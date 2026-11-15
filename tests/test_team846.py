import base64
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import team846


def repo(name):
    return {'name': name, 'default_branch': 'main', 'description': '', 'private': False}


class Team846Tests(unittest.TestCase):
    def test_pagination_includes_all_pages(self):
        pages = [[repo('repo%d' % i) for i in range(100)], [repo('last')]]
        with patch.object(team846, 'request', side_effect=pages) as request:
            result = team846.repositories()
        self.assertEqual(len(result), 101)
        self.assertEqual(result[-1]['name'], 'last')
        self.assertIn('page=2', request.call_args_list[1].args[0])

    def test_repository_must_be_discovered_and_public(self):
        with patch.object(team846, 'repositories', return_value=[repo('allowed')]):
            with self.assertRaises(team846.GitHubError):
                team846.repo_info('other')
            with self.assertRaises(team846.GitHubError):
                team846.repo_info('../allowed')

    def test_reads_text_and_builds_source_url(self):
        data = {'type': 'file', 'size': 3, 'encoding': 'base64', 'content': base64.b64encode(b'abc').decode(), 'sha': '123'}
        with patch.object(team846, 'repo_info', return_value=repo('code')), patch.object(team846, 'request', return_value=data):
            result = team846.contents('code', 'src/test.java')
        self.assertEqual(result['content'], 'abc')
        self.assertEqual(result['url'], 'https://github.com/Team846/code/blob/main/src/test.java')

    def test_binary_and_traversal_are_rejected(self):
        with self.assertRaises(team846.GitHubError):
            team846.safe_path('../secret')
        data = {'type': 'file', 'size': 2, 'encoding': 'base64', 'content': base64.b64encode(b'a\0').decode()}
        with patch.object(team846, 'repo_info', return_value=repo('code')), patch.object(team846, 'request', return_value=data):
            with self.assertRaises(team846.GitHubError):
                team846.contents('code', 'image.png')

    def test_search_paths_reports_truncation(self):
        with patch.object(team846, 'tree', return_value={'repo': 'code', 'truncated': True, 'paths': ['src/Intake.java', 'src/Drive.java']}):
            result = team846.execute_tool('search_paths', {'repo': 'code', 'query': 'intake'})
        self.assertEqual(result['paths'], ['src/Intake.java'])
        self.assertTrue(result['truncated'])
        self.assertEqual(result['total'], 1)

    def test_search_repositories_filters_zero_score_matches(self):
        repos = [
            {'name': 'code-2026', 'description': 'competition robot', 'default_branch': 'main', 'language': 'Java', 'archived': False, 'topics': ['frc']},
            {'name': 'docs', 'description': 'team handbook', 'default_branch': 'main', 'language': 'Markdown', 'archived': False, 'topics': []},
        ]
        with patch.object(team846, 'repositories', return_value=repos):
            no_match = team846.execute_tool('search_repositories', {'query': 'zzzqqq'})
            self.assertEqual(no_match['results'], [])
            self.assertIn('note', no_match)
            match = team846.execute_tool('search_repositories', {'query': 'robot'})
            self.assertEqual([r['name'] for r in match['results']], ['code-2026'])

    def test_read_file_tool_truncates_and_reports(self):
        big = 'line\n' * 3000  # 15000 chars
        data = {'type': 'file', 'size': len(big), 'encoding': 'base64',
                'content': base64.b64encode(big.encode()).decode(), 'sha': '123'}
        with patch.object(team846, 'repo_info', return_value=repo('code')), patch.object(team846, 'request', return_value=data):
            result = team846.execute_tool('read_file', {'repo': 'code', 'path': 'src/Big.java'})
        self.assertTrue(result['truncated'])
        self.assertLessEqual(len(result['content']), 6000)
        self.assertEqual(result['total_lines'], 3001)

    def test_github_token_is_used_when_set(self):
        captured = {}
        class FakeResponse:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def read(self): return b'[]'
        def fake_urlopen(req, timeout=0):
            captured['auth'] = req.get_header('Authorization')
            return FakeResponse()
        with patch.object(team846, '_cache', {}), patch('urllib.request.urlopen', fake_urlopen):
            import os
            os.environ['GITHUB_TOKEN'] = 'test-token'
            try:
                team846.request('/orgs/Team846/repos', refresh=True)
            finally:
                del os.environ['GITHUB_TOKEN']
        self.assertEqual(captured['auth'], 'Bearer test-token')


if __name__ == '__main__':
    unittest.main()
