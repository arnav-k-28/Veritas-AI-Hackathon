/* Autodesk CAD explorer. SVN credentials stay in server memory for the session. */
(() => {
  const $ = id => document.getElementById(id);
  let viewer = null, localViewer = null, current = null, selected = null, sdkPromise = null, selectionVersion = 0;
  let svnSession = null, svnPath = '', svnRequestVersion = 0;
  let failedAssembly = null;
  let openingFile = false;
  let pendingAssembly = null;
  const status = text => { $('cadStatus').textContent = text; };
  const apiBase = /^https?:$/.test(location.protocol) ? '' : 'http://127.0.0.1:8787';
  const localPage = location.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(location.hostname);
  const localServerHelp = 'Primer’s local server is not available here. On a Mac, run Start Primer.command from Terminal; on Windows, open Start Primer.cmd. Then open Primer at http://127.0.0.1:8787/.';

  async function request(path, options = {}) {
    if (!localPage) throw new Error(localServerHelp);
    let response;
    try {
      response = await fetch(apiBase + '/api/cad/' + path, {
        ...options, headers: { ...(svnSession ? { 'X-Nova-SVN-Session': svnSession } : {}), ...(options.headers || {}) }, cache: 'no-store',
      });
    } catch (_) {
      throw new Error(localServerHelp);
    }
    if (response.status === 404) throw new Error('The Primer server needs to be restarted to enable CAD sign-in. Restart it using Start Primer.command on Mac or Start Primer.cmd on Windows.');
    let data;
    try { data = await response.json(); } catch (_) { throw new Error('The Primer server returned an unexpected response. Restart Primer and try again.'); }
    if (!response.ok) throw new Error(data.error || 'CAD request failed.');
    return data;
  }

  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link'); link.rel = 'stylesheet';
      link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
      document.head.append(link);
      const script = document.createElement('script');
      script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
      script.onload = resolve; script.onerror = () => reject(new Error('Could not load the Autodesk Viewer. Check your internet connection.'));
      document.head.append(script);
    });
    return sdkPromise;
  }

  async function initializeViewer() {
    if (viewer) return viewer;
    await loadSdk();
    await new Promise((resolve, reject) => {
      Autodesk.Viewing.Initializer({ env: 'AutodeskProduction2', api: 'streamingV2',
        getAccessToken: (onTokenReady) => request('token').then(t => onTokenReady(t.access_token, t.expires_in)).catch(e => status(e.message)),
      }, resolve);
      setTimeout(() => reject(new Error('Autodesk Viewer initialization timed out.')), 30000);
    });
    $('cadCanvas').replaceChildren();
    viewer = new Autodesk.Viewing.GuiViewer3D($('cadCanvas'));
    if (viewer.start() !== 0) { viewer = null; throw new Error('Could not start the Autodesk Viewer.'); }
    viewer.setTheme('light-theme');
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, event => {
      const id = event.dbIdArray && event.dbIdArray[0], version = ++selectionVersion;
      selected = null; $('cadProperties').replaceChildren();
      if (!id) { $('cadSelection').textContent = 'Select a component in the model to see its properties.'; return; }
      $('cadSelection').textContent = 'Loading component properties…';
      viewer.getProperties(id, data => {
        if (version !== selectionVersion) return;
        const properties = (data.properties || []).filter(p => p.displayName && p.displayValue !== undefined && p.displayValue !== null && p.displayValue !== '');
        selected = { name: data.name || 'Component', dbId: id, externalId: data.externalId || null,
          properties: properties.slice(0, 80).map(p => ({ name: p.displayName, value: String(p.displayValue), units: p.units || '' })) };
        $('cadSelection').textContent = selected.name + ' · ID ' + id;
        const list = $('cadProperties');
        if (!properties.length) { $('cadSelection').textContent += ' — no properties available.'; return; }
        for (const property of selected.properties) {
          const dt = document.createElement('dt'), dd = document.createElement('dd');
          dt.textContent = property.name; dd.textContent = property.value + (property.units ? ' ' + property.units : '');
          list.append(dt, dd);
        }
      }, () => { if (version === selectionVersion) $('cadSelection').textContent = 'Properties are unavailable for this component.'; });
    });
    return viewer;
  }

  async function openModel(model) {
    status('Checking Autodesk conversion…');
    const conversion = await request('model-status?' + new URLSearchParams({ id: model.id }));
    if (conversion.status !== 'success') {
      if (conversion.status === 'failed' || conversion.status === 'timeout') throw new Error('Autodesk conversion ' + conversion.status + (conversion.messages.length ? ': ' + conversion.messages.join(' ') : '.'));
      status('Conversion: ' + conversion.status + (conversion.progress ? ' · ' + conversion.progress : '') + (conversion.messages.length ? ' · ' + conversion.messages.join(' ') : '') + '. Try opening again later.');
      return false;
    }
    status('Loading Autodesk Viewer…');
    if (localViewer) { localViewer.dispose(); localViewer = null; }
    const v = await initializeViewer();
    const loadedModel = await new Promise((resolve, reject) => Autodesk.Viewing.Document.load('urn:' + model.urn, doc => {
      const geometry = doc.getRoot().getDefaultGeometry();
      if (!geometry) { reject(new Error('No 3D view was found in this translation.')); return; }
      v.loadDocumentNode(doc, geometry).then(resolve, reject);
    }, (_code, message) => reject(new Error(message || 'Could not open the translated model.'))));
    current = model; selected = null; selectionVersion++;
    renderTree(loadedModel);
    $('cadDocumentName').textContent = (model.root || model.name) + (model.revision ? ' · Rev ' + model.revision : '');
    for (const id of ['cadFit', 'cadFocus', 'cadIsolate', 'cadShowAll', 'cadMeasure', 'cadSection']) $(id).disabled = false;
    $('cadSelection').textContent = 'Select a component in the model to see its properties.';
    $('cadProperties').replaceChildren(); v.resize(); v.fitToView();
    status('Model ready. Use the Autodesk toolbar to navigate and measure.' + (conversion.messages.length ? ' Autodesk reports: ' + conversion.messages.join(' ') : ''));
    return true;
  }

  function renderTree(model) {
    const host = $('cadTree'); host.textContent = 'Loading assembly…';
    if (!model || typeof model.getObjectTree !== 'function') { host.textContent = 'Assembly tree unavailable.'; return; }
    model.getObjectTree(tree => {
      if (!viewer || viewer.model !== model) return;
      host.replaceChildren();
      function addNode(parent, nodeId) {
        const childIds = [];
        tree.enumNodeChildren(nodeId, child => childIds.push(child), false);
        const name = tree.getNodeName(nodeId) || 'Component ' + nodeId;
        if (!childIds.length) {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = name;
          button.addEventListener('click', () => viewer.select([nodeId])); parent.append(button); return;
        }
        const branch = document.createElement('details'), label = document.createElement('summary');
        label.textContent = name; branch.append(label); parent.append(branch);
        label.addEventListener('click', event => { event.stopPropagation(); viewer.select([nodeId]); });
        branch.addEventListener('toggle', () => {
          if (branch.open && !branch.dataset.loaded) {
            branch.dataset.loaded = '1'; childIds.forEach(child => addNode(branch, child));
          }
        });
      }
      addNode(host, tree.getRootId());
    }, () => { host.textContent = 'Assembly tree unavailable.'; });
  }

  async function listSvn(username, password, path, allowHttp) {
    return request('svn/list', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, path, allow_http: allowHttp === true }) });
  }

  function renderSvn(result) {
    svnPath = result.path || '';
    $('cadSvnPath').textContent = '/' + svnPath + (result.truncated ? ' · showing first 1,000 items' : '');
    $('cadSvnUp').hidden = !svnPath;
    const container = $('cadSvnEntries'); container.replaceChildren();
    if (!result.entries.length) { container.textContent = 'No CAD files or folders found.'; return; }
    for (const entry of result.entries) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = (entry.type === 'directory' ? '▸ ' : '◇ ') + entry.name;
      button.addEventListener('click', () => {
        if (entry.type === 'directory') { browseSvn(entry.path); return; }
        openSvnFile(entry.path);
      });
      container.append(button);
    }
  }

  async function browseSvn(path) {
    if (!svnSession) { status('Sign in to SVN to browse the repository.'); return; }
    const version = ++svnRequestVersion;
    $('cadSvnPath').textContent = 'Loading SVN folder…';
    try {
      const result = await listSvn('', '', path, false);
      if (version === svnRequestVersion && svnSession) renderSvn(result);
    } catch (error) { if (version === svnRequestVersion) $('cadSvnPath').textContent = error.message; }
  }

  $('cadSvnForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('cadSvnUser').value.trim(), password = $('cadSvnPassword').value, allowHttp = $('cadSvnAllowHttp').checked;
    const version = ++svnRequestVersion;
    $('cadSvnSubmit').disabled = true; $('cadSvnAuthStatus').textContent = allowHttp ? 'Connecting over HTTP…' : 'Connecting over HTTPS…';
    try {
      const result = await listSvn(username, password, '', allowHttp);
      if (version !== svnRequestVersion || $('cadPanel').hidden) return;
      svnSession = result.session; $('cadSvnPassword').value = '';
      if (!svnSession) throw new Error('The server did not start an SVN session. Restart Primer and try again.');
      renderSvn(result); $('cadSvnBrowser').open = true; $('cadSvnSignIn').hidden = true;
      status('Signed in. Choose a CAD file from the SVN browser.');
    } catch (error) {
      if (version === svnRequestVersion) {
        $('cadSvnAuthStatus').textContent = error.message;
        $('cadServerHint').hidden = error.message !== localServerHelp;
      }
    } finally { $('cadSvnSubmit').disabled = false; }
  });
  $('cadSvnUp').addEventListener('click', () => browseSvn(svnPath.split('/').slice(0, -1).join('/')));
  $('cadBtn').addEventListener('click', () => {
    const opening = $('cadPanel').hidden;
    $('cadPanel').hidden = false; $('cadBtn').setAttribute('aria-expanded', 'true');
    if (opening) {
      $('cadSvnSignIn').hidden = false; $('cadSvnUser').value = ''; $('cadSvnPassword').value = ''; $('cadSvnAllowHttp').checked = false;
      $('cadSvnAuthStatus').textContent = ''; $('cadServerHint').hidden = localPage;
      if (!localPage) $('cadSvnAuthStatus').textContent = localServerHelp;
      setTimeout(() => $('cadSvnUser').focus(), 0);
    }
    document.body.classList.add('cad-open'); if (viewer || localViewer) setTimeout(() => (viewer || localViewer).resize(), 0);
  });
  $('cadClose').addEventListener('click', () => {
    $('cadPanel').hidden = true; $('cadBtn').setAttribute('aria-expanded', 'false'); document.body.classList.remove('cad-open');
    ++svnRequestVersion;
    if (svnSession) request('svn/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {});
    svnSession = null; svnPath = ''; failedAssembly = null; $('cadSvnBroaden').hidden = true; current = null; selected = null; selectionVersion++;
    $('cadSvnUser').value = ''; $('cadSvnPassword').value = ''; $('cadSvnAllowHttp').checked = false;
    $('cadSvnEntries').replaceChildren(); $('cadSvnPath').textContent = 'Sign in to browse the repository.';
    $('cadProperties').replaceChildren(); $('cadTree').textContent = 'Open a model to explore its components.';
    $('cadSelection').textContent = 'Select a component to see its properties.'; $('cadDocumentName').textContent = 'Autodesk Viewer · No model open';
    for (const id of ['cadFit', 'cadFocus', 'cadIsolate', 'cadShowAll', 'cadMeasure', 'cadSection']) $(id).disabled = true;
    if (viewer) { viewer.finish(); viewer = null; }
    if (localViewer) { localViewer.dispose(); localViewer = null; }
    pendingAssembly = null; $('cadFolderPrompt').hidden = true;
    $('cadCanvas').textContent = 'Open a converted model to inspect it here.';
  });
  $('cadLocalChoice').addEventListener('click', () => $('cadLocalFile').click());
  $('cadLocalOpen').addEventListener('click', () => $('cadLocalFile').click());
  $('cadLocalFile').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    if (/\.iam$/i.test(file.name)) {
      $('cadSvnSignIn').hidden = true;
      pendingAssembly = file.name; $('cadFolderPrompt').hidden = false;
      status('Choose the folder containing ' + file.name + ' and its referenced parts.');
      return;
    }
    if (!/\.(step|stp|ipt)$/i.test(file.name)) {
      const message = 'Choose an Inventor part, assembly, or STEP file.';
      if (!$('cadSvnSignIn').hidden) $('cadSvnAuthStatus').textContent = message; else status(message);
      return;
    }
    pendingAssembly = null; $('cadFolderPrompt').hidden = true;
    $('cadSvnSignIn').hidden = true; ++svnRequestVersion; const version = svnRequestVersion;
    await openLocalFile(file, file.name, version, /\.ipt$/i.test(file.name));
  });

  $('cadChooseFolder').addEventListener('click', () => $('cadLocalFolder').click());
  $('cadLocalFolder').addEventListener('change', async event => {
    const files = Array.from(event.target.files || []).filter(file => /\.(iam|ipt|ipj)$/i.test(file.name));
    event.target.value = '';
    if (!pendingAssembly || !files.length) { status('No Inventor files were found in the selected folder.'); return; }
    const matches = files.filter(file => file.name.toLowerCase() === pendingAssembly.toLowerCase());
    if (!matches.length) { status('The selected assembly was not found in that folder.'); return; }
    let root = matches[0].webkitRelativePath;
    if (matches.length > 1) {
      const choice = window.prompt('More than one file has this name. Enter the full relative path of the assembly:\n\n' + matches.map(file => file.webkitRelativePath).join('\n'), root);
      if (!choice) return;
      if (!matches.some(file => file.webkitRelativePath === choice)) { status('That assembly path was not found in the folder.'); return; }
      root = choice;
    }
    const name = pendingAssembly;
    ++svnRequestVersion; const version = svnRequestVersion;
    status('Preparing the selected assembly folder locally…');
    try {
      const bytes = await new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./cad-package-worker.js', document.baseURI));
        worker.onmessage = result => { worker.terminate(); result.data.error ? reject(new Error(result.data.error)) : resolve(result.data.bytes); };
        worker.onerror = () => { worker.terminate(); reject(new Error('Could not package this assembly folder.')); };
        worker.postMessage({ files: files.map(file => ({ file, path: file.webkitRelativePath })) });
      });
      if (version !== svnRequestVersion) return;
      await openLocalFile(new File([bytes], 'assembly.zip'), name, version, true, root);
    } catch (error) { if (version === svnRequestVersion) status(error.message || 'Could not prepare the assembly.'); }
  });

  async function openLocalFile(file, displayName, version, convert, root = '', sourceLabel = 'Local') {
    status(convert ? 'Opening in local Inventor and preparing the viewer…' : 'Opening the STEP file locally…');
    try {
      if (viewer) { viewer.finish(); viewer = null; }
      if (localViewer) localViewer.dispose();
      let source = file;
      if (convert) {
        const params = new URLSearchParams({ filename: file.name, root });
        const response = await fetch(apiBase + '/api/cad/local-convert?' + params, { method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', 'X-Nova-Local-Cad': '1' }, body: file, cache: 'no-store' });
        if (!response.ok) {
          let message = 'Could not convert the Inventor file locally.';
          try { message = (await response.json()).error || message; } catch (_) {}
          throw new Error(message);
        }
        source = new File([await response.blob()], 'converted.step');
      }
      const module = await import('./cad-local.js');
      if (version !== svnRequestVersion) return;
      localViewer = module.createLocalViewer($('cadCanvas'), component => {
        selected = component ? { name: component.name, dbId: null, properties: [] } : null;
        $('cadSelection').textContent = component ? component.name + ' — no additional properties available.' : 'Select a component to see its name.';
        $('cadProperties').replaceChildren();
      });
      const components = await localViewer.load(source);
      if (version !== svnRequestVersion) return;
      pendingAssembly = null; $('cadFolderPrompt').hidden = true;
      current = { name: displayName, description: sourceLabel + ' CAD file converted locally for viewing' }; selected = null;
      $('cadDocumentName').textContent = displayName + ' · ' + sourceLabel;
      $('cadSelection').textContent = 'Select a component to see its name.'; $('cadProperties').replaceChildren();
      const tree = $('cadTree'); tree.replaceChildren();
      for (const component of components) {
        const item = document.createElement('button'); item.type = 'button'; item.textContent = component.name;
        item.addEventListener('click', () => localViewer && localViewer.select(component.index)); tree.append(item);
      }
      for (const id of ['cadFit', 'cadFocus', 'cadIsolate', 'cadShowAll']) $(id).disabled = false;
      $('cadMeasure').disabled = true; $('cadSection').disabled = true;
      status('Opened locally. Orbit, pan, zoom, and select components. Accurate measurement is not available in the local viewer yet.');
    } catch (error) {
      if (version === svnRequestVersion) status(error.message || 'Could not open this STEP file locally.');
    }
  }
  async function openSvnFile(path, scope = null) {
    if (openingFile) { status('A CAD file is already being prepared.'); return; }
    openingFile = true;
    const version = svnRequestVersion;
    try {
      failedAssembly = null; $('cadSvnBroaden').hidden = true;
      status('Checking the SVN file and its assembly folder…');
      const plan = await request('svn/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, scope }) });
      if (version !== svnRequestVersion) return;
      status(plan.packaged ? 'Reading the Inventor project files from SVN; opening with local Inventor…' : 'Reading the SVN file and preparing the local viewer…');
      const response = await fetch(apiBase + '/api/cad/svn/local-open', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Nova-SVN-Session': svnSession },
        body: JSON.stringify({ path, scope, plan_id: plan.plan_id }), cache: 'no-store',
      });
      if (!response.ok) {
        let message = 'Could not open this SVN file locally.';
        try { message = (await response.json()).error || message; } catch (_) {}
        throw new Error(message);
      }
      const file = new File([await response.blob()], 'converted.step');
      if (version !== svnRequestVersion) return;
      await openLocalFile(file, path.split('/').pop(), version, false, '', 'SVN');
    } catch (error) {
      if (version === svnRequestVersion) {
        status(error.message);
        if (/\.(iam|ipt)$/i.test(path) && /missing|referenc|dependenc/i.test(error.message)) {
          failedAssembly = { path, scope: scope === null ? path.split('/').slice(0, -1).join('/') : scope };
          $('cadSvnBroaden').hidden = false;
        }
      }
    }
    finally { openingFile = false; }
  }
  $('cadSvnBroaden').addEventListener('click', () => {
    if (!failedAssembly) return;
    const parent = failedAssembly.scope.split('/').slice(0, -1).join('/');
    const input = window.prompt('Enter the SVN project folder containing the assembly and its parts. Use / for the repository root.', '/' + parent);
    if (input === null) return;
    const scope = input.trim().replace(/^\/+|\/+$/g, '');
    openSvnFile(failedAssembly.path, scope);
  });
  window.addEventListener('pagehide', () => {
    if (svnSession) request('svn/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => {});
  });
  $('cadFit').addEventListener('click', () => { if (localViewer && current) localViewer.fit(); else if (viewer && current) viewer.fitToView(); });
  $('cadFocus').addEventListener('click', () => {
    if (!selected) { status('Select a component to focus on it.'); return; }
    if (localViewer) localViewer.focus(); else if (viewer) viewer.fitToView([selected.dbId]);
  });
  $('cadIsolate').addEventListener('click', () => {
    if (!selected) { status('Select a component to isolate it.'); return; }
    if (localViewer) localViewer.isolate(); else if (viewer) viewer.isolate([selected.dbId]);
  });
  $('cadShowAll').addEventListener('click', () => { if (localViewer && current) localViewer.showAll(); else if (viewer && current) viewer.isolate(null); });
  async function activateTool(extension, mode) {
    if (!viewer || !current) return;
    try {
      if (!viewer.getExtension(extension)) await viewer.loadExtension(extension);
      const activated = viewer.activateExtension(extension, mode);
      if (activated === false) throw new Error('The Autodesk Viewer could not activate this tool.');
      status('Use the Autodesk Viewer controls to complete the operation.');
    } catch (_) { status('This Autodesk Viewer tool is unavailable for this model.'); }
  }
  $('cadMeasure').addEventListener('click', () => activateTool('Autodesk.Measure', 'distance'));
  $('cadSection').addEventListener('click', () => activateTool('Autodesk.Section'));
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (viewer) viewer.resize();
      if (localViewer) localViewer.resize();
    }).observe($('cadCanvas'));
  }
  window.novaCad = { context: () => current ? JSON.stringify({ model: { name: current.name, root: current.root,
    season: current.season, revision: current.revision, description: current.description }, selected_component: selected }) : '' };
})();
