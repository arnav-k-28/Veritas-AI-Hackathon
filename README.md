---
title: Primer
emoji: 🤖
colorFrom: amber
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# Primer

- **Team:** Alexander Nicholson, Arnav Kulkarni, and Harish Gottimukkula
- **School:** Lynbrook High School
- **Track:** Languages

## Summary

We made Primer to help students get started in robotics, especially new members
of FRC Team 846. There are a lot of terms, tools, and rules to learn, so we
wanted to make it easier to find answers and learn in the language that works
best for you.

Primer puts chat, translation, and robotics resources in one place. You can ask
questions, translate text using the conversation as context, look through Team
846's public code, and browse CAD files. We also fine-tuned a translation model
to add experimental Afrikaans support.

The local app includes the AI models and Inventor conversion. There's also a
hosted preview for browsing SVN and viewing STEP files.

## Getting started

On Windows, double-click **Start Primer.cmd** to start the local AI server and
open Primer. Python 3.10 or newer is required. The first question for a model may
take longer while its files download. For other platforms and setup details, see
[backend/README.md](backend/README.md).

On a Mac, download the Primer project folder and install Python 3.10 or newer.
Open Terminal in that folder and run `bash "Start Primer.command"`. This starts
the local server and opens Primer at `http://127.0.0.1:8787/`. You can also
use the hosted preview for SVN browsing and STEP files without starting the local
server. Opening Inventor `.ipt` and `.iam` files locally requires Windows and
an Inventor installation.

When you first use the local app, Primer asks whether Python is installed. If a
model or runtime is missing, it asks before downloading it. Spark and Pro can
preload after you give permission.
Models are stored in `models/`, and your download choice is saved in
`.runtime/download-consent.json`.

## What you can do

- **Chat and translate:** Ask a question or use the language button in the
  message box to change the site and answer language. The in-chat translator can
  also use the conversation to help translate a draft.
- **Use the knowledge base:** Look through the included references or add your
  own notes, links, and text files. Your additions stay in your browser.
- **Explore Team 846 code:** Open the model selector and choose **Team 846
  code**. Primer loads public repositories from GitHub and includes a dated
  snapshot of the repository list for offline browsing. You can open files with
  GitHub access or use a previously saved copy.
- **Browse CAD:** The experimental viewer opens STEP files and can browse the
  team's SVN repository. On Windows, it can also use a local Inventor install
  to open `.ipt` and `.iam` files. See [CAD setup and limitations](backend/CAD.md).

The local FRC knowledge base includes game information, Team 846 history, CAD
resources, and Chief Delphi white papers. Primer searches it when answering FRC
questions. See the FRC knowledge base section in [backend/README.md](backend/README.md)
for details and instructions for refreshing it.

## Translation model — PLaMo-3-Translate-2B-AF (Q4_K_M GGUF, Unofficial Experimental Fine-Tune)

Built with PLaMo.

This is an unofficial, experimental LoRA fine-tune and Q4_K_M GGUF quantization
of `pfnet/plamo-3-translate-2b` by Preferred Networks, Inc., trained to add
experimental Afrikaans (`af`) translation alongside PLaMo 3 Translate's original
supported languages (54 languages in total).

Our checkpoint scored about 55 chrF++ on held-out `nllb-english-bitext-hq`
test sentences. It's useful for drafts and general translation, with room to
improve accuracy and reduce occasional Dutch words.

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


## How we built the translation model

We started with Preferred Networks' PLaMo-3-Translate-2B and made a LoRA
fine-tune to add Afrikaans. We then quantized it to Q4_K_M GGUF so it can run
with llama.cpp. The model is on [Hugging Face](https://huggingface.co/Eiki-AI/plamo-3-translate-2b-af-q4_k_m).

For training and evaluation, we used about 10,000 sentence pairs combined from
[OPUS-100](https://huggingface.co/datasets/Helsinki-NLP/opus-100) and
[nllb-english-bitext-hq](https://huggingface.co/datasets/hotchpotch/nllb-english-bitext-hq).
The exact mixture and train/validation/test split weren't tracked precisely.
We relied on the datasets' filtering and excluded non-target-language content.
Since much of the OPUS-100 data comes from subtitles, the model sees a lot of
informal conversation.

We chose PLaMo because it already supported 53 languages, and the quantized
model is small enough to run locally on a consumer computer. Primer uses it
alongside LFM3-VL-2B and MiMo-V2.6-Distill-Qwen-9B for chat, Whisper for voice
input, and a local FRC knowledge base for robotics questions.

The Afrikaans results give us a starting point to build on. Next, we'd like to
train with more varied data, run training longer, and evaluate on a bigger
held-out set. We also want to improve accuracy and reduce Dutch words in the
translations. We also want to explore higher-quality datasets and more languages, including Norwegian.

# Sources

Everything Primer is built on — models, datasets, libraries, services and APIs,
with links. All model weights stay in `models/` (gitignored) and are downloaded
only with your approval.

## Models

| Role | Model | Used | License |
|---|---|---|---|
| Chat/vision — Spark | [LFM3-VL-2B](https://huggingface.co/LiquidAI/LFM3-VL-2B), served via [LiquidAI/LFM3-VL-2B-GGUF](https://huggingface.co/LiquidAI/LFM3-VL-2B-GGUF) (Q4_K_M, `lfm3` arch) | everyday chat, vision, on-device | [LFM1.0](https://huggingface.co/LiquidAI/LFM3-VL-2B/blob/main/LICENSE) |
| Chat/reasoning — Pro | [XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B) (SFT fine-tune of `Qwen/Qwen3.5-9B`), served via [bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF](https://huggingface.co/bartowski/MiMo-V2.6-Distill-Qwen-9B-GGUF) (Q4_K_M) | strong reasoning + tool use | [MIT](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B/blob/main/LICENSE) |
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
- **Afrikaans translation training + evaluation data** — about 10k sentence pairs combined from [Helsinki-NLP/opus-100](https://huggingface.co/datasets/Helsinki-NLP/opus-100) (af-en, OpenSubtitles subtitle-sourced, English-centric) and [hotchpotch/nllb-english-bitext-hq](https://huggingface.co/datasets/hotchpotch/nllb-english-bitext-hq) (filtered English↔non-English bitext derived from [allenai/nllb](https://huggingface.co/datasets/allenai/nllb)) (reported by the fine-tune's author). Afrikaans quality (~55 chrF++) was measured on held-out `nllb-english-bitext-hq` test sentences; the exact mixture/split was not tracked precisely. The full mixture/recipe is not published.

## AI tools used in development

Primer was built with the help of AI coding assistants (development-time assistance; not runtime dependencies):

- [OpenCode](https://opencode.ai/) — open-source AI coding agent ([GitHub](https://github.com/sst/opencode))
- [OpenAI Codex](https://openai.com/codex) — OpenAI's coding agent ([GitHub](https://github.com/openai/codex))
- [Google Gemini](https://gemini.google.com/) — Google's AI assistant

## Libraries, runtimes and tools

- [llama.cpp](https://github.com/ggml-org/llama.cpp) / `llama-server` (MIT) — runs all GGUF chat/translation models locally
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) (MIT) — dictation
- [Three.js](https://github.com/mrdoob/three.js/tree/r167) r167 (MIT) — CAD viewer rendering (`vendor/cad/`)
- [occt-import-js](https://github.com/kovacsv/occt-import-js/tree/0.0.23) 0.0.23 (LGPL-2.1) — STEP parsing in the CAD viewer (`vendor/cad/`)
- [fflate](https://github.com/101arrowz/fflate/tree/v0.8.2) 0.8.2 (MIT) — packaging local assemblies (`vendor/cad/`)
- [OpenAI Whisper](https://openai.com/research/robust-speech-recognition-via-large-scale-weak-supervision) — model family used for dictation
- Autodesk Platform Services (Forge) API (`developer.api.autodesk.com`) — optional cloud CAD integration (`backend/cad.py`); local Inventor conversion uses an installed copy of Inventor
- Team SVN (`svn.lynbrookrobotics.com`) — private repository browser in the CAD viewer; sign-in required, no data is public
- Python deps: see `requirements.txt` and `backend/README.md`
- Hugging Face Spaces (`app.py` Gradio hosted preview) and [Render](render.yaml) (`Dockerfile`, `render.yaml`) — hosted CAD/SVN-only preview where AI models are not available
