import io
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

BACKEND_DIR = str(Path(__file__).resolve().parents[1] / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import tba  # noqa: E402

EVENT = {"key": "2026cc", "name": "Chezy Champs 2026", "event_type": 1,
         "start_date": "2026-09-18", "end_date": "2026-09-20",
         "city": "San Jose", "state_prov": "California", "country": "USA",
         "district": {"abbreviation": "CA"}, "website": "https://chezychamps.com"}
ALLIANCES = [{"number": i + 1, "captain": {"team_number": 100 + i},
              "picks": [{"team_number": 200 + i}, {"team_number": 300 + i}]} for i in range(3)]
RANKINGS = {"rankings": [{"rank": i + 1, "team_key": "frc%d" % (1000 + i),
                          "record": {"wins": 10, "losses": 2, "ties": 1},
                          "qual_points": 40 - i, "dq_count": 0} for i in range(5)]}
AWARDS = [{"name": "Engineering Inspiration", "award_type": 1, "event_key": "2026cc",
           "recipient_list": [{"team_key": "frc846", "awardee": None}], "year": 2026}]
MATCHES = [{"key": "2026cc_qm%d" % i, "comp_level": "qm", "set_number": 1,
            "match_number": i, "alliances": {
                "red": {"team_keys": ["frc1", "frc2", "frc3"], "score": 100},
                "blue": {"team_keys": ["frc4", "frc5", "frc6"], "score": 80}},
            "winning_alliance": "red"} for i in range(1, 101)]

TEAM = {"team_number": 846, "nickname": "The Funky Monkeys", "name": "FUHS Foundation",
        "rookie_year": 2002, "school_name": "Lynbrook High School",
        "city": "San Jose", "state_prov": "California", "country": "USA",
        "website": "https://www.lynbrookrobotics.com"}
EVENTS_SIMPLE = [{"key": "2026casf", "name": "San Francisco Regional",
                  "start_date": "2026-03-20", "event_type": 0, "week": 4}]
STATUSES = {"2026casf": {"qual": {"num_teams": 40, "ranking": {"rank": 3,
                                   "record": {"wins": 12, "losses": 3, "ties": 0},
                                   "qual_points": 30}},
                         "alliance": {"number": 1, "pick": 0},
                         "playoff": {"level": "qf", "status": "won"},
                         "alliance_status_str": "<b>Captain</b> of alliance 1",
                         "playoff_status_str": "Won match 12", "overall_status_str": "Ranked #3<br>"}}
TEAM_AWARDS = [{"name": "Winner", "award_type": 0, "event_key": "2022casf", "recipient_list": [], "year": 2022},
               {"name": "Woodie Flowers Award", "award_type": 21, "event_key": "2007sj", "recipient_list": [], "year": 2007}]


def fake_urlopen(mapping):
    """Build a urlopen replacement that answers per path suffix."""
    def _open(req, timeout=18):
        url = req.full_url
        for suffix, payload in mapping.items():
            if url.endswith(suffix):
                body = json.dumps(payload).encode("utf-8")

                class Resp:
                    status = 200
                    headers = {"Content-Type": "application/json"}

                    def read(self, n=-1):
                        return body if n < 0 else body[:n]

                    def __enter__(self):
                        return self

                    def __exit__(self, *exc):
                        return False
                return Resp()
        raise AssertionError("unexpected URL fetched: %s" % url)
    return _open


class TestTbaNoKey(unittest.TestCase):
    def setUp(self):
        self._old = os.environ.pop("TBA_AUTH_KEY", None)
        tba._cache.clear()

    def test_team_event_record_counts_wins_losses_and_unplayed(self):
        def match(n, red_score, blue_score, winner):
            return {"key": "event_qm%d" % n, "comp_level": "qm", "match_number": n,
                    "alliances": {"red": {"team_keys": ["frc846"], "score": red_score},
                                  "blue": {"team_keys": ["frc1"], "score": blue_score}},
                    "winning_alliance": winner}
        with mock.patch.object(tba, "_get", return_value=([match(1, 100, 80, "red"),
                match(2, 50, 70, "blue"), match(3, -1, -1, "")], None)):
            data = tba.team_event_matches(846, "2026cacg")
        self.assertEqual(data["record_all_matches"], {"wins": 1, "losses": 1, "ties": 0, "unplayed": 1})
        self.assertEqual([m["team_result"] for m in data["matches"]], ["win", "loss", "unplayed"])

    def tearDown(self):
        if self._old is not None:
            os.environ["TBA_AUTH_KEY"] = self._old
        tba._cache.clear()

    def test_event_tool_returns_actionable_error_without_key(self):
        out = tba.event_digest("2026cc")
        self.assertIn("not configured", out["error"])
        self.assertIn("TBA_AUTH_KEY", out["error"])

    def test_team_tool_returns_actionable_error_without_key(self):
        out = tba.team_digest(846)
        self.assertIn("TBA_AUTH_KEY", out["error"])


class TestTbaDigests(unittest.TestCase):
    def setUp(self):
        os.environ["TBA_AUTH_KEY"] = "test-key"
        tba._cache.clear()

    def tearDown(self):
        os.environ.pop("TBA_AUTH_KEY", None)
        tba._cache.clear()

    def test_event_digest_shape(self):
        mapping = {"/event/2026cc": EVENT, "/event/2026cc/alliances": ALLIANCES,
                   "/event/2026cc/rankings": RANKINGS, "/event/2026cc/awards": AWARDS,
                   "/event/2026cc/matches/simple": MATCHES}
        with mock.patch.object(tba.urllib.request, "urlopen", fake_urlopen(mapping)):
            out = tba.event_digest("2026cc")
        self.assertEqual(out["name"], "Chezy Champs 2026")
        self.assertEqual(out["location"], "San Jose, California, USA")
        self.assertEqual(out["alliances"][0]["captain"], 100)
        self.assertEqual(out["rankings"][0]["record"], "10-2-1")
        self.assertEqual(out["awards"][0]["name"], "Engineering Inspiration")
        self.assertTrue(out["matches_truncated"])
        self.assertEqual(out["total_matches"], 100)
        self.assertLessEqual(len(out["matches"]), 80)
        self.assertEqual(out["url"], "https://www.thebluealliance.com/event/2026cc")

    def test_event_alliances_accept_official_team_keys(self):
        mapping = {"/event/2026cc": EVENT,
                   "/event/2026cc/alliances": [{"picks": ["frc846", "frc254"], "declines": []}],
                   "/event/2026cc/rankings": {"rankings": []},
                   "/event/2026cc/awards": [], "/event/2026cc/matches/simple": []}
        with mock.patch.object(tba.urllib.request, "urlopen", fake_urlopen(mapping)):
            out = tba.event_digest("2026cc")
        self.assertEqual(out["alliances"][0], {"number": 1, "captain": 846, "picks": [846, 254]})

    def test_team_digest_shape(self):
        mapping = {"/team/frc846": TEAM, "/team/frc846/events/2026/simple": EVENTS_SIMPLE,
                   "/team/frc846/events/2026/statuses": STATUSES, "/team/frc846/awards": TEAM_AWARDS}
        with mock.patch.object(tba.urllib.request, "urlopen", fake_urlopen(mapping)):
            out = tba.team_digest("846")
        self.assertEqual(out["nickname"], "The Funky Monkeys")
        self.assertEqual(out["rookie_year"], 2002)
        self.assertEqual(out["events_2026"][0]["name"], "San Francisco Regional")
        self.assertEqual(out["statuses_2026"]["2026casf"]["rank"], 3)
        self.assertNotIn("<b>", out["statuses_2026"]["2026casf"]["alliance"])
        self.assertEqual(out["awards_recent"][0]["year"], 2022)

    def test_cache_prevents_second_fetch(self):
        calls = []
        mapping = {"/event/2026cc": EVENT, "/event/2026cc/alliances": [],
                   "/event/2026cc/rankings": {"rankings": []},
                   "/event/2026cc/awards": [], "/event/2026cc/matches/simple": []}
        inner = fake_urlopen(mapping)

        def spy(req, timeout=18):
            calls.append(req.full_url)
            return inner(req)

        with mock.patch.object(tba.urllib.request, "urlopen", spy):
            tba.event_digest("2026cc")
            tba.event_digest("2026cc")
        paths = sorted(c.split("/api/v3")[-1] for c in calls)
        self.assertEqual(paths, sorted(["/event/2026cc", "/event/2026cc/alliances",
                                        "/event/2026cc/awards", "/event/2026cc/matches/simple",
                                        "/event/2026cc/rankings"]))

    def test_authentication_is_sent_in_header(self):
        captured = []
        def spy(req, timeout=18):
            captured.append(req)
            return fake_urlopen({"/team/frc846": TEAM})(req, timeout=timeout)
        with mock.patch.object(tba.urllib.request, "urlopen", spy):
            data, error = tba._get('/team/frc846')
        self.assertIsNone(error)
        self.assertEqual(data['team_number'], 846)
        self.assertEqual(captured[0].get_header('X-tba-auth-key'), 'test-key')
        self.assertNotIn('test-key', captured[0].full_url)

    def test_http_errors_are_actionable(self):
        import urllib.error

        def boom(req, timeout=18):
            raise urllib.error.HTTPError(req.full_url, 401, "nope", None, io.BytesIO(b"{}"))
        with mock.patch.object(tba.urllib.request, "urlopen", boom):
            out = tba.event_digest("2026cc")
        self.assertIn("rejected", out["error"])

    def test_bad_keys_and_args(self):
        self.assertIn("Invalid event_key", tba.event_digest("!!!!")["error"])
        self.assertIn("Invalid team", tba.team_digest("abc")["error"])
        self.assertIn("Invalid team", tba.team_digest(-1)["error"])
        self.assertIn("Invalid season", tba.team_digest(846, year="not-a-year")["error"])
        with self.assertRaises(ValueError):
            tba.execute_tool("tba_nope", {})
        with self.assertRaises(ValueError):
            tba.execute_tool("tba_event", "nope")


if __name__ == "__main__":
    unittest.main()
