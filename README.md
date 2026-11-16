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
Datasets, pretrained models, tutorials and AI tools used, with links.