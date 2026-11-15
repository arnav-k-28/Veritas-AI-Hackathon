"""Web search for the Nova tutor — DuckDuckGo's no-key HTML endpoints.

Defaults to FRC-scoped search: The Blue Alliance, FRCDesign.org, Chief
Delphi, Wikipedia, FIRST's official site and WPILib docs are queried first
via `site:` operators (anything else is second-class). Falls back to a
general search when the scoped query returns nothing. Never raises; on any
failure the caller degrades to answering from the local knowledge base.

Privacy note: the exact query text leaves the machine and goes to
DuckDuckGo (plus whatever mirrors DDG uses). Results are untrusted web
content, not verified data.
"""
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


def search(query, limit=6, focus="frc"):
    """Search the web. focus='frc' (default) restricts to suggested FRC sites
    and falls back to a general search if nothing matches. Never raises."""
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
    raise ValueError("Unknown websearch tool: %s" % name)
