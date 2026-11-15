# Nova AI backend

Chat runs locally. Start `backend/translator_server.py` with Python 3.10 or
newer, then open the displayed local URL. On Windows x64, the server downloads
a CPU llama.cpp runtime on first use if none is installed; a compatible
`llama-server` on PATH or `NOVA_LLAMA_SERVER` takes precedence. Each chat tier
downloads its weights when first requested. The vision projector is downloaded
when an image is first sent, so text questions don't wait for that file.
Downloads require an internet connection and several GB of free disk space;
Pro and Ultra also require sufficient RAM. The first answer can take much
longer while files download. Models are unloaded when switching tiers or after
five minutes without a completed request. Active generations are not unloaded.
Keep the server running while using the app. This is a local application, so
opening the HTML file alone does not start an AI server.

Set `NOVA_NO_AUTODOWNLOAD=1` to disable automatic downloads. On other platforms,
install a compatible llama.cpp `llama-server` separately. The setup notes below
cover optional GPU, translation and dictation dependencies; they are not needed
for basic Windows CPU chat.

Local AI for the Nova website, on one port (same-origin, no CORS):

| Endpoint | Engine | License |
|---|---|---|
| `POST /api/chat` | **LFM3-VL-2B** — official `Q4_K_M` GGUF via **llama.cpp** (llama-server b12343, all layers GPU, ~1.1 GB) | LFM1.0 (custom, personal/research) |
| `POST /api/translate` | **PLaMo-3-translate-2B (Q4_K_M)** via **llama.cpp**, ~1.1 GB VRAM | PLaMo Community License |
| `POST /api/transcribe` | **Whisper large-v3-turbo (int8)** via faster-whisper — lazy-loaded on first dictation, ~1.6 GB when in use | MIT |
| `GET /api/health` | status of all engines | — |

Without this server, chat cannot generate answers; the translator can use its
limited offline phrasebook.

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

- LFM3-VL-2B can use the `mmproj-LFM3-VL-2B-Q8_0.gguf` vision projector.
  If the optional projector cannot be downloaded, text chat can still start.
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

## FRC knowledge base (RAG)

Nova ships a local retrieval-augmented knowledge base of FRC common knowledge,
built at `data/frc_knowledge.db` (SQLite + FTS5, BM25 ranking) and queryable
from chat. It knows: every recent FRC game (plus the full 1992-2027 list),
The Blue Alliance pages for a curated set of famous/championship teams,
**Team 846 in every year from 2002 to 2026** (identity, year-by-year events,
all-time awards), every FRCDesign.org page (FRC CAD in Onshape — learning
course, design handbook, best practices, mechanism examples), the top-liked
Chief Delphi white papers (swerve kinematics, motor curves, batteries,
scouting, drivetrains) and a Nova-curated FRC common-knowledge guide.

Retrieval is automatic: FRC-flavored questions get the top~4 chunks injected
into the prompt as a system note (cite the URLs), and the planning pass also
armed with a `search_frc_knowledge` tool so models can dig deeper. The exact
token meter accounts for the injected note. Inspect hits directly:

```powershell
Invoke-RestMethod "http://127.0.0.1:8787/api/knowledge/search?q=846%202022&limit=5"
```

Nova also ships a no-key **web search** tool (`web_search`) for the chat models
via DuckDuckGo's HTML endpoints. `focus='frc'` (default) restricts results to
the suggested FRC community sites — `thebluealliance.com`, `frcdesign.org`,
`chiefdelphi.com`, `en.wikipedia.org`, `firstinspires.org`, `docs.wpilib.org` —
and silently falls back to a general web search when the scoped query yields
nothing (or is rate-limited); `focus='general'` searches the whole web.
Category note: unlike `search_frc_knowledge` (fully offline), `web_search`
sends the query text to DuckDuckGo — Nova is local-first, but a web search
does leave the machine. Results are untrusted and may include wrong or
manipulated pages; the model is instructed to cite URLs and say when web
search was unavailable. DuckDuckGo rate-limits aggressively: expect
intermittent empty responses, and the FRC-scoped query may degrade to the
general fallback. There is no API key to configure.

Rebuild or refresh the database (needs internet, no API keys, ~4 minutes):

```powershell
.\.venv-translator\Scripts\python.exe backend\ingest_knowledge.py            # full rebuild
.\.venv-translator\Scripts\python.exe backend\ingest_knowledge.py build_tba # only one source
```

`data/frc_knowledge.db` (~3.8 MB) is self-contained and works offline; add it
to git with your next commit (it is intentionally left out of the tree only if
you prefer to rebuild locally with the ingester instead).
Rerun the ingester to refresh (season data changes through the year). The
`search_frc_knowledge` tool uses only the local database — no network.
Sources are all public web pages; scraping is throttled and polite.

## Team 846 integration (early implementation)

Nova can browse the public Team846 organization through the GitHub REST API. The
server discovers public repositories page by page, including archived projects,
and caches metadata, directory listings, files, and recursive trees in memory.
Metadata expires after 15 minutes; the Refresh button forces a fresh listing.
Directory and file data expire after five minutes. Nothing is cloned or stored
in the project. The explorer filters repository metadata and language. Opening a
file passes its identity to the tutor on the next request. Only UTF-8 text files
up to 200 KB are accepted. No GitHub token is used and private repositories are
not supported; the unauthenticated API is subject to GitHub rate limits.

If the Nova backend is unavailable, the explorer can fetch public repositories
and files directly from GitHub in the browser, including when served by a static
server. Browser network access and GitHub's unauthenticated rate limits still
apply. The AI requires Nova's backend. Links open GitHub's own interface;
GitHub does not permit its full website to be embedded in an iframe.

The local llama-server is sent OpenAI-compatible tool definitions: list and
search repositories, search paths in a repository, and read a file. The model
chooses whether to call them; execution is limited to five rounds and ten calls.
The first file read is sent to the explorer unless the user has manually changed
files since sending the message. Search paths is filename/path search, not full
text search. The model must support llama.cpp tool calling for its specific chat
template; the tool loop and the individual model tiers have not been verified
on a running engine. No automatic source verification is performed on generated
claims. Tool results and source text should be treated as untrusted.

Known missing features: organization-wide full-text search/indexing, automatic
search of every repository tree, syntax highlighting, Markdown rendering in the
explorer, line-range citations, robust file relationships, and verified automatic
cross-repository comparisons. Repo refresh is on request after cache expiry,
not a background scheduled job. There is no private repository authorization.
The UI has an English/Spanish/Simplified Chinese tutor-language selector; model
quality and multilingual behavior have not been tested. A model might fail to
call tools, misinterpret source, or produce an incorrect citation. Do not treat
this implementation as a verified end-to-end integration.

With Python and the models installed as described above, start and test from
PowerShell:

```powershell
Set-Location 'C:\Projects\Veritas Hackathon'
.\.venv-translator\Scripts\python.exe -m unittest discover -s tests -v
.\.venv-translator\Scripts\python.exe backend\translator_server.py
# Open http://127.0.0.1:8787/
```

For initial Python/model installation see the setup section above. The GitHub
integration itself uses only the Python standard library. No credentials are
required. Keep the server bound to localhost: private repository access and
multi-user access controls have not been implemented.
