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


if __name__ == '__main__':
    unittest.main()
