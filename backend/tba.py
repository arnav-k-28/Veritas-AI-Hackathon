"""The Blue Alliance API v3 — official, structured FRC event/team data.

Read-only. Auth via the TBA_AUTH_KEY environment variable (free: sign in with
Google at thebluealliance.com/account, copy the API key, e.g. set it in
Start Primer's environment or `setx TBA_AUTH_KEY ...`).

Without a key every tool call returns an actionable error dict and Primer keeps
working from its scraped knowledge base — nothing else changes.

Tool digests are compact by design (Spark's context is small):
- tba_event(event_key): event facts + alliances + rankings + awards + matches
  (matches capped; rankings and matches are trimmed for very large events).
- tba_team(team_number, year): team identity + this year's events + statuses
  + recent awards.
"""
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request

API = "https://www.thebluealliance.com/api/v3"
_TTL = 300
_CACHE_MAX = 256
_cache = {}
_lock = threading.RLock()

_EVENT_KEY = re.compile(r"^[A-Za-z0-9_-]{3,32}$")


def _key_error():
    return "TBA API not configured — set TBA_AUTH_KEY (free: thebluealliance.com/account after Google sign-in). Primer still answers from its knowledge base."


def is_configured():
    """Report only whether a key is present; never expose its value."""
    return bool(os.environ.get("TBA_AUTH_KEY", "").strip())


def _get(path, ttl=_TTL):
    """GET /api/v3/<path>. Returns (data, None) or (None, error). Never raises."""
    key = os.environ.get("TBA_AUTH_KEY", "").strip()
    if not key:
        return None, _key_error()
    with _lock:
        hit = _cache.get(path)
        if hit and time.monotonic() - hit[0] < ttl:
            return hit[1], None
    req = urllib.request.Request(API + path, headers={
        "X-TBA-Auth-Key": key,
        "User-Agent": "Primer-FRC-Tutor/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=18) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            return None, "TBA_AUTH_KEY was rejected (HTTP %s) — check the key." % exc.code
        if exc.code == 404:
            return None, "Not found on The Blue Alliance: %s" % path
        if exc.code == 429:
            return None, "TBA rate limit hit (HTTP 429) — try again shortly."
        return None, "TBA API error (HTTP %s)." % exc.code
    except (OSError, ValueError) as exc:
        return None, "TBA API unavailable: %s" % exc
    with _lock:
        _cache[path] = (time.monotonic(), data)
        while len(_cache) > _CACHE_MAX:
            oldest = min(_cache, key=lambda k: _cache[k][0])
            _cache.pop(oldest)
    return data, None


def _team_key(number):
    raw = str(number or "").strip().lower()
    if raw.startswith("frc"):
        raw = raw[3:]
    if not raw.isdigit() or not 1 <= int(raw) <= 99999:
        return None
    return "frc%d" % int(raw)


def _year_now():
    return int(time.strftime("%Y"))


def event_digest(event_key):
    if not _EVENT_KEY.match(str(event_key or "")):
        return {"error": "Invalid event_key %r (expected something like '2026cc')." % event_key}
    key = str(event_key)
    event, err = _get("/event/%s" % key)
    if err:
        return {"error": err, "event_key": key}
    out = {
        "event_key": key,
        "name": event.get("name"),
        "event_type": event.get("event_type"),
        "start_date": event.get("start_date"),
        "end_date": event.get("end_date"),
        "location": ", ".join(p for p in [event.get("city"), event.get("state_prov") or event.get("stateProv"), event.get("country")] if p),
        "district": (event.get("district") or {}).get("abbreviation") if isinstance(event.get("district"), dict) else event.get("district"),
        "website": event.get("website"),
        "url": "https://www.thebluealliance.com/event/%s" % key,
    }
    alliances, err = _get("/event/%s/alliances" % key)
    if not err and isinstance(alliances, list):
        def team_number(value):
            if isinstance(value, dict):
                return value.get("team_number")
            if isinstance(value, str) and value.startswith("frc") and value[3:].isdigit():
                return int(value[3:])
            return None
        out["alliances"] = [
            {"number": a.get("number") or i + 1,
             "captain": team_number(a.get("captain")) or (team_number((a.get("picks") or [None])[0])),
             "picks": [team_number(p) for p in a.get("picks", []) if team_number(p) is not None]}
            for i, a in enumerate(alliances[:16]) if isinstance(a, dict)
        ]
    rankings, err = _get("/event/%s/rankings" % key)
    if not err and isinstance(rankings, dict) and isinstance(rankings.get("rankings"), list):
        out["rankings"] = [
            {"rank": r.get("rank"), "team": (r.get("team_key") or "").replace("frc", ""),
             "record": ("%s-%s-%s" % (r.get("record", {}).get("wins", "?"), r.get("record", {}).get("losses", "?"), r.get("record", {}).get("ties", "?")) if isinstance(r.get("record"), dict) else None),
             "qual_points": r.get("qual_points")}
            for r in (rankings["rankings"])[:60]
        ]
    awards, err = _get("/event/%s/awards" % key)
    if not err and isinstance(awards, list):
        out["awards"] = [
            {"name": a.get("name"),
             "teams": [(r.get("team_key") or "").replace("frc", "") for r in a.get("recipient_list", []) if isinstance(r, dict)]}
            for a in awards[:40]
        ]
    matches, err = _get("/event/%s/matches/simple" % key)
    if not err and isinstance(matches, list):
        qm = [m for m in matches if m.get("comp_level") == "qm"]
        po = [m for m in matches if m.get("comp_level") != "qm"]
        cap = 80
        kept = qm[: max(0, cap - len(po))] + po
        def _one(m):
            def side(s):
                a = m.get("alliances", {}).get(s, {})
                return {"teams": [t.replace("frc", "") for t in a.get("team_keys", [])], "score": a.get("score")}
            return {"match": m.get("match_number"), "comp_level": m.get("comp_level"),
                    "set": m.get("set_number"), "red": side("red"), "blue": side("blue"),
                    "winner": m.get("winning_alliance")}
        out["matches"] = [_one(m) for m in kept]
        out["matches_truncated"] = len(matches) > len(kept)
        out["total_matches"] = len(matches)
    return out


def team_digest(team_number, year=None):
    key = _team_key(team_number)
    if not key:
        return {"error": "Invalid team %r — expected a number like 846." % team_number}
    n = int(key[3:])
    try:
        year = int(year) if year else _year_now()
        if not 1992 <= year <= 9999:
            raise ValueError()
    except (TypeError, ValueError):
        return {"error": "Invalid season year."}
    team, err = _get("/team/%s" % key)
    if err:
        return {"error": err, "team_key": key}
    out = {
        "team_key": key,
        "number": team.get("team_number"),
        "nickname": team.get("nickname"),
        "name": team.get("name"),
        "rookie_year": team.get("rookie_year"),
        "school": team.get("school_name"),
        "location": ", ".join(p for p in [team.get("city"), team.get("state_prov") or team.get("stateProv"), team.get("country")] if p),
        "website": team.get("website"),
        "url": "https://www.thebluealliance.com/team/%d" % n,
    }
    events, err = _get("/team/%s/events/%d/simple" % (key, year))
    if not err and isinstance(events, list):
        out["events_%d" % year] = [
            {"key": e.get("key"), "name": e.get("name"), "start_date": e.get("start_date"),
             "type": e.get("event_type"), "week": e.get("week")}
            for e in events
        ]
    statuses, err = _get("/team/%s/events/%d/statuses" % (key, year))
    if not err and isinstance(statuses, dict):
        def _clip(s, n):
            t = re.sub(r"<[^>]+>", " ", s).strip() if isinstance(s, str) else ""
            return t[:n] if t else None
        out["statuses_%d" % year] = {}
        for k, v in statuses.items():
            qual = v.get("qual") if isinstance(v, dict) else None
            out["statuses_%d" % year][k] = {
                "rank": ((qual or {}).get("ranking") or {}).get("rank") if qual else None,
                "record": ((qual or {}).get("ranking") or {}).get("record") if qual else None,
                "overall": _clip(v.get("overall_status_str"), 150) if isinstance(v, dict) else None,
                "alliance": _clip(v.get("alliance_status_str"), 100) if isinstance(v, dict) else None,
                "playoff": _clip(v.get("playoff_status_str"), 100) if isinstance(v, dict) else None,
            }
    awards, err = _get("/team/%s/awards" % key)
    if not err and isinstance(awards, list):
        def _yr(a):
            return a.get("year") or 0
        recent = sorted(awards, key=_yr, reverse=True)[:25]
        out["awards_recent"] = [
            {"year": a.get("year"), "name": a.get("name"), "event": a.get("event_key")}
            for a in recent
        ]
    return out


def team_event_matches(team_number, event_key):
    """Return all matches for one team at one event, without event-wide truncation."""
    team_key = _team_key(team_number)
    if not team_key or not _EVENT_KEY.fullmatch(str(event_key or "")):
        return {"error": "Invalid team or event key."}
    matches, err = _get("/team/%s/event/%s/matches/simple" % (team_key, event_key))
    if err:
        return {"error": err}
    if not isinstance(matches, list):
        return {"error": "The Blue Alliance returned an unexpected match response."}
    record = {"wins": 0, "losses": 0, "ties": 0, "unplayed": 0}
    summaries = []
    for m in matches:
        if not isinstance(m, dict):
            continue
        alliances = m.get("alliances") or {}
        red, blue = alliances.get("red") or {}, alliances.get("blue") or {}
        side = "red" if team_key in red.get("team_keys", []) else "blue" if team_key in blue.get("team_keys", []) else None
        if side is None:
            continue
        our_score = (red if side == "red" else blue).get("score")
        their_score = (blue if side == "red" else red).get("score")
        winner = m.get("winning_alliance")
        if not isinstance(our_score, (int, float)) or not isinstance(their_score, (int, float)) or our_score < 0 or their_score < 0:
            result = "unplayed"
        elif winner == side:
            result = "win"
        elif winner in ("red", "blue"):
            result = "loss"
        elif our_score == their_score:
            result = "tie"
        else:
            result = "unknown"
        record_key = {"win": "wins", "loss": "losses", "tie": "ties", "unplayed": "unplayed"}.get(result)
        if record_key:
            record[record_key] += 1
        summaries.append({"key": m.get("key"), "level": m.get("comp_level"),
                          "set": m.get("set_number"), "match": m.get("match_number"),
                          "team_alliance": side, "team_score": our_score,
                          "opponent_score": their_score, "team_result": result})
    return {"team": team_key, "event_key": event_key,
            "url": "https://www.thebluealliance.com/team/%s/%s" % (team_key[3:], str(event_key)[:4]),
            "record_all_matches": record, "matches": summaries}


def execute_tool(name, args):
    if not isinstance(args, dict):
        raise ValueError("Invalid tool arguments")
    if name == "tba_event":
        return event_digest(args.get("event_key"))
    if name == "tba_team":
        return team_digest(args.get("team"), year=args.get("year"))
    raise ValueError("Unknown TBA tool: %s" % name)


TOOLS = [
    {"type": "function", "function": {
        "name": "tba_event",
        "description": "Official FRC event data from The Blue Alliance API v3: name, dates, location, eliminations alliances, rankings, awards, and every match (qual and playoff, with scores). Use whenever the student asks about a specific event (e.g. '2026cc' = Chezy Champs 2026, '2026sac' etc.). The event_key is the slug in the TBA URL, e.g. thebluealliance.com/event/2026cc -> '2026cc'. Returns a compact digest. Requires TBA_AUTH_KEY (free); without it, returns a note and you should answer from the knowledge base or say data is unavailable.",
        "parameters": {"type": "object", "properties": {
            "event_key": {"type": "string", "description": "TBA event key, e.g. '2026cc' or '2026santaclara'."},
        }, "required": ["event_key"], "additionalProperties": False},
    }},
    {"type": "function", "function": {
        "name": "tba_team",
        "description": "Official FRC team data from The Blue Alliance API v3: identity (nickname, location, school, rookie year), this year's events, win/loss status per event, and recent awards. Use for questions about a specific team beyond the knowledge base. `team` is the team number, `year` defaults to the current year. Requires TBA_AUTH_KEY (free); without it, returns a note.",
        "parameters": {"type": "object", "properties": {
            "team": {"type": "integer", "description": "FRC team number, e.g. 846 (letters/prefixes like 'frc' are ignored)."},
            "year": {"type": "integer", "description": "Season year (default: current year)."},
        }, "required": ["team"], "additionalProperties": False},
    }},
]
