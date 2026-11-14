# Nova AI backend

Local AI for the Nova website, on one port (same-origin, no CORS):

| Endpoint | Engine | License |
|---|---|---|
| `POST /api/chat` | **LFM3-VL-2B** — official `Q4_K_M` GGUF via **llama.cpp** (llama-server b12343, all layers GPU, ~1.1 GB) | LFM1.0 (custom, personal/research) |
| `POST /api/translate` | **PLaMo-3-translate-2B (W4A16)** via transformers + compressed-tensors, ~1.6 GB VRAM | PLaMo Community License |
| `GET /api/health` | status of both engines | — |

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

# download the weights (~3.3 GB total)
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

- PLaMo W4A16: ~2.2 GB VRAM, ~4 s per translation after a one-time warm-up
- LFM chat: ~4 s for a short answer; exact token usage returned in the `done`
  event (`usage`), rendered live in the context meter
- Total with both engines loaded: ~3.3 GB VRAM

## Notes

- LFM3-VL-2B is used **text-only** (chat). Image input works through the same
  binary with `llama-mtmd-cli` if you ever want it — the official GGUF repo
  ships `mmproj-LFM3-VL-2B-Q8_0.gguf` for that.
- The GGUF carries the LFM chat template with `enable_thinking` **on** by
  default; the backend passes `chat_template_kwargs:
  {"enable_thinking": false}` so the student gets the answer directly instead
  of a long hidden reasoning block.
- PLaMo usage is governed by the PLaMo Community License (see LICENSE/en in
  the model repo): free for personal/academic use; commercial use requires a
  free prior registration with Preferred Networks (< ¥1B revenue/yr).
- LFM usage is governed by the LFM1.0 license (see LICENSE in the model repo).
- The old `download_lfm.py` name kept — now it fetches BOTH models.
