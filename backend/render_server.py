"""Restricted hosted Primer preview: static UI and read-only SVN / STEP access.

Do not expose translator_server.py: it is designed for a single local user.
Render terminates HTTPS and supplies RENDER_EXTERNAL_HOSTNAME and PORT.
"""
import collections
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

import cad

ROOT = Path(__file__).resolve().parent.parent
HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '')
if not re.fullmatch(r'[a-z0-9][a-z0-9-]*\.onrender\.com', HOSTNAME):
    raise RuntimeError('RENDER_EXTERNAL_HOSTNAME must be the Render service hostname.')
ORIGIN = 'https://' + HOSTNAME
_attempts = collections.deque()
_attempt_lock = threading.Lock()
_slots = threading.BoundedSemaphore(4)


def allow_signin():
    # A conservative global limit; Render's proxy addresses are not user identities.
    with _attempt_lock:
        now = time.monotonic()
        while _attempts and _attempts[0] < now - 60:
            _attempts.popleft()
        if len(_attempts) >= 20:
            return False
        _attempts.append(now)
        return True


class Handler(BaseHTTPRequestHandler):
    server_version = 'PrimerHosted'
    def log_message(self, format, *args):
        # Paths and request headers may contain sensitive information.
        pass

    def send_bytes(self, data, content_type, status=200):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(data)

    def reply(self, data, status=200):
        self.send_bytes(json.dumps(data).encode('utf-8'), 'application/json; charset=utf-8', status)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/api/health':
            return self.reply({'ok': True, 'mode': 'hosted-preview'})
        if path.startswith('/api/'):
            return self.reply({'error': 'This feature is not available on the hosted preview.'}, 503)
        if path == '/':
            path = '/index.html'
        parts = path.lstrip('/').split('/')
        if (not parts or any(p in ('', '.', '..') or p.startswith('.') or '\\' in p for p in parts)
                or not (parts == ['index.html'] or parts[0] in ('css', 'js', 'vendor'))):
            return self.reply({'error': 'Not found.'}, 404)
        candidate = (ROOT / Path(*parts)).resolve()
        if ROOT not in candidate.parents or not candidate.is_file():
            return self.reply({'error': 'Not found.'}, 404)
        try:
            content = candidate.read_bytes()
            self.send_bytes(content, mimetypes.guess_type(candidate.name)[0] or 'application/octet-stream')
        except OSError:
            self.reply({'error': 'File unavailable.'}, 404)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ('/api/cad/svn/list', '/api/cad/svn/plan', '/api/cad/svn/local-open', '/api/cad/svn/logout'):
            return self.reply({'error': 'This feature is not available on the hosted preview.'}, 503)
        if self.headers.get_content_type() != 'application/json':
            return self.reply({'error': 'Invalid request.'}, 400)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 8192:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError()
        except (ValueError, UnicodeDecodeError):
            return self.reply({'error': 'Invalid request.'}, 400)
        if self.headers.get('Host', '').lower() != HOSTNAME or self.headers.get('Origin', '') != ORIGIN:
            return self.reply({'error': 'Requests must come from the Primer website.'}, 403)
        if not _slots.acquire(blocking=False):
            return self.reply({'error': 'The CAD service is busy. Try again shortly.'}, 429)
        try:
            self.handle_svn(path, payload)
        except cad.CadError as exc:
            self.reply({'error': str(exc)}, 400)
        except (OSError, ValueError, TypeError):
            self.reply({'error': 'Could not complete the SVN request.'}, 500)
        finally:
            _slots.release()

    def handle_svn(self, path, payload):
        session_id = self.headers.get('X-Nova-SVN-Session', '')
        if path.endswith('/list') and not session_id:
            if not allow_signin():
                return self.reply({'error': 'Too many sign-in attempts. Try again in a minute.'}, 429)
            username, password = payload.get('username'), payload.get('password')
            allow_http = payload.get('allow_http') is True
            result = cad.svn_list(username, password, payload.get('path', ''), allow_http=allow_http)
            result['session'] = cad.new_session(username, password, allow_http)
            return self.reply(result)
        session = cad.get_session(session_id)
        if path.endswith('/logout'):
            cad.close_session(session_id)
            return self.reply({'ok': True})
        if path.endswith('/list'):
            return self.reply(cad.svn_list(session['username'], session['password'], payload.get('path', ''), allow_http=session['allow_http']))
        plan = cad.svn_plan(session, payload.get('path'), payload.get('scope'))
        if path.endswith('/plan'):
            return self.reply(plan)
        plan_id = payload.get('plan_id')
        if not isinstance(plan_id, str) or not hmac.compare_digest(plan_id, plan['plan_id']):
            raise cad.CadError('The file list changed. Select the file again.')
        if not plan['selected'].lower().endswith(('.step', '.stp')):
            raise cad.CadError('Inventor files need a separate Windows Inventor or Autodesk conversion service; this hosted preview can open STEP files.')
        return self.send_bytes(cad.svn_download(session, plan['selected']), 'application/octet-stream')


if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '10000'))), Handler)
    server.serve_forever()
