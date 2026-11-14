# Nova — Progress Log

A running record of everything built for Nova, what was verified, and what is
still approximate. Last updated **2026-11-13** (end of session).

---

## What Nova is

Nova is a dark, warm-"ember" web app for **international students**:

- **Chat** with a local LLM (LFM3-VL-2B) — markdown answers, streaming, simple
  English for learners, context-usage meter on the composer
- **Translator** — **PLaMo-3-translate-2B** (Q4_K_M) running **llama.cpp**,
  **53 languages**, offline phrasebook fallback, TTS listen buttons,
  dictation (Whisper), and translation history
- **Voice dictation everywhere** — local **Whisper large-v3-turbo (int8)** in
  both the chat composer and the translator (replaces browser SpeechRecognition)
- **Past chats** persist locally; all-chats grid with search
- UI languages: **English / Español / Français / Português** (Settings)
- Docked, permanent sidebar toggled by the 3-bars (`Ctrl+B`)

---

## Timeline

### Phase 1 — First screenshot clone (Nov 13)
- Rebuilt the Gemini screenshot 1:1 locally: `index.html` + `css/style.css` +
  `js/app.js`, dark theme, Manrope, sparkle logo, sidebar, stocks/`Gemini-y` bits,
  localStorage persistence, seeded demo chats.
- **Bug found & fixed:** `[hidden]` was overridden by component `display`
  rules → empty modal rendered on top of the page on load.
  Fix: `[hidden] { display: none !important; }`.

### Phase 2 — De-branding pass (user asked)
- Palette → warm near-black with amber→coral→rose "ember" gradients
  (`#ffd166 → #ff8a5c → #ff5d73`)
- Typography → **Fraunces** serif for greeting/headings, Inter for UI
- Logo mark → orbit-planet; new-chat button → solid cream
- Suggestions chips removed per user; model names kept as presets
- Docked sidebar replaces popup+scrim sidebar (toolbar 3-bars toggles, state persists)

### Phase 3 — Translator v1 (built for foreign students)
- Added **Translate** view: offline phrasebook (~45 campus-life phrases) +
  word-by-word dictionary fallback; quick-phrase chips; TTS speaker buttons;
  copy/swap/history; engine pill + Auto/Neural/Offline segmented control
- Settings gained: **App language** (en/es/fr/pt — full UI i18n incl. title and
  placeholders) and **Simple English mode** (short easy answers for learners)
- History persisted in localStorage

### Phase 4 — Hy-MT2 episode (replaced later)
- Downloaded Tencent Hy-MT2-1.8B (aborted mid-download when the user asked to
  switch); artifacts deleted.

### Phase 5 — PLaMo-3-translate-2B — W4A16 → GGUF/llama.cpp (final)
- Path analysis: **vLLM has no Windows build**; transformers couldn't load the
  custom architecture (`attention_dropout` mismatch); so PLaMo eventually runs
  as **official `plamo-3-translate-2b-Q4_K_M.gguf`** on **llama.cpp b12343**
  (winget `ggml.llamacpp`), same engine as the chat model — one tech stack
- Fix highlights:
  - PyPI ships **CPU-only torch** on Windows → installed `torch==2.14.1+cu126`
    from the pytorch index (still needed somewhere else? PLaMo no longer uses
    torch — kept for reference/tests; hot path is all llama.cpp)
  - `apply_chat_template` needs **flat kwargs**, not nested
    `chat_template_kwargs={…}`
  - transformers 5.x forbids `stop_token_ids=` in `generate()` — use `eos_token_id`
  - llama-server adopted by the proxy, **not duplicated** (see duplicate-server
    fix below)
- Warm-up inference at startup kills a 15–20 s first-call penalty
- Measured: **~0.5–1 s per translation** after warm-up
- **VRAM: ~1.1 GB** (vs ~2.2 GB under W4A16 transformers)

### Phase 6 — 53 languages (user asked)
- All 53 PLaMo languages in grouped `<optgroup>`s with autonyms
  (East & SE Asia / W., C. & S. Europe / E. Europe, Baltics & Caucasus /
  Middle East, Central Asia & Africa / South Asia)
- Backend validates all 53 lowercase codes
- ja↔X and en↔X highest quality (PFN's training focus); X↔Y works but rough —
  documented for users

### Phase 7 — LFM3-VL-2B chat (registered "quantized" LLM for real chat)
- Official `LiquidAI/LFM3-VL-2B-GGUF`, **Q4_K_M** (~1.05 GB), architecture
  `lfm3` — supported in **llama.cpp b12088+**; winget gave **b12343**
- Python `llama-cpp-python 0.3.36` embeds an older llama.cpp →
  `unknown model architecture: 'lfm3'` → switched to the **standalone
  llama-server.exe** (winget) as a child process, OpenAI-compatible HTTP/SSE
- CUDA 12.4 runtime DLLs installed (`nvidia-cuda-runtime-cu12`,
  `nvidia-cublas-cu12`) and copied next to `llama.dll`
- Chat streams **markdown**, `enable_thinking=false` via
  `chat_template_kwargs`; per-turn **usage** (`prompt_tokens` /
  `completion_tokens` / `context_max`) from `stream_options.include_usage=true`
- Fallback preserved: if llama-server dies, the site silently uses
  built-in offline replies (with a toast)

### Phase 8 — Context meter (user asked)
- Composer always shows **used vs max** tokens, e.g. `123 / 128,000 · 0.1%`
- Exact numbers from llama-server usage; live while streaming and while typing
  (char/4 estimate marked `~`); resets with New chat; bar turns red ≥ 85%

### Phase 9 — Engine toggles reset, VRAM audit (user asked)
- **"How is the GPU load shared?"** — answer: both models stay resident and on
  GPU simultaneously (PLaMo q4_k_m ~1.1 GB + LFM q4_k_m ~1.1 GB), Whisper lazy
- **Duplicate-server bug found & fixed:** Health check was happily reporting
  "ready" off a stale/orphaned llama-server while our actual child had failed
  to bind :8000/:8001 — both were being spawned anyway → each server lived
  twice → ~6 GB consumed. Fix: **adopt an existing healthy server on the port**
  instead of spawning a duplicate; `atexit` terminates the child on clean exit;
  orphan cleanup procedure documented
- **Both llama-servers adopted by the proxy**, killing the overlap
- VRAM now: PLaMo ~1.1 GB + LFM ~1.1 GB + Whisper lazy (~1.7 GB on first use)

### Phase 10 — Japanese politeness toggle (user asked)
- Translator now shows **Polite / 丁寧 · Plain / 普通** toggle, visible only
  when target language is **Japanese** (`target_lang="ja"` precondition in the
  PLaMo template ✓)
- Verified: `"I feel sick"` → polite: `気分が悪いです。` · plain: `気分が悪い。`
- Sent as template kwarg `form=polite|plain`

### Phase 11 — Pro/Ultra presets (user asked)
- **Spark** — `temperature 0.2`, max 320, no thinking, fastest
- **Pro** — `temperature 0.6`, max 700, **thinking enabled**
- **Ultra** — `temperature 0.85`, max 1500, **thinking + full 128K context**
  (`-c 128000` on the chat llama-server; meter reflects it)

### Phase 12 — Whisper locally, for dictation (user asked)
- `faster-whisper` + `large-v3-turbo` (**int8**, ~1.6 GB, 6 GB-friendly),
  downloaded to `models/large-v3-turbo`
- Backend endpoint `POST /api/transcribe` (raw audio bytes, webm/opus → WAV
  accepted, auto-language or per-target-language hint), lazy-loaded on first
  mic tap, 503 while loading
- Frontend: MediaRecorder-based recorder replaces SpeechRecognition in **both**
  the chat composer and the translator source pane; toast shows what it heard
- Whisper handles every PLaMo language except Cebuano (documented)

### Phase 13 — Housekeeping (final)
- Repo initialized with git (first commit `bac2c5b`), `.gitignore` excludes
  multi-GB artifacts (models/, venv, caches)
- Progress log + README rewritten; this file updated continuously

---

## Architecture

```
browser (localhost:3000 or file://)
   │  static files
   ▼
backend/translator_server.py  (:8787)
   ├─ PLaMo GGUF → llama-server subprocess  (:8001)
   ├─ LFM GGUF   → llama-server subprocess  (:8000)
   ├─ whisper    → embedded in-process (lazy, on first mic)
   ├─ /api/translate  /api/chat (SSE)  /api/transcribe  /api/health
   └─ serves the static site
```

- Frontend: vanilla JS, no build; state in localStorage (`nova.*` keys)
- Chat history: saved locally; 53 translation languages; 4 UI languages

## Verified
- [x] PLaMo translation en/es/fr/pt/de↔ any of 53 codes; ja polite vs plain
      (`desu` vs plain-form confirmed)
- [x] 53 languages in 5 `<optgroup>`s; history persists/restores
- [x] i18n en→fr (and back) end-to-end
- [x] Chat streams markdown; actions row; context meter (`123/128,000 ≈ 0.1%`)
- [x] Exact token usage from llama-server (`stream_options.include_usage`)
- [x] VRAM healthy: PLaMo ~1.1 GB + LFM ~1.1 GB (whisper lazy)
- [x] git repo initialized; progress.md current
- [x] `/api/transcribe` end-to-end: Windows TTS → Whisper → text matched
      ("Where is the library"), lazy-loaded on first dictation, ~1.1 s per clip

## Known limitations / honest notes
- **Offline replies** (canned) are only a fallback when the LFM backend dies
- **Offline phrasebook** is approximate; matches are labelled honestly
- Math renders as plain text (no LaTeX)
- LFM 2B = small-model quality; decent for study help, not frontier
- **Whisper** doesn't transcribe Cebuano (the only PLaMo language it lacks);
  Javanese is `jw` in Whisper vs `jv` in PLaMo (users don't see this)
- **PLaMo license**: community license — commercial use needs free PFN
  registration (< ¥1B/yr rev); **LFM1.0** license — personal/research fine
- Seed data is generic; "Username" only, never real names

## Repo status

`git init` → branch `main`, first commit `bac2c5b` (8 files). Several engine
swaps and features followed; all artifacts (models, venv, caches) stay out of
the tree — see `.gitignore`. Run everything with the commands below (or
`backend/README.md`), then `git status` to inspect cleanliness.

## Run it

```powershell
py -3.11 -m venv .venv-translator
.\.venv-translator\Scripts\python.exe -m pip install --upgrade pip
.\.venv-translator\Scripts\python.exe -m pip install --index-url https://download.pytorch.org/whl/cu126 "torch==2.14.1+cu126"
.\.venv-translator\Scripts\python.exe -m pip install "transformers>=5.6.0" accelerate compressed-tensors numba faster-whisper nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"
winget install --id ggml.llamacpp -e --accept-source-agreements --accept-package-agreements
.\.venv-translator\Scripts\python.exe backend\download_lfm.py
.\.venv-translator\Scripts\python.exe backend\translator_server.py
# then open http://127.0.0.1:8787/  (site + API)
```
