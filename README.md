---
title: Primer
emoji: 🤖
colorFrom: amber
colorTo: orange
sdk: gradio
sdk_version: 5.29.0
app_file: app.py
pinned: false
---

# Veritas-AI-Hackathon
app for robotics rookies, specially designed for 846

## Summary

Primer is a local-first AI study assistant for FRC Team 846 and robotics
rookies. It runs entirely on your machine: on-device LLM chat (Spark =
LFM3-VL-2B, Pro = MiMo-V2.6-Distill-Qwen-9B, optional Ultra = Qwen3.6-35B-A3B),
54-language translation built in (including experimental Afrikaans via the
PLaMo-3-Translate-2B-AF fine-tune), voice dictation (Whisper large-v3-turbo),
and retrieval over a bundled FRC knowledge base (game rules, every season,
Team 846 history, TI/CAD resources, top Chief Delphi white papers). It also
explores the Team 846 GitHub org, pulls team data and standings from The Blue
Alliance API, and ships an experimental CAD viewer that opens STEP files
directly, converts Inventor `.ipt`/`.iam` files via a local Inventor install,
and browses the team's SVN repository. Use it as a local app
(`Start Primer.cmd` → http://127.0.0.1:8787/) or as a hosted preview where only
the CAD/SVN side is available. The rest of this README covers setup, the
translation model, and everything the app is built on.

On Windows, double-click **Start Primer.cmd** to start the local AI server and
open Primer. Python 3.10 or newer is required. The first question for a model may
take longer while its files download. For other platforms and setup details, see
[backend/README.md](backend/README.md).

On a Mac, download the Primer project folder and install Python 3.10 or newer.
Open Terminal in that folder and run `bash "Start Primer.command"`. This starts
the local server and opens Primer at `http://127.0.0.1:8787/`. A website link
alone does not start this server; SVN sign-in needs the local copy. On macOS,
SVN browsing and STEP viewing are supported, but opening Inventor `.ipt` and
`.iam` files requires Windows and a local Inventor installation.

Primer first asks whether Python is installed. If a required model or runtime is
missing, it asks permission before downloading. After approval, Spark and Pro
can preload when selected; Ultra is never downloaded automatically. Model files
stay in `models/`, separate from knowledge sources. The permission choice is
saved locally in `.runtime/download-consent.json`.

Use the language button in the message box to change the interface and answer
language or open the in-chat translator. “Use chat context” translates the draft
using the current conversation. The Knowledge base includes the built-in tool
references and lets you add notes, links, or text files; your additions are
stored in the current browser. Team 846 code uses public GitHub data and can
fall back to public repository archives when GitHub's API is rate-limited.
Open the model selector and choose **Team 846 code** to use the explorer. A
dated snapshot of the public repository list is bundled so it appears on a
first visit even if GitHub is unavailable; Primer refreshes it from GitHub when
possible. Browsing files still requires GitHub access or a previously saved
file. The snapshot only includes public repositories.

The experimental **CAD viewer** opens local STEP files directly and can use a
local Inventor installation to open `.ipt` and `.iam` files. It can also browse
the team's SVN repository. See [CAD setup and limitations](backend/CAD.md).

Primer ships a local FRC knowledge base (`data/frc_knowledge.db`, SQLite + FTS5 /
BM25 RAG) with every recent FRC game, famous teams from The Blue Alliance,
Team 846 in every year 2002-2026, all FRCDesign.org CAD material and the
top-liked Chief Delphi white papers. FRC questions answered by chat retrieve it
automatically; see `backend/README.md` ("FRC knowledge base (RAG)") for details
and how to refresh it.

## Translation model — PLaMo-3-Translate-2B-AF (Q4_K_M GGUF, Unofficial Experimental Fine-Tune)

Built with PLaMo.

This is an unofficial, experimental LoRA fine-tune and Q4_K_M GGUF quantization
of `pfnet/plamo-3-translate-2b` by Preferred Networks, Inc., trained to add
experimental Afrikaans (`af`) translation alongside PLaMo 3 Translate's original
supported languages (54 languages in total).

**Status / Caveat:** Early experimental checkpoint (checkpoint-7000, quantized
to Q4_K_M). Afrikaans is usable for general/draft translation (~55 chrF++ on
held-out nllb-english-bitext-hq test sentences) but can still exhibit occasional
Dutch bleed or lexical errors.

**Usage (llama.cpp):** Primer serves it locally via llama.cpp using the standard
PLaMo-3 PFML3 prompt format with `temperature=0`, a light `repeat_penalty=1.05`,
and stop tokens `<|plamo:tag|>` and `<|plamo:bos|>`. (`backend/plamo-chat-template.jinja`
supplies an equivalent PFML3 template for local runs — see
[backend/README.md](backend/README.md).)

**Model:** [Eiki-AI/plamo-3-translate-2b-af-q4_k_m](https://huggingface.co/Eiki-AI/plamo-3-translate-2b-af-q4_k_m) on Hugging Face.

**License & Attribution:**
Built with PLaMo — based on `pfnet/plamo-3-translate-2b` by Preferred Networks, Inc.
Distributed under the [PLaMo Community License](https://huggingface.co/Eiki-AI/plamo-3-translate-2b-af-q4_k_m/blob/main/LICENSE/en).
Commercial use and redistribution are subject to the terms of the PLaMo Community
License (including registration/revenue thresholds for commercial deployment).
This derivative model is not affiliated with or endorsed by Preferred Networks, Inc.


# Project name: Primer
**Track:** Languages
**Team:** Alexander Nicholson, Arnav Kulkarni, Harish Gottimukkula
# The problem
Who has this problem, and why does it matter? (2-3 sentences)
# What we built
What goes in, what comes out, and how someone would use it.
# What we added
If you started from a suggested project: which one, and what you added
or changed (your own user, data or question). Otherwise, write "Our own
idea".
# How it works
Data: which dataset, how many examples, how we cleaned it.
Model: what we used and why.
# Results
Our baseline scored X. Our model scored Y on held-out test data.
Where it fails, and why we think so.
# What we'd do next
One or two concrete next steps with more time.
# Sources

Everything Primer is built on — models, datasets, libraries, services and APIs,
with links. All model weights stay in `models/` (gitignored) and are downloaded
only with your approval.

## Models

| Role | Model | Used | License |
|---|---|---|---|
| Chat/vision — Spark | [LFM3-VL-2B](https://huggingface.co/LiquidAI/LFM3-VL-2B), served via [LiquidAI/LFM3-VL-2B-GGUF](https://huggingface.co/LiquidAI/LFM3-VL-2B-GGUF) (Q4_K_M, `lfm3` arch) | everyday chat, vision, on-device | [LFM1.0](https://huggingface.co/LiquidAI/LFM3-VL-2B/blob/main/LICENSE) |
| Chat/reasoning — Pro | [XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B) (SFT fine-tune of `Qwen/Qwen3.5-9B`), served via [bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF](https://huggingface.co/bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF) (Q4_K_M) | strong reasoning + tool use | [MIT](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B/blob/main/LICENSE) |
| Chat — Ultra (optional, never auto-downloaded, not bundled) | [Qwen/Qwen3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B) (35B-A3B MoE), served via [unsloth/Qwen3.6-35B-A3B-GGUF](https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF) (UD-Q3_K_M) | maximum quality, large VRAM/RAM needed | [Apache-2.0](https://huggingface.co/Qwen/Qwen3.6-35B-A3B/blob/main/LICENSE) |
| Translation — 54 languages incl. Afrikaans | [Eiki-AI/plamo-3-translate-2b-af-q4_k_m](https://huggingface.co/Eiki-AI/plamo-3-translate-2b-af-q4_k_m) — unofficial experimental LoRA fine-tune + Q4_K_M GGUF of [pfnet/plamo-3-translate-2b](https://huggingface.co/pfnet/plamo-3-translate-2b) by Preferred Networks, Inc. (54 languages, `af` added) | `POST /api/translate`, in-chat translator | [PLaMo Community License](https://huggingface.co/Eiki-AI/plamo-3-translate-2b-af-q4_k_m/blob/main/LICENSE/en) — see the "Translation model" section above; not affiliated with or endorsed by PFN |
| Dictation | [Systran/faster-whisper-large-v3-turbo](https://huggingface.co/Systran/faster-whisper-large-v3-turbo) via [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) (int8, GPU) | voice input | MIT (Whisper large-v3-turbo base: [openai/whisper-large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo)) |

## Datasets and knowledge sources

- **FRC knowledge base** (`data/frc_knowledge.db`, built by `backend/ingest_knowledge.py`): 363 documents / 1,588 chunks of FRC-specific material, retrieved automatically by chat (RAG). Sources:
  - [FIRST Inspires](https://firstinspires.org/) — official season content
  - [The Blue Alliance](https://www.thebluealliance.com/) — Team 846 in every year 2002–2026, every FRC game, famous teams ([API docs](https://www.thebluealliance.com/apidocs/))
  - [FRCDesign.org](https://frcdesign.org/) — FRC CAD material
  - [Chief Delphi](https://www.chiefdelphi.com/) — top-liked CD-Media white papers
  - [Wikipedia](https://en.wikipedia.org/wiki/FIRST_Robotics_Competition) — FRC overview and game pages
  - Not a redistributed dataset; it is derived locally and stored in the repo as a SQLite + FTS5 database.
- **Team 846 public code** — fetched live from the [Team846 GitHub org](https://github.com/Team846) (`api.github.com`, repo archives as fallback); a dated snapshot is bundled in `js/team846-snapshot.js` for offline display.
- **Afrikaans translation evaluation** — per the translation model card, Afrikaans quality (~55 chrF++) was measured on held-out `nllb-english-bitext-hq` test sentences: [hotchpotch/nllb-english-bitext-hq](https://huggingface.co/datasets/hotchpotch/nllb-english-bitext-hq) (filtered English↔non-English bitext, derived from [allenai/nllb](https://huggingface.co/datasets/allenai/nllb)).
- **Afrikaans translation training data** — the fine-tune was trained on [Helsinki-NLP/opus-100](https://huggingface.co/datasets/Helsinki-NLP/opus-100) subtitle data (OpenSubtitles-sourced parallel bitext from the OPUS corpus, English-centric, 100 languages; paper: [OPUS-MT / OPUS 100](https://arxiv.org/abs/2004.11867)), reported by the fine-tune's author. The full mixture/recipe is not published.

## Libraries, runtimes and tools

- [llama.cpp](https://github.com/ggml-org/llama.cpp) / `llama-server` (MIT) — runs all GGUF chat/translation models locally
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) (MIT) — dictation
- [Three.js](https://github.com/mrdoob/three.js/tree/r167) r167 (MIT) — CAD viewer rendering (`vendor/cad/`)
- [occt-import-js](https://github.com/kovacsv/occt-import-js/tree/0.0.23) 0.0.23 (LGPL-2.1) — STEP parsing in the CAD viewer (`vendor/cad/`)
- [fflate](https://github.com/101arrowz/fflate/tree/v0.8.2) 0.8.2 (MIT) — packaging local assemblies (`vendor/cad/`)
- [OpenAI Whisper](https://openai.com/research/robust-speech-recognition-via-large-scale-weak-supervision) — model family used for dictation
- Autodesk Platform Services (Forge) API (`developer.api.autodesk.com`) — Inventor `.ipt`/`.iam` → STEP conversion in the backend (`backend/cad.py`)
- Team SVN (`svn.lynbrookrobotics.com`) — private repository browser in the CAD viewer; sign-in required, no data is public
- Python deps: see `requirements.txt` and `backend/README.md`
- Hugging Face Spaces (`app.py` Gradio hosted preview) and [Render](render.yaml) (`Dockerfile`, `render.yaml`) — hosted CAD/SVN-only preview where AI models are not available