/* Read-only Team846 explorer with a cache of verified public GitHub data. */
(() => {
  const $ = id => document.getElementById(id);
  const CACHE_KEY = 'nova.team846.cache.v2';

  function readLocalCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function writeLocalCache(patch) {
    try {
      const cur = readLocalCache();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cur, ...patch, ts: Date.now() }));
    } catch (_) { /* ignore quota */ }
  }

  let repos = [], selected = null, files = [], manualVersion = 0, requestVersion = 0;
  let dataSource = '', loadError = '', loading = false, loadVersion = 0, panelMode = 'popup';

  function setPanel(open, mode = 'popup') {
    if (open) panelMode = mode;
    $('githubPanel').hidden = !open;
    $('githubBackdrop').hidden = !open || panelMode !== 'popup';
    $('githubExpand').hidden = !open || panelMode !== 'dock';
    $('githubPanel').setAttribute('role', panelMode === 'popup' ? 'dialog' : 'region');
    $('githubPanel').setAttribute('aria-modal', panelMode === 'popup' ? 'true' : 'false');
    $('githubToggle').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('github-open', open);
    document.body.classList.toggle('github-docked', open && panelMode === 'dock');
    if (open && panelMode === 'popup') $('githubFilter').focus();
  }
  const status = message => { $('githubStatus').textContent = message; };

  async function api(route, params = {}) {
    const apiBase = location.port === '8787' ? '' : 'http://127.0.0.1:8787';
    // 1) Try Nova's backend first (which has server-side caching + GITHUB_TOKEN + fallback)
    try {
      const response = await fetch(apiBase + '/api/team846/' + route + '?' + new URLSearchParams(params), { signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error('Nova backend unavailable');
      const data = await response.json();
      if (route === 'repos' && !Array.isArray(data.repositories)) throw new Error('Invalid repository response');
      dataSource = data.fallback ? 'Public GitHub pages' : 'GitHub API';
      if (route === 'repos') writeLocalCache({ repos: data.repositories });
      if (route === 'contents') {
        const saved = readLocalCache().files || {};
        saved[params.repo + ':' + (params.path || '')] = data;
        writeLocalCache({ files: saved });
      }
      return data;
    } catch (_) {
      // 2) Try direct public GitHub API
      try {
        const data = await githubApi(route, params);
        dataSource = 'GitHub live';
        if (route === 'repos') writeLocalCache({ repos: data.repositories });
        if (route === 'contents') {
          const saved = readLocalCache().files || {};
          saved[params.repo + ':' + (params.path || '')] = data;
          writeLocalCache({ files: saved });
        }
        return data;
      } catch (ghErr) {
        // 3) Use only previously fetched public GitHub data when offline.
        if (route === 'repos') {
          const cached = readLocalCache();
          if (Array.isArray(cached.repos) && cached.repos.length) {
            dataSource = 'Local cache (rate limit bypassed)';
            return { repositories: cached.repos, fallback: true };
          }
          throw new Error('GitHub is unavailable and no saved repository list exists. Try again later or open the organization on GitHub.');
        }
        if (route === 'contents') {
          const cached = readLocalCache();
          const item = (cached.files || {})[params.repo + ':' + (params.path || '')];
          if (item) { dataSource = 'Saved GitHub cache'; return item; }
          throw new Error('This file is not cached and GitHub is unavailable. Try again later.');
        }
        throw ghErr;
      }
    }
  }

  async function githubRequest(path) {
    let response;
    try {
      response = await fetch('https://api.github.com' + path, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(12000),
      });
    } catch (_) { throw new Error('Could not connect to GitHub.'); }
    if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached.');
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
    return response.json();
  }

  async function githubApi(route, params) {
    if (route === 'repos') {
      const all = [];
      for (let page = 1; page <= 10; page++) {
        const batch = await githubRequest(`/orgs/Team846/repos?type=public&per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository list.');
        all.push(...batch.filter(r => !r.private).map(r => ({ name: r.name, description: r.description || '', default_branch: r.default_branch, language: r.language, archived: r.archived, topics: r.topics || [], updated_at: r.updated_at })));
        if (batch.length < 100) return { repositories: all };
      }
      return { repositories: all };
    }
    if (route !== 'contents') throw new Error('Unsupported GitHub request.');
    const repo = repos.find(r => r.name === params.repo);
    const path = params.path || '';
    if (!repo || typeof path !== 'string' || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid repository or path.');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const data = await githubRequest(`/repos/Team846/${encodeURIComponent(repo.name)}/contents/${encodedPath}?ref=${encodeURIComponent(repo.default_branch)}`);
    if (Array.isArray(data)) return { type: 'directory', entries: data.filter(x => x.type === 'file' || x.type === 'dir').map(({ name, path, type }) => ({ name, path, type })) };
    if (data.type !== 'file' || data.size > 200000 || data.encoding !== 'base64') throw new Error('Only UTF-8 text files up to 200 KB can be displayed.');
    try {
      const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      if (bytes.length > 200000 || bytes.includes(0)) throw new Error('binary');
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return {
        type: 'file',
        repo: repo.name,
        path,
        branch: repo.default_branch,
        content,
        url: `https://github.com/Team846/${encodeURIComponent(repo.name)}/blob/${encodeURIComponent(repo.default_branch)}/${encodedPath}`,
      };
    } catch (_) { throw new Error('This file is binary or is not UTF-8 text.'); }
  }

  async function load(refresh = false) {
    const version = ++loadVersion;
    loading = true; loadError = '';
    $('githubRefresh').disabled = true;
    status('Loading repositories…');
    try {
      const result = await api('repos', refresh ? { refresh: '1' } : {});
      if (version !== loadVersion) return;
      repos = result.repositories;
      repos.sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) || a.name.localeCompare(b.name));
      const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
      const filter = $('githubLanguageFilter');
      if (filter) {
        const previous = filter.value;
        filter.replaceChildren(new Option(window.NovaI18n ? window.NovaI18n('allLanguages') : 'All languages', ''), ...languages.map(x => new Option(x, x)));
        filter.value = languages.includes(previous) ? previous : '';
        if (window.NovaUI && window.NovaUI.syncCustomSelect) window.NovaUI.syncCustomSelect(filter);
      }
      loading = false; renderRepos();
    } catch (error) {
      if (version !== loadVersion) return;
      loading = false; loadError = error.message; status(loadError);
      $('githubRepos').replaceChildren();
    } finally {
      if (version === loadVersion) $('githubRefresh').disabled = false;
    }
  }

  function renderRepos() {
    if (loading || loadError) { status(loading ? 'Loading repositories…' : loadError); return; }
    const query = $('githubFilter').value.trim().toLowerCase();
    const filterEl = $('githubLanguageFilter');
    const language = filterEl ? filterEl.value : '';
    const filtered = repos.filter(r => (!language || r.language === language) && [r.name, r.description, ...(r.topics || [])].join(' ').toLowerCase().includes(query));
    $('githubRepos').replaceChildren();
    status(`${filtered.length} of ${repos.length} repositories · ${dataSource}`);
    if (!filtered.length) {
      const empty = document.createElement('div'); empty.className = 'github-empty';
      empty.textContent = repos.length ? 'No repositories match these filters. Try a different search or language.' : 'No public repositories were found. Try refreshing.';
      $('githubRepos').append(empty);
    }
    for (const repo of filtered) {
      const details = document.createElement('details'), summary = document.createElement('summary');
      details.className = 'github-repo';
      const heading = document.createElement('span'); heading.className = 'github-repo-heading';
      const name = document.createElement('strong'); name.textContent = repo.name;
      const badge = document.createElement('span'); badge.className = 'github-badge'; badge.textContent = repo.archived ? 'Public · archived' : 'Public';
      heading.append(name, badge);
      const desc = document.createElement('span'); desc.className = 'github-repo-description'; desc.textContent = repo.description || '';
      const meta = document.createElement('span'); meta.className = 'github-repo-meta';
      if (repo.language) { const langSpan = document.createElement('span'); langSpan.className = 'github-repo-language'; langSpan.textContent = repo.language; meta.append(langSpan); }
      const date = Date.parse(repo.updated_at);
      if (Number.isFinite(date)) { const updated = document.createElement('span'); updated.textContent = 'Updated ' + new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); meta.append(updated); }
      summary.append(heading, desc, meta); details.append(summary);
      const githubLink = document.createElement('a');
      githubLink.textContent = 'Open repository on GitHub ↗'; githubLink.href = `https://github.com/Team846/${encodeURIComponent(repo.name)}`;
      githubLink.target = '_blank'; githubLink.rel = 'noopener noreferrer'; githubLink.className = 'github-repo-link';
      details.append(githubLink);
      details.addEventListener('toggle', () => { if (details.open && !details.dataset.loaded) { details.dataset.loaded = '1'; browse(repo.name, '', details); } });
      $('githubRepos').append(details);
    }
  }

  async function browse(repo, path, parent) {
    const list = document.createElement('div'); list.className = 'github-tree'; list.textContent = 'Loading files…'; parent.append(list);
    try {
      const data = await api('contents', { repo, path }); list.replaceChildren();
      if (data.type !== 'directory' || !Array.isArray(data.entries)) throw new Error('This directory could not be displayed.');
      if (!data.entries.length) { list.textContent = 'No files in this directory.'; return; }
      data.entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
      for (const entry of data.entries || []) {
        if (entry.type === 'dir') {
          const folder = document.createElement('details'), title = document.createElement('summary');
          title.textContent = '📁 ' + entry.name; folder.append(title); list.append(folder);
          folder.addEventListener('toggle', () => { if (folder.open && !folder.dataset.loaded) { folder.dataset.loaded = '1'; browse(repo, entry.path, folder); } });
        } else {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'github-entry'; button.textContent = entry.name;
          button.addEventListener('click', () => open(repo, entry.path, true)); list.append(button);
        }
      }
    } catch (error) {
      list.replaceChildren();
      const message = document.createElement('span'); message.className = 'github-tree-error'; message.textContent = error.message;
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Try again';
      retry.addEventListener('click', () => { list.remove(); browse(repo, path, parent); });
      list.append(message, retry);
    }
  }

  async function open(repo, path, manual, range = null) {
    if (manual) manualVersion++;
    const version = manualVersion;
    if (!manual && $('githubPanel').hidden) setPanel(true, 'dock');
    status(`Loading ${repo} / ${path}…`);
    try {
      const file = await api('contents', { repo, path });
      if (version !== manualVersion) return;
      if (file.type !== 'file') throw new Error('This path is not a readable file.');
      file.highlight = range;
      selected = { repo: file.repo, path: file.path, branch: file.branch, url: file.url };
      files = files.filter(f => f.repo !== file.repo || f.path !== file.path); files.push(file); files = files.slice(-12);
      show(file);
      status(`Opened ${file.repo} / ${file.path} · ${dataSource}`);
      if (range) requestAnimationFrame(() => $('githubFile').querySelector('.highlighted')?.scrollIntoView({ block: 'nearest' }));
    } catch (error) { status(error.message); }
  }

  function show(file) {
    selected = { repo: file.repo, path: file.path, branch: file.branch, url: file.url };
    $('githubFileHead').hidden = false;
    $('githubTabs').hidden = false;
    $('githubFile').hidden = false;
    document.body.classList.toggle('github-has-file', true);
    $('githubFileLabel').textContent = `${file.repo} / ${file.path}`;
    const lineCount = file.content.split('\n').length;
    $('githubFileInfo').textContent = `${file.branch} · ${lineCount.toLocaleString()} ${lineCount === 1 ? 'line' : 'lines'}`;
    const link = $('githubFileLink'); link.href = file.url; link.hidden = false;
    const pre = $('githubFile'); pre.replaceChildren();
    const extension = file.path.split('.').pop().toLowerCase();
    const colored = ['java', 'py', 'cpp', 'cc', 'c', 'h', 'hpp', 'js', 'ts', 'json'].includes(extension);
    const tokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*|#.*|\b(?:class|public|private|protected|static|void|return|new|if|else|for|while|import|from|def|function|const|let|var|export|extends|implements|true|false|null|None|self|this|int|double|boolean|final|package|include|namespace)\b)/g;
    file.content.split('\n').forEach((line, i) => {
      const row = document.createElement('span'); row.className = 'github-line';
      const number = document.createElement('span'); number.className = 'github-line-no'; number.textContent = i + 1; row.append(number);
      if (file.highlight && i + 1 >= file.highlight.start && i + 1 <= file.highlight.end) row.classList.add('highlighted');
      let cursor = 0;
      if (colored) for (const match of line.matchAll(tokens)) {
        row.append(document.createTextNode(line.slice(cursor, match.index)));
        const token = document.createElement('span'); token.textContent = match[0];
        token.className = match[0].startsWith('//') || match[0].startsWith('#') ? 'gh-token-comment' : /^['"]/.test(match[0]) ? 'gh-token-string' : 'gh-token-keyword';
        row.append(token); cursor = match.index + match[0].length;
      }
      row.append(document.createTextNode(line.slice(cursor) || (line ? '' : ' '))); pre.append(row);
    });
    const tabs = $('githubTabs'); tabs.replaceChildren();
    for (const item of files) { const button = document.createElement('button'); button.type = 'button'; button.textContent = item.repo + ' / ' + item.path.split('/').pop(); button.title = item.path; button.className = item.repo === file.repo && item.path === file.path ? 'active' : ''; button.setAttribute('aria-pressed', String(Boolean(button.className))); button.addEventListener('click', () => { manualVersion++; show(item); }); tabs.append(button); }
  }

  $('githubRefresh').addEventListener('click', () => load(true));
  $('githubExpand').addEventListener('click', () => { manualVersion++; setPanel(true, 'popup'); });
  $('githubFileClose').addEventListener('click', () => {
    manualVersion++;
    selected = null;
    $('githubFileHead').hidden = true;
    $('githubTabs').hidden = true;
    $('githubFile').hidden = true;
    document.body.classList.toggle('github-has-file', false);
  });
  $('githubToggle').addEventListener('click', () => {
    const opening = $('githubPanel').hidden;
    const engineMenu = $('enginePopover');
    const brandCaret = $('brandCaret');
    if (engineMenu) engineMenu.hidden = true;
    if (brandCaret) brandCaret.setAttribute('aria-expanded', 'false');
    if (!opening && panelMode === 'dock') { manualVersion++; setPanel(true, 'popup'); return; }
    if (!opening) manualVersion++;
    setPanel(opening);
  });
  const restoreFocus = () => ($('brandCaret') || $('modelBtn')).focus();
  $('githubClose').addEventListener('click', () => { manualVersion++; setPanel(false); restoreFocus(); });
  $('githubBackdrop').addEventListener('click', () => { manualVersion++; setPanel(false); restoreFocus(); });
  $('githubFilter').addEventListener('input', renderRepos);
  if ($('githubLanguageFilter')) $('githubLanguageFilter').addEventListener('change', renderRepos);
  $('githubPanel').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); manualVersion++; setPanel(false); restoreFocus(); }
    if (event.key === 'Tab' && panelMode === 'popup') {
      const focusable = [...$('githubPanel').querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], summary')].filter(el => el.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.team846 = {
    selected: () => { requestVersion = manualVersion; return selected; },
    openFromAI: source => {
      if (requestVersion !== manualVersion || !source || !source.repo || !source.path) return;
      const start = Number(source.start_line), end = Number(source.end_line || source.start_line);
      const range = Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start && end - start <= 200 ? { start, end } : null;
      open(source.repo, source.path, false, range);
    },
    openSnapshotFile: (repo, path) => {
      setPanel(true, 'popup');
      open(repo, path, true);
    },
  };
  load();
})();
