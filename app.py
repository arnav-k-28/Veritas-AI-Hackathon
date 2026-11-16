"""Hugging Face ZeroGPU Space entrypoint for Primer (Spark + Pro + PLaMo).

Exposes:
  * Gradio REST /gradio_api/call/chat      (api_name="chat")
  * Gradio REST /gradio_api/call/translate (api_name="translate")
  * Interactive Gradio demo UI on https://eiki-ai-primer.hf.space
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.error
import urllib.request
import zipfile
from contextlib import contextmanager
from pathlib import Path

import gradio as gr

try:
    import spaces
except ImportError:  # Allow local syntax/unit testing without the HF spaces package
    class _SpacesStub:
        @staticmethod
        def GPU(duration=60):
            def _decorator(fn):
                return fn
            return _decorator
    spaces = _SpacesStub()

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import translator_server as ts  # noqa: E402

RUNTIME_LLAMA_DIR = REPO_ROOT / ".runtime" / "llama"
_BINARY_LOCK = threading.Lock()


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _find_llama_binary() -> Path | None:
    env_bin = os.environ.get("NOVA_LLAMA_SERVER")
    if env_bin and Path(env_bin).is_file():
        return Path(env_bin)
    for candidate in (
        RUNTIME_LLAMA_DIR / "llama-server",
        RUNTIME_LLAMA_DIR / "build" / "bin" / "llama-server",
        Path("/usr/local/bin/llama-server"),
        Path("/usr/bin/llama-server"),
    ):
        if candidate.is_file():
            return candidate
    found_in_runtime = sorted(RUNTIME_LLAMA_DIR.rglob("llama-server")) if RUNTIME_LLAMA_DIR.exists() else []
    if found_in_runtime:
        return found_in_runtime[0]
    which = shutil.which("llama-server")
    return Path(which) if which else None


def _ensure_llama_binary() -> Path:
    existing = _find_llama_binary()
    if existing:
        return existing

    with _BINARY_LOCK:
        existing = _find_llama_binary()
        if existing:
            return existing

        RUNTIME_LLAMA_DIR.mkdir(parents=True, exist_ok=True)
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "Primer-Space/1.0"}
        gh_tok = os.environ.get("GITHUB_TOKEN")
        if gh_tok:
            headers["Authorization"] = f"Bearer {gh_tok}"

        req = urllib.request.Request(
            "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest",
            headers=headers,
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            release = json.load(resp)

        assets = release.get("assets") or []
        ubuntu_assets = [
            a for a in assets
            if isinstance(a, dict)
            and "ubuntu" in (a.get("name") or "").lower()
            and "x64" in (a.get("name") or "").lower()
            and any((a.get("name") or "").lower().endswith(ext) for ext in (".tar.gz", ".tgz", ".zip"))
        ]
        if not ubuntu_assets:
            raise RuntimeError("No Ubuntu x64 llama.cpp release archive found on GitHub.")

        # Prefer CUDA builds when available in the latest release, otherwise standard Ubuntu x64
        cuda_assets = [a for a in ubuntu_assets if "cuda" in a["name"].lower()]
        chosen = (cuda_assets or ubuntu_assets)[0]
        dl_url = chosen["browser_download_url"]
        name = chosen["name"]

        print(f"[space] downloading llama.cpp runtime: {name}", flush=True)
        with tempfile.NamedTemporaryFile(suffix=name, delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            dl_req = urllib.request.Request(dl_url, headers={"User-Agent": "Primer-Space/1.0"})
            with urllib.request.urlopen(dl_req, timeout=600) as r, tmp_path.open("wb") as fh:
                while True:
                    chunk = r.read(1024 * 1024)
                    if not chunk:
                        break
                    fh.write(chunk)

            if name.lower().endswith(".zip"):
                with zipfile.ZipFile(tmp_path) as zf:
                    zf.extractall(RUNTIME_LLAMA_DIR)
            else:
                with tarfile.open(tmp_path, "r:*") as tf:
                    tf.extractall(RUNTIME_LLAMA_DIR)
        finally:
            tmp_path.unlink(missing_ok=True)

        binary = _find_llama_binary()
        if not binary:
            raise RuntimeError("Downloaded llama.cpp archive did not contain llama-server.")
        binary.chmod(0o755)
        return binary


def _resolve_tier_paths(tier: str, need_vision: bool = False) -> tuple[Path, Path | None, int, str]:
    ts.record_download_consent()
    t = (tier or "pro").lower().strip()
    if t == "plamo":
        model_path = ts.resolve_local_plamo_gguf()
        resolved = ts.ensure_model_file(model_path, "plamo")
        return Path(resolved), None, 16384, "plamo3"
    if t == "spark":
        model_path = Path(ts.ensure_model_file(ts.LFM_GGUF, "lfm"))
        mmproj = None
        if need_vision or ts.LFM_MMPROJ.is_file() or ts.LFM_MMPROJ_Q8.is_file():
            candidate = ts.LFM_MMPROJ_Q8 if ts.LFM_MMPROJ_Q8.is_file() else ts.LFM_MMPROJ
            ok = ts.ensure_model_file(candidate, "lfm", optional=True)
            if ok:
                mmproj = Path(ok) if isinstance(ok, Path) else candidate
        return model_path, mmproj, ts.ENGINE_CTX["spark"], "lfm3-vl"

    model_path = Path(ts.ensure_model_file(ts.MIMO_GGUF, "mimo"))
    mmproj = None
    if need_vision or ts.MIMO_MMPROJ.is_file():
        ok = ts.ensure_model_file(ts.MIMO_MMPROJ, "mimo", optional=True)
        if ok:
            mmproj = Path(ok) if isinstance(ok, Path) else ts.MIMO_MMPROJ
    return model_path, mmproj, ts.ENGINE_CTX["pro"], "mimo"


@contextmanager
def _ephemeral_llama_server(model_path: Path, mmproj_path: Path | None, ctx: int, alias: str):
    binary = _ensure_llama_binary()
    env = os.environ.copy()
    lib_dirs = {str(binary.parent), str(RUNTIME_LLAMA_DIR)}
    for p in RUNTIME_LLAMA_DIR.rglob("*.so*"):
        lib_dirs.add(str(p.parent))
    existing_ld = env.get("LD_LIBRARY_PATH", "")
    env["LD_LIBRARY_PATH"] = ":".join([*sorted(lib_dirs), *([existing_ld] if existing_ld else [])])

    def _start(ngl_value: str) -> tuple[subprocess.Popen, int]:
        port = _free_port()
        cmd = [
            str(binary),
            "-m", str(model_path),
            "--host", "127.0.0.1",
            "--port", str(port),
            "-ngl", ngl_value,
            "-c", str(ctx),
            "-fa", "on",
            "-ctk", "q8_0",
            "-ctv", "q8_0",
            "--alias", alias,
            "--jinja",
            "--no-webui",
        ]
        if mmproj_path is not None and mmproj_path.is_file():
            cmd += ["--mmproj", str(mmproj_path)]
        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        deadline = time.time() + 180
        base = f"http://127.0.0.1:{port}"
        while time.time() < deadline:
            if proc.poll() is not None:
                err = (proc.stderr.read() if proc.stderr else b"").decode("utf-8", errors="replace")[-600:]
                raise RuntimeError(f"llama-server exited ({proc.returncode}): {err}")
            try:
                with urllib.request.urlopen(f"{base}/health", timeout=2) as resp:
                    if resp.status == 200:
                        return proc, port
            except Exception:
                time.sleep(0.35)
        ts._terminate_proc(proc)
        raise TimeoutError("llama-server failed health check")

    proc = None
    try:
        try:
            proc, port = _start("-1")
        except Exception:
            proc, port = _start("0")
        yield f"http://127.0.0.1:{port}"
    finally:
        if proc is not None:
            ts._terminate_proc(proc)


def _payload_has_images(payload: dict) -> bool:
    for m in payload.get("messages") or []:
        c = m.get("content") if isinstance(m, dict) else None
        if isinstance(c, list) and any(isinstance(p, dict) and p.get("type") == "image_url" for p in c):
            return True
    return False


@spaces.GPU(duration=120)
def chat_api(tier: str, payload_json: str):
    """OpenAI-compatible proxy inside ZeroGPU for Render (supports streaming & JSON responses)."""
    payload = json.loads(payload_json)
    need_vision = _payload_has_images(payload)
    model_path, mmproj_path, ctx, alias = _resolve_tier_paths(tier, need_vision=need_vision)
    payload = dict(payload)
    payload["model"] = alias
    is_stream = bool(payload.get("stream"))

    with _ephemeral_llama_server(model_path, mmproj_path, ctx, alias) as base_url:
        req = urllib.request.Request(
            f"{base_url}/v1/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        if not is_stream:
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.load(resp)
            yield json.dumps({"result": data, "done": True}, ensure_ascii=False)
            return

        chunks = []
        last_flush = time.monotonic()
        with urllib.request.urlopen(req, timeout=240) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line or not line.startswith("data:"):
                    continue
                body = line[5:].strip()
                if body == "[DONE]":
                    break
                try:
                    chunks.append(json.loads(body))
                except json.JSONDecodeError:
                    continue
                now = time.monotonic()
                if len(chunks) <= 4 or now - last_flush >= 0.08:
                    last_flush = now
                    yield json.dumps({"chunks": chunks, "done": False}, ensure_ascii=False)
        yield json.dumps({"chunks": chunks, "done": True}, ensure_ascii=False)


@spaces.GPU(duration=60)
def translate_api(text: str, source_lang: str = "en", target_lang: str = "es", form: str = "") -> str:
    """PLaMo-3-translate-2B ZeroGPU endpoint returning the translated string."""
    clean_text = (text or "").strip()
    if not clean_text:
        return ""
    model_path, _, ctx, alias = _resolve_tier_paths("plamo", need_vision=False)
    src = (source_lang or "en").lower().strip()
    tgt = (target_lang or "es").lower().strip()
    if tgt == "zh":
        tgt = "zh-hans"
    kwargs = {"source_lang": src, "target_lang": tgt}
    if form in ("polite", "plain") and tgt == "ja":
        kwargs["form"] = form

    payload = {
        "model": alias,
        "messages": [{"role": "user", "content": clean_text}],
        "temperature": 0,
        "max_tokens": 512,
        "seed": 0,
        "chat_template_kwargs": kwargs,
    }
    with _ephemeral_llama_server(model_path, None, ctx, alias) as base_url:
        req = urllib.request.Request(
            f"{base_url}/v1/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.load(resp)
    content = (((data.get("choices") or [{}])[0].get("message")) or {}).get("content") or ""
    result = content.strip()
    if len(result) >= 2 and result[0] == result[-1] and result[0] in "\"'“”":
        result = result[1:-1].strip()
    return result


def ui_chat(user_prompt: str, tier_choice: str) -> str:
    if not (user_prompt or "").strip():
        return ""
    payload = {
        "messages": [{"role": "user", "content": user_prompt.strip()}],
        "temperature": 0.4,
        "max_tokens": 1024,
        "stream": False,
    }
    raw = ""
    for item in chat_api(tier_choice, json.dumps(payload)):
        raw = item
    data = json.loads(raw) if raw else {}
    return ((((data.get("result") or {}).get("choices") or [{}])[0].get("message")) or {}).get("content") or ""


with gr.Blocks(title="Primer · ZeroGPU Inference Backend") as demo:
    gr.Markdown(
        "# Primer — ZeroGPU Model Backend\n"
        "Hosts **Spark** (`LiquidAI/LFM3-VL-2B-GGUF`), **Pro** (`bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF`), "
        "and **PLaMo Translator** (`Eiki-AI/plamo-3-translate-2b-af-q4_k_m`) for the Render web app."
    )
    with gr.Tab("Chat Demo"):
        ui_tier = gr.Radio(["spark", "pro"], value="spark", label="Tier")
        ui_prompt = gr.Textbox(lines=3, label="Prompt", placeholder="Ask an FRC or engineering question…")
        ui_reply = gr.Markdown()
        ui_send = gr.Button("Generate", variant="primary")
        ui_send.click(ui_chat, inputs=[ui_prompt, ui_tier], outputs=ui_reply, api_name=False)

    with gr.Tab("Translator Demo"):
        tr_text = gr.Textbox(lines=3, label="Text to translate", placeholder="Check the 120Ω CAN bus termination")
        with gr.Row():
            tr_src = gr.Dropdown(sorted(ts.LANG_CODES), value="en", label="Source language")
            tr_tgt = gr.Dropdown(sorted(ts.LANG_CODES), value="es", label="Target language")
            tr_form = gr.Dropdown(["", "polite", "plain"], value="", label="Japanese form (optional)")
        tr_out = gr.Textbox(lines=3, label="Translation")
        tr_btn = gr.Button("Translate", variant="primary")
        tr_btn.click(translate_api, inputs=[tr_text, tr_src, tr_tgt, tr_form], outputs=tr_out, api_name="translate")

    # Programmatic streaming JSON endpoint used by backend/translator_server.py on Render
    with gr.Tab("API Bridge", visible=False):
        api_tier = gr.Textbox(value="pro")
        api_payload = gr.Textbox(value="{}")
        api_output = gr.Textbox()
        api_trigger = gr.Button("Run")
        api_trigger.click(chat_api, inputs=[api_tier, api_payload], outputs=api_output, api_name="chat")


if __name__ == "__main__":
    demo.queue().launch()
