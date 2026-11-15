import unittest
from unittest import mock
from pathlib import Path
import sys

BACKEND_DIR = str(Path(__file__).resolve().parents[1] / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import websearch  # noqa: E402

DDG_HTML = """
<html><body>
<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.chiefdelphi.com%2Ft%2Fswerve-drive%2F123&amp;rut=abc">Swerve drive kinematics</a>
<a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.chiefdelphi.com%2Ft%2Fswerve-drive%2F123">Second order kinematics for swerve drives explained in detail.</a>
<a rel="nofollow" class="result__a" href="https://en.wikipedia.org/wiki/Rebuilt_(FIRST)">Rebuilt (FIRST) - Wikipedia</a>
<a class="result__snippet" href="https://en.wikipedia.org/wiki/Rebuilt_(FIRST)">Rebuilt is the 2026 FRC game.</a>
</body></html>
"""

DDG_LITE = """
<html><body><table>
<a class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.thebluealliance.com%2Fteam%2F846&amp;rut=x">Team 846 - The Blue Alliance</a>
<td class="result-snippet">Team 846 from San Jose, California.</td>
</table></body></html>
"""

CAPTCHA_HTML = "<html><body>anomaly modal detected captcha</body></html>"


class TestWebSearchParsing(unittest.TestCase):
    def test_parses_uddg_redirects_and_snippets(self):
        results = websearch._parse_ddg(DDG_HTML)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["url"], "https://www.chiefdelphi.com/t/swerve-drive/123")
        self.assertEqual(results[0]["title"], "Swerve drive kinematics")
        self.assertIn("kinematics", results[0]["snippet"])
        self.assertEqual(results[1]["url"], "https://en.wikipedia.org/wiki/Rebuilt_(FIRST)")

    def test_parses_lite_layout(self):
        results = websearch._parse_ddg(DDG_LITE)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["url"], "https://www.thebluealliance.com/team/846")

    def test_empty_html_returns_empty(self):
        self.assertEqual(websearch._parse_ddg("<html></html>"), [])


class TestWebSearchBehavior(unittest.TestCase):
    def setUp(self):
        websearch._cache.clear()

    def _fake_fetch(self, url, timeout=18):
        if "lite.duckduckgo.com" in url:
            return DDG_LITE
        return DDG_HTML

    def test_frc_scope_appends_site_operators(self):
        captured = []
        def spy(url, timeout=18):
            captured.append(url)
            return DDG_HTML
        with mock.patch.object(websearch, "_fetch_html", spy):
            websearch.search("swerve kinematics", limit=4, focus="frc")
        self.assertTrue(captured)
        self.assertIn("site%3Athebluealliance.com", captured[0] or "")
        self.assertIn("swerve", captured[0])

    def test_general_focus_has_no_site_operators(self):
        captured = []
        def spy(url, timeout=18):
            captured.append(url)
            return DDG_HTML
        with mock.patch.object(websearch, "_fetch_html", spy):
            websearch.search("anything else", limit=4, focus="general")
        self.assertNotIn("site%3A", captured[0] or "")

    def test_frc_scoped_falls_back_to_general_when_empty(self):
        calls = []
        def spy(url, timeout=18):
            calls.append(url)
            if "site%3A" in url:
                return "<html></html>"      # scoped (html and lite): no hits
            return DDG_HTML                # general: hits
        with mock.patch.object(websearch, "_fetch_html", spy):
            out = websearch.search("obscure thing", limit=4, focus="frc")
        self.assertFalse(out["scoped"])
        self.assertEqual(len(out["results"]), 2)
        self.assertNotIn("site%3A", calls[-1])   # last call is the general one

    def test_failure_is_soft_and_cache_works(self):
        calls = []
        def boom(url, timeout=18):
            calls.append(url)
            raise OSError("network down")
        with mock.patch.object(websearch, "_fetch_html", boom):
            out = websearch.search("anything", limit=4, focus="frc")
        self.assertEqual(out["results"], [])
        self.assertIn("error", out)

    def test_success_is_cached_for_ttl(self):
        calls = []
        def spy(url, timeout=18):
            calls.append(url)
            return DDG_HTML
        with mock.patch.object(websearch, "_fetch_html", spy):
            first = websearch.search("cache me", limit=4, focus="general")
            second = websearch.search("cache me", limit=4, focus="general")
        self.assertEqual(len(calls), 1)
        self.assertTrue(second.get("cached"))
        self.assertEqual(first["results"], second["results"])

    def test_tool_schema_and_contract(self):
        tool = next(t["function"] for t in websearch.TOOLS if t["function"]["name"] == "web_search")
        self.assertEqual(tool["name"], "web_search")
        self.assertIn("query", tool["parameters"]["required"])
        self.assertFalse(tool["parameters"]["additionalProperties"])
        with mock.patch.object(websearch, "_fetch_html", self._fake_fetch):
            out = websearch.execute_tool("web_search", {"query": "x", "focus": "general", "limit": 2})
        self.assertLessEqual(len(out["results"]), 2)
        with self.assertRaises(ValueError):
            websearch.execute_tool("not_a_tool", {})
        with self.assertRaises(ValueError):
            websearch.execute_tool("web_search", "nope")


if __name__ == "__main__":
    unittest.main()
