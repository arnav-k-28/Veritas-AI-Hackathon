import unittest
from unittest import mock
from pathlib import Path
import sys

BACKEND_DIR = str(Path(__file__).resolve().parents[1] / "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import translator_server  # noqa: E402

KB_HIT_846 = {"title": "Team 846 — 2022 season", "url": "https://www.thebluealliance.com/team/846/2022",
              "source": "thebluealliance.com", "snippet": "Team 846 won the San Francisco Regional.", "score": -5.0}
KB_HIT_ANY = {"title": "FRC overview", "url": "https://en.wikipedia.org/wiki/FIRST_Robotics_Competition",
              "source": "wikipedia.org", "snippet": "FRC is a high-school robotics competition.", "score": -4.0}


def _kb(results):
    return mock.patch.object(translator_server.knowledge, "search",
                             return_value={"results": results})


def _ws():
    return mock.patch.object(translator_server.websearch, "search")


class TestTeamNumbers(unittest.TestCase):
    def test_chat_prompt_uses_selected_language_and_added_source(self):
        messages, _ = translator_server._build_full_messages(
            [{'role': 'user', 'content': 'Explain the note'}], 'spark', False, None,
            'es', '[DOCS] Motor setup: Use 0.42 for steering tuning.')
        self.assertIn('Answer in Spanish', messages[0]['content'])
        self.assertIn('Use 0.42 for steering tuning.', messages[0]['content'])
        self.assertEqual(messages[-1]['content'], 'Explain the note')

    def test_team_numbers_plain(self):
        self.assertEqual(translator_server._team_numbers("tell me about team 9876"), [9876])
        self.assertEqual(translator_server._team_numbers("team 254 focus"), [254])

    def test_team_numbers_exclude_years_but_not_team_years(self):
        self.assertEqual(translator_server._team_numbers("what happened at the 2027 kickoff"), [])
        self.assertEqual(translator_server._team_numbers("the 2026 season game"), [])
        self.assertEqual(translator_server._team_numbers("team 2026 Lynbrook"), [2026])


class TestAugmentWithWeb(unittest.TestCase):
    def _msgs(self):
        return [{"role": "system", "content": "sys"},
                {"role": "user", "content": "q"}]

    def test_tba_team_event_data_is_added_for_match_question(self):
        team = {"number": 846, "events_2026": [{"key": "2026cacg", "name": "CalGames"}]}
        with mock.patch.object(translator_server.tba, "is_configured", return_value=True), \
             mock.patch.object(translator_server.tba, "team_digest", return_value=team) as team_lookup, \
             mock.patch.object(translator_server.tba, "team_event_matches", return_value={"matches": [{"key": "2026cacg_qm1"}]}) as matches:
            messages, used = translator_server._augment_with_tba(self._msgs(), "Team 846 performance at CalGames 2026")
        team_lookup.assert_called_once_with(846, 2026)
        matches.assert_called_once_with(846, "2026cacg")
        self.assertTrue(used)
        self.assertIn("2026cacg_qm1", messages[1]["content"])

    def test_unknown_team_triggers_web_search(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            ws_search.return_value = {"results": [
                {"title": "Team 9876 - TBA", "url": "https://www.thebluealliance.com/team/9876",
                 "snippet": "Team 9876 from Somewhere.", "score": 0}]}
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "What does team 9876 do?")
        ws_search.assert_called_once()
        self.assertIn("team 9876", ws_search.call_args[0][0].lower())
        self.assertEqual(info["web"], 1)
        self.assertTrue(info["web_wanted"])
        self.assertEqual([m["role"] for m in out], ["system", "system", "system", "user"])
        self.assertIn("Live web results", out[2]["content"])
        self.assertIn("FRC knowledge base notes", out[1]["content"])

    def test_known_team_skips_web_search(self):
        with _kb([KB_HIT_846]) as kb_search, _ws() as ws_search:
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "What did team 846 do in 2022?")
        ws_search.assert_not_called()
        self.assertEqual(info["web"], 0)
        self.assertFalse(info["web_wanted"])
        self.assertEqual([m["role"] for m in out], ["system", "system", "user"])

    def test_known_team_event_performance_searches_specific_question(self):
        with _kb([KB_HIT_846]), _ws() as ws_search:
            ws_search.return_value = {"results": []}
            _, info = translator_server._augment_with_knowledge(
                self._msgs(), "How was team 846's performance at CalGames 2026?")
        self.assertTrue(info["web_wanted"])
        self.assertIn("CalGames 2026", ws_search.call_args[0][0])

    def test_freshness_question_triggers_web_even_without_team(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            ws_search.return_value = {"results": [
                {"title": "Kickoff", "url": "https://firstinspires.org/kickoff",
                 "snippet": "BIOCORE kickoff January 9 2027.", "score": 0}]}
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "what is this year's new game")
        ws_search.assert_called_once()
        self.assertTrue(info["web_wanted"])
        self.assertEqual(info["web"], 1)
        self.assertIn("FIRST Robotics", ws_search.call_args[0][0])

    def test_allow_web_false_blocks_network(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "What does team 9876 do?", allow_web=False)
        ws_search.assert_not_called()
        self.assertTrue(info["web_wanted"])
        self.assertEqual(info["web"], 0)

    def test_cached_only_flag_is_forwarded(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            ws_search.return_value = {"results": [], "query": "x", "cached": True}
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "What does team 9876 do?", web_from_cache_only=True)
        self.assertTrue(ws_search.call_args[1].get("cached_only"))
        self.assertEqual(info["web"], 0)  # cache miss -> nothing injected, but wanted

    def test_web_failure_degrades_to_kb(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            ws_search.side_effect = OSError("no route")
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "What does team 9876 do?")
        self.assertIn("FRC knowledge base notes", out[1]["content"])
        self.assertEqual(info["web"], 0)

    def test_non_frc_question_gets_nothing(self):
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "what is the weather today")
        kb_search.assert_not_called()
        ws_search.assert_not_called()
        self.assertEqual(len(out), 2)

    def test_mechanism_question_arms_frc_intent(self):
        # Regression: "what is a Telescoping Hook" matched no FRC pattern, so the
        # model answered from general knowledge instead of the knowledge base.
        with _kb([KB_HIT_ANY]) as kb_search, _ws() as ws_search:
            out, info = translator_server._augment_with_knowledge(
                self._msgs(), "what is a Telescoping Hook")
        kb_search.assert_called_once()
        self.assertIn("FRC knowledge base notes", out[1]["content"])


if __name__ == "__main__":
    unittest.main()
