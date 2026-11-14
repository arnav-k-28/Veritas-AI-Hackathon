/* Read-only Team846 explorer. Text from GitHub is always inserted as text. */
(() => {
  const $ = id => document.getElementById(id);
  let repos = [], selected = null, files = [], manualVersion = 0, requestVersion = 0;
  let dataSource = '', loadError = '', loading = false;
  function setPanel(open) {
    $('githubPanel').hidden = !open;
    $('githubToggle').setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('github-open', open);
  }
  const status = message => { $('githubStatus').textContent = message; };
  async function api(route, params = {}) {
    // Nova's backend is preferred. Public GitHub access remains available if
    // the site is opened on a static server or the backend is not running.
    try {
      const response = await fetch('/api/team846/' + route + '?' + new URLSearchParams(params), { signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('Nova backend unavailable');
      const data = await response.json();
      if (route === 'repos' && !Array.isArray(data.repositories)) throw new Error('Invalid repository response');
      dataSource = 'Nova server';
      return data;
    } catch (_) {
      const data = await githubApi(route, params);
      dataSource = 'GitHub';
      return data;
    }
  }
  async function githubRequest(path) {
    let response;
    try {
      response = await fetch('https://api.github.com' + path, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (_) { throw new Error('Could not connect to GitHub. Check your internet connection and select Refresh.'); }
    if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached. Please try again later.');
    if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
    return response.json();
  }
  async function githubApi(route, params) {
    if (route === 'repos') {
      const all = [];
      for (let page = 1; page <= 100; page++) {
        const batch = await githubRequest(`/orgs/Team846/repos?type=public&per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository list.');
        all.push(...batch.filter(r => !r.private).map(r => ({name: r.name, description: r.description || '', default_branch: r.default_branch, language: r.language, archived: r.archived, topics: r.topics || [], updated_at: r.updated_at})));
        if (batch.length < 100) return {repositories: all};
      }
      throw new Error('GitHub repository list exceeded the pagination limit.');
    }
    if (route !== 'contents') throw new Error('Unsupported GitHub request.');
    const repo = repos.find(r => r.name === params.repo);
    const path = params.path || '';
    if (!repo || typeof path !== 'string' || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid repository or path.');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const data = await githubRequest(`/repos/Team846/${encodeURIComponent(repo.name)}/contents/${encodedPath}?ref=${encodeURIComponent(repo.default_branch)}`);
    if (Array.isArray(data)) return {type: 'directory', entries: data.filter(x => x.type === 'file' || x.type === 'dir').map(({name, path, type}) => ({name, path, type}))};
    if (data.type !== 'file' || data.size > 200000 || data.encoding !== 'base64') throw new Error('Only UTF-8 text files up to 200 KB can be displayed.');
    try {
      const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0));
      if (bytes.length > 200000 || bytes.includes(0)) throw new Error('binary');
      const content = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      return {type: 'file', repo: repo.name, path, branch: repo.default_branch, content,
        url: `https://github.com/Team846/${encodeURIComponent(repo.name)}/blob/${encodeURIComponent(repo.default_branch)}/${encodedPath}`};
    } catch (_) { throw new Error('This file is binary or is not UTF-8 text.'); }
  }
  async function load(refresh = false) {
    loading = true; loadError = '';
    status('Loading repositories…');
    try {
      repos = (await api('repos', refresh ? { refresh: '1' } : {})).repositories;
      repos.sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0) || a.name.localeCompare(b.name));
      const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();
      const filter = $('githubLanguageFilter'), previous = filter.value;
      filter.replaceChildren(new Option('All languages', ''), ...languages.map(x => new Option(x, x)));
      filter.value = previous;
      loading = false; renderRepos();
    } catch (error) { loading = false; loadError = error.message; status(loadError); }
  }
  function renderRepos() {
    if (loading || loadError) { status(loading ? 'Loading repositories…' : loadError); return; }
    const query = $('githubFilter').value.trim().toLowerCase(), language = $('githubLanguageFilter').value;
    const filtered = repos.filter(r => (!language || r.language === language) && [r.name, r.description, ...(r.topics || [])].join(' ').toLowerCase().includes(query));
    $('githubRepos').replaceChildren();
    status(`${filtered.length} of ${repos.length} repositories · ${dataSource} · archived included`);
    for (const repo of filtered) {
      const details = document.createElement('details'), summary = document.createElement('summary');
      details.className = 'github-repo';
      const heading = document.createElement('span'); heading.className = 'github-repo-heading';
      const name = document.createElement('strong'); name.textContent = repo.name;
      const badge = document.createElement('span'); badge.className = 'github-badge'; badge.textContent = repo.archived ? 'Public · archived' : 'Public';
      heading.append(name, badge);
      const desc = document.createElement('span'); desc.className = 'github-repo-description'; desc.textContent = repo.description || '';
      const meta = document.createElement('span'); meta.className = 'github-repo-meta';
      if (repo.language) { const language = document.createElement('span'); language.className = 'github-repo-language'; language.textContent = repo.language; meta.append(language); }
      const date = Date.parse(repo.updated_at);
      if (Number.isFinite(date)) { const updated = document.createElement('span'); updated.textContent = 'Updated ' + new Date(date).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}); meta.append(updated); }
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
    const list = document.createElement('div'); list.className = 'github-tree'; list.textContent = 'Loading…'; parent.append(list);
    try {
      const data = await api('contents', {repo, path}); list.replaceChildren();
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
    } catch (error) { list.textContent = error.message; parent.dataset.loaded = ''; }
  }
  async function open(repo, path, manual) {
    if (manual) manualVersion++;
    const version = manualVersion;
    try {
      const file = await api('contents', {repo, path});
      if (version !== manualVersion || file.type !== 'file') return;
      selected = {repo: file.repo, path: file.path, branch: file.branch, url: file.url};
      files = files.filter(f => f.repo !== file.repo || f.path !== file.path); files.push(file); files = files.slice(-12);
      show(file);
      if (!manual) setPanel(true);
    } catch (error) { status(error.message); }
  }
  function show(file) {
    selected = {repo: file.repo, path: file.path, branch: file.branch, url: file.url};
    $('githubFileHead').hidden = false;
    $('githubTabs').hidden = false;
    $('githubFile').hidden = false;
    $('githubFileLabel').textContent = `${file.repo} / ${file.path}`;
    const link = $('githubFileLink'); link.href = file.url; link.hidden = false;
    const pre = $('githubFile'); pre.replaceChildren();
    file.content.split('\n').forEach((line, i) => { const row = document.createElement('span'); row.className = 'github-line'; const number = document.createElement('span'); number.className = 'github-line-no'; number.textContent = i + 1; row.append(number, document.createTextNode(line || ' ')); pre.append(row); });
    const tabs = $('githubTabs'); tabs.replaceChildren();
    for (const item of files) { const button = document.createElement('button'); button.type = 'button'; button.textContent = item.repo + ' / ' + item.path.split('/').pop(); button.title = item.path; button.addEventListener('click', () => { manualVersion++; show(item); }); tabs.append(button); }
  }
  $('githubRefresh').addEventListener('click', () => load(true));
  $('githubFileClose').addEventListener('click', () => {
    manualVersion++;
    selected = null;
    $('githubFileHead').hidden = true;
    $('githubTabs').hidden = true;
    $('githubFile').hidden = true;
  });
  $('githubToggle').addEventListener('click', () => {
    const opening = $('githubPanel').hidden;
    if (!opening) manualVersion++;
    setPanel(opening);
  });
  $('githubClose').addEventListener('click', () => { manualVersion++; setPanel(false); $('githubToggle').focus(); });
  $('githubFilter').addEventListener('input', renderRepos);
  $('githubLanguageFilter').addEventListener('change', renderRepos);
  window.team846 = { selected: () => { requestVersion = manualVersion; return selected; }, openFromAI: source => { if (requestVersion === manualVersion && source && source.repo && source.path) open(source.repo, source.path, false); } };
  load();
})();
