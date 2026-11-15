# Veritas-AI-Hackathon
app for robotics rookies, specially designed for 846

On Windows, double-click **Start Nova.cmd** to start the local AI server and
open Nova. Python 3.10 or newer is required. The first question for a model may
take longer while its files download. For other platforms and setup details, see
[backend/README.md](backend/README.md).

Nova first asks whether Python is installed. If a required model or runtime is
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
Open the model selector and choose **Team 846 code** to use the explorer.

Nova ships a local FRC knowledge base (`data/frc_knowledge.db`, SQLite + FTS5 /
BM25 RAG) with every recent FRC game, famous teams from The Blue Alliance,
Team 846 in every year 2002-2026, all FRCDesign.org CAD material and the
top-liked Chief Delphi white papers. FRC questions answered by chat retrieve it
automatically; see `backend/README.md` ("FRC knowledge base (RAG)") for details
and how to refresh it.
