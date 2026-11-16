import http.client
import importlib
import json
import os
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
with patch.dict(os.environ, {'RENDER_EXTERNAL_HOSTNAME': 'primer-test.onrender.com'}):
    server_module = importlib.import_module('render_server')


class HostedServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = server_module.ThreadingHTTPServer(('127.0.0.1', 0), server_module.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, method, path, data=None, origin='https://primer-test.onrender.com'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        headers = {'Host': 'primer-test.onrender.com', 'Origin': origin}
        if data is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data)
        conn.request(method, path, data, headers)
        response = conn.getresponse()
        result = response.status, response.read()
        conn.close()
        return result

    def test_static_allowlist(self):
        self.assertEqual(self.request('GET', '/')[0], 200)
        self.assertEqual(self.request('GET', '/js/cad.js')[0], 200)
        for path in ('/backend/cad.py', '/.git/config', '/data/frc_knowledge.db', '/css/%2e%2e/backend/cad.py'):
            self.assertEqual(self.request('GET', path)[0], 404)

    def test_cross_origin_does_not_reach_svn(self):
        with patch.object(server_module.cad, 'svn_list') as svn:
            status, _ = self.request('POST', '/api/cad/svn/list', {'username': 'u', 'password': 'p'}, 'https://other.example')
            self.assertEqual(status, 403)
            svn.assert_not_called()

    def test_sign_in_and_browse(self):
        listing = {'path': '', 'entries': [], 'truncated': False}
        with patch.object(server_module.cad, 'svn_list', return_value=listing.copy()):
            status, body = self.request('POST', '/api/cad/svn/list', {'username': 'u', 'password': 'p', 'allow_http': True})
        self.assertEqual(status, 200)
        session = json.loads(body)['session']
        self.assertEqual(server_module.cad.get_session(session)['username'], 'u')
        server_module.cad.close_session(session)

    def test_unavailable_apis_are_explicit(self):
        self.assertEqual(self.request('POST', '/api/chat', {})[0], 503)

    def test_inventor_conversion_is_not_claimed_to_work(self):
        session = server_module.cad.new_session('u', 'p', True)
        plan = {'selected': 'part.ipt', 'plan_id': 'test-plan'}
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        with patch.object(server_module.cad, 'svn_plan', return_value=plan), patch.object(server_module.cad, 'svn_download') as download:
            conn.request('POST', '/api/cad/svn/local-open', json.dumps({'path': 'part.ipt', 'plan_id': 'test-plan'}),
                         {'Host': 'primer-test.onrender.com', 'Origin': 'https://primer-test.onrender.com',
                          'Content-Type': 'application/json', 'X-Nova-SVN-Session': session})
            response = conn.getresponse()
            self.assertEqual(response.status, 400)
            self.assertIn('Inventor files', response.read().decode())
            download.assert_not_called()
        conn.close()
        server_module.cad.close_session(session)


if __name__ == '__main__':
    unittest.main()
