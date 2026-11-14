"""
Nova server — local AI backend for the Nova website.

Serves three things on the same port:
  * the static Nova website (repo root)
  * POST /api/translate  — PLaMo-3-translate-2B (W4A16) neural translation
  * POST /api/chat       — LFM3-VL-2B (Q4_K_M GGUF via embedded llama.cpp) chat LLM, streamed (SSE)

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
PLAMO_DIR = REPO_ROOT / "models" / "plamo-3-translate-2b-W4A16"
LFM_GGUF = REPO_ROOT / "models" / "LFM3-VL-2B-GGUF" / "LFM3-VL-2B-Q4_K_M.gguf"
_DEFAULT_LLAMA_SERVER = r"C:\Users\anicf\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe"
LLAMA_SERVER = os.environ.get("NOVA_LLAMA_SERVER", _DEFAULT_LLAMA_SERVER if os.path.exists(_DEFAULT_LLAMA_SERVER) else "llama-server")
LLAMA_API_PORT = int(os.environ.get("NOVA_LLAMA_PORT", "8000"))
LLAMA_API_BASE = f"http://127.0.0.1:{LLAMA_API_PORT}"
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
    "spark": {"temperature": 0.2, "max_new_tokens": 320},
    "pro":   {"temperature": 0.6, "max_new_tokens": 700},
    "ultra": {"temperature": 0.85, "max_new_tokens": 1100},
}

# ───────────────────────── engine state ─────────────────────────
state = {
    "plamo": {"status": "loading", "device": None, "quantization": None, "error": None, "vram_mb": None},
    "lfm":   {"status": "idle",    "device": None, "quantization": "q4_k_m", "error": None, "vram_mb": None, "context_max": 32768},
}
_plamo_lock = threading.Lock()     # serialize generation / memory access
_lfm_lock = threading.Lock()
_plamo_tokenizer = None
_plamo_model = None
_plamo_stop_ids = []
_lfm_proc = None        # subprocess: llama-server (child of this process)


def _report(engine: str) -> dict:
    return {
        "status": state[engine]["status"],
        "device": state[engine]["device"],
        "quantization": state[engine]["quantization"],
        "vram_mb": state[engine]["vram_mb"],
        "error": state[engine]["error"],
    }


def load_plamo():
    """PLaMo-3-translate-2B (W4A16) — loads at startup."""
    global _plamo_tokenizer, _plamo_model, _plamo_stop_ids
    eng = state["plamo"]
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        if not (PLAMO_DIR / "config.json").exists():
            raise FileNotFoundError(f"Model not found at {PLAMO_DIR}. Run backend/download_model.py first.")

        use_cuda = torch.cuda.is_available()
        print("[plamo] loading tokenizer ...", flush=True)
        _plamo_tokenizer = AutoTokenizer.from_pretrained(str(PLAMO_DIR), trust_remote_code=True)
        if _plamo_tokenizer.pad_token is None:
            _plamo_tokenizer.pad_token = _plamo_tokenizer.eos_token
        _plamo_stop_ids = [
            _plamo_tokenizer.convert_tokens_to_ids(tok)
            for tok in ("<|plamo:tag|>", "<|plamo:bos|>")
        ]
        eos_id = _plamo_tokenizer.eos_token_id
        if eos_id is not None:
            _plamo_stop_ids.append(int(eos_id))

        print(f"[plamo] loading model (W4A16, device={'cuda' if use_cuda else 'cpu'}) ...", flush=True)
        t0 = time.time()
        _plamo_model = AutoModelForCausalLM.from_pretrained(
            str(PLAMO_DIR),
            dtype=torch.bfloat16,
            device_map="cuda:0" if use_cuda else "cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        _plamo_model.eval()
        eng["device"] = "cuda" if use_cuda else "cpu"
        eng["quantization"] = "w4a16"
        if use_cuda:
            eng["vram_mb"] = int(torch.cuda.memory_allocated() / (1024 * 1024))
        print(f"[plamo] ready in {time.time() - t0:.1f}s", flush=True)
        eng["status"] = "ready"

        try:  # warm-up so the first user request isn't penalized
            t_warm = time.time()
            run_translation("Hello", "en", "es")
            print(f"[plamo] warm-up done in {time.time() - t_warm:.1f}s", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[plamo] warm-up failed: {exc}", flush=True)
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


def run_translation(text: str, source_lang: str, target_lang: str) -> str:
    import torch

    src = (source_lang or "en").lower()
    tgt = (target_lang or "es").lower()
    src = src if src in LANG_CODES else "en"
    tgt = tgt if tgt in LANG_CODES else "es"

    messages = [{"role": "user", "content": text}]
    device = next(_plamo_model.parameters()).device
    inputs = _plamo_tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        target_lang=tgt,
        source_lang=src,
        return_tensors="pt",
        return_dict=True,
    ).to(device)

    with torch.inference_mode():
        outputs = _plamo_model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=False,
            repetition_penalty=1.0,
            pad_token_id=_plamo_tokenizer.pad_token_id,
            eos_token_id=_plamo_stop_ids,
        )
    new_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
    result = _plamo_tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
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
        "chat_template_kwargs": {"enable_thinking": False},
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
            plamo["model"] = "pfnet/plamo-3-translate-2b-W4A16"
            lfm = _report("lfm")
            lfm["model"] = "LiquidAI/LFM3-VL-2B-GGUF (Q4_K_M)"
            lfm["context_max"] = state["lfm"]["context_max"]
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

        try:
            with _plamo_lock:
                t0 = time.time()
                translation = run_translation(text, source_lang, target_lang)
            self._send_json({
                "translation": translation,
                "engine": "plamo-3-translate-2b-W4A16",
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
        global _lfm_proc
        if _lfm_proc and _lfm_proc.poll() is None:
            print("[nova] stopping llama-server ...", flush=True)
            _lfm_proc.terminate()

    atexit.register(_cleanup)
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
