# Nova AI backend

Local AI for the Nova website, on one port (same-origin, no CORS):

| Endpoint | Engine | License |
|---|---|---|
| `POST /api/chat` | **LFM3-VL-2B** — official `Q4_K_M` GGUF via **llama.cpp** (llama-server b12343, all layers GPU, ~1.1 GB) | LFM1.0 (custom, personal/research) |
| `POST /api/translate` | **PLaMo-3-translate-2B (Q4_K_M)** via **llama.cpp**, ~1.1 GB VRAM | PLaMo Community License |
| `POST /api/transcribe` | **Whisper large-v3-turbo (int8)** via faster-whisper — lazy-loaded on first dictation, ~1.6 GB when in use | MIT |
| `GET /api/health` | status of all engines | — |

Without this server the site still fully works — the translator falls back to
its offline phrasebook and the chat falls back to built-in offline replies.

## Setup (one time)

Requires **Python 3.11** and an NVIDIA GPU (tested on RTX 4050 Laptop, 6 GB).

```powershell
# from the repo root
py -3.11 -m venv .venv-translator
.\.venv-translator\Scripts\python.exe -m pip install --upgrade pip

# GPU build of torch (CPU-only PyPI wheels do NOT see the GPU)
.\.venv-translator\Scripts\python.exe -m pip install --index-url https://download.pytorch.org/whl/cu126 "torch==2.14.1+cu126"

.\.venv-translator\Scripts\python.exe -m pip install "transformers>=5.6.0" accelerate compressed-tensors numba huggingface_hub

# llama.cpp (b12343) — winget version supports the lfm3 architecture
winget install --id ggml.llamacpp -e --accept-source-agreements --accept-package-agreements --silent
# OR: pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124

# Whisper (dictation): faster-whisper + the int8 large-v3-turbo checkpoint
.\.venv-translator\Scripts\python.exe -m pip install faster-whisper "nvidia-cudnn-cu12==9.*" nvidia-cublas-cu12
python -c "from faster_whisper import download_model; download_model('large-v3-turbo', output_dir='models/large-v3-turbo')"

# Windows-specific (per official guidance): copy CUDA runtime DLLs next to ctranslate2
Copy-Item .\.venv-translator\Lib\site-packages\nvidia\cublas\bin\*.dll .\.venv-translator\Lib\site-packages\ctranslate2\ -Force
Copy-Item .\.venv-translator\Lib\site-packages\nvidia\cudnn\bin\*.dll .\.venv-translator\Lib\site-packages\ctranslate2\ -Force
Copy-Item .\.venv-translator\Lib\site-packages\nvidia\cuda_runtime\bin\*.dll .\.venv-translator\Lib\site-packages\ctranslate2\ -Force

# download the LLM weights (~2.1 GB)
.\.venv-translator\Scripts\python.exe backend\download_lfm.py
```

## Run

```powershell
.\.venv-translator\Scripts\python.exe backend\translator_server.py
```

Then open **http://127.0.0.1:8787/**. The static site AND the API are served
from the same port by this process. It also spawns `llama-server` (port 8000)
as a child process and proxies chat requests to it; when Nova exits, the child
is terminated too.

Environment overrides: `NOVA_HOST`, `NOVA_PORT`, `NOVA_LLAMA_SERVER`
(path to llama-server.exe), `NOVA_LLAMA_PORT` (default 8000).

## Measured on this machine (RTX 4050 Laptop, 6 GB)

- PLaMo Q4_K_M: ~1.1 GB VRAM, **~0.5–1 s** per translation (warm)
- LFM chat: ~4 s for a short answer; exact token usage returned inline for the meter
- Whisper turbo int8: ~1.6 GB VRAM, lazy-loaded on first dictation (~9 s once)
- Both LLMs + Whisper simultaneously: ~3.9 GB VRAM; LLMs only: ~2.2 GB
- Launching a second copy of Nova does **not** double VRAM usage — an already
  healthy instance is detected and the newcomer exits instead of reloading

## Notes

- LFM3-VL-2B is used **text-only** (chat). Image input works through the same
  binary with `llama-mtmd-cli` if you ever want it — the official GGUF repo
  ships `mmproj-LFM3-VL-2B-Q8_0.gguf` for that.
- The GGUF carries the LFM chat template with `enable_thinking` **on** by
  default; the backend passes `chat_template_kwargs:
  {"enable_thinking": false}` for Spark (default) and `true` for Pro/Ultra,
  so the student can choose reasoning vs. speed. Ultra additionally gets the
  full 128K context window (`-c 128000`).
- PLaMo usage is governed by the PLaMo Community License (see LICENSE/en in
  the model repo): free for personal/academic use; commercial use requires a
  free prior registration with Preferred Networks (< ¥1B revenue/yr).
- LFM usage is governed by the LFM1.0 license (see LICENSE in the model repo).
- The llama.cpp child servers bind their own ports (8000 LFM, 8001 PLaMo) and
  are preferred automatically when already running — no duplicate loading,
  no port clashes.
- Do not point `--port` at the same value as `NOVA_PORT` — Nova serves both
  the site and the API on `NOVA_PORT` (default 8787).
- `download_lfm.py` fetches **both** model GGUFs in one command.
