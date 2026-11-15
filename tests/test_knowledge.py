import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = str(Path(__file__).resolve().parents[1] / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import ingest_knowledge  # noqa: E402
import knowledge  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
REAL_DB = REPO_ROOT / "data" / "frc_knowledge.db"


class TestKnowledgeSearch(unittest.TestCase):
    """Synthetic mini-database — no network required."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.db = Path(self._tmp.name) / "mini.db"
        self._old_ingest = ingest_knowledge.DB_PATH
        self._old_runtime = knowledge.DB_PATH
        ingest_knowledge.DB_PATH = self.db
        knowledge.DB_PATH = self.db
        builder = ingest_knowledge.Builder()
        builder.add("thebluealliance.com", "Team 846 — The Funky Monkeys — 2022 season",
                    "https://www.thebluealliance.com/team/846/2022",
                    "Team 846 won the San Francisco Regional in 2022 and reached the Galileo Division final at "
                    "the 2022 FIRST Championship. Their robot shot cargo into high goals and climbed in the endgame. " * 3,
                    tags="team-846, thebluealliance, season, 2022")
        builder.add("frcdesign.org", "Slapdown Intake Introduction",
                    "https://frcdesign.org/learning-course/stage2/2c/introduction/",
                    "A slapdown intake extends over the bumper to grab game pieces from the floor. Dead-axle rollers, "
                    "grippy squish wheels, and a spring-loaded pivot keep the mechanism robust and simple. " * 3,
                    tags="cad, design, onshape, intake")
        builder.add("wikipedia.org", "FRC 2026 game — Rebuilt",
                    "https://en.wikipedia.org/wiki/Rebuilt_(FIRST)",
                    "Rebuilt is the 2026 FIRST Robotics Competition game. Robots shoot Fuel, high-density foam balls, "
                    "into the Hub and climb a three-rung Tower in the endgame. Kickoff was January 10 2026. " * 3,
                    tags="game, frc-game, 2026, season")
        builder.finish()

    def tearDown(self):
        ingest_knowledge.DB_PATH = self._old_ingest
        knowledge.DB_PATH = self._old_runtime
        self._tmp.cleanup()

    def test_tokenize_keeps_team_numbers_and_drops_stopwords(self):
        tokens = knowledge.tokenize("What is team 846 known for at the 2022 championship?")
        self.assertIn("846", tokens)
        self.assertIn("2022", tokens)
        self.assertNotIn("what", tokens)
        self.assertNotIn("the", tokens)

    def test_tokenize_strips_possessives(self):
        tokens = knowledge.tokenize("What are Team 254's focus areas?")
        self.assertIn("254", tokens)
        self.assertNotIn("254's", tokens)

    def test_search_finds_relevant_chunk(self):
        result = knowledge.search("slapdown intake rollers", limit=3)
        self.assertEqual(result["results"][0]["url"], "https://frcdesign.org/learning-course/stage2/2c/introduction/")

    def test_search_finds_the_2026_game(self):
        result = knowledge.search("2026 game Rebuilt Fuel", limit=3)
        self.assertEqual(result["results"][0]["url"], "https://en.wikipedia.org/wiki/Rebuilt_(FIRST)")

    def test_team_846_bias_wins_ties(self):
        result = knowledge.search("team 846 alliance", limit=3)
        self.assertTrue(any(r["url"].endswith("/team/846/2022") for r in result["results"]))

    def test_search_never_raises_on_empty_query(self):
        self.assertEqual(knowledge.search("", limit=3)["results"], [])
        self.assertEqual(knowledge.search("the a an", limit=3)["results"], [])

    def test_stats_reports_build(self):
        stats = knowledge.stats()
        self.assertTrue(stats["built"])
        self.assertEqual(stats["docs"], 3)
        self.assertGreaterEqual(stats["chunks"], 3)

    def test_execute_tool_contract(self):
        out = knowledge.execute_tool("search_frc_knowledge", {"query": "Rebuilt", "limit": 2})
        self.assertLessEqual(len(out["results"]), 2)
        self.assertTrue(all("url" in r for r in out["results"]))
        with self.assertRaises(ValueError):
            knowledge.execute_tool("nonsense_tool", {})
        with self.assertRaises(ValueError):
            knowledge.execute_tool("search_frc_knowledge", "not a dict")

    def test_tool_schema_is_openai_compatible(self):
        tool = knowledge.TOOLS[0]["function"]
        self.assertEqual(tool["name"], "search_frc_knowledge")
        params = tool["parameters"]
        self.assertIn("query", params["properties"])
        self.assertIn("query", params["required"])
        self.assertFalse(params["additionalProperties"])


@unittest.skipUnless(REAL_DB.exists(), "run backend/ingest_knowledge.py first")
class TestRealKnowledgeBase(unittest.TestCase):
    """Smoke tests against the committed production database."""

    def test_corpus_is_substantial(self):
        stats = knowledge.stats()
        self.assertGreaterEqual(stats["docs"], 300)

    def test_team_846_is_well_covered(self):
        result = knowledge.search("team 846", limit=8)
        urls = [r["url"] for r in result["results"]]
        self.assertTrue(any(("team/846" in u) or ("846" in u) for u in urls), urls)
        # TBA (the primary source of truth) must contribute too
        self.assertTrue(any("thebluealliance.com/team/846" in u for u in urls), urls)

    def test_team_254_possessive_query_returns_254_not_846(self):
        result = knowledge.search("What are Team 254's focus areas?", limit=5)
        urls = [r["url"] for r in result["results"]]
        self.assertIn("https://www.thebluealliance.com/team/254", urls)
        # no 846-tagged Chief Delphi threads or curated docs leak in
        for r in result["results"]:
            self.assertNotIn("team-846", r.get("title", "").lower() + str(r.get("url")))
        self.assertNotIn("curated://frc-common-knowledge/frc-team-846", urls)

    def test_frcdesign_is_indexed(self):
        result = knowledge.search("onshape best practices assembly", limit=6)
        self.assertTrue(any("frcdesign.org" in r["url"] for r in result["results"]))

    def test_2026_game_is_indexed(self):
        result = knowledge.search("2026 Rebuilt game Fuel Tower", limit=6)
        self.assertTrue(any("Rebuilt" in r["title"] for r in result["results"]))

    def test_famous_teams_are_indexed(self):
        result = knowledge.search("254 Cheesy Poofs", limit=6)
        self.assertTrue(any("team/254" in r["url"] for r in result["results"]))


if __name__ == "__main__":
    unittest.main()
