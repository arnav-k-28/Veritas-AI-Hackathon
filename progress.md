# Nova — Progress Log

A running record of everything built for Nova, what was verified, and what is
still approximate. Last updated **2026-11-15** (Phase 29 — web search + final RAG rebuild).

> ## ΓÜá HANDOFF NOTE ΓÇö WHAT IS BROKEN RIGHT NOW (Nov 13, end of session)
> - **Chat replies fell back to the canned offline generator** in a quick browser
>   smoke-test. The frontend's `checkChatHealth()` reads `engines.spark.status = "idle"`
>   at page load (chat engines are lazy-loaded) and resolves to `"unavailable"`,
>   then the send path can take the canned reply branch. The lazy-load path works
>   (send ΓåÆ load ΓåÆ reply) but the gate blocks it. **Fix:** either always queue
>   through the neural path, or decide based on a post-load health probe instead
>   of the cached flag.
> - After the above was removed, sending may work end-to-end but has not been
>   re-verified yet ΓÇö the last smoke-test happened before that change.
> - **Two server copies were fighting over port :8787 earlier** (and a 502/CORS
>   error set turned up when the user tried to open the app from `localhost:3000`
>   against a crashed backend). `python http.server 3000` is killed; the app
>   must now be used from **http://127.0.0.1:8787** (Nova serves both site and API
>   from the same origin ΓÇö CORS is not in play when served from the same port).
> - A stale on-disk backup situation existed earlier with duplicated llama-server
>   instances; 4 python processes and 4 llama-servers were found running on dev.
>   Ports should be verified clean after any manual restart.
> - **Do NOT commit or trust any other agent's unverified merges**; both major
>   backend state merges require sanity checks to pass before merging or push.
> - See "Known limitations / honest notes" for the full list.

---

## What Nova is

Nova is a dark, warm-"ember" web app for **international students**:

- **Chat** with a local LLM (three tiers): Spark (LFM3-VL-2B), Pro (MiMo V2.6 Distill 9B), Ultra (Qwen3.6-35B-A3B MoE) ΓÇö all through Nova's same llama-server
- **Translator** ΓÇö **PLaMo-3-translate-2B** (Q4_K_M) running **llama.cpp**,
  **53 languages**, offline phrasebook fallback, TTS listen buttons,
  dictation (Whisper), and translation history
- **Voice dictation everywhere** ΓÇö local **Whisper large-v3-turbo (int8)** in
  both the chat composer and the translator (replaces browser SpeechRecognition)
- **Past chats** persist locally; all-chats grid with search
- UI languages: **English / Espa├▒ol / Fran├ºais / Portugu├¬s** (Settings)
- Docked, permanent sidebar toggled by the 3-bars (`Ctrl+B`)
- **Context-size + reasoning-tier chooser** lives in the composer model picker
  (Spark / Pro / Ultra + Reasoning Off/On + context window with VRAM estimates, KV q8_0)
- **Image inputs** in chat are proxied through to the vision-enabled LLMs (mmproj loaded)
- **"Engines" API inside Nova**: for every tier, `/api/engines/restart` lets the
  UI reboot a single engine with a new context size on the fly.
- **Team 846 GitHub explorer + tutor tools**: read-only browser of the org's
  public repos (opened from the sidebar), and 4 LLM tools (`list/search_repositories`,
  `search_paths`, `read_file`) that let the chat tutor answer with verified
  Team846 sources and open the referenced file in the explorer.
---

## Timeline

### Phase 1 ΓÇö First screenshot clone (Nov 13)
- Rebuilt the Gemini screenshot 1:1 locally: `index.html` + `css/style.css` +
  `js/app.js`, dark theme, Manrope, sparkle logo, sidebar, stocks/`Gemini-y` bits,
  localStorage persistence, seeded demo chats.
- **Bug found & fixed:** `[hidden]` was overridden by component `display`
  rules ΓåÆ empty modal rendered on top of the page on load.
  Fix: `[hidden] { display: none !important; }`.

### Phase 2 ΓÇö De-branding pass (user asked)
- Palette ΓåÆ warm near-black with amberΓåÆcoralΓåÆrose "ember" gradients
  (`#ffd166 ΓåÆ #ff8a5c ΓåÆ #ff5d73`)
- Typography ΓåÆ **Fraunces** serif for greeting/headings, Inter for UI
- Logo mark ΓåÆ orbit-planet; new-chat button ΓåÆ solid cream
- Suggestions chips removed per user; model names kept as presets
- Docked sidebar replaces popup+scrim sidebar (toolbar 3-bars toggles, state persists)

### Phase 3 ΓÇö Translator v1 (built for foreign students)
- Added **Translate** view: offline phrasebook (~45 campus-life phrases) +
  word-by-word dictionary fallback; quick-phrase chips; TTS speaker buttons;
  copy/swap/history; engine pill + Auto/Neural/Offline segmented control
- Settings gained: **App language** (en/es/fr/pt ΓÇö full UI i18n incl. title and
  placeholders) and **Simple English mode** (short easy answers for learners)
- History persisted in localStorage

### Phase 4 ΓÇö Hy-MT2 episode (replaced later)
- Downloaded Tencent Hy-MT2-1.8B (aborted mid-download when the user asked to
  switch); artifacts deleted.

### Phase 5 ΓÇö PLaMo-3-translate-2B ΓÇö W4A16 ΓåÆ GGUF/llama.cpp (final)
- Path analysis: **vLLM has no Windows build**; transformers couldn't load the
  custom architecture (`attention_dropout` mismatch); so PLaMo eventually runs
  as **official `plamo-3-translate-2b-Q4_K_M.gguf`** on **llama.cpp b12343**
  (winget `ggml.llamacpp`), same engine as the chat model ΓÇö one tech stack
- Fix highlights:
  - PyPI ships **CPU-only torch** on Windows ΓåÆ installed `torch==2.14.1+cu126`
    from the pytorch index (still needed somewhere else? PLaMo no longer uses
    torch ΓÇö kept for reference/tests; hot path is all llama.cpp)
  - `apply_chat_template` needs **flat kwargs**, not nested
    `chat_template_kwargs={ΓÇª}`
  - transformers 5.x forbids `stop_token_ids=` in `generate()` ΓÇö use `eos_token_id`
  - llama-server adopted by the proxy, **not duplicated** (see duplicate-server
    fix below)
- Warm-up inference at startup kills a 15ΓÇô20 s first-call penalty
- Measured: **~0.5ΓÇô1 s per translation** after warm-up
- **VRAM: ~1.1 GB** (vs ~2.2 GB under W4A16 transformers)

### Phase 6 ΓÇö 53 languages (user asked)
- All 53 PLaMo languages in grouped `<optgroup>`s with autonyms
  (East & SE Asia / W., C. & S. Europe / E. Europe, Baltics & Caucasus /
  Middle East, Central Asia & Africa / South Asia)
- Backend validates all 53 lowercase codes
- jaΓåöX and enΓåöX highest quality (PFN's training focus); XΓåöY works but rough ΓÇö
  documented for users

### Phase 7 ΓÇö LFM3-VL-2B chat (registered "quantized" LLM for real chat)
- Official `LiquidAI/LFM3-VL-2B-GGUF`, **Q4_K_M** (~1.05 GB), architecture
  `lfm3` ΓÇö supported in **llama.cpp b12088+**; winget gave **b12343**
- Python `llama-cpp-python 0.3.36` embeds an older llama.cpp ΓåÆ
  `unknown model architecture: 'lfm3'` ΓåÆ switched to the **standalone
  llama-server.exe** (winget) as a child process, OpenAI-compatible HTTP/SSE
- CUDA 12.4 runtime DLLs installed (`nvidia-cuda-runtime-cu12`,
  `nvidia-cublas-cu12`) and copied next to `llama.dll`
- Chat streams **markdown**, `enable_thinking=false` via
  `chat_template_kwargs`; per-turn **usage** (`prompt_tokens` /
  `completion_tokens` / `context_max`) from `stream_options.include_usage=true`
- Fallback preserved: if llama-server dies, the site silently uses
  built-in offline replies (with a toast)

### Phase 8 ΓÇö Context meter (user asked)
- Composer always shows **used vs max** tokens, e.g. `123 / 128,000 ┬╖ 0.1%`
- Exact numbers from llama-server usage; live while streaming and while typing
  (char/4 estimate marked `~`); resets with New chat; bar turns red ΓëÑ 85%

### Phase 9 ΓÇö Engine toggles reset, VRAM audit (user asked)
- **"How is the GPU load shared?"** ΓÇö answer: both models stay resident and on
  GPU simultaneously (PLaMo q4_k_m ~1.1 GB + LFM q4_k_m ~1.1 GB), Whisper lazy
- **Duplicate-server bug found & fixed:** Health check was happily reporting
  "ready" off a stale/orphaned llama-server while our actual child had failed
  to bind :8000/:8001 ΓÇö both were being spawned anyway ΓåÆ each server lived
  twice ΓåÆ ~6 GB consumed. Fix: **adopt an existing healthy server on the port**
  instead of spawning a duplicate; `atexit` terminates the child on clean exit;
  orphan cleanup procedure documented
- **Both llama-servers adopted by the proxy**, killing the overlap
- VRAM now: PLaMo ~1.1 GB + LFM ~1.1 GB + Whisper lazy (~1.7 GB on first use)

### Phase 10 ΓÇö Japanese politeness toggle (user asked)
- Translator now shows **Polite / Σ╕üσ»º ┬╖ Plain / µÖ«ΘÇÜ** toggle, visible only
  when target language is **Japanese** (`target_lang="ja"` precondition in the
  PLaMo template Γ£ô)
- Verified: `"I feel sick"` ΓåÆ polite: `µ░ùσêåπüîµé¬πüäπüºπüÖπÇé` ┬╖ plain: `µ░ùσêåπüîµé¬πüäπÇé`
- Sent as template kwarg `form=polite|plain`

### Phase 11 ΓÇö Pro/Ultra presets (user asked)
- **Spark** ΓÇö `temperature 0.2`, max 320, no thinking, fastest
- **Pro** ΓÇö `temperature 0.6`, max 700, **thinking enabled**
- **Ultra** ΓÇö `temperature 0.85`, max 1500, **thinking + full 128K context**
  (`-c 128000` on the chat llama-server; meter reflects it)

### Phase 12 ΓÇö Whisper locally, for dictation (user asked)
- `faster-whisper` + `large-v3-turbo` (**int8**, ~1.6 GB, 6 GB-friendly),
  downloaded to `models/large-v3-turbo`
- Backend endpoint `POST /api/transcribe` (raw audio bytes, webm/opus ΓåÆ WAV
  accepted, auto-language or per-target-language hint), lazy-loaded on first
  mic tap, 503 while loading
- Frontend: MediaRecorder-based recorder replaces SpeechRecognition in **both**
  the chat composer and the translator source pane; toast shows what it heard
- Whisper handles every PLaMo language except Cebuano (documented)

### Phase 13 ΓÇö Housekeeping (final)
- Repo initialized with git (first commit `bac2c5b`), `.gitignore` excludes
  multi-GB artifacts (models/, venv, caches)
- Progress log + README rewritten; this file updated continuously

### Phase 14 ΓÇö Tier upgrade: Pro (MiMo 9B) + Ultra (Qwen3.6-A3B), vision everywhere, hover Nova menu ΓÇö IN PROGRESS (2026-11-13)

**User ask:** add a Pro tier with MiMo-V2.6-Distill-Qwen-9B (llama.cpp + Flash Attention + quantized KV cache), hover/tap on the Nova brand opens a menu to pick reasoning on/off + context size with VRAM estimates, image support in chat, and Ultra tier with Qwen3.6-35B-A3B at Q3 quant.

**Findings (HF API, 2026-11-13):**
- MiMo-V2.6-Distill-Qwen-9B: 9.4B params, VL (qwen3_5 arch with mmproj), MIT license. Source: `bartowski/...` (972k downloads) ΓÇö Q4_K_M (~5.6 GB) + f16 mmproj (876 MB). Hybrid GDN + full-attention (8 of 32 full layers, 4 KV heads, head_dim 256) ΓåÆ tiny KV: ~17 KB/token at q8_0 ΓåÆ 16K Γëê 272 MB.
- Qwen3.6-35B-A3B: 35.9B total (3B active MoE, 256 experts/8 active), VL (qwen3_5_moe), Apache-2.0. Source: `unsloth/...` (1.67 M downloads) ΓÇö **UD-Q3_K_M** (~15.8 GB; fits 32 GB RAM with ~12ΓÇô14 layers on GPU) + f16 mmproj (858 MB). Same GDN hybrid ΓÇö 10 full-attention layers of 40 (2 KV heads) ΓåÆ ~11 KB/token at q8_0 ΓåÆ 32K Γëê 360 MB.
- PLaMo translator also moved to llama.cpp (~1.7 GB, ~0.5ΓÇô1.0 s/sentence vs ~4ΓÇô7 s before) ΓÇö ~4.5 GB VRAM freed. One engine per tier: Spark 8000 ┬╖ PLaMo 8001 ┬╖ MiMo 8002 ┬╖ Qwen 8003.

**Implementation:** backend registers the two new engines (mmproj + flash attention + q8_0 KV, ngl split) with per-tier sampling, `/api/engines/restart`, `tier` routing from `preset`, vision parts proxying (OpenAI format), health payload exposes all engines with context; frontend Spark/Pro/Ultra identities (LFM3-VL-2B / MiMo-V2.6 / Qwen3.6), hover popover (Reasoning on/off + context 4KΓÇô64K with VRAM estimates, live engine status/tag), images in bubbles with lightbox, context meter reads per-tier.

**Verification pending:** cold-boot engines, popover behavior, image round trip, `/api/engines/restart`, full health + VRAM check. To be updated as tasks complete.

### Phase 15 — GitHub tooling review (model ↔ tools), Spark rescue — DONE (2026-11-14)

Reviewed the new Team846 GitHub integration (read-only explorer + 4 LLM tools
wired into chat via llama-server OpenAI-compatible API). User confirmed the LFM
model quant is **Q4_K_M** (not Q8); Spark weakness is expected for a 2B model.

**On-device verification (this session):**
- All 8 unit tests pass (3 new: zero-score filtering, read_file truncation, GITHUB_TOKEN auth header).
- **MiMo (Pro)** chained `search_repositories → search_paths × 4` sensibly on live
  GitHub data; tool errors (nonexistent repo) were tolerated and fed back as data.
- **Spark** now boots (~10 s incl. lazy load) and streams end-to-end with real
  usage accounting (197 prompt / 9 completion on a smoke question).
- The GitHub machine quota (60/hr unauthenticated) was exhausted by testing — set
  `GITHUB_TOKEN` to lift the cap; `/rate_limit` confirmed 0 remaining.

**Bugs found & fixed:**
1. **Root-cause Spark failure** — `deadline = time.time() + 900 if name == "qwen" else 240`
   parses as `time.time() + (900 if …) else 240`, so Spark/Pro got a deadline of **240
   seconds since the epoch** → instant `RuntimeError → "did not become healthy in time"`.
   This is why Spark could never load. Fixed: `time.time() + (900 if qwen else 240)`.
2. **LFM mmproj missing** (vision + unconditional `--mmproj` flag → llama-server exit 1).
   Downloaded `mmproj-LFM3-VL-2B-F16.gguf`; `download_lfm.py` now fetches it;
   `launch_engine()` validates the mmproj up front with a clear error.
3. `search_repositories` returned 30 results even on zero matches → now drops
   score-0 hits (name 3× / topics 2× / description+lang 1× weighting) and returns
   `{results: [], note: …}` when nothing matches.
4. `read_file` tool truncated at 16 000 chars (blows small contexts) → 6 000 chars +
   `truncated` / `total_lines` flags.
5. `search_paths` ranks exact-filename hits first and reports `total`.
6. GitHub API cache was unbounded → capped at 256 entries, oldest-first eviction;
   optional `GITHUB_TOKEN` env enables 5,000 req/hr.
7. Tool path failure was fatal to the whole reply → now degrades to a plain answer
   (SSE `note` → frontend toast: "GitHub lookup was unavailable…").
8. Tool-limit overflow raised `RuntimeError` → now executes up to the budget and stops.
9. Context meter showed ~0 on direct (no-tool) answers → planning-pass token usage is
   summed into the `done` SSE usage.
10. Tool outputs could exceed Pro's 16K ctx → `_compact_tool_outputs()` trims older tool
    messages to 800 chars before the final pass.
11. Every message paid a full planning round-trip → `_GITHUB_INTENT` pre-filter: ordinary
    questions stream directly; only Team846-flavored questions get tools.
12. Selected-file injection capped at 6 000 chars with `content_truncated` marker.
13. Tool schemas gained property descriptions + `additionalProperties: false` (helps Spark).
14. Frontend handles the new `note` SSE event with a toast.

**Notes:** stale system-Python Nova instance on :8787 was replaced by the venv
server (both llama-servers were adopted, not reloaded); stray 128K-ctx LFM instance
from the buggy launch was killed.

**Still not verified / known limits:** Ultra (Qwen) tool loop untested on-device;
Spark tool persistence remains weak (hedges instead of chaining tools — expected at
2B); Spark reply when GitHub is rate-limited is honest but useless — set
`GITHUB_TOKEN`; GitHub quota on this machine was exhausted during testing.

### Phase 16 — Controls moved into the model picker + thinking view + markdown/UX fixes — DONE (2026-11-14)

User asked: put the reasoning/context controls in the chat model picker (not the
left-side hover popover), let people expand the model's hidden thinking as a
diagnostic, fix context-meter reset blamed on history, fix markdown bullets,
and explain Qwen Ultra's memory footprint.

**Changes:**
- Reasoning on/off + context-window chooser moved from the left-brand **popover**
  (deleted, incl. CSS/JS) into the composer **model picker** menu
  (Spark / Pro / Ultra + Reasoning + Context + VRAM estimates), same restart
  flow via `/api/engines/restart` — verified in-page (menu renders, tiers select).
- **Thinking is now visible**: backend forwards llama-server `reasoning_content`
  deltas as SSE `thinking` events; the frontend streams them into a collapsed
  **"Thinking · N lines"** block on each model reply — click to expand/collapse,
  persisted with the chat (restored collapsed on reload). Verified end-to-end:
  Spark (enable_thinking) → `thinking x69` → `token` stream → `done`.
- **Markdown bullets**: the ul regex only accepted `-` / `–`; `* item` (which
  models actually emit) rendered as literal asterisks. Fixed to `-•*–—` +
  `\s+` — verified live: `* one` → `<ul><li>`.
- **Context meter reset (user-visible)**: asking a math question made the meter
  read `~0 / 16K` forever. Root cause: the planning path discarded usage and
  returned `{prompt_tokens: 0}` on direct answers, which the UI took as real.
  Aggregation landed in Phase 15; the mid-stream reset to the estimate during
  generation is intentional, and `done` sets the exact figure.
- **File incident (recovered)**: an encoding slip during the rework corrupted
  `js/app.js`; the file was restored from `HEAD` and every frontend edit was
  re-applied and verified (`node --check`, in-page `md()` probes, menu snapshot).
- Environment note: two Nova Python instances were silently fighting for :8787;
  a single clean venv instance now runs it (all llama-servers adopted).
- Spark is fine server-side: loads in ~5–10 s (128K fixed ctx), streams with
  exact usage; its *quality* is 2B-tier weak (hedging, shallow tool use).

**Still / newly noted:**
- Ultra's residency is permanent once loaded (Nova has no unload path): Qwen
  ~11 GB working set on :8003 + MiMo ~4.4 GB on :8002 + LFM ~1.1 GB. With only
  Spark+PLaMo the floor is ~1.5 GB — everything that loads stays loaded. An
  engine-stop (UI button or idle timeout) would free that on demand.
- `chat.messages.slice(-40)` frontend cap + 24,000-char backend cap — long
  threads silently drop older turns; documented here, not yet configurable.

### Phase 17 — Stop response button, delete confirmations, hover-to-tune menu — DONE (2026-11-14)

User asked: stop button in the corner; delete confirmations; reasoning/context
controls only on hover of a model tier (menu was taking over the screen).

**Changes (all frontend, verified in-page):**
- **Stop response button** — fixed bottom-right pill (dark, red stop square),
  visible only while a neural stream is active. Aborts the SSE fetch via
  AbortController (combined with the 240 s timeout); on abort, the partial
  reply finalizes with a "Stopped" toast; an abort before the first token
  removes the model block completely. Confirmed live: Stop mid-stream →
  `isStreaming: true→false`, button hides, clean DOM.
- **Delete confirmations** — per-chat deletes (sidebar + all-chats grid, click
  and keyboard) now route through the existing `openConfirmModal`
  ("Delete “title”? … This cannot be undone."); "Clear all" already had one.
- **Hover-to-tune model menu** — menu is now compact (3 rows + hint + footer)
  by default; each tier row's chevron (or hover/focus) expands that tier's
  Reasoning toggle + context-window chooser inline; one panel at a time
  (accordion), panels never exceed their own tier. Restart flow per-tier;
  `restartTier(ctx, tier)` reboots the hovered tier, not just the selected one.
- **Regenerate** now routes through the same neural path as Send (previously
  it silently produced the built-in canned text even with a healthy backend).
- **Context meter reset explained (not a bug in current build)**: direct answers
  previously returned zero usage → meter read `~0 / 16K` forever; Phase 15
  aggregation fixed it — the meter shows the true prompt size now and grows
  with conversation length. Mid-stream dip-to-estimate is intentional.
- **File incidents & recovery**: an earlier edit tool splice corrupted `js/app.js`
  (restored from HEAD, edits re-applied); `progress.md` was wiped once by an
  erroneous script (rebuilt from HEAD, Phases 15/16 re-applied, encoding
  normalized to UTF-8). `node --check` and 8/8 unit tests pass.

### Phase 18 — Memory anatomy under Task Manager (2026-11-14)

User asked how 90% of RAM can be in use when the Details tab shows only a
handful of small processes. Measured on this machine (2026-11-14, ~11:30):

| Metric | Value |
|---|---|
| Visible RAM / free physical | **31.9 GB / ~1.8 GB free (~94%)** |
| Processes | 311; working-set total **18.5 GB** |
| Private commit total | **~29 GB** |
| — llama-servers (private commit) | MiMo 5.6 GB · Qwen Ultra 5.4 GB · Spark 3.65 GB · PLaMo 2.4 GB = **~17 GB** |
| — Chrome (16 procs) / Firefox (13) / OpenCode (8) | 2.1 / 1.6 / 1.1 GB |
| — everything else (~270 procs + kernel/services) | ≈ 7–8 GB |
| Commit limit (RAM + pagefile) | 44.2 GB (pagefile 12.3 GB); commit free ~7 GB |
| GPU shared-memory reservation (charged to RAM) | **~12 GB** (NVIDIA adapter 9.4 GB dedicated 2.9 GB + secondary adapter 2.5 GB shared) |
| File cache / standby | the ~23 GB of GGUF files are mmap'd — clean pages paged out and instantly reusable; this is why "free" ≈ 0 without an actual leak |

### Phase 19 — Menu popped beside the picker; no Ultra default — DONE (2026-11-14)

User asked: menu pops OUT beside the model button (not above it); why engines
aren't auto-killed under memory pressure; never default to Ultra.

**Changes (frontend-only, verified in-page after reload):**
- `.model-menu` repositioned from `bottom: calc(100% + 12px); right: 0` to
  `right: calc(100% + 12px); bottom: 0` — the panel now pops out to the left,
  **beside** the model button inside the composer row, over the textarea
  instead of covering the heading; narrow screens fall back to the old
  top-anchored placement (`@media (max-width: 720px)`).
- Default tier audit: fresh default remains Spark; the backend falls back to
  Pro; a one-time migration (`nova.view.default-pro-migrated`) rewrites a
  saved `ultra` default to `pro` — Ultra is never the implicit default
  anywhere; user can re-select Ultra in one click.
- **Engine residency explained (not a defect, yet)** — Nova lazy-loads but
  *never unloads*: llama-servers are adopted/health-checked but not owned or
  auto-killed. Automatic eviction under memory pressure would surprise-evict
  Spark/PLaMo/MiMo mid-conversation and incur 20–120 s reloads later; nothing
  currently owns that policy, and killing arbitrary processes is opt-in, not
  default. A real fix (stop/unload button or idle timeout) is offered,
  not built.

### Phase 20 — Memory FAQ: "can't you just load the models slower?" (2026-11-14)

User exposed a misconception: that memory usage comes from loading speed.
Measured state (2026-11-14, ~13:00): free physical **2.0 GB** of 31.9 GB,
commit free **4.8 GB** of 44.2 GB, process working sets total ~18.6 GB, llama
private commit ~17 GB (MiMo 5.6 · Ultra 5.4 · Spark 3.65 · PLaMo 2.4).

**The facts:**
- mmap **is** the slow/lazy loader — the kernel faults in pages on first touch;
  that is why llama-servers boot fast and why the cost lands only after you
  actually chat with a model. Boot speed is not the cause of 90%.
- Loading slower does not reduce footprint. The 90% is the accumulated
  residency of **four resident engines** (16+ GB tied to Qwen Ultra) plus
  Chrome/Firefox/OpenCode (~5 GB) and kernel/services (~6–8 GB). Paged-out
  pages re-fault on next touch — they are not freed by waiting.
- Explicitly **not** options: ctx size (irrelevant at these scales, Ultra
  KV ≈ 0.3–0.7 GB), VRAM offload (already loaned; shared GPU memory counts
  against system RAM), `--no-mmap` (opposite direction).

**Actual levers, in order of effect:**
1. Never default-load Ultra (done in UI); adopt-on-first-use instead — pay
   the cost only when you actually ask for it.
2. On-demand unload (process terminate + lazy reload) — kills ~16+ GB
   instantly; costs 20–120 s on next use.
3. Prefer Pro (~5.6 GB private commit) over Ultra (~16 GB footprint).
4. Restart (reclaims everything incl. standby).
5. Pagefile growth doesn't fix it — commit is fine; physical isn't.

### Phase 21 — Engine unload ("Free memory") — DONE (2026-11-14)

Directly address "if the model isn't currently selected, no RAM should be
taken up." Implemented a true unload path for all three chat tiers:

- Backend: `POST /api/engines/stop` — validates tier, refuses to kill anything
  that isn't that tier's llama-server listening on its port (covers *adopted*
  servers, not just spawned children: identity verified via psutil cmdline +
  `llama-server` name + alias match); skips with **409** while a generation
  is in flight; resets state to `idle`; process terminated (graceful, then
  kill on timeout). Lazy-reload on next message already exists.
- Frontend: each tier's engine panel now has a **"Free memory (unload)"**
  button. Clicking unloads immediately (no confirm — undoable by simply
  chatting again); toast confirms and `checkChatHealth()` refreshes pills.

**Verified live (this session):**
- `/api/engines/stop {tier: spark}` → `{"ok":true,"stopped":true}` — llama-server
  on :8000 terminated; free physical memory rose **1.95 GB → 4.4 GB**
  (~2.5 GB reclaimed). Spark lazily reloaded and is `ready` again (9.3 s).
- Idle tiers stay idle: after this backend launch, spark/pro/ultra all report
  `idle` (loads are fully lazy now; nothing pre-spawns on boot).

**Not addressed (by design):**
- Budget for everything: all four engines still co-reside if you use them all.
- Translator (PLaMo) stays always-ready — it's only ~2.4 GB private and the
  translator is the app's backbone; stop path exists if ever needed.

### Phase 22 — Menu: model strip on top, tuning on the side — DONE (2026-11-14)

User asked: model switcher options to the **top** of the panel; context window
and similar tuning options to the **side**; and to stop the panel covering the
page like a tall column.

**Layout reworked (verified in-page):**
- `.mm-strip`: Spark / Pro / Ultra as three horizontal pills across the top of
  the menu — the switcher now lives in a row instead of a vertical list on the
  page's side. Selected tier stays highlighted.
- `.mm-body` grid (two columns): left = Reasoning Off/On seg + "Free memory
  (unload)" button; right = **Context window** chips (GBKV q8_0 estimates) or
  the "128K fixed" note for Spark — the "options like the context window" are
  now the side panel's content.
- `.model-menu` is a compact ~226 px tall panel docked above the model button
  (`bottom: calc(100% + 12px)`), max-width above composer; narrow screens fall
  back to 92vw.
- Accordion machinery (`.mo-wrap`/`.mo-tune`/`.mm-engine`/hover-expand/
  `openEngineTier`/`closeEnginePanels`) removed — everything is always visible,
  no hover tricks, no dead CSS classes.

**Pro thinking — honest measured findings (not fixed, not fixable by UI):**
- MiMo's raw API with `enable_thinking: True` *does* produce `<reasoning_content>`
  and streams it before `content` — verified directly against the official-docs
  example (no system prompt). Nova forwards those as `thinking` SSE events —
  verified for Spark; the same code path applies to Pro.
- With Nova's full system prompt (FRC tutor suffix + "Be helpful and concise"),
  MiMo consistently answers trivial questions ("what is 15% of 240?") **without
  thinking at all**; the thinking channel stays empty. A hard question is more
  likely to activate it.
- A prime suffix ("think briefly inside <think>...</think> tags before
  answering") was being tested when interrupted by RAM pressure — direction is
  right, but unverified. Until measured, Pro on trivial prompts is honest:
  it answers directly, Reasoning-vs-not is not user-visible on trivia. For a
  guaranteed mode, force a terse <think> prefill server-side (`--reasoning`
  or llama.cpp `--reasoning-format` + system prime), which is a product call.

**State note:** MiMo :8002 is currently unloaded (auto-unload on tier switch);
first next Pro message cold-loads ~20–60 s.

### Phase 23 — Remote merged (NewReact mock UI + explorer v2), our work reapplied on top — DONE (2026-11-14)

User asked to pull main and adopt the new UI as much as possible while keeping
our backend fixes. Findings and what landed:

**What remote `main` actually brought in:**
1. **A *new* React/TypeScript frontend under `frontend/`** — a polished demo of a
   completely different app ("Veritas AI · FRC Team 846 multimodal tutor") with
   mock AI, mock CAD schematics, mock knowledge base, mock glossary and a fully
   simulated agent — **zero backend calls** (verified: nothing hits /api/* or
   :8787). It cannot be "adopted" by flipping a switch; it would replace the
   entire working app with a non-functional shell of itself.
2. **GitHub explorer v2** in the *vanilla* app (our app): centered modal dialog
   with backdrop when opened manually, docked side panel beside chat when a
   file source arrives from the model, syntax highlighting (java/py/js/ts/…
   keyword/string/comment), highlighted line ranges, line numbers, file-info
   line, retry buttons, keyboard focus trap, empty-states, `githubExpand`.
   The AI can now pass `start_line`/`end_line` when calling `read_file`; the
   explorer highlights and auto-scrolls to that range.
3. Main sits on top of our pre-merge state: fast-forward merge, no conflicts —
   our work was on `backup-nova-phase23` (created before the pull); merged the
   two cleanly: explorer v2 kept intact, our MERGED-FILE-adjacent edits
   re-applied (Spark cutoff fix 320→700 tokens; Pro 700→2048 + thinking prime
   suffix).

**Actual state after merge (verified on this machine):**
- Spark end-to-end: full reply, no cutoffs, usage meter live.
- Pro thinking: actually emits thinking now (66 thinking events); budget raised to complete answers after 700-token cutoffs.
- Explorer dock-mode fix: `openFromAI` now docks the panel *before* waiting on
  the file fetch, so a fetch failure never leaves backdrop-visible-but-panel-hidden
  (found during merge verification).
- Escape key in popup mode closes the panel (focus stays in panel by default).
- GitHub API rate limit on this machine is exhausted (60/hr anonymous) — any
  tool/explorer usage returns 502/empty until the hourly reset or `GITHUB_TOKEN`.

**The honest fork in the road:**
Our app is production-like and backend-wired; the new React app is a beautiful
fake (all output is canned or random-seeded). The user must decide:
(A) port the **look/feel** of the React demo into our app (reasonable amount of work), or
(B) wire the React demo to our backend (a multi-week rewrite — translator,
    GitHub tools, dictation, i18n, streaming, mmproj, etc. all need re-doing or
    stubbing), or
(C) keep both: ship our app as-is, use the React app as a design/pitch reference.

### Phase 24 — Auto-unload on model switch — DONE (2026-11-14)

The user asked outright: "if the model isn't currently selected, no ram should
be taken up." Implemented in `selectModel()`: on every tier switch, the two
non-selected tiers are stopped (POST /api/engines/stop) in the background and
the selection fires only after the UI updates. Quiet, best-effort, non-blocking;
fails soft when an engine is mid-generation (HTTP 409 → skipped silently).

**Verified live:** selecting Ultra after Pro → Spark & MiMo llama-servers
terminated; free physical RAM went from **~2 GB → ~18.9 GB**; only PLaMo
(always-ready backbone) survives. First message on an idle tier lazily
relaunches it (~5–10 s Spark, ~30–60 s Pro, ~20–120 s Ultra cold start). Every
switch — Spark→Ultra→Pro→Spark — auto-unloads whatever gets deselected.

**Honest trade:** switching tiers now always pays the cold-start on the next
message (engines never stay warm once deselected); that is the explicit ask.
No persistence warmth means nothing stays resident "just in case." Context
meter still reads history correctly on chat load (Phase 15/16 work).

**Why Details misleads:** it lists per-process working sets (currently resident
pages), not the committed totals. Under pressure the OS trims pages backed by
disk (the GGUFs), so the four llama-servers show ~100 MB–2 GB working sets
while their private commit is ~17 GB; GPU shared memory belongs to the graphics
driver, not to any process, so it never appears in the process list; and the
~270 remaining processes plus the kernel accounting complete the picture.

**What matters for the demo:** physical pressure is driven by (a) the four
resident engines, (b) the mmap'd GGUF file pages in standby, (c) Chrome +
OpenCode + Firefox, (d) the GPU shared-memory loan. The engines never unload
in Nova — a real unload path (idle timeout / stop button) is the fix; a
machine restart reclaims everything including the standby cache.

---


### Phase 26 — Thinking view reverted (inline, near-invisible) + meter monotonic — DONE (2026-11-15)

User asked: revert the thinking UI to the previous look (much worse), and stop
the context meter from dipping between replies.

**Changes:**
- `.mind-row` / `.mind-toggle` restyled into an inline minimal label (`▸
  Reasoning · N lines`), no chrome; `.mind-body` rendered as a thin amber
  left-border text block — back to the shimmer-era aesthetic without the box.
  Chevron rotates on expand; Enter/Space/click flips it as before.
- **Meter dip eliminated:** `msgRecord.usage` now stores
  `{prompt_tokens, completion_tokens}` on every model reply; `renderMessages`
  picks the *nearest* persisted usage from the tail of the conversation instead
  of always re-estimating chars → meter pins to server-reported totals on chat
  re-open instead of swinging ~530 → ~384 → ~526.
- Verified repeated sends: 454 → ~474 → ~461 → 708 → 749 / 16,384 (monotone
  upward, persists exactly across re-opens).
- Unit tests + `node --check` on both JS files pass.

### Phase 25 — Symbols "glitch" (mojibake) + meter snap to zero — DONE (2026-11-14)

User reported: symbols look broken (\"Γûñ Repositories\", \"Find a repositoryΓÇª\")
and the context token meter resets to ~0 on every reply.

**Root cause (both):**
1. **Mojibake disaster** introduced during Phase 24's panel swap: a PowerShell
   `Get-Content -Raw` (default Windows-1252) re-read UTF-8 panel bytes,
   double-encoding every multi-byte sequence (e.g. U+25A4 `▤` → `Γûñ`,
   U+2026 `…` → `ΓÇª`). The git-blob panel itself was always clean UTF-8 —
   the corruption was 100% introduced at merge time, not by anyone's editor.
   **Fix:** restored the panel verbatim from `git show veritas/main:index.html`
   (byte-exact), re-inserted the stop button with .NET `WriteAllText` (forced
   UTF-8), verified every text file decodes under **strict** UTF-8.
2. **Token meter snap-to-zero** unchanged after Phase 16: `start` handler always
   set `used = promptTokens (0)`, discarding history.
   **Fix:** estimator `estimateHistoryTokens(chat)` (chars/4 of all local
   messages) now seeds the meter on `start`, during `token` events, and at
   `renderMessages` (chat open/switch), instead of a bare zero.

**Verified in-page:** `nav` reads `▤  Repositories`, `placeholder` reads
`Find a repository…`, `cm-text` reads `129 / 131,072 tokens` when the
multi-exchange chat is re-opened, and the meter persists (not `0`) across
replies.

## Architecture

```
browser (http://127.0.0.1:8787 ΓåÉ the only supported origin; no CORS issues)
   Γöé  static files
   Γû╝
backend/translator_server.py  (:8787)
   Γö£ΓöÇ PLaMo GGUF  ΓåÆ llama-server subprocess  (:8001)
   Γö£ΓöÇ LFM GGUF    ΓåÆ llama-server subprocess  (:8000)  (lazy)
   Γö£ΓöÇ MiMo GGUF   ΓåÆ llama-server subprocess  (:8002)  (lazy, mmproj attached)
   Γö£ΓöÇ Qwen GGUF   ΓåÆ llama-server subprocess  (:8003)  (lazy, mmproj attached)
   Γö£ΓöÇ whisper     ΓåÆ embedded in-process (lazy, on first mic)
   Γö£ΓöÇ /api/translate  /api/chat (SSE)  /api/transcribe  /api/health
   ├── /api/team846/*  — read-only Team846 GitHub explorer (repos/contents)
   Γö£ΓöÇ /api/engines/restart   ΓÇö reboot one chat tier with a new context size
   ΓööΓöÇ serves the static site
```

- Frontend: vanilla JS, no build; state in localStorage (`nova.*` keys)
- Chat history: saved locally; 53 translation languages; 4 UI languages
- `/api/health` exposes per-tier `engines.spark|pro|ultra` health + context
- Chat can call 4 read-only GitHub tools (`list/search_repositories`,
  `search_paths`, `read_file`) via a planning pass (auto-skipped for
  non-Team846 questions); see Phase 15/16
- Model picker (composer) carries the tier switch + Reasoning toggle + context-window chooser
- Model replies stream with visible, collapsed "Thinking" sections (click to expand); persisted in the chat thread
## Phase 27 — Exact token counts via llama-server's own tokenizer (2026-11-15)

User asked why the meter uses chars/4 guesses when llama.cpp can tokenize.
Answer: llama-server ships `/apply-template` + `/tokenize`; Nova now uses them.

**Changes:**
- Backend: `_normalize_messages()` extracted (shared by /api/chat and the new
  `/api/token-count`); `_build_full_messages()` builds the exact prompt array
  (system + conversation, optional selected-file block); `_exact_prompt_tokens()`
  renders the prompt via `POST /apply-template` then counts it via
  `POST /tokenize` with `parse_special=True` — verified to match
  `usage.prompt_tokens` exactly (194 == 194 on live Spark). Never loads a model:
  used only when the engine is already `ready`.
- `/api/chat` SSE `start` event now carries exact `prompt_tokens` when the
  engine answers (tool-armed rounds stay approximate until `done`).
- New `POST /api/token-count` (`{messages, preset, thinking}`) for the live
  meter: exact numbers when the engine is ready, chars/4 estimate otherwise
  (marked `exact:false`); images counted as 256 tok each client-side.
- Frontend: typing (debounced ~250 ms), attach/detach and chat-open all probe
  `/api/token-count`; `chars/4` remains only as the offline fallback. Removed
  `historyTokens` double-counting (prompt now already includes history).
  Meter is pinned to server-reported totals; `start` == `done` == exact.
- Nova backend restarted; llama-server :8000 adopted (not duplicated).

**Verified live (2026-11-15):**
- `/api/token-count` spark ready -> `{prompt_tokens: 194, exact: true}` (chars/4 would say 231); idle -> estimate + `exact:false`.
- `/api/chat` -> `start` `{prompt_tokens: 194, exact: true}`; `done` `usage.prompt_tokens: 194` — identical.
- 22/22 unit tests pass (`test_chat_retries_from_error_state` fake updated to answer /apply-template + /tokenize); `node --check js/app.js` OK.

**Notes / trade-offs:**
- The meter now counts the *full* prompt (system prompt + template included),
  like the server does — first keystroke shows ~194 on Spark, not ~1. Monotone
  with `done`, never jumps.
- Pro/Ultra: exact only when the engine is ready; while idle the probe falls
  back to chars/4 (no surprise 10 GB loads just to count).

## Verified
- [x] PLaMo translation en/es/fr/pt/deΓåö any of 53 codes; ja polite vs plain
      (`desu` vs plain-form confirmed)
- [x] 53 languages in 5 `<optgroup>`s; history persists/restores
- [x] i18n enΓåÆfr (and back) end-to-end
- [x] Hover popover opens on Nova brand; Reasoning Off/On works (Spark/Pro/Ultra)
- [x] Context size options render per tier with VRAM estimates (q8_0 KV + GDN)
- [x] Image path exists in the UI (bubble thumbnails; base64 through to llama.cpp mmproj)
- [x] GitHub tool planning pass + tool loop work on live models (MiMo verified;
      Spark streams; usage metering aggregates planning + final tokens)
- [x] Offline fallback fixed for Spark: root-cause `deadline` precedence bug +
      missing mmproj (F16) - Spark loads and answers in ~10 s
- [x] 8 unit tests pass (`python -m unittest discover -s tests`)
## Not yet verified / suspected broken
- Ultra (Qwen3.6-35B) GitHub tool loop untested on-device (verified: template supports
  tools; boot untested).
- The `GITHUB_TOKEN` path is unit-tested for the auth header but not against a
  real authenticated quota.
- Chat path (Spark -> LFM): frontend canned-reply fallback only triggers on failure;
  a silent quality regression is hard to notice for 2B answers - watch for it.
- Pro/Ultra first use: **very large cold load**; LFM boot ~10 s, MiMo ~30-60 s,
  Qwen ~60-120 s (reads ~15 GB into ~32 GB RAM). Whisper/PLaMo must not coexist
  with Qwen if VRAM gets tight - measure before demo.
- The `/api/engines/restart` path is untested end-to-end (re-spawn *and* health).
- `/api/health` returns `502 Bad Gateway` if the single instant-serve port is mid-reload; proceed with one fresh launch and avoid double-spawned servers.
## Licenses / practical notes for the next agent
- **PLaMo** ΓÇö PLaMo Community License (not for commercial use without free PFN registration).
- **LFM3-VL-2B** ΓÇö LFM1.0; **MimoV2.6-Distill-Qwen-9B** ΓÇö MIT; **Qwen3.6-35B-A3B** ΓÇö Apache-2.0.
- **Whisper** ΓÇö MIT.
- LFM2/MoE checkpoint ΓÇö expect 0.4 sΓÇô5 s per response depending on the tier; CPU-only for Qwen is expected ~2ΓÇô5 tok/s at Q3_K_M.

## Known limitations / honest notes
- **Offline replies** (canned) are only a fallback when the LFM backend dies
- **Offline phrasebook** is approximate; matches are labelled honestly
- Math renders as plain text (no LaTeX)
- LFM 2B = small-model quality; decent for study help, not frontier
- **Whisper** doesn't transcribe Cebuano (the only PLaMo language it lacks);
  Javanese is `jw` in Whisper vs `jv` in PLaMo (users don't see this)
- **PLaMo license**: community license ΓÇö commercial use needs free PFN
  registration (< ┬Ñ1B/yr rev); **LFM1.0** license ΓÇö personal/research fine
- Seed data is generic; "Username" only, never real names

- **GitHub API**: 60 req/hr unauthenticated (shared per IP) - set `GITHUB_TOKEN`
  (read-only PAT) for 5,000/hr; the explorer panel and the LLM tools both pick it up.
- The LLM sees only the 4 read-only GitHub tools; arbitrary URLs and writes are
  intentionally impossible.
## Repo status

`git init` ΓåÆ branch `main`, first commit `bac2c5b` (8 files). Several engine
swaps and features followed; all artifacts (models, venv, caches) stay out of
the tree ΓÇö see `.gitignore`. Run everything with the commands below (or
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

## Phase 28 — FRC knowledge base (RAG) for all three chat models — DONE (2026-11-15)

User asked for a database the models can search for FRC common knowledge:
famous teams from The Blue Alliance, all recent games in the US, CAD knowledge
from frcdesign.org, plus more sources, and lots of Team 846 data.

**Built:**
- `backend/ingest_knowledge.py` — deterministic rebuild scraper (stdlib only,
  ~0.35 s throttling, no API keys). Parses TBA's server-rendered pages,
  FRCDesign.org's Starlight sitemap (all 170 pages), Wikipedia wikitext via
  the MediaWiki API, Chief Delphi (Discourse, CD-Media: Papers category —
  first post of the top-liked papers, plus Team 846 threads), and FIRST's
  official Game & Season page. Table content is kept; TBA match tables are
  dropped (noise).
- `data/frc_knowledge.db` — SQLite + FTS5 (BM25), **365 documents / 1596
  chunks**: all FRCDesign.org CAD pages, FRC game articles 2016-2026 + the
  complete 1992-2027 games list, FRC overview (awards, districts,
  championship), Team 846 identity + full 2002-2027 history + 25 individual
  season pages (every event, rank, record, awards) and 47 famous
  teams (identity + all-time history/awards) × The Blue Alliance, ~56 top
  Chief Delphi engineering white papers + 9 Team 846 threads, FIRST's 2026 REBUILT /
  2027 BIOCORE announcements, and 2 Nova-curated common-knowledge docs.
- `backend/knowledge.py` — read-only runtime: BM25 retrieval with title
  weighting, query-coverage and year-in-title bonuses, Team 846 bias, one
  chunk per URL; OpenAI-compatible `search_frc_knowledge` tool; never raises
  (missing DB → empty results).
- Chat integration (`translator_server.py`): FRC-flavored questions get the
  top ~4 chunks injected as a system note (auto-cited URLs, ~600 tokens) AND
  the planning pass is armed with `search_frc_knowledge` alongside the
  Team846 GitHub tools (combined `_ALL_TOOLS`). Injection is shared with
  `/api/token-count` so the Context meter stays exact. New endpoint:
  `GET /api/knowledge/search?q=...&limit=n`; `/api/health` now reports
  knowledge stats. New tests: `tests/test_knowledge.py` (13 tests).

**Verified:** 13/13 knowledge tests + 22/22 existing suite pass; retrieval
probe shows correct top hits for 846 (2022 San Francisco Regional), 2026
game (Rebuilt), intake/onshape queries, Charged Up, and Rebuilt-vs-others;
simulated server-side augmentation produces a correct 4-hit note; live chat
on :8787 still needs a restart to load the new code (endpoint is additive).

**Honest notes:**
- BM25 keyword retrieval, not dense embeddings — fine for FRC jargon, but no
  semantic synonym recall (embeddings can be added later; retrieval API is
  the seam).
- CD papers store the OP summary + linked-doc references, not full PDFs.
- TBA pages omit match-by-match scores by design; full match data stays on
  thebluealliance.com (URLs are in every doc).
- 2 fetch failures (non-fatal); a few thin pages were dropped by the
  min-content filter.
- FRCDesign.org extraction is regex-based; chunk quality was spot-checked,
  not exhaustively reviewed.
- `data/frc_knowledge.db` is NOT committed yet — decide: add it to git
  (~3.5 MB) or rebuild with `backend/ingest_knowledge.py` (needs internet).
- The live :8787 server still runs pre-Phase-28 code; restart it to activate
  knowledge search. Unverified merges warning from before still applies.

## Phase 29 — Web search tool (FRC-scoped DuckDuckGo) + final DB verification — DONE (2026-11-15)

User asked to "also add websearch with these sites as suggested sites," then
asked when `data/frc_knowledge.db` would be ready for relaunch — it is ready
now (rebuilt with all extraction/wiki-table fixes, tests green).

**Built:**
- `backend/websearch.py` — no-key search via DuckDuckGo's HTML endpoint
  (browser UA headers needed; without them DDG serves an anomaly/captcha page).
  - `focus='frc'` (default) appends
    `(site:thebluealliance.com OR site:frcdesign.org OR site:chiefdelphi.com OR site:en.wikipedia.org OR site:firstinspires.org OR site:docs.wpilib.org)`
    and silently falls back to a general search when the scoped query yields
    nothing (or DDG rate-limits it).
  - Parses `result__a`/`result__snippet` (or the `result-link` lite layout as
    a backup), decodes DDG's `uddg=` redirect URLs, 300 s cache (max 128
    entries), soft-fails into `{results: [], error: ...}` — never raises.
  - OpenAI-compatible `web_search` tool; query text leaves the machine
    (privacy note documented in tool description + READMEs).
- Wired into chat alongside the other tools (`_ALL_TOOLS`), dispatcher, and
  the FRC tutor system prompt. `_WEB_INTENT` arms tools-only (no injection) for
  explicit "search the web" asks that aren't FRC-flavored.
- FRC knowledge base was rebuilt from scratch with the HTML chrome filter
  (TBA/Starlight nav lines dropped), the wikitable state machine
  (year | game | participants | teams | events per row, all 1992-2027 rows
  render aligned), and the `<ref .../>` vs `<ref>...</ref>` ordering fix that
  was eating whole table rows (1996-2006 region of the games table).
- 9 offline tests (`tests/test_websearch.py`, mocked HTTP). Full suite: **44/44
  pass**; retrieval probes correct for "Every FRC game", 2026-Rebuilt,
  Team 846 2022/2026 queries.

**DDG reality check (measured):** with full browser headers, DDG returns
~24 KB result pages; repeated rapid queries flip it to an anomaly/captcha
page (~14 KB, 0 results) intermittently. Bing's HTML works but ignores
`site:` OR-lists and returns acronym noise ("FRC" → Microsoft Teams), so it
was evaluated and rejected. The scoped search may therefore degrade to the
general fallback, and either may occasionally return nothing — the model is
instructed to say so and answer from the local knowledge base.

**To relaunch:** restart the Nova server yourself (code changes are not
hot-reloaded): close the Nova console window / Ctrl+C, run `Start Nova.cmd`,
then confirm `Invoke-RestMethod http://127.0.0.1:8787/api/health` shows a
`knowledge` block with `built: true, docs: 365, chunks: 1596`. The first FRC
question in a fresh chat will show "Consulting the FRC knowledge base".

## Phase 30 — Date fix, mechanism-intent broadening, fetch_url, Chainlink to TBA API — DONE (2026-11-15)

User screenshots showed three defects (Pro tier): (1) "what is today's date"
answered "Monday, May 19, 2026" with a fabricated season window; (2) the match
schedule for Chezy Champs 2026 was found as a web page but not opened; (3) the
model narrated its internal reasoning ("The user wants the details of Match 1")
as the visible reply instead of answering. Follow-up: mechanism/vocabulary
questions didn't consult the FRC database at all ("what is a Telescoping Hook"
answered generically, no notes injected).

**Fixes (all live, verified on the running instance):**
- **Date**: `_build_full_messages` now prefixes "Today is <Weekday, Month D, YYYY>"
  into the FRC system prompt — verified live: "Today is Saturday, November 14, 2026."
  (was: Monday, May 19, 2026, with invented season bounds).
- **Mechanism/vocabulary injection**: `_FRC_INTENT` now matches FRC mechanism terms
  (hook|flywheel|indexer|hopper|counterbalance|slapdown|turret|belt|sprocket|gearbox|
  bumper|roller|pivot|endgame|auton|scouting|game piece|fuel|season|new game|kickoff),
  so generic-sounding FRC questions ARE grounded by the KB. Verified live:
  "what is a Telescoping Hook" now shows "Consulting the FRC knowledge base" and the
  reply cites frcdesign.org's Exercise 4 (was: fully ungrounded generic answer).
- **fetch_url tool** (`backend/websearch.py`): the model can READ pages — public
  http(s) only, tables kept (TBA match tables included), ~14k-char cap, private /
  loopback / reserved hosts blocked. Answers the Chezy Champs gap class. SSE status
  "Reading a web page"/"Searching the web" added for tool calls.
- **Thinking leak**: STUDENT_SYSTEM_PROMPT now forbids restating the question and
  narrating reasoning/planning/tool calls in the reply ("the student only sees your answer").
- **Injection wording hardened**: notes now mandate "answer USING these notes; cite
  URLs; don't fabricate beyond them".
- **TBA API v3 client** (`backend/tba.py`, user decision: key LATER — built, tested,
  unconfigured): `tba_event(event_key)` (alliances, rankings, awards, all matches with
  scores, capped) and `tba_team(team_number, year)` (identity, yearly events, statuses
  with win/loss rank/award counts, 25 recent awards). No key => actionable error,
  zero behavior change. 8 mocked unit tests; dispatched via `_execute_any_tool`.
- Ranked bug also covering this phase: unknown *team numbers* were never FRC-flavored
  (now caught by the generic `team\s*\d{2,5}` pattern + web injection for uncovered teams).

**Measured / verified:** 63/63 unit tests pass (9 new incl. intent-broadening
regression test); live relaunch verified date fix + hook grounding + tool dispatch.

**Honest notes / pending:**
- Spark (2B) still adheres to injected notes weakly vs Pro — cap is the model, not
  the retrieval (expected); Pro ranked #1 hits land on theme and cite sources.
- TBA tools advertise but error until `TBA_AUTH_KEY` is set in Nova's environment
  (free key at thebluealliance.com/account). With it set, tba_event/tba_team work
  end-to-end; without it, Nova falls back to scrape/RAG as before.
- DDG rate limits remain intermittently lossy; scoped search degrades to general.
- Uncommitted: everything in this phase (working tree ahead of 3f3ef4e).

