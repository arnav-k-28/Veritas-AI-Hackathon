"""Local, read-only Autodesk Platform Services CAD library.

Credentials and access keys come only from the server environment. CAD sources
are sent to APS only after an explicit import and are never extracted or run.
"""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import stat
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / '.runtime' / 'cad' / 'library.json'
MAX_UPLOAD = 100 * 1024 * 1024
MAX_EXPANDED = 1024 * 1024 * 1024
_lock = threading.RLock()
_tokens = {}
_sessions = {}
API = 'https://developer.api.autodesk.com'
SVN_BASE = 'https://svn.lynbrookrobotics.com/'
SVN_HTTP_BASE = 'http://svn.lynbrookrobotics.com/'


class CadError(Exception):
    pass


def configured():
    return all(os.environ.get(x, '').strip() for x in ('APS_CLIENT_ID', 'APS_CLIENT_SECRET', 'APS_BUCKET'))


def new_session(username, password, allow_http):
    session_id = secrets.token_urlsafe(32)
    with _lock:
        now = time.monotonic()
        for key in list(_sessions):
            if _sessions[key]['expires'] < now:
                del _sessions[key]
        _sessions[session_id] = {'username': username, 'password': password, 'allow_http': allow_http is True,
                                 'expires': now + 1800, 'models': set()}
    return session_id


def get_session(session_id):
    with _lock:
        session = _sessions.get(session_id or '')
        if not session or session['expires'] < time.monotonic():
            _sessions.pop(session_id or '', None)
            raise CadError('Your SVN session expired. Close and reopen CAD viewer to sign in again.')
        session['expires'] = time.monotonic() + 1800
        return session


def close_session(session_id):
    with _lock:
        _sessions.pop(session_id or '', None)


def authorized(key, admin=False):
    keys = [os.environ.get('NOVA_CAD_ADMIN_KEY', '')]
    if not admin:
        keys.append(os.environ.get('NOVA_CAD_VIEW_KEY', ''))
    return bool(key) and any(x and hmac.compare_digest(key, x) for x in keys)


def _request(url, method='GET', data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            body = response.read(2_000_001)
            if len(body) > 2_000_000:
                raise CadError('APS response was too large.')
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        raise CadError('Autodesk request failed (HTTP %s). Check APS configuration and account access.' % exc.code) from exc
    except (OSError, ValueError) as exc:
        raise CadError('Could not reach Autodesk or read its response.') from exc


def token(viewer=False):
    scope = 'viewables:read' if viewer else 'data:read data:write data:create bucket:read'
    with _lock:
        cached = _tokens.get(scope)
        if cached and cached[0] > time.monotonic():
            return dict(cached[1], expires_in=max(1, int(cached[0] - time.monotonic())))
        client = os.environ.get('APS_CLIENT_ID', '')
        secret = os.environ.get('APS_CLIENT_SECRET', '')
        if not client or not secret:
            raise CadError('APS credentials are not configured.')
        basic = base64.b64encode((client + ':' + secret).encode()).decode()
        data = urllib.parse.urlencode({'grant_type': 'client_credentials', 'scope': scope}).encode()
        result = _request(API + '/authentication/v2/token', 'POST', data,
                          {'Authorization': 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded'})
        if not result.get('access_token'):
            raise CadError('Autodesk did not return an access token.')
        _tokens[scope] = (time.monotonic() + max(0, int(result.get('expires_in', 300)) - 60), result)
        return result


def aps(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    return _request(API + path, method, data, {'Authorization': 'Bearer ' + token()['access_token'],
                                                'Content-Type': 'application/json'})


def validate_file(path, filename, root=''):
    name = Path(filename).name
    if name != filename or len(name) > 180:
        raise CadError('Invalid filename.')
    ext = Path(name).suffix.lower()
    if ext not in ('.zip', '.ipt', '.stp', '.step'):
        raise CadError('Use an Inventor assembly ZIP, .ipt, .step, or .stp. Assemblies require a ZIP of dependencies.')
    if not 0 < os.path.getsize(path) <= MAX_UPLOAD:
        raise CadError('File must be between 1 byte and 100 MB.')
    if ext != '.zip':
        if root:
            raise CadError('A root assembly is only used for ZIP packages.')
        return ''
    try:
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if not entries or len(entries) > 10000:
                raise CadError('Invalid or oversized ZIP file list.')
            paths = set()
            total = 0
            for item in entries:
                p = PurePosixPath(item.filename)
                if ('\\' in item.filename or p.is_absolute() or any(x in ('..', '.') for x in p.parts)
                        or ':' in item.filename or stat.S_ISLNK(item.external_attr >> 16) or item.flag_bits & 1):
                    raise CadError('ZIP contains an unsafe or encrypted path.')
                total += item.file_size
                if total > MAX_EXPANDED:
                    raise CadError('ZIP expands beyond the 1 GB limit.')
                if not item.is_dir():
                    if item.filename in paths:
                        raise CadError('ZIP contains duplicate file paths.')
                    paths.add(item.filename)
            if not root or root not in paths or not root.lower().endswith('.iam'):
                raise CadError('Enter the exact path of the top-level .iam file inside the ZIP.')
            if not any(p.lower().endswith(('.ipt', '.iam')) and p != root for p in paths):
                raise CadError('The assembly ZIP must include referenced parts or subassemblies.')
    except (zipfile.BadZipFile, OSError) as exc:
        raise CadError('The assembly package is not a valid ZIP.') from exc
    return root


def _read_library():
    try:
        value = json.loads(LIBRARY.read_text(encoding='utf-8'))
        return value if isinstance(value, list) else []
    except FileNotFoundError:
        return []
    except (OSError, ValueError) as exc:
        raise CadError('Could not read the CAD library.') from exc


def _save_library(items):
    LIBRARY.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=LIBRARY.parent, delete=False) as out:
        json.dump(items, out, ensure_ascii=False)
        temporary = out.name
    os.replace(temporary, LIBRARY)


def library():
    with _lock:
        return _read_library()


def svn_revision():
    """Read local working-copy metadata only; never contacts or modifies SVN."""
    working_copy = os.environ.get('NOVA_SVN_WORKING_COPY', '').strip()
    if not working_copy or not (Path(working_copy) / '.svn').is_dir():
        raise CadError('Configure NOVA_SVN_WORKING_COPY as the root of a local SVN working copy.')
    try:
        result = subprocess.run(['svn', 'info', '--xml', '--non-interactive', '--no-auth-cache', working_copy],
                                capture_output=True, timeout=10, check=True)
        entry = ET.fromstring(result.stdout).find('entry')
        revision = entry.get('revision') if entry is not None else None
        if not revision or not revision.isdigit():
            raise CadError('SVN did not return a working-copy revision.')
        return {'revision': revision}
    except (OSError, subprocess.SubprocessError, ET.ParseError) as exc:
        raise CadError('Could not read SVN metadata. Install the SVN command-line tools and check the working copy.') from exc


def _svn_html_listing(opener, url, auth, parts):
    """Fallback for SVN parent indexes that expose GET but reject PROPFIND."""
    request = urllib.request.Request(url, headers={'Authorization': 'Basic ' + auth, 'Accept': 'text/html'})
    try:
        with opener.open(request, timeout=20) as response:
            content_type = response.headers.get('Content-Type', '')
            if 'text/html' not in content_type.lower():
                raise CadError('SVN returned an unsupported repository index.')
            data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise CadError('The SVN directory listing is too large.')
    except (OSError, ValueError) as exc:
        raise CadError('The SVN server could not list this folder. Check the repository URL and server configuration.') from exc

    class Links(HTMLParser):
        def __init__(self):
            super().__init__()
            self.hrefs = []

        def handle_starttag(self, tag, attrs):
            if tag.lower() == 'a':
                href = dict(attrs).get('href')
                if href:
                    self.hrefs.append(href)

    parser = Links()
    parser.feed(data.decode('utf-8', 'replace'))
    parent_path = '/' + '/'.join(parts)
    found = {}
    for href in parser.hrefs:
        parsed = urllib.parse.urlsplit(urllib.parse.urljoin(url, href))
        if (parsed.scheme, parsed.netloc.lower()) != (urllib.parse.urlsplit(url).scheme, 'svn.lynbrookrobotics.com'):
            continue
        decoded = urllib.parse.unquote(parsed.path).rstrip('/')
        parent, _, name = decoded.rpartition('/')
        if parent != parent_path.rstrip('/') or not name or name.startswith('!') or name in ('.', '..') or '\\' in name or '%' in name:
            continue
        is_dir = parsed.path.endswith('/')
        if not is_dir and not name.lower().endswith(('.iam', '.ipt', '.ipj', '.step', '.stp', '.zip')):
            continue
        found[name] = {'name': name, 'path': '/'.join(parts + [name]), 'type': 'directory' if is_dir else 'file', 'revision': ''}
    if not found:
        raise CadError('The SVN server did not return a usable repository listing. Check the repository URL or ask the server administrator.')
    entries = sorted(found.values(), key=lambda item: (item['type'] != 'directory', item['name'].lower()))
    return {'path': '/'.join(parts), 'entries': entries[:1000], 'truncated': len(entries) > 1000}


def svn_list(username, password, path='', allow_http=False):
    """List an SVN WebDAV directory. HTTP requires explicit per-session approval."""
    if not isinstance(username, str) or not username or len(username) > 256 or ':' in username:
        raise CadError('Enter a valid SVN username.')
    if not isinstance(password, str) or not password or len(password) > 1024:
        raise CadError('Enter your SVN password.')
    if not isinstance(path, str) or len(path) > 2000 or '\\' in path or '\x00' in path:
        raise CadError('Invalid SVN directory.')
    parts = path.strip('/').split('/') if path.strip('/') else []
    if any(p in ('', '.', '..') or '/' in p or '%' in p for p in parts):
        raise CadError('Invalid SVN directory.')
    url = (SVN_HTTP_BASE if allow_http is True else SVN_BASE) + '/'.join(urllib.parse.quote(part, safe='') for part in parts)
    if not url.endswith('/'):
        url += '/'
    auth = base64.b64encode((username + ':' + password).encode('utf-8')).decode('ascii')
    body = b'<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/><D:version-name/></D:prop></D:propfind>'
    request = urllib.request.Request(url, data=body, method='PROPFIND', headers={
        'Authorization': 'Basic ' + auth, 'Depth': '1', 'Content-Type': 'application/xml'})

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    try:
        opener = urllib.request.build_opener(NoRedirect())
        with opener.open(request, timeout=20) as response:
            data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise CadError('The SVN directory listing is too large.')
        doc = ET.fromstring(data)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise CadError('SVN sign-in failed or this folder is not authorized.') from exc
        if exc.code in (405, 500, 501):
            return _svn_html_listing(opener, url, auth, parts)
        if 300 <= exc.code < 400:
            raise CadError('The SVN server requested a redirect, which Nova cannot follow safely. Check the repository URL.') from exc
        raise CadError('The SVN server returned HTTP %s. Check the repository URL or ask the server administrator.' % exc.code) from exc
    except (OSError, ET.ParseError, ValueError) as exc:
        message = ('Could not connect to the SVN server over HTTP.' if allow_http is True else
                   'Could not establish a verified HTTPS connection to the SVN server. Check its certificate and network access.')
        raise CadError(message) from exc
    entries = []
    ns = {'d': 'DAV:'}
    expected = '/' + '/'.join(parts)
    for response in doc.findall('d:response', ns):
        href = response.findtext('d:href', default='', namespaces=ns)
        parsed = urllib.parse.urlsplit(href)
        if parsed.netloc and parsed.netloc.lower() != 'svn.lynbrookrobotics.com':
            continue
        decoded = urllib.parse.unquote(parsed.path).rstrip('/')
        parent, _, name = decoded.rpartition('/')
        if parent != expected.rstrip('/') or not name or name in ('.', '..') or '/' in name or '\\' in name:
            continue
        prop = response.find("d:propstat/d:prop", ns)
        if prop is None:
            continue
        is_dir = prop.find('d:resourcetype/d:collection', ns) is not None
        if not is_dir and not name.lower().endswith(('.iam', '.ipt', '.ipj', '.step', '.stp', '.zip')):
            continue
        entries.append({'name': name, 'path': '/'.join(parts + [name]), 'type': 'directory' if is_dir else 'file',
                        'revision': prop.findtext('d:version-name', default='', namespaces=ns)})
    entries.sort(key=lambda entry: (entry['type'] != 'directory', entry['name'].lower()))
    return {'path': '/'.join(parts), 'entries': entries[:1000], 'truncated': len(entries) > 1000}


def svn_plan(session, file_path, scope=None):
    if not isinstance(file_path, str) or len(file_path) > 2000 or file_path.startswith('/') or '\\' in file_path or any(p in ('', '.', '..') or ':' in p or '%' in p or '\x00' in p or len(p) > 180 for p in file_path.split('/')):
        raise CadError('Invalid SVN file path.')
    parent, _, name = file_path.rpartition('/')
    if not name.lower().endswith(('.iam', '.ipt', '.step', '.stp')):
        raise CadError('Select an Inventor part, assembly, or STEP file.')
    creds = (session['username'], session['password'])
    root = svn_list(*creds, parent, allow_http=session['allow_http'])
    match = next((x for x in root['entries'] if x['type'] == 'file' and x['path'] == file_path), None)
    if not match:
        raise CadError('The selected SVN file is unavailable or you do not have access.')
    files = [file_path]
    packaged = name.lower().endswith('.iam') or (name.lower().endswith('.ipt') and scope is not None)
    if packaged:
        scope = parent if scope is None else scope
        if (not isinstance(scope, str) or (scope and (scope.startswith('/') or scope.endswith('/')
                or any(p in ('', '.', '..') or ':' in p or '%' in p or '\\' in p or '\x00' in p for p in scope.split('/'))))
                or (scope != parent and not parent.startswith(scope + '/') and scope != '')):
            raise CadError('The assembly folder must be the file’s folder or one of its parent folders.')
        pending = [scope]
        files = []
        while pending:
            folder = pending.pop()
            listing = root if folder == parent else svn_list(*creds, folder, allow_http=session['allow_http'])
            if listing.get('truncated'):
                raise CadError('The assembly folder contains too many items to package safely.')
            for entry in listing['entries']:
                if entry['type'] == 'directory':
                    pending.append(entry['path'])
                elif entry['name'].lower().endswith(('.iam', '.ipt', '.ipj')):
                    files.append(entry['path'])
                if len(files) + len(pending) > 200:
                    raise CadError('The assembly folder contains more than 200 CAD files or folders; use a smaller package.')
        if file_path not in files:
            raise CadError('The selected Inventor file was not found in its folder.')
    files.sort()
    digest = hashlib.sha256(json.dumps({'files': files, 'selected': file_path, 'scope': scope}, ensure_ascii=False).encode()).hexdigest()
    return {'selected': file_path, 'files': files, 'plan_id': digest,
            'assembly': name.lower().endswith('.iam'), 'packaged': packaged, 'revision': match.get('revision', ''),
            'scope': scope if packaged else parent}


def svn_download(session, file_path):
    parts = file_path.split('/')
    if any(p in ('', '.', '..') or '\\' in p or '%' in p for p in parts):
        raise CadError('Invalid SVN file path.')
    url = (SVN_HTTP_BASE if session['allow_http'] else SVN_BASE) + '/'.join(urllib.parse.quote(part, safe='') for part in parts)
    auth = base64.b64encode((session['username'] + ':' + session['password']).encode()).decode()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    try:
        opener = urllib.request.build_opener(NoRedirect())
        req = urllib.request.Request(url, headers={'Authorization': 'Basic ' + auth})
        with opener.open(req, timeout=60) as response:
            if 'text/html' in response.headers.get('Content-Type', '').lower():
                raise CadError('The SVN server returned a web page instead of the CAD file.')
            data = response.read(MAX_UPLOAD + 1)
        if not data or len(data) > MAX_UPLOAD:
            raise CadError('An SVN file is empty or exceeds the 100 MB limit.')
        return data
    except urllib.error.HTTPError as exc:
        raise CadError('Could not read the selected SVN file (HTTP %s).' % exc.code) from exc
    except OSError as exc:
        raise CadError('Could not read the selected SVN file.') from exc


def open_svn_local(session, plan):
    """Read the selected files from SVN and convert locally; never write to SVN."""
    import local_cad

    name = plan['selected'].rpartition('/')[2]
    if name.lower().endswith(('.step', '.stp')):
        return svn_download(session, plan['selected'])
    local_cad.WORK.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=local_cad.WORK) as tmp:
        directory = Path(tmp)
        if plan.get('packaged', plan['assembly']):
            archive_path = directory / 'assembly.zip'
            prefix = plan['scope'] + '/' if plan['scope'] else ''
            total = 0
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_STORED) as archive:
                for item in plan['files']:
                    data = svn_download(session, item)
                    total += len(data)
                    if total > local_cad.LIMIT:
                        raise CadError('The assembly files exceed the 100 MB limit.')
                    archive.writestr(item[len(prefix):], data)
            return local_cad.convert(archive_path, 'assembly.zip', plan['selected'][len(prefix):])
        source = directory / name
        source.write_bytes(svn_download(session, plan['selected']))
        return local_cad.convert(source, name)


def open_svn_model(session, plan):
    """Download only approved SVN files to a private temp file, then submit APS job."""
    name = plan['selected'].rpartition('/')[2]
    with tempfile.TemporaryDirectory(dir=LIBRARY.parent) as directory:
        if plan['assembly']:
            path = Path(directory) / 'assembly.zip'
            parent = plan['selected'].rpartition('/')[0]
            prefix = parent + '/' if parent else ''
            total = 0
            with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
                for item in plan['files']:
                    data = svn_download(session, item)
                    total += len(data)
                    if total > MAX_UPLOAD:
                        raise CadError('The selected assembly folder exceeds the 100 MB limit.')
                    archive.writestr(item[len(prefix):], data)
            model = import_model(path, name + '.zip', name, {'revision': plan['revision']})
        else:
            path = Path(directory) / name
            path.write_bytes(svn_download(session, plan['selected']))
            model = import_model(path, name, metadata={'revision': plan['revision']})
    with _lock:
        session['models'].add(model['id'])
    return model


def _find(model_id):
    return next((m for m in library() if m.get('id') == model_id), None)


def import_model(path, filename, root='', metadata=None):
    if not configured():
        raise CadError('CAD access and APS credentials are not configured.')
    root = validate_file(path, filename, root)
    bucket = os.environ['APS_BUCKET']
    if not re.fullmatch(r'[a-z0-9._-]{3,128}', bucket):
        raise CadError('Invalid APS bucket name.')
    model_id = uuid.uuid4().hex
    object_key = model_id + Path(filename).suffix.lower()
    object_path = '/oss/v2/buckets/%s/objects/%s' % (bucket, urllib.parse.quote(object_key, safe=''))
    size = os.path.getsize(path)
    part_size = 8 * 1024 * 1024
    parts = (size + part_size - 1) // part_size
    signed = aps(object_path + '/signeds3upload?parts=%d&minutesExpiration=60' % parts)
    urls, upload_key = signed.get('urls', []), signed.get('uploadKey')
    if len(urls) != parts or not upload_key:
        raise CadError('Autodesk did not provide all upload URLs.')
    with open(path, 'rb') as source:
        for url in urls:
            chunk = source.read(part_size)
            # APS supplies signed S3 URLs; do not forward the APS bearer token.
            req = urllib.request.Request(url, data=chunk, method='PUT', headers={'Content-Type': 'application/octet-stream'})
            try:
                with urllib.request.urlopen(req, timeout=180) as response:
                    response.read()
            except (OSError, ValueError) as exc:
                raise CadError('The CAD upload failed. Please retry.') from exc
    result = aps(object_path + '/signeds3upload', 'POST', {'uploadKey': upload_key})
    object_id = result.get('objectId')
    if not object_id:
        raise CadError('Autodesk did not return an uploaded object ID.')
    urn = base64.urlsafe_b64encode(object_id.encode()).decode().rstrip('=')
    metadata = metadata or {}
    digest = hashlib.sha256()
    with open(path, 'rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    model = {'id': model_id, 'name': filename, 'root': root, 'urn': urn,
             'revision': str(metadata.get('revision', ''))[:100], 'season': str(metadata.get('season', ''))[:20],
             'description': str(metadata.get('description', ''))[:500], 'status': 'submitted',
             'created': int(time.time()), 'sha256': digest.hexdigest()}
    with _lock:
        models = _read_library()
        models.append(model)
        _save_library(models)
    job_input = {'urn': urn}
    if root:
        job_input.update(compressedUrn=True, rootFilename=root)
    try:
        aps('/modelderivative/v2/designdata/job', 'POST', {'input': job_input,
            'output': {'formats': [{'type': 'svf2', 'views': ['3d']}]}})
    except CadError:
        with _lock:
            models = _read_library()
            for item in models:
                if item['id'] == model_id:
                    item['status'] = 'failed'
            _save_library(models)
        raise
    return model


def model_status(model_id):
    model = _find(model_id)
    if not model:
        raise CadError('Model not found.')
    manifest = aps('/modelderivative/v2/designdata/%s/manifest' % model['urn'])
    status = manifest.get('status', 'pending')
    with _lock:
        models = _read_library()
        for item in models:
            if item['id'] == model_id:
                item['status'] = status
        _save_library(models)
    messages = []
    def collect(node):
        if not isinstance(node, dict):
            return
        for message in node.get('messages', []):
            if isinstance(message, dict) and message.get('message'):
                messages.append(str(message['message'])[:300])
        for child in node.get('children', []):
            collect(child)
        for derivative in node.get('derivatives', []):
            collect(derivative)
    collect(manifest)
    return {'id': model_id, 'status': status, 'progress': manifest.get('progress', ''),
            'messages': messages[:10]}
