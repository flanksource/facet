export const PLAYGROUND_RUNTIME_SCRIPT = `
    let installedThemes = [{ id: 'facet', module: '@flanksource/facet/Theme' }];
    async function loadThemeCatalog(preferred) {
      const response = await fetch('/themes');
      if (!response.ok) throw new Error('Cannot load themes');
      const catalog = await response.json();
      const select = document.getElementById('documentTheme');
      const previous = installedThemes.find(theme => theme.id === select.value);
      installedThemes = catalog.themes;
      select.replaceChildren(...installedThemes.map(function(theme) { const option = document.createElement('option'); option.value = theme.id; option.textContent = theme.id; return option; }));
      const desired = installedThemes.find(theme => theme.id === (preferred ?? catalog.default));
      select.value = desired?.id ?? 'facet';
      if (select.value !== previous?.id || desired?.build !== previous?.build) themeChanged();
    }
    loadThemeCatalog(new URLSearchParams(location.search).get('theme')).catch(function(error) { addLog('error', error.message); });
    function themeChanged() { browserOriginRequest = undefined; markPreviewStale(); writeUrlState(); document.dispatchEvent(new Event('facet-preview-styles')); }
    function themeChrome(slot) {
      const value = (slot === 'header' ? headerEditor : footerEditor).getValue().trim();
      const defaultValue = (slot === 'header' ? DEFAULT_HEADER : DEFAULT_FOOTER).trim();
      return document.getElementById('documentTheme').value !== 'facet' && value === defaultValue ? '' : value;
    }
    const styleResults = {};
    const styleRevisions = {};
    function showStyleResults(runtime, styles, revision) {
      if (revision !== previewRevision) return;
      styleResults[runtime] = styles;
      styleRevisions[runtime] = revision;
      document.dispatchEvent(new Event('facet-preview-styles'));
      let panel = document.getElementById('styleDiagnostics');
      if (!panel) {
        panel = document.createElement('details'); panel.id = 'styleDiagnostics';
        const summary = document.createElement('summary'); summary.textContent = 'Styles: precedence and computed typography'; panel.append(summary, document.createElement('pre'));
        panel.style.cssText = 'max-height:30vh;overflow:auto;padding:8px;font-size:12px;';
        document.getElementById('preview').parentElement.append(panel);
      }
      panel.querySelector('pre').textContent = 'Normal declarations: earlier layers < later layers < unlayered custom CSS. Inline styles and !important follow CSS cascade rules.\\n' + JSON.stringify(styleResults, null, 2);
      let table = panel.querySelector('table');
      if (!table) { table = document.createElement('table'); panel.insertBefore(table, panel.querySelector('pre')); }
      table.replaceChildren();
      const rows = [['Computed value', 'Browser', 'Node']];
      Object.keys(Object.assign({}, styleResults.Browser, styleResults.Node)).filter(function(key) { return key !== 'stylesheets'; }).forEach(function(key) {
        rows.push([key, styleResults.Browser?.[key] ?? 'Not rendered', styleResults.Node?.[key] ?? 'Not rendered']);
      });
      rows.forEach(function(values, index) {
        const row = table.insertRow();
        if (index && styleResults.Browser && styleResults.Node && values[1] !== values[2]) row.style.background = '#713f12';
        values.forEach(function(value) { const cell = row.insertCell(); cell.textContent = value; cell.style.cssText = 'padding:4px 8px;white-space:normal;'; });
      });
    }
    function readPlaygroundSource() {
      function readJson(editor, label) {
        try { return JSON.parse(editor.getValue()); }
        catch (error) { throw new Error('Invalid JSON in the ' + label + ' editor: ' + error.message); }
      }
      const data = readJson(dataEditor, 'Data');
      const dependencies = readJson(depsEditor, 'Deps');
      if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) throw new Error('Dependencies must be an object of package names and versions');
      const headerCode = themeChrome('header');
      const footerCode = themeChrome('footer');
      return { code: templateEditor.getValue(), ext: currentExt, data, dependencies, theme: document.getElementById('documentTheme').value,
        ...(headerCode ? { headerCode } : {}), ...(footerCode ? { footerCode } : {}), css: cssEditor.getValue() };
    }
    let previewRendering = false;
    let browserPreview;
    let browserOriginRequest;

    function usesBrowserPreview() {
      return document.getElementById('runtime').value === 'browser' && currentFormat === 'html';
    }

    function renderInitialBrowserPreview() {
      if (document.getElementById('runtime').value === 'browser' && templateEditor && !previewHasRender) void renderPreview(false);
    }

    function setRuntime(value) {
      if (!['server', 'browser'].includes(value)) throw new Error('Unknown rendering runtime: ' + value);
      document.getElementById('runtime').value = value;
      const browser = value === 'browser';
      document.querySelectorAll('[data-server-format]').forEach(function(button) { button.hidden = browser; });
      if (browser && !['html', 'pdf'].includes(currentFormat)) setFormat('html');
      updateOutputOptions();
      markPreviewStale();
      writeUrlState();
      renderInitialBrowserPreview();
      document.dispatchEvent(new Event('facet-preview-styles'));
    }

    async function browserRuntimeOrigin() {
      const origin = document.getElementById('runtimeOrigin').value.trim();
      const id = document.getElementById('documentTheme').value;
      const local = installedThemes.some(theme => theme.id === id && theme.build);
      if (origin && !local) return origin;
      const initialize = () => fetch('/playground/runtime?theme=' + encodeURIComponent(id)).then(async function(response) {
        const config = await response.json();
        if (!response.ok) throw new Error(config.error);
        return config.runtimeOrigin;
      });
      if (local) return initialize();
      if (!browserOriginRequest) browserOriginRequest = initialize().catch(function(error) { browserOriginRequest = undefined; throw error; });
      return browserOriginRequest;
    }

    async function doRender() {
      await renderPreview(true);
    }

    async function renderPreview(showLogs) {
      if (previewRendering || !templateEditor) return;
      previewRendering = true;
      const controls = ['renderBtn', 'renderDrop', 'runtime', 'runtimeOrigin', 'refreshPreview'].map(id => document.getElementById(id));
      controls.forEach(control => { control.disabled = true; });
      clearLogs();
      if (showLogs) openLogs();
      try {
        if (usesBrowserPreview()) await renderInBrowser();
        else await renderOnServer();
      } finally {
        previewRendering = false;
        controls.forEach(control => { control.disabled = false; });
      }
    }

    function disposePlaygroundBrowserPreview() {
      if (!browserPreview) return;
      window.FacetPlayground.disposeBrowserPage();
      browserPreview.remove();
      browserPreview = undefined;
    }

    async function browserPageOptions() {
      const source = readPlaygroundSource();
      const { data, dependencies } = source;
      const theme = installedThemes.find(theme => theme.id === source.theme);
      if (!theme) throw new Error('Selected theme is not installed');
      if (theme.package) dependencies[theme.package] = theme.version;
      if (!window.FacetPlayground) throw new Error('Playground runtime assets have not loaded');
      return { runtimeOrigin: await browserRuntimeOrigin(), code: source.code, ext: source.ext,
        header: source.headerCode || '', footer: source.footerCode || '', css: source.css,
        themeModule: theme.module, data, dependencies, format: 'html' };
    }

    async function renderInBrowser() {
      const revision = previewRevision;
      setLogStatus('Rendering in browser...', true);
      setPreviewState('rendering', 'Updating browser preview...');
      const started = Date.now();
      const staging = !browserPreview;
      let ready = false;
      let renderStyles;
      try {
        const options = await browserPageOptions();
        if (revision !== previewRevision) return;
        if (staging) {
          browserPreview = document.createElement('div');
          browserPreview.className = 'preview-body preview-pending';
          browserPreview.inert = true;
          document.getElementById('preview').append(browserPreview);
        }
        await window.FacetPlayground.renderBrowserPage({
          ...options, container: browserPreview,
          onStyles: function(styles) {
            renderStyles = styles;
            if (ready) showStyleResults('Browser', styles, revision);
          },
          onStatus: function(state) {
            if (revision === previewRevision && !ready) setPreviewState('rendering', 'Browser runtime: ' + state);
            setLogStatus(state, state !== 'ready'); addLog('browser', state);
          },
          onError: function(error) {
            if (previewRendering || revision !== previewRevision) return;
            setPreviewState('error', error.message); addLog('error', error.message);
          },
        });
        if (revision !== previewRevision) { window.FacetPlayground.invalidateBrowserPage(); return; }
        publishPreview(browserPreview);
        ready = true;
        if (renderStyles) showStyleResults('Browser', renderStyles, revision);
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        setPreviewState('done', 'Rendered in browser in ' + elapsed + 's');
        setLogStatus('Done (' + elapsed + 's)', false); addLog('done', 'Browser update completed in ' + elapsed + 's');
        if (!renderHadError) setTimeout(closeLogs, 600);
      } catch (error) {
        if (revision === previewRevision) setPreviewState('error', error.message);
        setLogStatus('Failed', false); addLog('error', error.message);
      } finally {
        if (staging && !ready) disposePlaygroundBrowserPreview();
      }
    }

    async function inspectBrowserStyles(revision, signal) {
      const options = await browserPageOptions();
      signal.throwIfAborted();
      const preview = document.getElementById('preview');
      const container = document.createElement('div');
      const { width, height } = preview.getBoundingClientRect();
      container.className = 'preview-body';
      container.style.cssText = 'position:fixed;opacity:0;pointer-events:none;inset:0;width:' + width + 'px;height:' + height + 'px';
      container.inert = true;
      document.body.append(container);
      const inspector = window.FacetPlayground.createBrowserPreview();
      signal.addEventListener('abort', inspector.dispose, { once: true });
      let styles;
      try {
        await inspector.render({ ...options, container, onStatus() {}, onError() {}, onStyles(value) { styles = value; } });
        signal.throwIfAborted();
        if (!styles) throw new Error('Browser runtime did not return computed styles');
        showStyleResults('Browser', styles, revision);
      } finally {
        signal.removeEventListener('abort', inspector.dispose);
        inspector.dispose();
        container.remove();
      }
    }
`;
