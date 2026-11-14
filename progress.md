# Nova — Progress Log

A running record of everything built for Nova, what was verified, and what is
still approximate. Last updated **2026-11-13** (handoff to new agent).

> ## ⚠ HANDOFF NOTE — WHAT IS BROKEN RIGHT NOW (Nov 13, end of session)
> - **Chat replies fell back to the canned offline generator** in a quick browser
>   smoke-test. The frontend's `checkChatHealth()` reads `engines.spark.status = "idle"`
>   at page load (chat engines are lazy-loaded) and resolves to `"unavailable"`,
>   then the send path can take the canned reply branch. The lazy-load path works
>   (send → load → reply) but the gate blocks it. **Fix:** either always queue
>   through the neural path, or decide based on a post-load health probe instead
>   of the cached flag.
> - After the above was removed, sending may work end-to-end but has not been
>   re-verified yet — the last smoke-test happened before that change.
> - **Two server copies were fighting over port :8787 earlier** (and a 502/CORS
>   error set turned up when the user tried to open the app from `localhost:3000`
>   against a crashed backend). `python http.server 3000` is killed; the app
>   must now be used from **http://127.0.0.1:8787** (Nova serves both site and API
>   from the same origin — CORS is not in play when served from the same port).
> - A stale on-disk backup situation existed earlier with duplicated llama-server
>   instances; 4 python processes and 4 llama-servers were found running on dev.
>   Ports should be verified clean after any manual restart.
> - **Do NOT commit or trust any other agent's unverified merges**; both major
>   backend state merges require sanity checks to pass before merging or push.
> - See "Known limitations / honest notes" for the full list.

---

## What Nova is

Nova is a dark, warm-"ember" web app for **international students**:

- **Chat** with a local LLM (three tiers): Spark (LFM3-VL-2B), Pro (MiMo V2.6 Distill 9B), Ultra (Qwen3.6-35B-A3B MoE) — all through Nova's same llama-server
- **Translator** — **PLaMo-3-translate-2B** (Q4_K_M) running **llama.cpp**,
  **53 languages**, offline phrasebook fallback, TTS listen buttons,
  dictation (Whisper), and translation history
- **Voice dictation everywhere** — local **Whisper large-v3-turbo (int8)** in
  both the chat composer and the translator (replaces browser SpeechRecognition)
- **Past chats** persist locally; all-chats grid with search
- UI languages: **English / Español / Français / Português** (Settings)
- Docked, permanent sidebar toggled by the 3-bars (`Ctrl+B`)
- **Context-size + reasoning-tier chooser** in a popover on the Nova brand
  with live VRAM estimates (KV q8_0 / GDN-tiny)
- **Image inputs** in chat are proxied through to the vision-enabled LLMs (mmproj loaded)
- **"Engines" API inside Nova**: for every tier, `/api/engines/restart` lets the
  UI reboot a single engine with a new context size on the fly.

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

### Phase 14 — Tier upgrade: Pro (MiMo 9B) + Ultra (Qwen3.6-A3B), vision everywhere, hover Nova menu — IN PROGRESS (2026-11-13)

**User ask:** add a Pro tier with MiMo-V2.6-Distill-Qwen-9B (llama.cpp + Flash Attention + quantized KV cache), hover/tap on the Nova brand opens a menu to pick reasoning on/off + context size with VRAM estimates, image support in chat, and Ultra tier with Qwen3.6-35B-A3B at Q3 quant.

**Findings (HF API, 2026-11-13):**
- MiMo-V2.6-Distill-Qwen-9B: 9.4B params, VL (qwen3_5 arch with mmproj), MIT license. Source: `bartowski/...` (972k downloads) — Q4_K_M (~5.6 GB) + f16 mmproj (876 MB). Hybrid GDN + full-attention (8 of 32 full layers, 4 KV heads, head_dim 256) → tiny KV: ~17 KB/token at q8_0 → 16K ≈ 272 MB.
- Qwen3.6-35B-A3B: 35.9B total (3B active MoE, 256 experts/8 active), VL (qwen3_5_moe), Apache-2.0. Source: `unsloth/...` (1.67 M downloads) — **UD-Q3_K_M** (~15.8 GB; fits 32 GB RAM with ~12–14 layers on GPU) + f16 mmproj (858 MB). Same GDN hybrid — 10 full-attention layers of 40 (2 KV heads) → ~11 KB/token at q8_0 → 32K ≈ 360 MB.
- PLaMo translator also moved to llama.cpp (~1.7 GB, ~0.5–1.0 s/sentence vs ~4–7 s before) — ~4.5 GB VRAM freed. One engine per tier: Spark 8000 · PLaMo 8001 · MiMo 8002 · Qwen 8003.

**Implementation:** backend registers the two new engines (mmproj + flash attention + q8_0 KV, ngl split) with per-tier sampling, `/api/engines/restart`, `tier` routing from `preset`, vision parts proxying (OpenAI format), health payload exposes all engines with context; frontend Spark/Pro/Ultra identities (LFM3-VL-2B / MiMo-V2.6 / Qwen3.6), hover popover (Reasoning on/off + context 4K–64K with VRAM estimates, live engine status/tag), images in bubbles with lightbox, context meter reads per-tier.

**Verification pending:** cold-boot engines, popover behavior, image round trip, `/api/engines/restart`, full health + VRAM check. To be updated as tasks complete.

---

## Architecture

```
browser (http://127.0.0.1:8787 ← the only supported origin; no CORS issues)
   │  static files
   ▼
backend/translator_server.py  (:8787)
   ├─ PLaMo GGUF  → llama-server subprocess  (:8001)
   ├─ LFM GGUF    → llama-server subprocess  (:8000)  (lazy)
   ├─ MiMo GGUF   → llama-server subprocess  (:8002)  (lazy, mmproj attached)
   ├─ Qwen GGUF   → llama-server subprocess  (:8003)  (lazy, mmproj attached)
   ├─ whisper     → embedded in-process (lazy, on first mic)
   ├─ /api/translate  /api/chat (SSE)  /api/transcribe  /api/health
   ├─ /api/engines/restart   — reboot one chat tier with a new context size
   └─ serves the static site
```

- Frontend: vanilla JS, no build; state in localStorage (`nova.*` keys)
- Chat history: saved locally; 53 translation languages; 4 UI languages
- `/api/health` exposes per-tier `engines.spark|pro|ultra` health + context

## Verified
- [x] PLaMo translation en/es/fr/pt/de↔ any of 53 codes; ja polite vs plain
      (`desu` vs plain-form confirmed)
- [x] 53 languages in 5 `<optgroup>`s; history persists/restores
- [x] i18n en→fr (and back) end-to-end
- [x] Hover popover opens on Nova brand; Reasoning Off/On works (Spark/Pro/Ultra)
- [x] Context size options render per tier with VRAM estimates (q8_0 KV + GDN)
- [x] Image path exists in the UI (bubble thumbnails; base64 through to llama.cpp mmproj)

## Not yet verified / suspected broken
- Chat path (Spark → LFM): the frontend's gate for the canned offline output
  uses a *stale* health check cached at page-load (engines.spark.status="idle"
  → treated as unavailable → offline generator fires). Regen to re-test.
- Pro/Ultra first use: **very large cold load**; LFM boot ~6 s, MiMo ~30–60 s,
  Qwen ~60–120 s (reads ~15 GB into ~32 GB RAM). Whisper/PLaMo must not coexist
  with Qwen if VRAM gets tight — measure before demo.
- The `/api/engines/restart` path is untested end-to-end (re-spawn *and* health).
- `/api/health` returns `502 Bad Gateway` if the single instant-serve port is mid-reload; proceed with one fresh launch and avoid double-spawned servers.

## Licenses / practical notes for the next agent
- **PLaMo** — PLaMo Community License (not for commercial use without free PFN registration).
- **LFM3-VL-2B** — LFM1.0; **MimoV2.6-Distill-Qwen-9B** — MIT; **Qwen3.6-35B-A3B** — Apache-2.0.
- **Whisper** — MIT.
- LFM2/MoE checkpoint — expect 0.4 s–5 s per response depending on the tier; CPU-only for Qwen is expected ~2–5 tok/s at Q3_K_M.

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
