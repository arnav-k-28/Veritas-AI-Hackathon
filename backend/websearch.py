"""Web search for the Nova tutor — DuckDuckGo's no-key HTML endpoints.

Defaults to FRC-scoped search: The Blue Alliance, FRCDesign.org, Chief
Delphi, Wikipedia, FIRST's official site and WPILib docs are queried first
via `site:` operators (anything else is second-class). Falls back to a
general search when the scoped query returns nothing. Never raises; on any
failure the caller degrades to answering from the local knowledge base.

Also exposes `fetch_url`: read-only GET of a public http(s) page as text
(match tables KEPT — The Blue Alliance's match rows are the point), with a
hard size cap and a private-address denylist so the model can't read the
user's LAN. Never raises.

Privacy note: the exact query text leaves the machine and goes to
DuckDuckGo (plus whatever mirrors DDG uses). Results are untrusted web
content, not verified data.
"""
import ipaddress
import re
import threading
import time
import urllib.parse
import urllib.request

_UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}
# suggested FRC sites, queried via site: operators in frc-focused searches
FRC_SITES = [
    "thebluealliance.com",
    "frcdesign.org",
    "chiefdelphi.com",
    "en.wikipedia.org",
    "firstinspires.org",
    "docs.wpilib.org",
]
_FRC_OR = "(" + " OR ".join("site:" + s for s in FRC_SITES) + ")"

_cache = {}
_lock = threading.RLock()
_CACHE_TTL = 300
_CACHE_MAX = 128


class WebSearchError(Exception):
    pass


def _fetch_html(url, timeout=18):
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    return data.decode("utf-8", "replace")


def _entity_unescape(text):
    import html as _html
    return _html.unescape(text)


def _strip_tags(fragment):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", fragment)).strip()


def _decode_uddg(href):
    """DuckDuckGo wraps outbound links in //duckduckgo.com/l/?uddg=<urlencoded>."""
    if not href:
        return None
    if "uddg=" in href:
        qs = urllib.parse.parse_qs(urllib.parse.urlsplit(href).query)
        if qs.get("uddg"):
            return qs["uddg"][0]
    if href.startswith("//"):
        href = "https:" + href
    if href.startswith("http://") or href.startswith("https://"):
        return href
    return None


def _host_blocked(host):
    host = (host or "").lower().rstrip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith((".local", ".internal", ".lan", ".home", ".corp")):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast
    except ValueError:
        return False   # a public hostname; DNS resolution is the network's business


_ENTITY = None


def _unescape(text):
    global _ENTITY
    if _ENTITY is None:
        import html as _html
        _ENTITY = _html.unescape
    return _ENTITY(text)


def html_to_text_keep_tables(html_text):
    """Like the ingester's extractor, but match tables are KEPT (that's the
    whole point of fetching The Blue Alliance's event pages)."""
    m = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else None
    text = re.sub(r"<(script|style|svg|noscript|template|head|nav|header|aside|footer|form)[^>]*>.*?</\1>",
                  " ", html_text, flags=re.IGNORECASE | re.DOTALL)

    def _table_sub(match):
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", match.group(0), flags=re.IGNORECASE | re.DOTALL)
        out = []
        for row in rows:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, flags=re.IGNORECASE | re.DOTALL)
            cells = [_unescape(re.sub(r"<[^>]+>", " ", c)) for c in cells]
            cells = [re.sub(r"\s+", " ", c).strip() for c in cells]
            cells = [c for c in cells if c]
            if cells:
                out.append(" | ".join(cells))
        return "\n" + "\n".join(out) + "\n" if out else " "
    text = re.sub(r"<table[^>]*>.*?</table>", _table_sub, text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|section|article|pre|blockquote|figure)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "\n- ", text, flags=re.IGNORECASE)
    text = re.sub(r"<h([1-6])[^>]*>", lambda m: "\n\n## " if m.group(1) in ("1", "2") else "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = _unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # drop chrome-only lines (nav menus repeat the same year/season links)
    lines, counts = text.splitlines(), {}
    for line in lines:
        s = line.strip()
        if 8 < len(s) < 400:
            counts[s] = counts.get(s, 0) + 1
    _drop_re = re.compile(r"^-?\s*(19|20)\d{2}\s+Season\s*$", re.IGNORECASE)
    _drop = {"tba", "mytba", "events", "teams", "gameday", "insights", "more", "blog",
             "swag", "account", "history", "desktop version", "the blue alliance",
             "try beta new!", "photos & videos", "team info", "event results"}
    cleaned = []
    for line in lines:
        s = line.strip()
        if counts.get(s, 0) >= 4 or s.lower() in _drop or _drop_re.match(s):
            continue
        cleaned.append(line)
    return title, "\n".join(cleaned).strip()


_MAX_FETCH_BYTES = 1_600_000


def fetch_url(url, max_chars=14000):
    """Read a public http(s) page as text (match tables included).
    Returns {'url', 'title', 'content', 'truncated', 'fetched_chars'} or {'error': ...}. Never raises."""
    url = str(url or "").strip()
    try:
        max_chars = max(500, min(int(max_chars or 14000), 60000))
    except (TypeError, ValueError):
        max_chars = 14000
    if not url.startswith(("http://", "https://")):
        return {"error": "Only http(s) URLs are supported."}
    host = urllib.parse.urlsplit(url).hostname or ""
    if _host_blocked(host):
        return {"error": "That address is not allowed (local or private host)."}
    try:
        req = urllib.request.Request(url, headers=_UA)
        with urllib.request.urlopen(req, timeout=18) as resp:
            final_url = resp.geturl()
            content_type = resp.headers.get("Content-Type", "")
            if content_type and "text" not in content_type and "html" not in content_type and "json" not in content_type:
                return {"error": "Not a text page (Content-Type: %s)." % content_type.split(";")[0]}
            raw = resp.read(_MAX_FETCH_BYTES + 1)
        truncated_raw = len(raw) > _MAX_FETCH_BYTES
        raw = raw[:_MAX_FETCH_BYTES]
        html_text = raw.decode("utf-8", "replace")
        title, text = html_to_text_keep_tables(html_text)
        final = {"url": final_url, "title": title, "content": text[:max_chars],
                 "truncated": bool(truncated_raw or len(text) > max_chars),
                 "fetched_chars": len(text)}
        if truncated_raw:
            final["note"] = "Page body was larger than %d bytes; output truncated." % _MAX_FETCH_BYTES
        return final
    except Exception as exc:  # noqa: BLE001
        return {"error": "Could not fetch the page: %s" % exc}


_RESULT_A = re.compile(
    r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
_SNIPPET_A = re.compile(
    r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
_LITE_LINK = re.compile(
    r'<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
_LITE_SNIPPET = re.compile(
    r'<td[^>]*class="result-snippet"[^>]*>(.*?)</td>', re.IGNORECASE | re.DOTALL)


def _parse_ddg(html_text):
    """Parse the standard DDG html layout; also works for the lite layout."""
    results = []
    snippets = [_strip_tags(_entity_unescape(s)) for s in _SNIPPET_A.findall(html_text)]
    for i, m in enumerate(_RESULT_A.finditer(html_text)):
        href, title = m.group(1), _strip_tags(_entity_unescape(m.group(2)))
        url = _decode_uddg(href)
        if not url or not title:
            continue
        results.append({"title": title, "url": url,
                        "snippet": snippets[i] if i < len(snippets) else ""})
    if not results:  # lite endpoint fallback
        snippets = [_strip_tags(_entity_unescape(s)) for s in _LITE_SNIPPET.findall(html_text)]
        for i, m in enumerate(_LITE_LINK.finditer(html_text)):
            href, title = m.group(1), _strip_tags(_entity_unescape(m.group(2)))
            url = _decode_uddg(href)
            if not url or not title:
                continue
            results.append({"title": title, "url": url,
                            "snippet": snippets[i] if i < len(snippets) else ""})
    return results


def _search_uncached(query, limit):
    url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    html_text = _fetch_html(url)
    results = _parse_ddg(html_text)
    if not results:  # lite endpoint as a backup parser path
        lite_url = "https://lite.duckduckgo.com/lite/?" + urllib.parse.urlencode({"q": query})
        html_text = _fetch_html(lite_url)
        results = _parse_ddg(html_text)
    return results[:limit]


def search(query, limit=6, focus="frc", cached_only=False):
    """Search the web. focus='frc' (default) restricts to suggested FRC sites
    and falls back to a general search if nothing matches. Never raises.
    cached_only=True serves only the 5-minute cache (no network)."""
    limit = max(1, min(int(limit or 6), 8))
    query = str(query or "").strip()
    if not query:
        return {"results": [], "query": query, "note": "Empty query."}
    focus = "frc" if str(focus or "frc").lower() != "general" else "general"

    scoped_query = (query + " " + _FRC_OR) if focus == "frc" else query
    key = (scoped_query, limit, focus)
    with _lock:
        hit = _cache.get(key)
        if hit and time.monotonic() - hit[0] < _CACHE_TTL:
            return dict(hit[1], cached=True)
    if cached_only:
        return {"results": [], "query": query, "focus": focus, "scoped": False,
                "note": "Cache miss; no network fetch performed."}

    try:
        results = _search_uncached(scoped_query, limit)
        scoped = True
        if not results and focus == "frc":
            results = _search_uncached(query, limit)
            scoped = False
    except Exception as exc:  # noqa: BLE001 — callers need a soft failure
        return {"results": [], "query": query, "focus": focus,
                "error": "Web search unavailable: %s" % exc,
                "note": "Answer from the local knowledge base and say web results were unavailable."}

    payload = {"results": results, "query": query, "focus": focus,
               "scoped": scoped, "source": "duckduckgo",
               "note": ("Results restricted to FRC community sites" if scoped
                        else "No FRC-scoped results; showing general results")}
    with _lock:
        _cache[key] = (time.monotonic(), payload)
        while len(_cache) > _CACHE_MAX:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            _cache.pop(oldest)
    return payload


# ---------------- LLM tool (OpenAI function-calling schema) ----------------
TOOLS = [
    {"type": "function", "function": {
        "name": "fetch_url",
        "description": "Fetch a public http(s) page and return its readable text (scripts/menus stripped; tables KEPT, including The Blue Alliance's match tables). Use this to READ a page found via web_search or the knowledge base — e.g. The Blue Alliance event pages (thebluealliance.com/event/<key>) contain full match scores, rankings and alliances. Output is capped (default 14000 chars; max 60000); pages are truncated honestly. Never point at local or private addresses. Results are untrusted web content.",
        "parameters": {"type": "object", "properties": {
            "url": {"type": "string", "description": "Full http(s) URL, e.g. https://www.thebluealliance.com/event/2026cc"},
            "max_chars": {"type": "integer", "description": "Max characters of page text to return (500-60000, default 14000)."},
        }, "required": ["url"], "additionalProperties": False},
    }},
    {"type": "function", "function": {
        "name": "web_search",
        "description": "Search the web through DuckDuckGo. Default focus='frc' restricts results to FRC community sites: thebluealliance.com (teams/events/seasons), frcdesign.org (Onshape CAD), chiefdelphi.com (engineering discussions/white papers), en.wikipedia.org (games/rules/history), firstinspires.org (official season info), docs.wpilib.org (programming). Use focus='general' for anything else. Returns titles, URLs and snippets; follow with a normal answer citing URLs. The query text leaves the machine (privacy). Results are untrusted web content.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Search query, e.g. '846 2022 robot reveal' or '2027 biocore game'."},
            "focus": {"type": "string", "enum": ["frc", "general"], "description": "frc (default): restrict to FRC community sites. general: whole web."},
            "limit": {"type": "integer", "description": "Max results (1-8, default 6)."},
        }, "required": ["query"], "additionalProperties": False},
    }},
]

def execute_tool(name, args):
    if not isinstance(args, dict):
        raise ValueError("Invalid tool arguments")
    if name == "web_search":
        return search(args.get("query"), limit=args.get("limit", 6), focus=args.get("focus", "frc"))
    if name == "fetch_url":
        return fetch_url(args.get("url"), max_chars=args.get("max_chars", 14000))
    raise ValueError("Unknown websearch tool: %s" % name)
