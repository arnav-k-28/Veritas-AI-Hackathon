import http.client
import io
import itertools
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

BACKEND_DIR = str(Path(__file__).resolve().parents[1] / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import team846  # noqa: E402
import translator_server  # noqa: E402


class _FakeHTTPResponse:
    def __init__(self, body: bytes, status: int = 200, headers: dict | None = None):
        self._buf = io.BytesIO(body)
        self.status = status
        self.headers = headers or {}

    def read(self, n: int = -1) -> bytes:
        return self._buf.read(n)

    def readline(self, limit: int = -1) -> bytes:
        return self._buf.readline(limit)

    def __iter__(self):
        return iter(self._buf)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _parse_sse(raw_bytes: bytes) -> list[dict]:
    events = []
    for line in raw_bytes.decode("utf-8", errors="replace").splitlines():
        if line.startswith("data: "):
            payload = line[6:].strip()
            if payload and payload != "[DONE]":
                events.append(json.loads(payload))
    return events


def _invoke_handler(method: str, path: str, body: bytes = b"", headers: dict | None = None):
    """Invoke Handler.do_GET / do_POST in-memory without binding a TCP socket."""
    handler = object.__new__(translator_server.Handler)
    hdrs = http.client.HTTPMessage()
    merged = {"Content-Length": str(len(body or b""))}
    if headers:
        merged.update(headers)
    for k, v in merged.items():
        hdrs[k] = v

    handler.rfile = io.BytesIO(body or b"")
    handler.wfile = io.BytesIO()
    handler.path = path
    handler.command = method
    handler.request_version = "HTTP/1.1"
    handler.headers = hdrs
    handler.close_connection = True

    resp_meta = {"status": None, "headers": {}}

    def send_response(code, message=None):
        resp_meta["status"] = code

    def send_header(k, v):
        resp_meta["headers"][k] = v

    def end_headers():
        pass

    def send_error(code, message=None):
        resp_meta["status"] = code

    handler.send_response = send_response
    handler.send_header = send_header
    handler.end_headers = end_headers
    handler.send_error = send_error
    handler.log_message = lambda *args, **kwargs: None

    if method == "GET":
        handler.do_GET()
    elif method == "POST":
        handler.do_POST()
    elif method == "OPTIONS":
        handler.do_OPTIONS()
    else:
        raise ValueError(f"Unsupported method {method}")

    return resp_meta["status"], resp_meta["headers"], handler.wfile.getvalue()


class TestTranslatorServerHelpers(unittest.TestCase):
    def test_download_requires_permission_and_autodetects_plamo_gguf(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            model = root / 'spark.gguf'
            plamo_placeholder = root / 'plamo-placeholder.gguf'
            consent = root / 'consent.json'
            fake_hub = mock.MagicMock()

            def fake_hf_dl(**kwargs):
                out = Path(kwargs['local_dir']) / kwargs['filename']
                out.write_bytes(b'GGUF')
                return str(out)

            fake_hub.hf_hub_download.side_effect = fake_hf_dl
            fake_hub.list_repo_files.return_value = [
                'README.md',
                'mmproj-ignored.gguf',
                'plamo-3-translate-2b-custom-Q4_K_M.gguf',
            ]
            sources = {
                model: ('example/model', model.name, root),
                plamo_placeholder: ('Eiki-AI/plamo-3-translate-2b-af-q4_k_m', None, root),
            }
            with mock.patch.object(translator_server, 'DOWNLOAD_CONSENT_FILE', consent), \
                 mock.patch.dict(translator_server.MODEL_SOURCES, sources), \
                 mock.patch.dict(os.environ, {'NOVA_NO_AUTODOWNLOAD': '0'}), \
                 mock.patch.dict(sys.modules, {'huggingface_hub': fake_hub}):
                with self.assertRaises(PermissionError):
                    translator_server.ensure_model_file(model)
                fake_hub.hf_hub_download.assert_not_called()
                translator_server.record_download_consent()
                self.assertTrue(translator_server.ensure_model_file(model))
                resolved = translator_server.ensure_model_file(plamo_placeholder, engine_name='plamo')
                self.assertEqual(resolved.name, 'plamo-3-translate-2b-custom-Q4_K_M.gguf')
                self.assertTrue(resolved.is_file())
                self.assertEqual(fake_hub.hf_hub_download.call_count, 2)

    def test_preload_warms_selected_model_and_rejects_ultra(self):
        snapshot = dict(translator_server.state['lfm'])
        old_selected = translator_server._preload_selected
        def fake_loader():
            translator_server.state['lfm']['status'] = 'ready'
        try:
            with tempfile.TemporaryDirectory() as tmpdir, \
                 mock.patch.object(translator_server, 'LFM_GGUF', Path(tmpdir) / 'spark.gguf'), \
                 mock.patch.object(translator_server, 'load_lfm', side_effect=fake_loader) as loader, \
                 mock.patch.object(translator_server, 'stop_engine', return_value={'ok': True}), \
                 mock.patch.object(translator_server, '_refresh_proc_liveness'), \
                 mock.patch.object(translator_server.threading, 'Thread') as thread:
                translator_server.state['lfm']['status'] = 'idle'
                rejected = translator_server.preload_chat_model('ultra', allow_download=True)
                self.assertFalse(rejected['ok'])
                skipped = translator_server.preload_chat_model('spark', allow_download=False)
                self.assertEqual(skipped['status'], 'idle')
                thread.assert_not_called()
                queued = translator_server.preload_chat_model('spark')
                self.assertEqual(queued['status'], 'loading')
                thread.call_args.kwargs['target']()
                loader.assert_called_once()
                self.assertEqual(translator_server.state['lfm']['status'], 'ready')
                self.assertNotIn('spark', translator_server._preload_pending)
        finally:
            translator_server.state['lfm'] = snapshot
            translator_server._preload_selected = old_selected

    @mock.patch.object(translator_server, '_require_download_consent', new=lambda: None)
    def test_empty_model_file_triggers_download(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model = Path(tmpdir) / 'model.gguf'
            model.touch()
            fake_hub = mock.MagicMock()
            fake_hub.hf_hub_download.side_effect = lambda **kwargs: model.write_bytes(b'GGUF')
            with mock.patch.dict(os.environ, {'NOVA_NO_AUTODOWNLOAD': '0'}), \
                 mock.patch.dict(translator_server.MODEL_SOURCES, {model: ('example/model', model.name, Path(tmpdir))}), \
                 mock.patch.dict(sys.modules, {'huggingface_hub': fake_hub}):
                self.assertTrue(translator_server.ensure_model_file(model))
            self.assertEqual(model.read_bytes(), b'GGUF')

    def test_idle_unload_respects_recent_activity_and_busy_engine(self):
        proc = mock.MagicMock()
        proc.poll.return_value = None
        old_activity = translator_server._last_chat_activity["spark"]
        old_state = dict(translator_server.state["lfm"])
        try:
            with mock.patch.object(translator_server, "_lfm_proc", proc), \
                 mock.patch.object(translator_server, "_terminate_proc") as terminate, \
                 mock.patch.object(translator_server.time, "monotonic", return_value=1000):
                translator_server._last_chat_activity["spark"] = 900
                translator_server.stop_engine("spark", idle_only=True)
                terminate.assert_not_called()
                translator_server._last_chat_activity["spark"] = 600
                with translator_server._lfm_lock:
                    result = translator_server.stop_engine("spark", idle_only=True)
                self.assertFalse(result["ok"])
                terminate.assert_not_called()
                result = translator_server.stop_engine("spark", idle_only=True)
                self.assertTrue(result["stopped"])
                terminate.assert_called_once_with(proc)
        finally:
            translator_server._last_chat_activity["spark"] = old_activity
            translator_server.state["lfm"] = old_state

    def test_engine_deadline_and_presets(self):
        self.assertEqual(translator_server.engine_deadline_seconds("lfm"), 240)
        self.assertEqual(translator_server.engine_deadline_seconds("mimo"), 240)
        self.assertGreaterEqual(translator_server.CHAT_PRESETS["pro"]["max_new_tokens"], 2048)
        self.assertNotIn("ultra", translator_server.CHAT_PRESETS)

    def test_think_stream_splitter_across_chunks(self):
        splitter = translator_server._ThinkStreamSplitter()
        chunks = [
            "Intro ",
            "<th",
            "ink>first ",
            "thought</t",
            "hink> final answer",
        ]
        thinking_out = []
        text_out = []
        for c in chunks:
            for kind, piece in splitter.feed(c):
                if kind == "thinking":
                    thinking_out.append(piece)
                else:
                    text_out.append(piece)
        for kind, piece in splitter.flush():
            if kind == "thinking":
                thinking_out.append(piece)
            else:
                text_out.append(piece)

        self.assertEqual("".join(thinking_out), "first thought")
        self.assertEqual("".join(text_out), "Intro  final answer")

    def test_whisper_language_normalization(self):
        self.assertEqual(translator_server.normalize_whisper_language("zh-hans"), "zh")
        self.assertEqual(translator_server.normalize_whisper_language("zh-hant"), "zh")
        self.assertEqual(translator_server.normalize_whisper_language("jv"), "jw")
        self.assertIsNone(translator_server.normalize_whisper_language("ceb"))
        self.assertIsNone(translator_server.normalize_whisper_language("auto"))
        self.assertEqual(translator_server.normalize_whisper_language("es"), "es")

        self.assertEqual(translator_server.map_detected_language("zh", "zh-hans"), "zh-hans")
        self.assertEqual(translator_server.map_detected_language("zh", "zh-hant"), "zh-hant")
        self.assertEqual(translator_server.map_detected_language("jw", None), "jv")
        self.assertEqual(translator_server.map_detected_language("es", "auto"), "es")

    def test_estimate_tokens(self):
        self.assertGreater(translator_server.estimate_tokens("hello world from nova"), 0)
        msg_tokens = translator_server.estimate_tokens([
            {"role": "user", "content": [{"type": "text", "text": "describe this"}]}
        ])
        self.assertGreater(msg_tokens, 0)

    @mock.patch.object(translator_server, '_require_download_consent', new=lambda: None)
    def test_ensure_model_file_autodownload_and_opt_out(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            missing_opt = Path(tmpdir) / "missing_opt.gguf"
            with mock.patch.dict(os.environ, {"NOVA_NO_AUTODOWNLOAD": "1"}):
                self.assertFalse(translator_server.ensure_model_file(missing_opt, optional=True))

            target_path = Path(tmpdir) / "plamo-3-translate-2b-Q4_K_M.gguf"

            def fake_hf_download(**kwargs):
                local_dir = Path(kwargs.get("local_dir") or tmpdir)
                out_file = local_dir / Path(kwargs["filename"]).name
                out_file.parent.mkdir(parents=True, exist_ok=True)
                out_file.write_bytes(b"GGUF-FAKE")
                return str(out_file)

            fake_hf_mod = mock.MagicMock()
            fake_hf_mod.hf_hub_download = mock.MagicMock(side_effect=fake_hf_download)
            patched_sources = {
                target_path: ("pfnet/plamo-3-translate-2b-GGUF", "plamo-3-translate-2b-Q4_K_M.gguf", Path(tmpdir))
            }
            with mock.patch.dict(os.environ, {"NOVA_NO_AUTODOWNLOAD": "0"}):
                with mock.patch.dict(translator_server.MODEL_SOURCES, patched_sources, clear=False):
                    with mock.patch.dict(sys.modules, {"huggingface_hub": fake_hf_mod}):
                        ok = translator_server.ensure_model_file(target_path, engine_name="plamo", optional=False)
            self.assertTrue(ok)
            self.assertTrue(target_path.exists())

    @mock.patch.object(translator_server, '_require_download_consent', new=lambda: None)
    def test_failed_download_does_not_report_a_model_as_ready(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / 'missing.gguf'
            fake_hub = mock.MagicMock()
            fake_hub.hf_hub_download.return_value = str(path)
            with mock.patch.dict(os.environ, {'NOVA_NO_AUTODOWNLOAD': '0'}), \
                 mock.patch.dict(translator_server.MODEL_SOURCES, {path: ('example/model', 'missing.gguf', Path(tmpdir))}), \
                 mock.patch.dict(sys.modules, {'huggingface_hub': fake_hub}):
                with self.assertRaisesRegex(RuntimeError, 'Download did not produce'):
                    translator_server.ensure_model_file(path)

    def test_launch_engine_cold_start_and_timeout(self):
        mimo_snap = dict(translator_server.state["mimo"])
        fake_proc = mock.MagicMock()
        fake_proc.poll.return_value = None
        health_calls = {"n": 0}

        def fake_urlopen_cold_start(url, *args, **kwargs):
            health_calls["n"] += 1
            if health_calls["n"] == 1:
                raise urllib.error.URLError("still booting")
            if health_calls["n"] == 2:
                return _FakeHTTPResponse(b"ok", status=200)
            return _FakeHTTPResponse(b"ok", status=200)

        try:
            with mock.patch.object(translator_server, "ensure_model_file", return_value=True):
                with mock.patch("subprocess.Popen", return_value=fake_proc):
                    with mock.patch("time.sleep", return_value=None):
                        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen_cold_start):
                            proc = translator_server.launch_engine(
                                "mimo",
                                Path("/tmp/mimo.gguf"),
                                None,
                                "mimo",
                                18799,
                                "http://127.0.0.1:18799",
                                99,
                                16384,
                            )
            self.assertIs(proc, fake_proc)

            timeout_proc = mock.MagicMock()
            timeout_proc.poll.return_value = None
            ticks = itertools.chain([1000.0, 1000.0, 1000.5], itertools.repeat(1300.0))
            with mock.patch.object(translator_server, "ensure_model_file", return_value=True):
                with mock.patch("subprocess.Popen", return_value=timeout_proc):
                    with mock.patch("time.sleep", return_value=None):
                        with mock.patch("time.time", side_effect=ticks):
                            with mock.patch(
                                "urllib.request.urlopen",
                                side_effect=urllib.error.URLError("never ready"),
                            ):
                                with mock.patch.object(translator_server, "_terminate_proc") as term_mock:
                                    with self.assertRaises(TimeoutError):
                                        translator_server.launch_engine(
                                            "mimo",
                                            Path("/tmp/mimo.gguf"),
                                            None,
                                            "mimo",
                                            18799,
                                            "http://127.0.0.1:18799",
                                            99,
                                            16384,
                                        )
            term_mock.assert_called_once_with(timeout_proc)
        finally:
            translator_server.state["mimo"] = mimo_snap

    def test_text_engine_start_does_not_download_vision_projector(self):
        fake_proc = mock.MagicMock()
        fake_proc.poll.return_value = None
        snapshot = dict(translator_server.state["mimo"])
        with tempfile.TemporaryDirectory() as directory:
            model = Path(directory) / "model.gguf"
            projector = Path(directory) / "vision.gguf"
            model.write_bytes(b"model")
            try:
                with mock.patch.object(translator_server, "ensure_model_file", return_value=True) as ensure, \
                     mock.patch("subprocess.Popen", return_value=fake_proc), \
                     mock.patch("urllib.request.urlopen", side_effect=[OSError("not running"), _FakeHTTPResponse(b"ok")]):
                    translator_server.launch_engine("mimo", model, projector, "mimo", 18799,
                                                    "http://127.0.0.1:18799", 0, 4096)
                ensure.assert_called_once_with(model, "mimo")
                self.assertFalse(translator_server.state["mimo"]["vision"])
                with mock.patch.object(translator_server, "ensure_model_file", return_value=False) as ensure, \
                     mock.patch("subprocess.Popen", return_value=fake_proc), \
                     mock.patch("urllib.request.urlopen", side_effect=[OSError("not running"), _FakeHTTPResponse(b"ok")]):
                    translator_server.launch_engine("mimo", model, projector, "mimo", 18799,
                                                    "http://127.0.0.1:18799", 0, 4096, require_vision=True)
                ensure.assert_any_call(projector, "mimo", optional=True)
            finally:
                translator_server.state["mimo"] = snapshot


class TestTranslatorServerHTTP(unittest.TestCase):
    def test_cad_viewer_requires_local_svn_session(self):
        headers = {'Host': '127.0.0.1:%s' % translator_server.PORT}
        session = translator_server.cad.new_session('user', 'password', False)
        self.addCleanup(translator_server.cad.close_session, session)
        with mock.patch.object(translator_server.cad, 'token', return_value={'access_token': 'view-only'}):
            status, _, _ = _invoke_handler('GET', '/api/cad/token', headers=headers)
            self.assertEqual(status, 403)
            status, _, raw = _invoke_handler('GET', '/api/cad/token', headers={**headers, 'X-Nova-SVN-Session': session})
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(raw)['access_token'], 'view-only')
            status, _, _ = _invoke_handler('GET', '/api/cad/token', headers={**headers, 'Origin': 'https://example.com', 'X-Nova-SVN-Session': session})
            self.assertEqual(status, 403)
            status, _, _ = _invoke_handler('GET', '/api/cad/model-status?id=other', headers={**headers, 'X-Nova-SVN-Session': session})
            self.assertEqual(status, 403)

    def test_runtime_files_are_not_served(self):
        with mock.patch.object(Path, 'is_file', return_value=True):
            status, _, _ = _invoke_handler('GET', '/.runtime/download-consent.json')
        self.assertEqual(status, 404)

    def test_local_cad_conversion_is_local_and_returns_step(self):
        headers = {'Host': '127.0.0.1:%s' % translator_server.PORT, 'X-Nova-Local-Cad': '1'}
        with mock.patch.object(translator_server.local_cad, 'convert', return_value=b'STEP') as convert:
            status, _, body = _invoke_handler('POST', '/api/cad/local-convert?filename=part.ipt', b'CAD', headers=headers)
            self.assertEqual((status, body), (200, b'STEP'))
            self.assertEqual(convert.call_args.args[1], 'part.ipt')
            status, _, _ = _invoke_handler('POST', '/api/cad/local-convert?filename=part.ipt', b'CAD',
                                            headers={**headers, 'Origin': 'https://example.com'})
            self.assertEqual(status, 403)

    def test_svn_signin_is_local_and_uses_post_body(self):
        host = '127.0.0.1:%s' % translator_server.PORT
        body = json.dumps({'username': 'user', 'password': 'private', 'path': ''}).encode()
        with mock.patch.object(translator_server.cad, 'svn_list', return_value={'path': '', 'entries': []}) as listing:
            status, _, raw = _invoke_handler('POST', '/api/cad/svn/list', body,
                                             headers={'Host': host, 'Content-Type': 'application/json'})
            self.assertEqual(status, 200)
            listing.assert_called_once_with('user', 'private', '', allow_http=False)
            self.assertNotIn('private', raw.decode())
            status, _, _ = _invoke_handler('POST', '/api/cad/svn/list', body,
                                            headers={'Host': host, 'Origin': 'https://example.com'})
            self.assertEqual(status, 403)

    def test_svn_conversion_requires_approval_and_matching_plan(self):
        session = translator_server.cad.new_session('user', 'private', False)
        self.addCleanup(translator_server.cad.close_session, session)
        headers = {'Host': '127.0.0.1:%s' % translator_server.PORT, 'X-Nova-SVN-Session': session}
        body = json.dumps({'path': 'model.ipt', 'plan_id': 'old', 'approved': False}).encode()
        with mock.patch.object(translator_server.cad, 'configured', return_value=True), \
             mock.patch.object(translator_server.cad, 'svn_plan', return_value={'plan_id': 'new'}), \
             mock.patch.object(translator_server.cad, 'open_svn_model') as upload:
            status, _, _ = _invoke_handler('POST', '/api/cad/svn/open', body, headers=headers)
            self.assertEqual(status, 400)
            body = json.dumps({'path': 'model.ipt', 'plan_id': 'old', 'approved': True}).encode()
            status, _, _ = _invoke_handler('POST', '/api/cad/svn/open', body, headers=headers)
            self.assertEqual(status, 502)
            upload.assert_not_called()

    def test_svn_local_open_requires_session_and_matching_plan(self):
        session = translator_server.cad.new_session('user', 'private', False)
        self.addCleanup(translator_server.cad.close_session, session)
        headers = {'Host': '127.0.0.1:%s' % translator_server.PORT, 'X-Nova-SVN-Session': session}
        plan = {'plan_id': 'a' * 64}
        body = json.dumps({'path': 'model.ipt', 'scope': None, 'plan_id': plan['plan_id']}).encode()
        with mock.patch.object(translator_server.cad, 'svn_plan', return_value=plan), \
             mock.patch.object(translator_server.cad, 'open_svn_local', return_value=b'STEP') as convert:
            status, _, raw = _invoke_handler('POST', '/api/cad/svn/local-open', body, headers=headers)
            self.assertEqual((status, raw), (200, b'STEP'))
            convert.assert_called_once()
            status, _, _ = _invoke_handler('POST', '/api/cad/svn/local-open', body, headers={'Host': headers['Host']})
            self.assertEqual(status, 403)

    def test_tba_status_does_not_expose_key_and_routes_team(self):
        with mock.patch.dict(os.environ, {'TBA_AUTH_KEY': 'private-example-key'}):
            status, _, raw = _invoke_handler('GET', '/api/tba/status')
            self.assertEqual(status, 200)
            self.assertTrue(json.loads(raw)['configured'])
            self.assertNotIn(b'private-example-key', raw)
            with mock.patch.object(translator_server.tba, 'team_digest', return_value={'number': 846}) as lookup:
                status, _, raw = _invoke_handler('GET', '/api/tba/team?team=846&year=2026')
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(raw)['number'], 846)
            lookup.assert_called_once_with('846', '2026')

    def test_tba_reports_missing_key(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            status, _, raw = _invoke_handler('GET', '/api/tba/team?team=846')
        self.assertEqual(status, 503)
        self.assertIn('TBA_AUTH_KEY', json.loads(raw)['error'])

    def test_download_consent_requires_explicit_approval(self):
        with tempfile.TemporaryDirectory() as tmpdir, \
             mock.patch.object(translator_server, 'DOWNLOAD_CONSENT_FILE', Path(tmpdir) / 'consent.json'):
            status, _, _ = _invoke_handler('POST', '/api/setup/consent', b'{"approved":false}')
            self.assertEqual(status, 400)
            self.assertFalse(translator_server.download_consent_granted())
            status, _, _ = _invoke_handler('POST', '/api/setup/consent', b'{"approved":true}',
                                           headers={'Origin': 'https://example.com'})
            self.assertEqual(status, 403)
            self.assertFalse(translator_server.download_consent_granted())
            status, _, _ = _invoke_handler('POST', '/api/setup/consent', b'{"approved":true}')
            self.assertEqual(status, 200)
            self.assertTrue(translator_server.download_consent_granted())

    def test_chat_pro_thinking_sse_tokens_and_message_normalization(self):
        captured_payloads = []
        sse_upstream = (
            b'data: {"choices":[{"delta":{"reasoning_content":"Step 1: "}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"<th"}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"ink>Step 2</think>Final "}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"Answer"}}],"usage":{"prompt_tokens":42,"completion_tokens":19}}\n\n'
            b"data: [DONE]\n\n"
        )

        def fake_urlopen(req, *args, **kwargs):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "/v1/chat/completions" in url:
                captured_payloads.append(json.loads(req.data.decode("utf-8")))
                return _FakeHTTPResponse(sse_upstream, status=200, headers={"Content-Type": "text/event-stream"})
            raise AssertionError(f"Unexpected urlopen call: {url}")

        engine_snap = dict(translator_server.state["mimo"])
        proc_snap = translator_server._mimo_proc
        fake_proc = mock.MagicMock()
        fake_proc.poll.return_value = None
        translator_server._mimo_proc = fake_proc
        translator_server.state["mimo"] = {
            **engine_snap,
            "state": "ready",
            "status": "ready",
            "context_max": 16384,
            "error": None,
        }
        try:
            payload = json.dumps({
                "preset": "pro",
                "messages": [
                    {"role": "user", "content": [{"type": "text", "text": "Hello"}]},
                    {"role": "user", "content": "Explain photosynthesis"},
                ],
            }).encode("utf-8")
            with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                status, _, raw = _invoke_handler(
                    "POST",
                    "/api/chat",
                    body=payload,
                    headers={"Content-Type": "application/json"},
                )
        finally:
            translator_server.state["mimo"] = engine_snap
            translator_server._mimo_proc = proc_snap

        self.assertEqual(status, 200)
        self.assertEqual(len(captured_payloads), 1)
        sent = captured_payloads[0]
        self.assertTrue(sent.get("chat_template_kwargs", {}).get("enable_thinking"))
        roles = [m["role"] for m in sent["messages"]]
        self.assertEqual(roles, ["system", "user"])
        self.assertIsInstance(sent["messages"][1]["content"], str)
        self.assertIn("Hello", sent["messages"][1]["content"])
        self.assertIn("Explain photosynthesis", sent["messages"][1]["content"])

        events = _parse_sse(raw)
        start_evts = [e for e in events if e.get("type") == "start"]
        think_evts = [e for e in events if e.get("type") == "thinking"]
        token_evts = [e for e in events if e.get("type") == "token"]
        done_evts = [e for e in events if e.get("type") == "done"]

        self.assertTrue(start_evts)
        self.assertGreater(start_evts[0]["prompt_tokens"], 0)
        self.assertEqual("".join(e["text"] for e in think_evts), "Step 1: Step 2")
        self.assertEqual("".join(e["text"] for e in token_evts), "Final Answer")
        self.assertEqual(done_evts[0]["usage"]["prompt_tokens"], 42)
        self.assertEqual(done_evts[0]["usage"]["completion_tokens"], 19)

    def test_chat_tool_call_then_fallback_token_estimation(self):
        call_count = {"n": 0}
        plan_resp = json.dumps({
            "choices": [{
                "message": {
                    "role": "assistant",
                    "tool_calls": [{
                        "id": "call_1",
                        "type": "function",
                        "function": {
                            "name": "read_file",
                            "arguments": json.dumps({"repo": "robot-2025", "path": "src/Main.java"}),
                        },
                    }],
                }
            }]
        }).encode("utf-8")
        stream_resp = (
            b'data: {"choices":[{"delta":{"reasoning_content":"Checking file."}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"Looks good."}}],"timings":{"prompt_n":33,"predicted_n":7}}\n\n'
            b"data: [DONE]\n\n"
        )

        def fake_urlopen(req, *args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _FakeHTTPResponse(plan_resp, status=200, headers={"Content-Type": "application/json"})
            return _FakeHTTPResponse(stream_resp, status=200, headers={"Content-Type": "text/event-stream"})

        engine_snap = dict(translator_server.state["mimo"])
        proc_snap = translator_server._mimo_proc
        fake_proc = mock.MagicMock()
        fake_proc.poll.return_value = None
        translator_server._mimo_proc = fake_proc
        translator_server.state["mimo"] = {
            **engine_snap,
            "status": "ready",
            "context_max": 16384,
            "error": None,
        }
        try:
            payload = json.dumps({
                "preset": "pro",
                "messages": [{"role": "user", "content": "Read file src/Main.java in team846 repository"}],
            }).encode("utf-8")
            with mock.patch.object(
                team846,
                "execute_tool",
                return_value={
                    "type": "file",
                    "repo": "robot-2025",
                    "path": "src/Main.java",
                    "branch": "main",
                    "url": "https://github.com/Team846/robot-2025/blob/main/src/Main.java",
                    "content": "class Main {}",
                },
            ) as exec_mock:
                with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                    status, _, raw = _invoke_handler(
                        "POST",
                        "/api/chat",
                        body=payload,
                        headers={"Content-Type": "application/json"},
                    )
        finally:
            translator_server.state["mimo"] = engine_snap
            translator_server._mimo_proc = proc_snap

        self.assertEqual(status, 200)
        exec_mock.assert_called_once()
        events = _parse_sse(raw)
        self.assertTrue(any(e.get("type") == "source" for e in events))
        done = [e for e in events if e.get("type") == "done"][0]
        self.assertEqual(done["usage"]["prompt_tokens"], 33)
        self.assertEqual(done["usage"]["completion_tokens"], 7)

    def test_text_tool_call_executes_search_before_answering(self):
        markup = "<tool_call><function=web_search><parameter=query>Team 846 CalGames 2026 matches results</parameter></function></tool_call>"
        planned = json.dumps({"choices": [{"message": {"role": "assistant", "content": markup}}]}).encode()
        followup = json.dumps({"choices": [{"message": {"role": "assistant", "content": "Ready"}}]}).encode()
        streamed = b'data: {"choices":[{"delta":{"content":"Here are the results."}}]}\n\ndata: [DONE]\n\n'
        payloads = []

        def fake_urlopen(req, *args, **kwargs):
            payloads.append(json.loads(req.data))
            return _FakeHTTPResponse([planned, followup, streamed][len(payloads) - 1])

        req = mock.MagicMock()
        req.wfile = io.BytesIO()
        with mock.patch.object(translator_server, "_augment_with_knowledge", return_value=(
                [{"role": "user", "content": "Team 846 CalGames 2026"}], {"kb": 0, "web": 0})), \
             mock.patch.object(translator_server.websearch, "execute_tool", return_value={"results": [{"title": "event"}]}) as search, \
             mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            translator_server.stream_chat(req, [{"role": "user", "content": "Team 846 CalGames 2026"}], "pro")

        search.assert_called_once_with("web_search", {"query": "Team 846 CalGames 2026 matches results"})
        self.assertTrue(any(m.get("role") == "tool" and "event" in m["content"] for m in payloads[1]["messages"]))
        answer = "".join(e.get("text", "") for e in _parse_sse(req.wfile.getvalue()) if e.get("type") == "token")
        self.assertEqual(answer, "Here are the results.")

    def test_text_tool_call_parser_and_stream_filter(self):
        calls = translator_server._text_tool_calls('<tool_call>{"name":"tba_team","arguments":{"team":"846","year":"2026"}}</tool_call>')
        self.assertEqual(json.loads(calls[0]["function"]["arguments"]), {"team": 846, "year": 2026})
        self.assertEqual(translator_server._text_tool_calls('<tool_call>{"name":"unknown","arguments":{}}</tool_call>'), [])
        filt = translator_server._ToolMarkupFilter()
        output = "".join(filt.feed(piece) for piece in ["Answer <too", "l_call><function=", "web_search>x</function></tool_", "call> done"])
        self.assertEqual(output + filt.flush(), "Answer  done")
        self.assertTrue(filt.suppressed)

    def test_chat_retries_from_error_state(self):
        engine_snap = dict(translator_server.state["mimo"])
        proc_snap = translator_server._mimo_proc
        translator_server._mimo_proc = None
        translator_server.state["mimo"] = {
            **engine_snap,
            "status": "error",
            "error": "previous failure",
        }
        stream_resp = (
            b'data: {"choices":[{"delta":{"content":"Recovered!"}}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n'
            b"data: [DONE]\n\n"
        )

        def fake_load_mimo():
            fake_proc = mock.MagicMock()
            fake_proc.poll.return_value = None
            translator_server._mimo_proc = fake_proc
            translator_server.state["mimo"]["status"] = "ready"
            translator_server.state["mimo"]["error"] = None

        def fake_urlopen(req, *args, **kwargs):
            url = getattr(req, "full_url", "") or ""
            if url.endswith("/apply-template"):
                return _FakeHTTPResponse(b'{"prompt": "templated prompt"}', status=200, headers={"Content-Type": "application/json"})
            if url.endswith("/tokenize"):
                return _FakeHTTPResponse(b'{"tokens": [1, 2, 3, 4]}', status=200, headers={"Content-Type": "application/json"})
            return _FakeHTTPResponse(stream_resp, status=200, headers={"Content-Type": "text/event-stream"})

        try:
            payload = json.dumps({
                "preset": "pro",
                "messages": [{"role": "user", "content": "hi"}],
            }).encode("utf-8")
            with mock.patch.object(translator_server, "load_mimo", side_effect=fake_load_mimo) as load_mock:
                with mock.patch(
                    "urllib.request.urlopen",
                    side_effect=fake_urlopen,
                ):
                    status, _, raw = _invoke_handler(
                        "POST",
                        "/api/chat",
                        body=payload,
                        headers={"Content-Type": "application/json"},
                    )
        finally:
            translator_server.state["mimo"] = engine_snap
            translator_server._mimo_proc = proc_snap

        self.assertEqual(status, 200)
        load_mock.assert_called_once()
        events = _parse_sse(raw)
        self.assertEqual("".join(e["text"] for e in events if e.get("type") == "token"), "Recovered!")

    def test_transcribe_language_mapping_and_vad_fallback(self):
        seen_calls = []

        class _Seg:
            def __init__(self, text):
                self.text = text

        class _Info:
            def __init__(self, lang):
                self.language = lang
                self.language_probability = 0.99

        class _FakeWhisper:
            def transcribe(self, audio_path, language=None, vad_filter=True, **kwargs):
                seen_calls.append({"language": language, "vad_filter": vad_filter})
                if vad_filter:
                    return iter([]), _Info("en")
                return iter([_Seg("Hola mundo")]), _Info("es")

        whisper_state_snap = dict(translator_server.state["whisper"])
        whisper_snap = translator_server._whisper
        translator_server.state["whisper"] = {**whisper_state_snap, "status": "ready", "error": None}
        translator_server._whisper = _FakeWhisper()
        try:
            status, _, raw = _invoke_handler(
                "POST",
                "/api/transcribe?language=auto",
                body=b"RIFF0000WAVEfmt ",
                headers={"Content-Type": "audio/wav"},
            )
            self.assertEqual(status, 200)
            data = json.loads(raw.decode("utf-8"))
            self.assertEqual(data["text"], "Hola mundo")
            self.assertEqual(data["language"], "es")
            self.assertEqual(seen_calls, [
                {"language": None, "vad_filter": True},
                {"language": None, "vad_filter": False},
            ])

            seen_calls.clear()
            _invoke_handler(
                "POST",
                "/api/transcribe?language=zh-hans",
                body=b"RIFF0000",
                headers={"Content-Type": "audio/wav"},
            )
            _invoke_handler(
                "POST",
                "/api/transcribe?language=ceb",
                body=b"RIFF0000",
                headers={"Content-Type": "audio/wav"},
            )
            self.assertEqual(seen_calls[0]["language"], "zh")
            self.assertIsNone(seen_calls[2]["language"])
        finally:
            translator_server.state["whisper"] = whisper_state_snap
            translator_server._whisper = whisper_snap

    def test_tts_get_post_chunking_and_auto_script_detection(self):
        with mock.patch.object(translator_server, "synthesize_tts_audio", return_value=b"ID3FAKE") as tts_mock:
            status_post, headers_post, body_post = _invoke_handler(
                "POST",
                "/api/tts",
                body=json.dumps({"text": "Bonjour", "lang": "fr"}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(status_post, 200)
            self.assertEqual(headers_post.get("Content-Type"), "audio/mpeg")
            self.assertEqual(body_post, b"ID3FAKE")
            tts_mock.assert_called_with("Bonjour", "fr")

            status_get, headers_get, body_get = _invoke_handler("GET", "/api/tts?text=Hello&lang=en")
            self.assertEqual(status_get, 200)
            self.assertEqual(headers_get.get("Content-Type"), "audio/mpeg")
            self.assertEqual(body_get, b"ID3FAKE")

        long_text = " ".join(["palabra"] * 45)
        chunk_calls = []

        def fake_tts_urlopen(req, *args, **kwargs):
            chunk_calls.append(req.full_url if hasattr(req, "full_url") else str(req))
            return _FakeHTTPResponse(b"MP3CHUNK", status=200)

        with mock.patch.dict(sys.modules, {"edge_tts": None}):
            with mock.patch("urllib.request.urlopen", side_effect=fake_tts_urlopen):
                audio_bytes = translator_server.synthesize_tts_audio(long_text, "es")
        self.assertGreaterEqual(len(chunk_calls), 2)
        self.assertEqual(audio_bytes, b"MP3CHUNK" * len(chunk_calls))

        self.assertEqual(translator_server._infer_tts_lang_from_text("こんにちは"), "ja")
        self.assertEqual(translator_server._infer_tts_lang_from_text("你好世界"), "zh-hans")
        self.assertEqual(translator_server._infer_tts_lang_from_text("Привет мир"), "ru")
        self.assertEqual(translator_server._infer_tts_lang_from_text("Hello world"), "en")


class TestTeam846Enhancements(unittest.TestCase):
    def test_github_token_header_and_read_file_strip(self):
        captured_headers = {}
        team846._cache.clear()

        def fake_urlopen(req, *args, **kwargs):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            captured_headers.update(dict(req.header_items()))
            if "/orgs/Team846/repos" in url:
                return _FakeHTTPResponse(json.dumps([
                    {"name": "DemoRepo", "default_branch": "main", "private": False}
                ]).encode("utf-8"))
            if "/repos/Team846/DemoRepo/contents/src/main.py" in url:
                return _FakeHTTPResponse(json.dumps({
                    "type": "file",
                    "size": 5,
                    "encoding": "base64",
                    "content": "aGVsbG8=",
                    "sha": "abc",
                }).encode("utf-8"))
            raise AssertionError(f"Unexpected GitHub URL: {url}")

        try:
            with mock.patch.dict(os.environ, {"GITHUB_TOKEN": "tok_test_123"}):
                with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                    out = team846.execute_tool("read_file", {"repo": "DemoRepo", "path": "/src/main.py"})
        finally:
            team846._cache.clear()

        self.assertEqual(out["path"], "src/main.py")
        self.assertEqual(captured_headers.get("Authorization"), "Bearer tok_test_123")


class TestRemoteInferenceEndpoints(unittest.TestCase):
    def test_remote_hf_endpoints_setup_health_chat_translate_and_cors(self):
        captured = []

        def fake_urlopen(req, *args, **kwargs):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            hdrs = dict(req.header_items())
            body = json.loads(req.data.decode("utf-8")) if getattr(req, "data", None) else {}
            captured.append((url, hdrs, body))
            if "plamo" in url:
                return _FakeHTTPResponse(
                    json.dumps({"choices": [{"message": {"content": "Hola"}}]}).encode("utf-8"),
                    status=200,
                    headers={"Content-Type": "application/json"},
                )
            sse = (
                b'data: {"choices":[{"delta":{"content":"Remote reply"}}],"usage":{"prompt_tokens":12,"completion_tokens":4}}\n\n'
                b"data: [DONE]\n\n"
            )
            return _FakeHTTPResponse(sse, status=200, headers={"Content-Type": "text/event-stream"})

        env = {
            "HF_TOKEN": "hf_test_tok",
            "NOVA_SPARK_API_BASE": "https://spark.endpoints.huggingface.cloud",
            "NOVA_PRO_API_BASE": "https://pro.endpoints.huggingface.cloud/v1",
            "NOVA_PLAMO_API_BASE": "https://plamo.endpoints.huggingface.cloud",
        }
        snap_plamo = dict(translator_server.state["plamo"])
        snap_lfm = dict(translator_server.state["lfm"])
        snap_mimo = dict(translator_server.state["mimo"])
        try:
            with mock.patch.dict(os.environ, env), \
                 mock.patch.object(translator_server, "LLAMA_SERVER", "/nonexistent/llama-server"), \
                 mock.patch.object(translator_server, "DOWNLOAD_CONSENT_FILE", Path("/nonexistent/consent.json")), \
                 mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                status_hz, _, raw_hz = _invoke_handler("GET", "/healthz")
                self.assertEqual(status_hz, 200)
                self.assertTrue(json.loads(raw_hz)["ok"])

                status_opt, opt_hdrs, _ = _invoke_handler("OPTIONS", "/api/chat")
                self.assertEqual(status_opt, 204)
                self.assertEqual(opt_hdrs.get("Access-Control-Allow-Origin"), "*")

                status_setup, _, raw_setup = _invoke_handler("GET", "/api/setup")
                self.assertEqual(status_setup, 200)
                setup_data = json.loads(raw_setup)
                self.assertTrue(setup_data["consent"])
                self.assertTrue(setup_data["runtime"])
                self.assertTrue(setup_data["models"]["spark"])
                self.assertTrue(setup_data["models"]["pro"])
                self.assertTrue(setup_data["models"]["translation"])

                status_h, _, raw_h = _invoke_handler("GET", "/api/health")
                self.assertEqual(status_h, 200)
                health = json.loads(raw_h)
                self.assertTrue(health["ok"])
                self.assertEqual(health["engines"]["spark"]["device"], "remote")
                self.assertEqual(health["engines"]["pro"]["device"], "remote")
                self.assertNotIn("ultra", health["engines"])
                self.assertNotIn("qwen", health)

                # Legacy preset 'ultra' falls back cleanly to Pro endpoint
                chat_body = json.dumps({"preset": "ultra", "messages": [{"role": "user", "content": "Hi"}]}).encode("utf-8")
                status_c, _, raw_c = _invoke_handler("POST", "/api/chat", body=chat_body, headers={"Content-Type": "application/json"})
                self.assertEqual(status_c, 200)
                tokens = "".join(e.get("text", "") for e in _parse_sse(raw_c) if e.get("type") == "token")
                self.assertEqual(tokens, "Remote reply")

                tr_body = json.dumps({"text": "Hello", "source_lang": "en", "target_lang": "es"}).encode("utf-8")
                status_t, _, raw_t = _invoke_handler("POST", "/api/translate", body=tr_body, headers={"Content-Type": "application/json"})
                self.assertEqual(status_t, 200)
                self.assertEqual(json.loads(raw_t)["translation"], "Hola")
        finally:
            translator_server.state["plamo"] = snap_plamo
            translator_server.state["lfm"] = snap_lfm
            translator_server.state["mimo"] = snap_mimo

        self.assertEqual(captured[0][0], "https://pro.endpoints.huggingface.cloud/v1/chat/completions")
        self.assertEqual(captured[0][1].get("Authorization"), "Bearer hf_test_tok")
        self.assertEqual(captured[0][2].get("model"), "bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF")
        self.assertEqual(captured[1][0], "https://plamo.endpoints.huggingface.cloud/v1/chat/completions")
        self.assertEqual(captured[1][1].get("Authorization"), "Bearer hf_test_tok")
        self.assertEqual(captured[1][2].get("model"), "Eiki-AI/plamo-3-translate-2b-af-q4_k_m")

    def test_gradio_zerogpu_space_bridge_chat_and_translate(self):
        requests_seen = []

        def fake_urlopen(req, *args, **kwargs):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            method = req.get_method() if hasattr(req, "get_method") else "GET"
            body = json.loads(req.data.decode("utf-8")) if getattr(req, "data", None) else None
            requests_seen.append((method, url, body))
            if url.endswith("/gradio_api/call/chat") and method == "POST":
                return _FakeHTTPResponse(json.dumps({"event_id": "evt_chat_1"}).encode("utf-8"), status=200)
            if url.endswith("/gradio_api/call/chat/evt_chat_1") and method == "GET":
                c1 = json.dumps({"chunks": [{"choices": [{"delta": {"content": "Zero"}}]}], "done": False})
                c2 = json.dumps({"chunks": [
                    {"choices": [{"delta": {"content": "Zero"}}]},
                    {"choices": [{"delta": {"content": "GPU!"}}], "usage": {"prompt_tokens": 9, "completion_tokens": 2}},
                ], "done": True})
                sse = (
                    f"event: generating\ndata: {json.dumps([c1])}\n\n"
                    f"event: complete\ndata: {json.dumps([c2])}\n\n"
                ).encode("utf-8")
                return _FakeHTTPResponse(sse, status=200, headers={"Content-Type": "text/event-stream"})
            if url.endswith("/gradio_api/call/translate") and method == "POST":
                return _FakeHTTPResponse(json.dumps({"event_id": "evt_tr_1"}).encode("utf-8"), status=200)
            if url.endswith("/gradio_api/call/translate/evt_tr_1") and method == "GET":
                sse = b'event: complete\ndata: ["Bonjour"]\n\n'
                return _FakeHTTPResponse(sse, status=200, headers={"Content-Type": "text/event-stream"})
            raise AssertionError(f"Unexpected URL: {method} {url}")

        env = {
            "NOVA_SPARK_API_BASE": "https://eiki-ai-primer.hf.space",
            "NOVA_PRO_API_BASE": "https://eiki-ai-primer.hf.space",
            "NOVA_PLAMO_API_BASE": "https://eiki-ai-primer.hf.space",
        }
        snap_plamo = dict(translator_server.state["plamo"])
        snap_lfm = dict(translator_server.state["lfm"])
        snap_mimo = dict(translator_server.state["mimo"])
        try:
            with mock.patch.dict(os.environ, env):
                self.assertEqual(translator_server._remote_config("spark")["provider"], "gradio")
                self.assertEqual(translator_server._remote_config("pro")["provider"], "gradio")
                self.assertEqual(translator_server._remote_config("plamo")["provider"], "gradio")

                with mock.patch.dict(os.environ, {"SPACE_ID": "Eiki-AI/Primer"}), \
                     mock.patch.object(translator_server, "DOWNLOAD_CONSENT_FILE", Path("/nonexistent/consent.json")):
                    self.assertTrue(translator_server.download_consent_granted())

                with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
                    chat_body = json.dumps({"preset": "spark", "messages": [{"role": "user", "content": "Hi"}]}).encode("utf-8")
                    status_c, _, raw_c = _invoke_handler("POST", "/api/chat", body=chat_body, headers={"Content-Type": "application/json"})
                    self.assertEqual(status_c, 200)
                    events = _parse_sse(raw_c)
                    tokens = "".join(e.get("text", "") for e in events if e.get("type") == "token")
                    self.assertEqual(tokens, "ZeroGPU!")

                    tr_body = json.dumps({"text": "Hello", "source_lang": "en", "target_lang": "fr"}).encode("utf-8")
                    status_t, _, raw_t = _invoke_handler("POST", "/api/translate", body=tr_body, headers={"Content-Type": "application/json"})
                    self.assertEqual(status_t, 200)
                    self.assertEqual(json.loads(raw_t)["translation"], "Bonjour")
        finally:
            translator_server.state["plamo"] = snap_plamo
            translator_server.state["lfm"] = snap_lfm
            translator_server.state["mimo"] = snap_mimo

        self.assertEqual(requests_seen[0][1], "https://eiki-ai-primer.hf.space/gradio_api/call/chat")
        self.assertEqual(requests_seen[0][2]["data"][0], "spark")
        self.assertEqual(requests_seen[2][1], "https://eiki-ai-primer.hf.space/gradio_api/call/translate")
        self.assertEqual(requests_seen[2][2]["data"], ["Hello", "en", "fr", ""])


if __name__ == "__main__":
    unittest.main()
