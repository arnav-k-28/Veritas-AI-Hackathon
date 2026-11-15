"""Build data/frc_knowledge.db — Nova's FRC common-knowledge RAG corpus.

Run:  .venv-translator\\Scripts\\python.exe backend\\ingest_knowledge.py

Sources (all public, no auth):
  1. The Blue Alliance (thebluealliance.com) — Team 846 identity, all-years
     history and 2002-2026 season pages, plus identity + year-by-year/award
     history for a curated set of famous/championship FRC teams.
  2. FRCDesign.org — every page in its published sitemap (FRC CAD design
     learning course, design handbook, best practices, mechanism examples).
  3. Wikipedia — FRC main article + per-year game articles (2016-2026) + the
     complete 1992-2027 games table.
  4. Chief Delphi (www.chiefdelphi.com, a Discourse forum) — first posts of
     the top-liked white papers in the CD-Media: Papers category, plus
     Team 846 build/technical threads.
  5. FIRST's official site — 2026 REBUILT game details and the 2027
     BIOCORE season announcement.

The database is rebuilt from scratch on each run (deterministic). Nothing
here needs API keys; scraping is throttled and polite (~0.25-0.5 s between
requests). Re-run occasionally to refresh.
"""
import html as _html
import json
import os
import re
import sqlite3
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "data" / "frc_knowledge.db"
UA = "Nova-FRC-KnowledgeBot/1.0 (FIRST robotics tutor; contact: lynbrookrobotics@gmail.com)"
DELAY = float(os.environ.get("INGEST_DELAY", "0.35"))

_session_started = time.time()
_fetch_log = []

# ----------------------------- fetching -----------------------------

def fetch(url, timeout=30, retries=2, binary=False):
    delay = DELAY
    last = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                time.sleep(delay)
                raw = resp.read()
                if binary:
                    return raw
                charset = resp.headers.get_content_charset() or "utf-8"
                try:
                    return raw.decode(charset, errors="replace")
                except LookupError:
                    return raw.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            if exc.code in (404, 410):
                _fetch_log.append((url, exc.code))
                return None
            last = exc
            time.sleep(2 * (attempt + 1))
        except (OSError, urllib.error.URLError) as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    print("  ! failed %s (%s)" % (url, last), flush=True)
    _fetch_log.append((url, str(last)))
    return None


# ----------------------------- HTML -> text -----------------------------

def html_to_text(html, keep_tables=True):
    """Lightweight HTML -> readable text (regex-based table handling, since
    the stdlib parser above buffers tables loosely)."""
    # 1) title from <title>
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else None
    # 2) drop scripts/styles/svg/head/nav/header/aside/footer/form wholesale
    text = re.sub(r"<(script|style|svg|noscript|template|head|nav|header|aside|footer|form)[^>]*>.*?</\1>", " ", html,
                  flags=re.IGNORECASE | re.DOTALL)
    # 3) tables: drop match tables, keep the rest as pipe rows
    def _table_sub(match):
        body = match.group(0)
        flat = re.sub(r"<[^>]+>", " ", body)
        if "Match" in flat and ("Red Alliance" in flat or "Blue Alliance" in flat):
            return " "
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", body, flags=re.IGNORECASE | re.DOTALL)
        out = []
        for row in rows:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, flags=re.IGNORECASE | re.DOTALL)
            cells = [re.sub(r"<[^>]+>", " ", c) for c in cells]
            cells = [re.sub(r"\s+", " ", c).strip() for c in cells]
            cells = [c for c in cells if c]
            if cells:
                out.append(" | ".join(cells))
        return "\n" + "\n".join(out) + "\n"
    if keep_tables:
        text = re.sub(r"<table[^>]*>.*?</table>", _table_sub, text, flags=re.IGNORECASE | re.DOTALL)
    else:
        text = re.sub(r"<table[^>]*>.*?</table>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    # 4) common block tags -> newlines
    text = re.sub(r"</(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|section|article|pre|blockquote|figure)>",
                  "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "\n- ", text, flags=re.IGNORECASE)
    text = re.sub(r"<h([1-6])[^>]*>", lambda m: "\n\n## " if m.group(1) in ("1", "2") else "\n", text,
                  flags=re.IGNORECASE)
    # 5) strip remaining tags, unescape entities
    text = re.sub(r"<[^>]+>", " ", text)
    text = unicodedata.normalize("NFKC", text)
    import html as _html
    text = _html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    lines, counts = text.splitlines(), {}
    for line in lines:
        s = line.strip()
        if 8 < len(s) < 400:
            counts[s] = counts.get(s, 0) + 1
    # drop repeated chrome lines and known nav-word-only lines
    _drop_exact = {
        "tba", "mytba", "events", "teams", "gameday", "insights", "more", "blog",
        "swag", "account", "history", "desktop version", "the blue alliance",
        "try beta new!", "add social media!", "photos & videos", "robot profile",
        "team info", "event results", "##", "-->", "participates",
    }
    _nav_words = {"events", "teams", "gameday", "insights", "more", "blog", "swag",
                  "account", "history", "photos", "videos", "robot", "profile",
                  "team", "info", "event", "results", "mytba", "tba"}
    _drop_re = re.compile(r"^-?\s*(19|20)\d{2}\s+Season\s*$", re.IGNORECASE)
    cleaned = []
    for line in lines:
        s = line.strip()
        if counts.get(s, 0) >= 4:
            continue
        if s.lower() in _drop_exact or _drop_re.match(s):
            continue
        words = re.findall(r"[a-z]+", s.lower())
        if 2 <= len(words) <= 10 and all(w in _nav_words for w in words):
            continue
        cleaned.append(line)
    text = "\n".join(cleaned)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return title, text.strip()


# ----------------------------- wikitext -> text -----------------------------

def wiki_api(page, prop="wikitext"):
    url = ("https://en.wikipedia.org/w/api.php?action=parse&page=%s&prop=%s&format=json"
           % (urllib.parse.quote(page, safe=""), prop))
    raw = fetch(url)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        if "error" in data:
            print("  ! wiki missing: %s (%s)" % (page, data["error"].get("code")), flush=True)
            return None
        return data.get("parse", {}).get(prop, {}).get("*")
    except ValueError:
        return None

def wiki_to_text(wt):
    text = wt
    text = re.sub(r"<ref[^>]*/\s*>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<ref[^>]*>.*?</ref>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    # templates: strip innermost-out loop (bounded)
    tpl = re.compile(r"\{\{[^{}]*\}\}")
    for _ in range(30):
        new = tpl.sub(" ", text)
        if new == text:
            break
        text = new
    text = re.sub(r"\{\{[^{}]*\{\{", " ", text)  # leftovers
    # links [[a|b]] -> b, [[a]] -> a
    text = re.sub(r"\[\[[^|\]]*\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[(https?://\S+)\s+([^\]]+)\]", r"\2", text)
    text = re.sub(r"\[https?://\S+\]", " ", text)
    # tables: emit "cell | cell | ..." rows with a real state machine
    lines, table_row, in_table = [], [], False
    def _flush_table_row():
        nonlocal table_row
        cells = [c.strip() for c in table_row if c.strip()]
        if cells:
            lines.append(" | ".join(cells))
        table_row = []
    for raw_line in text.splitlines():
        s = raw_line.strip()
        if s.startswith("{|"):
            in_table = True
            table_row = []
            continue
        if s.startswith("|}"):
            _flush_table_row()
            in_table = False
            continue
        if in_table:
            if s.startswith("|-"):
                _flush_table_row()
                continue
            if s.startswith("!"):
                _flush_table_row()   # header row: flush previous; skip header cells
                continue
            if s.startswith("|"):
                body = s.lstrip("|").strip()
                # attributes like "style=...|value" — take the value part
                if "|" in body and re.match(r"^[a-z\-]+=", body.split("|", 1)[0].strip()):
                    body = body.split("|", 1)[1].strip()
                cells = body.split("||")
                table_row.extend(cells)
                continue
            # continuation line inside a table cell
            if table_row:
                table_row[-1] = (table_row[-1] + " " + s).strip()
            continue
        lines.append(raw_line)
    _flush_table_row()
    text = "\n".join(lines)
    text = re.sub(r"={2,}([^=]+)={2,}", r"\n## \1\n", text)
    text = re.sub(r"'''", "", text)
    text = re.sub(r"''", "", text)
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ----------------------------- chunking -----------------------------

def chunk_text(text, size=900, overlap=120):
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks, current = [], ""
    for para in paragraphs:
        if len(para) > size:  # hard-split oversized paragraph
            if current:
                chunks.append(current)
                current = ""
            for i in range(0, len(para), size - overlap):
                chunks.append(para[i:i + size])
            continue
        if len(current) + len(para) + 2 <= size:
            current = (current + "\n\n" + para).strip() if current else para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return [c for c in chunks if len(c) >= 120]


# ----------------------------- database -----------------------------

SCHEMA = """
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  tags TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL
);
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  doc_id INTEGER NOT NULL REFERENCES documents(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL
);
CREATE VIRTUAL TABLE chunks_fts USING fts5(title, content, tokenize='unicode61');
CREATE INDEX idx_chunks_doc ON chunks(doc_id);
"""

class Builder:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        if DB_PATH.exists():
            DB_PATH.unlink()
        self.conn = sqlite3.connect(DB_PATH)
        self.conn.executescript(SCHEMA)
        self.count = 0

    def add(self, source, title, url, text, tags=""):
        if not text or len(text) < 200:
            print("  - skip (thin): %s" % url, flush=True)
            return
        chunks = chunk_text(text)
        if not chunks:
            return
        cur = self.conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO documents(source, title, url, tags, fetched_at) VALUES (?,?,?,?,?)",
            (source, title[:300], url, tags, time.strftime("%Y-%m-%dT%H:%M:%S")),
        )
        doc_id = cur.lastrowid
        cur.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
        for i, chunk in enumerate(chunks):
            cur.execute("INSERT INTO chunks(doc_id, chunk_index, content) VALUES (?,?,?)",
                        (doc_id, i, chunk))
            cur.execute("INSERT INTO chunks_fts(rowid, title, content) VALUES (?,?,?)",
                        (cur.lastrowid, title[:300], chunk))
        self.conn.commit()
        self.count += 1
        print("  + [%s] %s (%d chunks)" % (source, title[:80], len(chunks)), flush=True)

    def finish(self):
        self.conn.commit()
        self.conn.close()
        print("\nKnowledge base built: %s (%d documents)" % (DB_PATH, self.count), flush=True)


# ----------------------------- sources -----------------------------

def build_frcdesign(b):
    print("== FRCDesign.org ==", flush=True)
    sitemap = fetch("https://frcdesign.org/sitemap-0.xml")
    urls = re.findall(r"<loc>(.*?)</loc>", sitemap or "")
    print("sitemap pages: %d" % len(urls), flush=True)
    for url in urls:
        raw = fetch(url)
        if not raw:
            continue
        title, text = html_to_text(raw, keep_tables=True)
        title = title or url.rstrip("/").rsplit("/", 1)[-1]
        title = re.sub(r"\s*\|\s*FRCDesign\.org\s*$", "", title).strip()
        section = urllib.parse.urlparse(url).path.strip("/").split("/")[0] or "home"
        b.add("frcdesign.org", title, url, text, tags="cad, design, onshape, " + section)

def tba_to_text(html):
    title, text = html_to_text(html, keep_tables=False)
    return title, text

def build_tba(b):
    print("== The Blue Alliance ==", flush=True)
    # --- Team 846: identity + full history + season detail pages ---
    raw = fetch("https://www.thebluealliance.com/team/846")
    if raw:
        title, text = tba_to_text(raw)
        b.add("thebluealliance.com",
              "Team 846 — The Funky Monkeys — team profile (San Jose, CA; rookie 2002)",
              "https://www.thebluealliance.com/team/846", text,
              tags="team-846, thebluealliance, team, profile")
    raw = fetch("https://www.thebluealliance.com/team/846/history")
    if raw:
        title, text = tba_to_text(raw)
        b.add("thebluealliance.com",
              "Team 846 — complete competition history & all-time awards (2002-2027)",
              "https://www.thebluealliance.com/team/846/history", text,
              tags="team-846, thebluealliance, history, awards")
    for year in range(2002, 2027):
        url = "https://www.thebluealliance.com/team/846/%d" % year
        raw = fetch(url)
        if not raw:
            continue
        title, text = tba_to_text(raw)
        # trim the match-video noise: keep everything up to the first "Match |" block
        cut = text.find("Qualifications")
        if cut > 400 and text.count("Match") > 30:
            text = text[:cut] + "\n[Individual match scores omitted from this excerpt; see thebluealliance.com for full match data.]"
        b.add("thebluealliance.com", "Team 846 — %d season" % year, url, text,
              tags="team-846, thebluealliance, season, %d" % year)

    # --- famous / notable FRC teams: identity + history ---
    famous = [
        254, 27, 33, 45, 67, 111, 116, 118, 148, 197, 217, 365, 469, 971, 1058,
        1114, 1323, 1538, 1678, 1690, 1717, 1983, 2046, 2056, 2468, 2910, 3132,
        3310, 4414, 4451, 4613, 4946, 5940, 6324, 6328, 6329, 6800, 7769, 4065,
        6290, 2057, 3476, 1024, 884, 3015,
    ]
    for number in famous:
        for slug, label in (("", "profile"), ("/history", "history & awards")):
            url = "https://www.thebluealliance.com/team/%d%s" % (number, slug)
            raw = fetch(url)
            if not raw:
                continue
            title, text = tba_to_text(raw)
            name = _html.unescape(title or "Team %d" % number).replace(" - The Blue Alliance", "").strip()
            name = re.sub(r"^Team\s+", "Team " + str(number) + " — ", name)
            b.add("thebluealliance.com", "%s — %s" % (name, label), url, text,
                  tags="thebluealliance, team, famous, team-%d" % number)

GAME_ARTICLES = [
    ("FIRST Stronghold", "2016"), ("FIRST Steamworks", "2017"), ("FIRST Power Up", "2018"),
    ("Destination: Deep Space", "2019"), ("Infinite Recharge", "2020"), ("Rapid React", "2022"),
    ("Charged Up (FIRST)", "2023"), ("Crescendo (FIRST)", "2024"), ("Reefscape", "2025"),
    ("Rebuilt (FIRST)", "2026"),
]

def build_games(b):
    print("== FRC games (Wikipedia) ==", flush=True)
    for page, year in GAME_ARTICLES:
        wt = wiki_api(page)
        if not wt:
            continue
        text = wiki_to_text(wt)
        b.add("wikipedia.org", "FRC %s game — %s" % (year, page.split(" (")[0]),
              "https://en.wikipedia.org/wiki/" + urllib.parse.quote(page.replace(" ", "_")),
              text, tags="game, frc-game, %s, season" % year)
    # full 1992-2027 games table, straight from the FRC article wikitext
    wt = wiki_api("FIRST Robotics Competition", prop="wikitext")
    if wt:
        m = re.search(r"==\s*Games\s*==(.*?)(==\s*Gallery\s*==|$)", wt, re.DOTALL)
        if m:
            table = wiki_to_text(m.group(1))
            b.add("wikipedia.org", "Every FRC game 1992-2027 (complete list)",
                  "https://en.wikipedia.org/wiki/FIRST_Robotics_Competition#Games",
                  "Complete list of FIRST Robotics Competition games by year, from the FRC Wikipedia article:\n\n" + table,
                  tags="game, frc-game, list, history")

def build_wikipedia(b):
    print("== FRC overview (Wikipedia) ==", flush=True)
    wt = wiki_api("FIRST Robotics Competition")
    if wt:
        text = wiki_to_text(wt)
        keep = []
        for section in re.split(r"\n## ", "\n" + text):
            head = section.split("\n", 1)[0].strip().lower()
            if head.startswith(("history", "teams", "competition", "awards", "media exposure")):
                keep.append("## " + section)
        b.add("wikipedia.org", "FIRST Robotics Competition — overview, history, teams, awards",
              "https://en.wikipedia.org/wiki/FIRST_Robotics_Competition",
              "\n\n".join(keep), tags="frc, overview, awards, history")

def build_chiefdelphi(b):
    print("== Chief Delphi white papers ==", flush=True)
    topics = []
    for page in range(3):  # 90 top-liked papers
        raw = fetch("https://www.chiefdelphi.com/c/cd-media-papers/82.json?order=likes&ascending=false&page=%d" % page)
        if not raw:
            break
        try:
            data = json.loads(raw)
        except ValueError:
            break
        topics.extend((data.get("topic_list") or {}).get("topics", []))
        time.sleep(DELAY)
    print("candidate papers: %d" % len(topics), flush=True)
    seen = set()
    for topic in topics:
        tid, title = topic.get("id"), topic.get("title")
        likes = topic.get("like_count", 0)
        if not tid or tid in seen or likes < 20:
            continue
        seen.add(tid)
        raw = fetch("https://www.chiefdelphi.com/t/%s.json" % tid)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except ValueError:
            continue
        posts = data.get("post_stream", {}).get("posts", [])
        if not posts:
            continue
        cooked = posts[0].get("cooked", "")
        _, text = html_to_text(cooked, keep_tables=True)
        url = "https://www.chiefdelphi.com/t/%s" % topic.get("slug", tid) + "/%d" % tid
        b.add("chiefdelphi.com", "CD white paper: %s (%d likes)" % (title, likes), url, text,
              tags="chiefdelphi, whitepaper, engineering")
    # Team 846 threads on Chief Delphi
    print("== Chief Delphi — Team 846 threads ==", flush=True)
    raw = fetch("https://www.chiefdelphi.com/search.json?q=846&order=likes&page=1")
    if raw:
        try:
            data = json.loads(raw)
            results = (data.get("topics") or [])[:60]
            kept = 0
            for t in results:
                blob = (t.get("title", "") + " " + (t.get("excerpt") or "")).lower()
                if "846" not in blob or kept >= 12:
                    continue
                tid = t.get("id")
                raw2 = fetch("https://www.chiefdelphi.com/t/%s.json" % tid)
                if not raw2:
                    continue
                try:
                    d2 = json.loads(raw2)
                except ValueError:
                    continue
                posts = d2.get("post_stream", {}).get("posts", [])
                if not posts:
                    continue
                _, text = html_to_text(posts[0].get("cooked", ""), keep_tables=False)
                url = "https://www.chiefdelphi.com/t/%s/%d" % (t.get("slug", tid), tid)
                b.add("chiefdelphi.com", "CD thread (846): %s" % t.get("title", tid), url, text,
                      tags="team-846, chiefdelphi, thread")
                kept += 1
        except ValueError:
            pass

def build_firstinspires(b):
    print("== FIRST official ==", flush=True)
    raw = fetch("https://www.firstinspires.org/programs/frc/game-and-season")
    if raw:
        title, text = html_to_text(raw, keep_tables=False)
        # keep the season-specific prose, drop nav boilerplate
        cut = text.find("Game & Season Info")
        if cut != -1:
            text = text[cut:]
        b.add("firstinspires.org", "FIRST FRC Game & Season — 2026 REBUILT (FIRST AGE) and 2027 BIOCORE (FIRST CANOPY)",
              "https://www.firstinspires.org/programs/frc/game-and-season", text,
              tags="frc, season, 2026, 2027, game, kickoff")

def main():
    start = time.time()
    b = Builder()
    builders = [build_frcdesign, build_tba, build_games, build_wikipedia,
                build_chiefdelphi, build_firstinspires]
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for fn in builders:
        if only and fn.__name__ not in only and not any(fn.__name__.startswith(o) for o in only):
            continue
        try:
            fn(b)
        except Exception as exc:  # noqa: BLE001 — keep going, report at the end
            print("!! source %s failed: %s" % (fn.__name__, exc), flush=True)
    b.finish()
    docs = b.count
    print("done in %.1fs; %d documents; %d fetch failures" % (time.time() - start, docs, len(_fetch_log)))

if __name__ == "__main__":
    main()
