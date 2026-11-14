"""Read-only public Team846 GitHub access. Cache is process-local."""
import base64
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.github.com'
_cache = {}
_lock = threading.RLock()

class GitHubError(Exception):
    pass

def request(path, ttl=300, refresh=False):
    with _lock:
        item = _cache.get(path)
        if item and not refresh and time.monotonic() - item[0] < ttl:
            return item[1]
    req = urllib.request.Request(API + path, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'Nova-Team846-Explorer', 'X-GitHub-Api-Version': '2022-11-28'})
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
    {'type': 'function', 'function': {'name': 'list_repositories', 'description': 'List all public Team846 repositories, including archived repositories.', 'parameters': {'type': 'object', 'properties': {}}}},
    {'type': 'function', 'function': {'name': 'search_repositories', 'description': 'Search repository names, descriptions, topics and language.', 'parameters': {'type': 'object', 'properties': {'query': {'type': 'string'}}, 'required': ['query']}}},
    {'type': 'function', 'function': {'name': 'search_paths', 'description': 'Search filenames and paths within a specific repository. This does not search file contents.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string'}, 'query': {'type': 'string'}}, 'required': ['repo', 'query']}}},
    {'type': 'function', 'function': {'name': 'read_file', 'description': 'Read a Team846 source file and cite its returned URL. The first file read is offered to the viewer. Optionally highlight a line range when you know which lines are relevant.', 'parameters': {'type': 'object', 'properties': {'repo': {'type': 'string'}, 'path': {'type': 'string'}, 'start_line': {'type': 'integer'}, 'end_line': {'type': 'integer'}}, 'required': ['repo', 'path']}}},
]

def execute_tool(name, args):
    if not isinstance(args, dict):
        raise GitHubError('Invalid tool arguments')
    if name == 'list_repositories':
        return repositories()
    if name == 'search_repositories':
        terms = str(args.get('query', '')).lower().split()[:8]
        results = repositories()
        def score(item):
            hay = ' '.join([item['name'], item['description'], item.get('language') or '', ' '.join(item['topics'])]).lower()
            return sum(hay.count(term) for term in terms)
        return sorted(results, key=score, reverse=True)[:30]
    if name == 'search_paths':
        result = tree(args.get('repo'))
        terms = str(args.get('query', '')).lower().split()[:8]
        matches = [p for p in result['paths'] if any(t in p.lower() for t in terms)] if terms else result['paths']
        return {'repo': result['repo'], 'truncated': result['truncated'], 'paths': matches[:100]}
    if name == 'read_file':
        result = contents(args.get('repo'), args.get('path'))
        if result['type'] != 'file':
            raise GitHubError('Path is a directory')
        result['content'] = result['content'][:16000]
        return result
    raise GitHubError('Unknown tool')
