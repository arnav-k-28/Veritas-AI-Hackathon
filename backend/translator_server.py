"""
Nova server — local AI backend for the Nova website.

Serves three things on the same port:
  * the static Nova website (repo root)
  * POST /api/translate  — PLaMo-3-translate-2B (Q4_K_M GGUF via llama.cpp) neural translation
  * POST /api/chat       — LFM3-VL-2B (Q4_K_M GGUF via llama.cpp subprocess) chat LLM, streamed (SSE)

Run:
  .venv-translator\\Scripts\\python.exe backend\\translator_server.py

Then open http://127.0.0.1:8787/
Without this server the website still works: the translator falls back to its
offline phrasebook, and the chat falls back to built-in offline replies.
"""
from __future__ import annotations

import json
import mimetypes
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
# PLaMo runs through llama-server (see PLAMO_GGUF below)
LFM_GGUF = REPO_ROOT / "models" / "LFM3-VL-2B-GGUF" / "LFM3-VL-2B-Q4_K_M.gguf"
_DEFAULT_LLAMA_SERVER = r"C:\Users\anicf\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe"
LLAMA_SERVER = os.environ.get("NOVA_LLAMA_SERVER", _DEFAULT_LLAMA_SERVER if os.path.exists(_DEFAULT_LLAMA_SERVER) else "llama-server")
LLAMA_API_PORT = int(os.environ.get("NOVA_LLAMA_PORT", "8000"))
LLAMA_API_BASE = f"http://127.0.0.1:{LLAMA_API_PORT}"
PLAMO_API_PORT = int(os.environ.get("NOVA_PLAMO_PORT", "8001"))
PLAMO_API_BASE = f"http://127.0.0.1:{PLAMO_API_PORT}"
PLAMO_GGUF = REPO_ROOT / "models" / "plamo-3-translate-2b-GGUF" / "plamo-3-translate-2b-Q4_K_M.gguf"
HOST = os.environ.get("NOVA_HOST", "127.0.0.1")
PORT = int(os.environ.get("NOVA_PORT", "8787"))

# lowercase language codes supported by the PLaMo chat template
# (all 53 languages of PLaMo-3-translate)
LANG_CODES = {
    "ja", "zh-hans", "zh-hant", "ko", "vi", "th", "id", "ms", "jv", "tl", "ceb", "my", "km",
    "en", "de", "fr", "es", "it", "nl", "ca", "eu", "pl", "hu", "sk", "sl", "hr", "sr", "bg",
    "ru", "be", "et", "lv", "lt", "hy", "ka", "az",
    "ar", "he", "fa", "kk", "uz", "sw",
    "hi", "ur", "bn", "pa", "mr", "gu", "ta", "te", "ml", "ne", "si",
}

STUDENT_SYSTEM_PROMPT = (
    "You are Nova, a friendly study assistant for international students. "
    "Use simple, clear English (the student may be an English learner). "
    "Answer with markdown: headings with ##, bold for key terms, short lists. "
    "Be helpful and concise — but explain difficult words when they matter."
)

CHAT_PRESETS = {
    "spark": {"temperature": 0.2,  "max_new_tokens": 320,  "thinking": False},
    "pro":   {"temperature": 0.6,  "max_new_tokens": 700,  "thinking": True},
    "ultra": {"temperature": 0.85, "max_new_tokens": 1500, "thinking": True},
}

# ───────────────────────── engine state ─────────────────────────
state = {
    "plamo": {"status": "loading", "device": None, "quantization": None, "error": None, "vram_mb": None},
    "lfm":   {"status": "idle",    "device": None, "quantization": "q4_k_m", "error": None, "vram_mb": None, "context_max": 128000},
}
_plamo_lock = threading.Lock()     # serialize generation / memory access
_lfm_lock = threading.Lock()
_plamo_proc = None     # subprocess: llama-server PLaMo (child or adopted)
_lfm_proc = None       # subprocess: llama-server LFM (child or adopted)


# ───────────────────────── transcriber (Whisper) — lazy-loaded on first use ─────────────────────────
WHISPER_DIR = REPO_ROOT / "models" / "large-v3-turbo"

state["whisper"] = {"status": "idle", "device": None, "quantization": "int8", "error": None, "vram_mb": None}
_whisper = None
_whisper_lock = threading.Lock()


def load_whisper():
    global _whisper
    eng = state["whisper"]
    eng["status"] = "loading"
    try:
        if not (WHISPER_DIR / "model.bin").exists() and not any(WHISPER_DIR.glob("*.bin")):
            raise FileNotFoundError(f"Whisper model not found at {WHISPER_DIR}.")
        # Windows: make CUDA runtime DLLs visible to ctranslate2
        sp = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
        for sub in ("cublas/bin", "cudnn/bin", "cuda_runtime/bin"):
            d = sp / sub
            if d.exists():
                os.add_dll_directory(str(d))
        from faster_whisper import WhisperModel

        print("[whisper] loading large-v3-turbo (int8) ...", flush=True)
        t0 = time.time()
        _whisper = WhisperModel(str(WHISPER_DIR), device="cuda", compute_type="int8")
        eng.update(status="ready", device="cuda", quantization="int8")
        print(f"[whisper] ready in {time.time() - t0:.1f}s", flush=True)
    except Exception as exc:  # noqa: BLE001
        eng["status"] = "error"
        eng["error"] = str(exc)
        print(f"[whisper] FAILED: {exc}", flush=True)


def _report(engine: str) -> dict:
    return {
        "status": state[engine]["status"],
        "device": state[engine]["device"],
        "quantization": state[engine]["quantization"],
        "vram_mb": state[engine]["vram_mb"],
        "error": state[engine]["error"],
    }


def load_plamo():
    """PLaMo-3-translate-2B (Q4_K_M GGUF via embedded llama-server, port 8001)."""
    global _plamo_proc
    eng = state["plamo"]
    eng["status"] = "loading"
    try:
        if not PLAMO_GGUF.exists():
            raise FileNotFoundError(
                f"GGUF not found at {PLAMO_GGUF}. "
                "Run: python -c \"from huggingface_hub import hf_hub_download; "
                "hf_hub_download('pfnet/plamo-3-translate-2b-GGUF', 'plamo-3-translate-2b-Q4_K_M.gguf', 'models/plamo-3-translate-2b-GGUF')\""
            )

        import subprocess
        import urllib.request

        # adopt an existing healthy server on the port instead of spawning a duplicate
        try:
            with urllib.request.urlopen(f"{PLAMO_API_BASE}/health", timeout=2) as resp:
                if resp.status == 200:
                    print("[plamo] llama-server already running — adopting it", flush=True)
                    eng.update(device="cuda", quantization="q4_k_m", status="ready")
                    return
        except Exception:
            pass

        print(f"[plamo] launching llama-server: {LLAMA_SERVER}", flush=True)
        _plamo_proc = subprocess.Popen(
            [
                LLAMA_SERVER,
                "-m", str(PLAMO_GGUF),
                "--host", "127.0.0.1",
                "--port", str(PLAMO_API_PORT),
                "-ngl", "-1",
                "-c", "16384",
                "--alias", "plamo3",
                "--no-webui",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )

        deadline = time.time() + 180
        while time.time() < deadline:
            if _plamo_proc.poll() is not None:
                raise RuntimeError(f"plamo llama-server exited with code {_plamo_proc.returncode}")
            try:
                with urllib.request.urlopen(f"{PLAMO_API_BASE}/health", timeout=2) as resp:
                    if resp.status == 200:
                        eng["device"] = "cuda"
                        eng["quantization"] = "q4_k_m"
                        eng["status"] = "ready"
                        print("[plamo] model loaded", flush=True)
                        return
            except Exception:  # noqa: BLE001 — still loading
                time.sleep(0.5)
        raise TimeoutError("plamo llama-server did not become healthy in 180s")
    except Exception as exc:  # noqa: BLE001
        eng["status"] = "error"
        eng["error"] = str(exc)
        print(f"[plamo] FAILED: {exc}", flush=True)


def load_lfm():
    """Launch llama-server (llama.cpp b12343, official GGUF) as a subprocess and wait for it."""
    global _lfm_proc
    eng = state["lfm"]
    eng["status"] = "loading"
    try:
        if not LFM_GGUF.exists():
            raise FileNotFoundError(f"GGUF not found at {LFM_GGUF}.")

        import subprocess
        import urllib.request

        # adopt an existing healthy server on the port instead of spawning a duplicate
        try:
            with urllib.request.urlopen(f"{LLAMA_API_BASE}/health", timeout=2) as resp:
                if resp.status == 200:
                    print("[lfm] llama-server already running — adopting it", flush=True)
                    eng.update(device="cuda", quantization="q4_k_m", status="ready")
                    return
        except Exception:
            pass

        print(f"[lfm] launching llama-server: {LLAMA_SERVER}", flush=True)
        t0 = time.time()
        _lfm_proc = subprocess.Popen(
            [
                LLAMA_SERVER,
                "-m", str(LFM_GGUF),
                "--host", "127.0.0.1",
                "--port", str(LLAMA_API_PORT),
                "-ngl", "-1",              # all layers on GPU
                "-c", str(eng["context_max"]),
                "--alias", "lfm3-vl",
                "--no-webui",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
        )

        # wait until the model is loaded (llama-server /health returns 200)
        deadline = time.time() + 240
        ready = False
        while time.time() < deadline:
            if _lfm_proc.poll() is not None:
                raise RuntimeError(f"llama-server exited with code {_lfm_proc.returncode}")
            try:
                with urllib.request.urlopen(f"{LLAMA_API_BASE}/health", timeout=2) as resp:
                    if resp.status == 200:
                        ready = True
                        break
            except Exception:  # noqa: BLE001 — still loading
                time.sleep(1.0)
        if not ready:
            raise TimeoutError("llama-server did not become healthy in 240s")

        eng["device"] = "cuda"
        eng["quantization"] = "q4_k_m"
        eng["status"] = "ready"
        print(f"[lfm] ready in {time.time() - t0:.1f}s (api on :{LLAMA_API_PORT})", flush=True)
    except Exception as exc:  # noqa: BLE001
        eng["status"] = "error"
        eng["error"] = str(exc)
        print(f"[lfm] FAILED: {exc}", flush=True)


def run_translation(text: str, source_lang: str, target_lang: str, form: str | None = None) -> str:
    import urllib.request

    eng = state["plamo"]
    if eng["status"] != "ready":
        raise RuntimeError(f"PLaMo model not ready (status={eng['status']})")

    src = (source_lang or "en").lower()
    tgt = (target_lang or "es").lower()
    src = src if src in LANG_CODES else "en"
    tgt = tgt if tgt in LANG_CODES else "es"

    kwargs = {"target_lang": tgt, "source_lang": src}
    if form and tgt == "ja" and form in ("polite", "plain"):
        kwargs["form"] = form

    payload = {
        "model": "plamo3",
        "messages": [{"role": "user", "content": text}],
        "temperature": 0,
        "max_tokens": 512,
        "seed": 0,
        "chat_template_kwargs": kwargs,
    }
    request = urllib.request.Request(
        f"{PLAMO_API_BASE}/v1/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=180) as resp:
        data = json.load(resp)
    content = (((data.get("choices") or [{}])[0].get("message")) or {}).get("content") or ""
    result = content.strip()
    if len(result) >= 2 and result[0] == result[-1] and result[0] in "\"'“”":
        result = result[1:-1].strip()
    return result


def stream_chat(req, messages, preset_key: str):
    """Proxy the request to llama-server (/v1/chat/completions) and re-stream SSE."""
    import urllib.request

    preset = CHAT_PRESETS.get((preset_key or "pro").lower(), CHAT_PRESETS["pro"])

    full_messages = [{"role": "system", "content": STUDENT_SYSTEM_PROMPT}] + messages

    try:
        sse_event(req, {"type": "start", "context_max": state["lfm"]["context_max"]})
    except Exception:  # noqa: BLE001
        pass

    payload = {
        "model": "lfm3-vl",
        "messages": full_messages,
        "temperature": preset["temperature"],
        "max_tokens": preset["max_new_tokens"],
        "repeat_penalty": 1.1,
        "seed": 0,
        "stream": True,
        "stream_options": {"include_usage": True},
        "chat_template_kwargs": {"enable_thinking": bool(preset["thinking"])},
    }
    request = urllib.request.Request(
        f"{LLAMA_API_BASE}/v1/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    acc = ""
    usage = None

    def emit(text: str):
        nonlocal acc
        if text:
            acc += text
            sse_event(req, {"type": "token", "text": text})

    try:
        with urllib.request.urlopen(request, timeout=300) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if chunk.get("usage"):
                    usage = chunk["usage"]
                delta = ((chunk.get("choices") or [{}])[0].get("delta")) or {}
                emit(delta.get("content") or "")   # reasoning_content (thinking) is dropped on purpose
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"llama-server request failed: {exc}") from exc

    prompt_tokens = int(usage["prompt_tokens"]) if usage and usage.get("prompt_tokens") else 0
    completion_tokens = int(usage["completion_tokens"]) if usage and usage.get("completion_tokens") else 0

    return {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
            "context_max": state["lfm"]["context_max"]}


def sse_event(req, payload: dict):
    data = json.dumps(payload, ensure_ascii=False)
    req.wfile.write(f"data: {data}\n\n".encode("utf-8"))
    req.wfile.flush()


# ───────────────────────── HTTP handler ─────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "NovaServer/1.0"

    def _send_json(self, payload: dict, status: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path):
        try:
            data = path.read_bytes()
        except OSError:
            self.send_error(404, "Not found")
            return
        ctype, _ = mimetypes.guess_type(str(path))
        self.send_response(200)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        sys.stderr.write("[http] %s\n" % (fmt % args))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        route = self.path.split("?", 1)[0]

        if route == "/api/health":
            plamo = _report("plamo")
            plamo["model"] = "pfnet/plamo-3-translate-2b-GGUF (Q4_K_M)"
            lfm = _report("lfm")
            lfm["model"] = "LiquidAI/LFM3-VL-2B-GGUF (Q4_K_M)"
            lfm["context_max"] = state["lfm"]["context_max"]
            wh = _report("whisper")
            wh["model"] = "large-v3-turbo (int8)"
            self._send_json({
                "ok": plamo["status"] == "ready" or lfm["status"] == "ready",
                "status": plamo["status"],
                "device": plamo["device"],
                "quantization": plamo["quantization"],
                "vram_mb": plamo["vram_mb"],
                "model": plamo["model"],
                "error": plamo["error"],
                "chat": {
                    "status": lfm["status"],
                    "device": lfm["device"],
                    "quantization": lfm["quantization"],
                    "vram_mb": lfm["vram_mb"],
                    "model": lfm["model"],
                    "context_max": lfm["context_max"],
                    "error": lfm["error"],
                },
                "whisper": wh,
            })
            return

        if route == "/":
            route = "/index.html"
        safe = os.path.normpath(route.lstrip("/")).replace("..", "")
        path = (REPO_ROOT / safe).resolve()
        if REPO_ROOT in path.parents or path == REPO_ROOT:
            if path.is_file():
                self._send_file(path)
                return
        self.send_error(404, "Not found")

    def do_POST(self):
        route = self.path.split("?", 1)[0]
        if route == "/api/transcribe":
            self._handle_transcribe()
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._send_json({"error": "Invalid JSON body"}, 400)
            return

        if route == "/api/translate":
            self._handle_translate(payload)
        elif route == "/api/chat":
            self._handle_chat(payload)
        else:
            self.send_error(404, "Not found")

    def _handle_transcribe(self):
        """POST /api/transcribe — body: raw audio bytes; ?language=<code|auto>."""
        from urllib.parse import urlparse, parse_qs
        import tempfile

        eng = state["whisper"]
        if eng["status"] == "idle":
            # lazy-load on first dictation (~9 s once) — saves ~1.6 GB VRAM when unused
            load_whisper()
        eng = state["whisper"]
        if eng["status"] != "ready":
            status = 503 if eng["status"] == "loading" else 500
            self._send_json(
                {"error": f"Whisper not ready (status={eng['status']})", "detail": eng["error"]},
                status,
            )
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            self._send_json({"error": "Missing audio body"}, 400)
            return
        if length > 50 * 1024 * 1024:
            self._send_json({"error": "Audio too large (50 MB max)"}, 413)
            return

        raw = self.rfile.read(length)
        qs = parse_qs(urlparse(self.path).query)
        lang = (qs.get("language") or ["auto"])[0].lower()
        lang = None if lang == "auto" else lang

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
        try:
            tmp.write(raw)
            tmp.close()
            t0 = time.time()
            with _whisper_lock:
                segments, info = _whisper.transcribe(
                    tmp.name, language=lang, beam_size=5, vad_filter=True
                )
                text = " ".join(seg.text.strip() for seg in segments).strip()
            self._send_json({
                "text": text,
                "language": info.language,
                "language_probability": round(info.language_probability, 2),
                "seconds": round(time.time() - t0, 2),
            })
        except Exception as exc:  # noqa: BLE001
            self._send_json({"error": "Transcription failed", "detail": str(exc)}, 500)
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass

    def _handle_translate(self, payload: dict):
        text = (payload.get("text") or "").strip()
        source_lang = str(payload.get("source_lang") or "en")
        target_lang = str(payload.get("target_lang") or "es")

        if not text:
            self._send_json({"error": "Missing 'text'"}, 400)
            return
        if len(text) > 4000:
            self._send_json({"error": "Text too long (4000 chars max)"}, 400)
            return

        if state["plamo"]["status"] != "ready":
            status = 503 if state["plamo"]["status"] == "loading" else 500
            self._send_json(
                {"error": f"Model not ready (status={state['plamo']['status']})",
                 "detail": state["plamo"]["error"]},
                status,
            )
            return

        form = payload.get("form") or None
        if form not in (None, "polite", "plain"):
            form = None
        try:
            with _plamo_lock:
                t0 = time.time()
                translation = run_translation(text, source_lang, target_lang, form)
            self._send_json({
                "translation": translation,
                "engine": "plamo-3-translate-2b-GGUF (Q4_K_M)",
                "seconds": round(time.time() - t0, 2),
            })
        except Exception as exc:  # noqa: BLE001
            self._send_json({"error": "Generation failed", "detail": str(exc)}, 500)

    def _handle_chat(self, payload: dict):
        messages = payload.get("messages") or []
        if not isinstance(messages, list) or not messages:
            self._send_json({"error": "Missing 'messages'"}, 400)
            return

        clean_messages = []
        for m in messages[-40:]:
            role = str((m or {}).get("role") or "user")
            content = str((m or {}).get("content") or "")
            if role == "assistant":
                role = "assistant"
            elif role not in ("user", "assistant", "system"):
                role = "user"
            if content:
                clean_messages.append({"role": role, "content": content})
        if not clean_messages or clean_messages[-1]["role"] != "user":
            self._send_json({"error": "Last message must be from the user"}, 400)
            return
        if sum(len(m["content"]) for m in clean_messages) > 24000:
            self._send_json({"error": "Conversation too long (24000 chars max)"}, 400)
            return

        if state["lfm"]["status"] != "ready":
            status = 503 if state["lfm"]["status"] in ("loading", "idle") else 500
            self._send_json(
                {"error": f"Chat model not ready (status={state['lfm']['status']})",
                 "detail": state["lfm"]["error"]},
                status,
            )
            return

        # stream SSE back
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        try:
            with _lfm_lock:
                usage = stream_chat(self, clean_messages, str(payload.get("preset") or "pro"))
            sse_event(self, {"type": "done", "usage": usage})
        except Exception as exc:  # noqa: BLE001
            try:
                sse_event(self, {"type": "error", "error": str(exc)})
            except Exception:
                pass


def main():
    import atexit

    def _cleanup():
        global _plamo_proc, _lfm_proc
        if _plamo_proc and _plamo_proc.poll() is None:
            print("[nova] stopping plamo llama-server ...", flush=True)
            _plamo_proc.terminate()
        if _lfm_proc and _lfm_proc.poll() is None:
            print("[nova] stopping llama-server ...", flush=True)
            _lfm_proc.terminate()

    atexit.register(_cleanup)

    # if a healthy instance is already serving this port, adopt it and exit
    # (prevents duplicate models in VRAM when the user launches a second copy)
    try:
        import urllib.request
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=3) as resp:
            if resp.status == 200:
                print(f"[nova] already running on :{PORT} — using the existing instance; exiting.", flush=True)
                return
    except Exception:
        pass

    print(f"[nova] starting on http://{HOST}:{PORT}/ (repo root: {REPO_ROOT})", flush=True)
    threading.Thread(target=load_plamo, daemon=True).start()
    threading.Thread(target=load_lfm, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[nova] shutting down", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
