# Nova — Progress Log

A running record of everything built for Nova, what was verified, and what is
still approximate. Written at the end of the session on **2026-11-13**.

---

## What Nova is

Nova is a dark, warm-"ember" web app for **international students**:

- **Chat** with a local LLM (LFM3-VL-2B) — markdown answers, streaming, simple
  English for learners, context-usage meter on the composer
- **Translator** — **PLaMo-3-translate-2B (W4A16)** for 53 languages, with an
  offline phrasebook fallback, TTS listen buttons, and translation history
- **Past chats** persist in localStorage; all-chats grid with search
- UI languages: **English / Español / Français / Português** (Settings)
- Sidebar docks permanently, toggled by the 3-bars button (`Ctrl+B`)

---

## Timeline

### Phase 1 — First screenshot clone (Nov 13)
- Rebuilt the Gemini screenshot 1:1 locally: `index.html` + `css/style.css` +
  `js/app.js`, dark theme, Manrope, sparkle logo, sidebar with logo/search/
  collapse, "Get app"/"Upgrade" top pills, greeting, composer with model picker
  (Spark/Pro/Ultra), mic/send swap, suggestion chips, grouped recent-chat list
  with date buckets, localStorage persistence, seeded demo chats.
- **Bug found & fixed:** `[hidden]` was being overridden by component
  `display` rules → the (empty) modal rendered on top of the page on load.
  Fix: `[hidden] { display: none !important; }`.
- Seed data sanitized on load (repair duplicate consecutive model messages).

### Phase 2 — De-branding pass (user asked)
- Changed the look so it's **not** Gemini:
  - palette: warm near-black with amber→coral→rose "ember" gradients
    (hashtags `--accent` #ffd166 → #ff8a5c → #ff5d73)
  - typography: **Fraunces** serif for greeting/headings, Inter for UI
  - logo: orbit-planet mark (orb + ring), favicon likewise
  - new-chat button is solid cream (high contrast), suggestions removed
  - headings/pronouns switched away from Gemini silhouette; model names kept
    (Spark / Pro / Ultra) but they are *generation presets*, not a fake vendor
- Sidebar behavior changed: the **3-bars toggles a docked permanent sidebar**
  (content reflows, no overlay, no scrim). `Ctrl/Cmd+B` toggles it too; choice
  persists; hidden by default on small screens.

### Phase 3 — Translator v1 (built for foreign students)
- Added **Translate** view (nav item + home link):
  - 5 languages at first (en/es/fr/pt/de)
  - **Offline phrasebook** of ~45 campus-life phrases (library, dining hall,
    visa, health, emergencies…) + word-by-word dictionary fallback (pivot via
    English), phrasebook matches labelled vs "Word-by-word (approximate) N/N"
  - **All 53 PLaMo languages** later (en↔X, ja↔X fully, other pairs work)
  - Quick-phrase chips, TTS speaker buttons (speechSynthesis, per-language BCP-47),
    copy buttons, swap, char counter, **translation history** (persisted,
    restorable, clearable)
  - Match-quality footer label, toast feedback, drag&drop unrelated
- Settings gained: **App language** (en/es/fr/pt — re-translates the whole UI,
  including greeting/toasts/title), **Simple English mode** (short, easy answers),
  ambient glow toggle, streaming toggle, sound toggle.
- Removed the three suggestion chips per request; chat history untouched.

### Phase 4 — Hy-MT2 episode (replaced later)
- Downloaded Tencent Hy-MT2-1.8B (suspended mid-download when user asked to
  switch) — `backend/download_model.py` deleted, `models/Hy-MT2-1.8B` wiped.
- Wired a transformers+bitsandbytes NF4 path and an engine pill/Auto-Neural-
  Offline segmented control into the translator UI. **That scaffolding
  remained**; the engine changed underneath it (see next phase).

### Phase 5 — PLaMo-3-translate-2B (W4A16) (user's pick)
- User asked for `pfnet/plamo-3-translate-2b-W4A16` + vLLM. Constraints found:
  - No 2B W4A16 in the repo listing initially — later confirmed it *does* exist
    (`pfnet/plamo-3-translate-2b-W4A16`, ~2.3 GB, compressed-tensors pack-quantized int4)
  - **vLLM has no Windows build**; WSL wasn't installed
  - transformers couldn't load their custom arch (needed `numba`, later
    `attention_dropout` mismatch broke their custom code)
  - Resolution: use **transformers + compressed-tensors** loading on the GPU
    instead of vLLM — same weights, works on Windows, ~1.6–2.2 GB VRAM
- Fix highlights:
  - `transformers>=5.6.0`; **cute gotcha: PyPI ships CPU-only torch on Windows**
    → installed `torch==2.14.1+cu126` from the pytorch index (CUDA on the 4050)
  - `compressed-tensors` for pack-quantized int4; measured **~2.2 GB VRAM,
    ~3–5 s per translation**; warm-up inference added at startup to avoid a
    20 s first-call penalty
  - `apply_chat_template` must take **flat kwargs** (`target_lang=…`), NOT a
    nested `chat_template_kwargs={…}` — passing nested raised
    "target_lang is required"
  - transformers 5.x forbids `stop_token_ids=` in `generate()` → use `eos_token_id=[...]`
  - **VRAM "leak" mystery solved:** two translator_server.py instances were
    running (one under `Python311\python.exe`, one under the venv) — both had
    the model loaded → ~6 GB consumed. Killed the stray; duplicate servers are
    now prevented by explicit PID filtering + `atexit` termination of the child
    llama-server

### Phase 6 — 53 languages
- Translator now offers **all 53 PLaMo languages**, grouped in `<optgroup>`s
  (East & Southeast Asia / W., C. & Southern Europe / E. Europe, Baltics &
  Caucasus / Middle East, Central Asia & Africa / South Asia) with autonyms
- `LANG_CODES` on the backend = all 53 lowercase codes
- Note kept in the code + UI: **English↔X and Japanese↔X are the strongest
  pairs**; X↔Y across distant languages degrades gracefully (never errors)

### Phase 7 — LFM3-VL-2B as the chat LLM (user asked for real LLM)
- User picked **Quantized LiquidAI/LFM3-VL-2B**; contextual honesty: it's a
  **vision-language** model used text-only here — fine for chat
- Path taken (after transformers 5.x couldn't load their custom arch —
  `'Lfm3Config' object has no attribute 'attention_dropout'`):
  - **Official `LiquidAI/LFM3-VL-2B-GGUF` Q4_K_M** (1.05 GB), architecture
    `lfm3`, supported in **llama.cpp b12088+**
  - `winget install ggml.llamacpp` → **llama-server b12343** (Python binding
    `llama-cpp-python 0.3.36` was too old: `unknown model architecture: 'lfm3'`;
    binaries path chosen)
  - llama-server runs as a **child process on :8000**, all layers GPU;
    Nova proxies it through `:8787 /api/chat` (SSE) — same port = no CORS pain
  - llama-server needs the CUDA 12.4 runtime DLLs (`cudart64_12.dll`,
    `cublas64_12.dll`, `cublasLt64_12.dll`) next to `llama.dll` — pip
    `nvidia-cuda-runtime-cu12` + `nvidia-cublas-cu12`, copied in
  - **Thinking phase disabled** (`chat_template_kwargs: {enable_thinking:
    false}`) — replies stream visibly, ~5 s for short answers
  - **Fallback preserved:** if llama-server fails/dies, the website silently
    falls back to the built-in offline reply engine (with a toast)
- Verified: streaming markdown answers; `"Explain what an atom is"` → coherent
  2-sentence answer in ~4.7 s; exact `usage` tokens returned

### Phase 8 — Context meter (user asked)
- Composer now always shows **used tokens vs 32,768 (context window)**:
  `123 / 32,768 tokens · 0.4%` with an amber→coral progress bar (red-hot at ≥85%)
- Exact numbers per turn from llama-server `usage` (upstream OpenAI
  `stream_options.include_usage=true`), refreshed live while streaming and
  while typing (estimated ¼ chars)
- Resets on New chat

### Phase 9 — Housekeeping (today)
- `git init`, `.gitignore` (models/, .venv-translator/, cache → never committed)
- `backend/download_lfm.py` now fetches BOTH models (one command)
- `backend/README.md` rewritten (engines, licenses, VRAM, run)
- Deleted unused HF checkpoint `models/LFM3-VL-2B` (~3.85 GB) after llama.cpp pivot

---

## Architecture

```
browser (localhost:3000 or file://)
   │  static files
   ▼
backend/translator_server.py  (:8787)  ── PLaMo W4A16 (:inline, transformers)
   │   · /api/translate      custom jinja chat template, target_lang kwarg
   │   · /api/chat    (SSE)  LFM + strip reasoning, exact usage
   │   · serves the static site
   └─ llama-server (:8000)   ── child process, LFM3-VL-2B-Q4_K_M, GPU
```

- Frontend: vanilla JS, no build step; state in localStorage (`nova.*` keys)
- Chat history: saved locally; nothing leaves the machine except huggingface
  downloads (one-time)
- 53 translation languages; 4 UI languages; all HTML/CSS/JS self-contained

## Verified
- [x] PLaMo translation: en↔es/fr/de/ja/zh-hans, phrasebook + fallback word match
- [x] 53 languages render in grouped `<optgroup>`s; history persists/restores
- [x] Sidebar collapse/expand (docked), scrim gone; 53-lang selects OK
- [x] i18n: English → français end-to-end (greeting, placeholders, title)
- [x] Chat: questions → streamed markdown, actions row (copy/like/regenerate)
- [x] Context meter: `123 / 32,768 tokens · 0.4%` after atom question
- [x] VRAM now healthy: PLaMo ~2.2 GB, LFM ~1.1 GB, total ≈ 3.3 GB / 6 GB
- [x] No console errors on the final build (fresh profile)
- [x] Byte-level integrity of `js/app.js` restored after a PowerShell
      encoding mishap (had to reverse CP1252→UTF-8 round trip; verified clean)

## Known limitations / honest notes
- **Offline chat replies are canned** (keyword/template) — used only when the
  LFM backend is down; said so in the UI toast
- **Offline phrasebook is ~45 corpus phrases + word-by-word** — no match ⇒
  graceful "No offline match", not silence
- **Math in model output renders as plain text** (e.g. `∫`, `√`) — it was a
  prompt/LaTeX concern for the LLM, not a bug per se; LaTeX is out of scope
- **LFM 2B quality is "small-model"** — good enough for study help, not frontier
- **Spark/Pro/Ultra are presets** (temp 0.2 / 0.6 / 0.85), not different models
- **53 languages** ≠ equal quality: ja↔X / en↔X strongest (PFN's training);
  remote pairs (e.g. sw↔et) are rough by design
- **Licenses**: PLaMo = PLaMo Community License (commercial needs free
  PFN registration, < ¥1B/yr rev); LFM = LFM1.0 (personal/research fine);
  HF weights not redistributed — `backend/download_lfm.py` fetches them
- **Seed data**: generic sample chats (no real user data); "Username" only,
  never real names
- **vLLM refuses Windows**; llama.cpp + transformers cover all needs here

## Run it

```powershell
py -3.11 -m venv .venv-translator
.\.venv-translator\Scripts\python.exe -m pip install --upgrade pip
.\.venv-translator\Scripts\python.exe -m pip install --index-url https://download.pytorch.org/whl/cu126 "torch==2.14.1+cu126"
.\.venv-translator\Scripts\python.exe -m pip install "transformers>=5.6.0" accelerate compressed-tensors numba huggingface_hub
winget install --id ggml.llamacpp -e --accept-source-agreements --accept-package-agreements
.\.venv-translator\Scripts\python.exe backend\download_lfm.py
.\.venv-translator\Scripts\python.exe backend\translator_server.py
# then open http://127.0.0.1:8787/  (site + API)
```
