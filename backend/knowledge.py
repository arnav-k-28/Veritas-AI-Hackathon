"""Primer's local FRC knowledge base (RAG).

Reads the pre-built SQLite database at data/frc_knowledge.db (built by
backend/ingest_knowledge.py) and answers searches with BM25-ranked chunks
from across the corpus: The Blue Alliance team/season pages, FRCDesign.org
CAD docs, recent FRC game write-ups, top Chief Delphi white papers and a
public FIRST materials.

Everything here is read-only, network-free and cheap to call; the chat
layer injects the top hits into the system prompt and also exposes a
`search_frc_knowledge` tool so capable models can dig deeper on demand.
If the database is missing the module degrades to empty results instead
of crashing the chat server.
"""
import re
import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "data" / "frc_knowledge.db"

# Small stopword list; pure digits (team numbers, years) are always kept.
_STOP = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "could",
    "did", "do", "does", "for", "from", "get", "had", "has", "have", "how", "i",
    "in", "into", "is", "it", "its", "me", "my", "of", "on", "or", "should", "so",
    "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
    "to", "too", "us", "was", "we", "were", "what", "when", "where", "which", "who",
    "why", "with", "would", "you", "your",
}

_token_re = re.compile(r"[a-z0-9][a-z0-9+\-'#]{0,30}")

def _connect():
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=2)
    conn.row_factory = sqlite3.Row
    return conn

def tokenize(query):
    tokens = _token_re.findall(str(query or "").lower())
    seen, out = set(), []
    for tok in tokens:
        # possessives: "254's" -> "254" (otherwise the team number vanishes)
        tok = tok.replace("'s", "").replace("'", "")
        if not tok:
            continue
        if tok in _STOP or (len(tok) < 2 and not tok.isdigit()):
            continue
        if tok not in seen:
            seen.add(tok)
            out.append(tok)
        if len(out) >= 12:
            break
    return out

def _fts_query(terms):
    # double-quoted terms are safe FTS5 phrases; OR keeps recall broad
    return " OR ".join('"%s"' % t.replace('"', "") for t in terms)

def search(query, limit=6):
    """Return {'results': [...], 'query': query} — never raises."""
    limit = max(1, min(int(limit or 6), 12))
    terms = tokenize(query)
    if not terms:
        return {"results": [], "query": query, "note": "No usable search terms."}
    conn = _connect()
    if conn is None:
        return {"results": [], "query": query, "note": "Knowledge base is not built yet (run backend/ingest_knowledge.py)."}
    try:
        try:
            rows = conn.execute(
                "SELECT d.title AS title, c.content AS content, d.url, d.source, d.tags, bm25(chunks_fts, 3.0, 1.0) AS rank"
                " FROM chunks_fts"
                " JOIN chunks c ON c.id = chunks_fts.rowid"
                " JOIN documents d ON d.id = c.doc_id"
                " WHERE chunks_fts MATCH ?"
                " ORDER BY rank"
                " LIMIT ?",
                (_fts_query(terms), limit * 3),
            ).fetchall()
        except sqlite3.Error:
            like = "%" + terms[0] + "%"
            rows = conn.execute(
                "SELECT d.title AS title, c.content AS content, d.url, d.source, d.tags, 0.0 AS rank"
                " FROM chunks c JOIN documents d ON d.id = c.doc_id"
                " WHERE c.content LIKE ? OR d.title LIKE ? LIMIT ?",
                (like, like, limit * 3),
            ).fetchall()
        # rank adjustment: reward term coverage and a year mentioned in the title
        # (BM25 alone drowns "2026" game queries in every page tagged 2026)
        q_years = [t for t in terms if re.fullmatch(r"(19|20)\d{2}", t)]
        def _adjusted(row):
            text_l = ((row["title"] or "") + " " + row["content"]).lower()
            coverage = sum(1 for t in terms if t in text_l)
            bonus = 1.2 * coverage
            if q_years and any(y in (row["title"] or "") for y in q_years):
                bonus += 4.0
            return row["rank"] - bonus
        # sort by adjusted rank, then prefer docs whose team tags match the query
        rows = sorted(rows, key=_adjusted)
        q_teams = [t for t in terms if t.isdigit() and len(t) <= 5]
        if q_teams:
            _team_tag = re.compile(r"team-(\d{1,5})")
            def _bucket(row):
                tags = _team_tag.findall(row["tags"] or "")
                if not tags:
                    return 1     # untagged general knowledge stays in play
                return 0 if any(n in tags for n in q_teams) else 2
            rows = sorted(rows, key=_bucket)   # stable: keeps adjusted order inside buckets
            keep = [r for r in rows if _bucket(r) < 2]
            # only fall back to other teams' docs if there aren't enough on the asked team
            rows = keep if len(keep) >= limit else keep + [r for r in rows if _bucket(r) == 2]
        # one chunk per source document — different documents win, not repeated pages
        seen, results = set(), []
        for row in rows:
            if row["url"] in seen:
                continue
            seen.add(row["url"])
            results.append({
                "title": row["title"],
                "url": row["url"],
                "source": row["source"],
                "snippet": row["content"][:600],
                "score": round(float(row["rank"]), 3),
            })
            if len(results) >= limit:
                break
        return {"results": results, "query": query, "terms": terms}
    finally:
        conn.close()

def stats():
    conn = _connect()
    if conn is None:
        return {"built": False, "path": str(DB_PATH)}
    try:
        docs = conn.execute("SELECT count(*) FROM documents").fetchone()[0]
        chunks = conn.execute("SELECT count(*) FROM chunks").fetchone()[0]
        by_source = dict(conn.execute("SELECT source, count(*) FROM documents GROUP BY source").fetchall())
        built_at = conn.execute("SELECT max(fetched_at) FROM documents").fetchone()[0]
        return {"built": True, "docs": docs, "chunks": chunks, "by_source": by_source,
                "built_at": built_at, "path": str(DB_PATH)}
    finally:
        conn.close()

# ---------------- LLM tool (OpenAI function-calling schema) ----------------
TOOLS = [
    {"type": "function", "function": {
        "name": "search_frc_knowledge",
        "description": "Search Primer's local FRC knowledge base (The Blue Alliance team/season data, FRCDesign.org CAD/design docs, FRC game rules and history, top Chief Delphi engineering white papers, Team 846 in every year, and official FIRST materials). Use for FRC facts, team history, game rules, CAD technique, mechanism design, batteries, motors, swerve, etc. Returns ranked excerpts with source URLs.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Natural-language or keyword query, e.g. 'team 846 2022 season' or 'swerve kinematics whitepaper' or 'onshape design best practices'."},
            "limit": {"type": "integer", "description": "Max excerpts to return (1-8, default 5)."},
        }, "required": ["query"], "additionalProperties": False},
    }},
]

def execute_tool(name, args):
    if not isinstance(args, dict):
        raise ValueError("Invalid tool arguments")
    if name == "search_frc_knowledge":
        query = str(args.get("query", "")).strip()
        if not query:
            return {"results": [], "note": "Empty query."}
        limit = args.get("limit", 5)
        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = 5
        return search(query, limit=limit)
    raise ValueError("Unknown knowledge tool: %s" % name)
