"""Read-only access to public Team846 GitHub repositories."""
import base64
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.github.com'
_cache = {}
_lock = threading.RLock()
_CACHE_MAX = 256


class GitHubError(Exception):
    pass


def request(path, ttl=300, refresh=False):
    with _lock:
        item = _cache.get(path)
        if item and not refresh and time.monotonic() - item[0] < ttl:
            return item[1]
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'Primer-Team846-Explorer', 'X-GitHub-Api-Version': '2022-11-28'}
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        # optional read-only PAT: lifts the 60 req/hr unauthenticated cap to 5,000/hr
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(API + path, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise GitHubError('GitHub rate limit or access restriction; try again later.') from exc
        raise GitHubError('GitHub returned HTTP %s; the repository or file may be unavailable.' % exc.code) from exc
    except (OSError, ValueError) as exc:
        raise GitHubError('GitHub is unavailable: %s' % exc) from exc
    with _lock:
        _cache[path] = (time.monotonic(), data)
        # bound the cache: drop the oldest entries when full (tree() payloads get big)
        while len(_cache) > _CACHE_MAX:
            oldest = min(_cache, key=lambda key: _cache[key][0])
            _cache.pop(oldest)
    return data


def repositories(refresh=False):
    repos = []
    page = 1
    while True:
        data = request('/orgs/Team846/repos?type=public&per_page=100&page=%d' % page, ttl=900, refresh=refresh)
        if not isinstance(data, list):
            raise GitHubError('Unexpected repository response')
        repos.extend({'name': x['name'], 'description': x.get('description') or '', 'default_branch': x['default_branch'], 'language': x.get('language'), 'archived': x.get('archived', False), 'updated_at': x.get('updated_at'), 'topics': x.get('topics', [])} for x in data if not x.get('private'))
        if len(data) < 100:
            return repos
        page += 1
        if page > 100:
            raise GitHubError('Repository pagination limit reached')


def _public_repositories():
    """Discover public repository names from GitHub's public organization pages."""
    with _lock:
        cached = _cache.get('public-repositories')
        if cached and time.monotonic() - cached[0] < 900:
            return cached[1]
    result = []
    seen = set()
    for page in range(1, 11):
        url = 'https://github.com/orgs/Team846/repositories?' + urllib.parse.urlencode({'type': 'all', 'page': page})
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Primer-Team846-Explorer'})
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read(2_000_001).decode('utf-8', 'replace')
        except (OSError, ValueError) as exc:
            raise GitHubError('GitHub public pages are unavailable: %s' % exc) from exc
        found = re.findall(r'href=["\']/Team846/([A-Za-z0-9_.-]+)["\']', html, re.I)
        added = 0
        for name in found:
            if name.lower() not in seen:
                seen.add(name.lower())
                result.append({'name': name, 'description': '', 'default_branch': 'HEAD', 'language': None,
                               'archived': False, 'updated_at': None, 'topics': []})
                added += 1
        if not added:
            break
    if not result:
        raise GitHubError('GitHub public pages did not return any repositories.')
    with _lock:
        _cache['public-repositories'] = (time.monotonic(), result)
    return result


def repositories_with_fallback(refresh=False):
    try:
        return {'repositories': repositories(refresh=refresh), 'fallback': False}
    except GitHubError as exc:
        if not _is_rate_or_net_error(exc):
            raise
        return {'repositories': _public_repositories(), 'fallback': True,
                'notice': 'Showing public GitHub pages because the API is unavailable.'}


def _public_archive(repo):
    """Read an actual public GitHub archive without extracting it to disk."""
    import io
    import zipfile
    if not isinstance(repo, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', repo):
        raise GitHubError('Invalid repository name')
    available = repositories_with_fallback()['repositories']
    info = next((item for item in available if item['name'].lower() == repo.lower()), None)
    if not info:
        raise GitHubError('Repository is not an accessible public Team846 repository.')
    key = 'archive:' + info['name']
    with _lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < 900:
            return cached[1]
    url = 'https://codeload.github.com/Team846/%s/zip/HEAD' % urllib.parse.quote(info['name'], safe='')
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Primer-Team846-Explorer'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read(25_000_001)
        if len(data) > 25_000_000:
            raise GitHubError('Repository archive is too large to browse here; open it on GitHub.')
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = {}
            total = 0
            for member in archive.infolist():
                path = member.filename.split('/', 1)
                if len(path) != 2 or not path[1] or member.is_dir():
                    continue
                relative = path[1]
                if member.file_size <= 200_000 and not any(part in ('.', '..') for part in relative.split('/')):
                    total += member.file_size
                    if total > 40_000_000 or len(entries) >= 10000:
                        raise GitHubError('Repository archive is too large to browse here; open it on GitHub.')
                    entries[relative] = archive.read(member)
        result = (info['name'], entries)
        with _lock:
            _cache[key] = (time.monotonic(), result)
        return result
    except GitHubError:
        raise
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        raise GitHubError('Could not read the public GitHub archive: %s' % exc) from exc


def _archive_contents(repo, path=''):
    safe_path(path)
    name, entries = _public_archive(repo)
    if path in entries:
        raw = entries[path]
        try:
            if b'\0' in raw:
                raise ValueError('binary')
            content = raw.decode('utf-8')
        except (ValueError, UnicodeDecodeError) as exc:
            raise GitHubError('This file is binary or is not UTF-8 text.') from exc
        url = 'https://github.com/Team846/%s/blob/HEAD/%s' % (urllib.parse.quote(name, safe=''), safe_path(path))
        return {'type': 'file', 'repo': name, 'path': path, 'branch': 'HEAD', 'url': url, 'content': content, 'fallback': True}
    prefix = path.strip('/') + '/' if path else ''
    children = {}
    for file_path in entries:
        if file_path.startswith(prefix):
            rest = file_path[len(prefix):]
            child, sep, _ = rest.partition('/')
            if child:
                children[child] = {'name': child, 'path': prefix + child, 'type': 'dir' if sep else 'file'}
    if not children and path:
        raise GitHubError('Path not found in the public GitHub archive.')
    return {'type': 'directory', 'entries': list(children.values()), 'fallback': True}


def contents_with_fallback(repo, path=''):
    safe_path(path)
    try:
        return contents(repo, path)
    except GitHubError as exc:
        if not _is_rate_or_net_error(exc):
            raise
        return _archive_contents(repo, path)


def repo_info(repo):
    if not isinstance(repo, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', repo):
        raise GitHubError('Invalid repository name')
    for item in repositories():
        if item['name'].lower() == repo.lower():
            return item
    raise GitHubError('Repository is not an accessible public Team846 repository; refresh the list.')


def safe_path(path):
    if not isinstance(path, str) or len(path) > 1000 or any(p in ('.', '..') for p in path.split('/')) or '\\' in path or path.startswith('/') or '\x00' in path:
        raise GitHubError('Invalid file path')
    return urllib.parse.quote(path, safe='/')


def contents(repo, path=''):
    info = repo_info(repo)
    quoted = safe_path(path)
    data = request('/repos/Team846/%s/contents/%s?ref=%s' % (urllib.parse.quote(info['name'], safe=''), quoted, urllib.parse.quote(info['default_branch'], safe='')))
    if isinstance(data, list):
        return {'type': 'directory', 'entries': [{'name': x['name'], 'path': x['path'], 'type': x['type']} for x in data if x.get('type') in ('file', 'dir')]}
    if data.get('type') != 'file' or data.get('size', 0) > 200000 or data.get('encoding') != 'base64':
        raise GitHubError('Only text files up to 200 KB can be displayed.')
    try:
        raw = base64.b64decode(data.get('content', ''), validate=False)
        if b'\0' in raw or len(raw) > 200000:
            raise ValueError('binary or too large')
        text = raw.decode('utf-8')
    except (ValueError, UnicodeDecodeError) as exc:
        raise GitHubError('This file is binary or is not UTF-8 text.') from exc
    branch = info['default_branch']
    url = 'https://github.com/Team846/%s/blob/%s/%s' % (urllib.parse.quote(info['name'], safe=''), urllib.parse.quote(branch, safe=''), quoted)
    return {'type': 'file', 'repo': info['name'], 'path': path, 'branch': branch, 'url': url, 'content': text, 'sha': data.get('sha')}


def tree(repo):
    info = repo_info(repo)
    data = request('/repos/Team846/%s/git/trees/%s?recursive=1' % (urllib.parse.quote(info['name'], safe=''), urllib.parse.quote(info['default_branch'], safe='')))
    return {'repo': info['name'], 'truncated': data.get('truncated', False), 'paths': [x['path'] for x in data.get('tree', []) if x.get('type') == 'blob']}


# Tool schemas are sent to llama-server using its OpenAI-compatible API.
TOOLS = [
    {'type': 'function', 'function': {'name': 'list_repositories', 'description': 'List all public Team846 repositories, including archived repositories. Use only when you need an overview; otherwise prefer search_repositories.', 'parameters': {'type': 'object', 'properties': {}, 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'search_repositories', 'description': 'Search repository names, descriptions, topics and language. Use ONLY for questions about Team846 repositories or their code.', 'parameters': {'type': 'object', 'properties': {'query': {'type': 'string', 'description': 'Keywords to search for, e.g. "drivetrain" or "vision". Match against names, descriptions, topics and language.'}}, 'required': ['query'], 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'search_paths', 'description': 'Search filenames and paths within a specific repository. This does not search file contents. Use after list_repositories/search_repositories to locate files.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string', 'description': 'Exact repository name from list_repositories or search_repositories, e.g. "code-2026".'}, 'query': {'type': 'string', 'description': 'Keywords matched against file paths, e.g. "intake" or "Swerve.java".'}}, 'required': ['repo', 'query'], 'additionalProperties': False}}},
    {'type': 'function', 'function': {'name': 'read_file', 'description': 'Read a Team846 source file (up to 6000 characters; longer files are truncated with `truncated: true`). Cite the returned URL. The first file read is offered to the viewer. Optionally highlight a line range when you know which lines are relevant.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string', 'description': 'Exact repository name, e.g. "code-2026".'}, 'path': {'type': 'string', 'description': 'Path within the repository as returned by search_paths, e.g. "src/main/java/Drive.java".'}, 'start_line': {'type': 'integer', 'description': 'Optional first line number to highlight (1-based).'}, 'end_line': {'type': 'integer', 'description': 'Optional last line number to highlight (inclusive).'}}, 'required': ['repo', 'path'], 'additionalProperties': False}}},
]


def _is_rate_or_net_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return 'rate limit' in msg or 'unavailable' in msg


def execute_tool(name, args):
    if not isinstance(args, dict):
        raise GitHubError('Invalid tool arguments')
    if name == 'list_repositories':
        return repositories_with_fallback()['repositories']
    if name == 'search_repositories':
        terms = str(args.get('query', '')).lower().split()[:8]
        results = repositories_with_fallback()['repositories']

        def score(item):
            repo_name = item['name'].lower()
            topics = ' '.join(item['topics']).lower()
            desc_lang = (item['description'] + ' ' + (item.get('language') or '')).lower()
            # weight name matches 3x, topics 2x, description/language 1x
            return (3 * sum(repo_name.count(t) for t in terms)
                    + 2 * sum(topics.count(t) for t in terms)
                    + sum(desc_lang.count(t) for t in terms)) if terms else 1

        scored = ((score(item), item) for item in results)
        scored = [(s, item) for s, item in scored if s > 0]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        matches = [item for _, item in scored[:30]]
        if not matches:
            return {'results': [], 'note': 'No repositories matched %r; try different or broader keywords.' % str(args.get('query', ''))[:80]}
        return {'results': matches}
    if name == 'search_paths':
        try:
            result = tree(args.get('repo'))
        except GitHubError as exc:
            if not _is_rate_or_net_error(exc):
                raise
            repo_name, paths = _public_archive(args.get('repo'))
            result = {'repo': repo_name, 'truncated': False, 'paths': list(paths)}
        terms = str(args.get('query', '')).lower().split()[:8]
        if not terms:
            matches = result['paths']
        else:
            matches = [p for p in result['paths'] if any(t in p.lower() for t in terms)]

        def rank(path):
            # exact filename matches rank above directory substring matches
            return 0 if any(path.lower() == t or path.lower().endswith('/' + t) for t in terms) else 1

        matches.sort(key=rank)
        return {'repo': result['repo'], 'truncated': result['truncated'], 'total': len(matches), 'paths': matches[:100]}
    if name == 'read_file':
        clean_path = str(args.get('path') or '').lstrip('/')
        result = contents_with_fallback(args.get('repo'), clean_path)
        if result['type'] != 'file':
            raise GitHubError('Path is a directory')
        original = result['content']
        result['total_lines'] = original.count('\n') + 1
        result['truncated'] = len(original) > 6000
        result['content'] = original[:6000]
        return result
    raise GitHubError('Unknown tool')
