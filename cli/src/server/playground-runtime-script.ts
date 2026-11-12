export const PLAYGROUND_RUNTIME_SCRIPT = `
    let installedThemes = [{ id: 'facet', module: '@flanksource/facet/Theme' }];
    fetch('/themes').then(async function(response) {
      if (!response.ok) throw new Error('Cannot load themes');
      const catalog = await response.json(); installedThemes = catalog.themes;
      const select = document.getElementById('documentTheme');
      select.replaceChildren(...installedThemes.map(function(theme) { const option = document.createElement('option'); option.value = theme.id; option.textContent = theme.id; return option; }));
      select.value = new URLSearchParams(location.search).get('theme') ?? catalog.default;
    }).catch(function(error) { addLog('error', error.message); });
    function themeChanged() { browserOriginRequest = undefined; markPreviewStale(); writeUrlState(); queueBrowserRender(); }
    function themeChrome(slot) {
      const value = (slot === 'header' ? headerEditor : footerEditor).getValue().trim();
      const defaultValue = (slot === 'header' ? DEFAULT_HEADER : DEFAULT_FOOTER).trim();
      return document.getElementById('documentTheme').value !== 'facet' && value === defaultValue ? '' : value;
    }
    const styleResults = {};
    function showStyleResults(runtime, styles) {
      styleResults[runtime] = styles;
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
    let browserRenderTimer;
    let browserRenderBusy = false;
    let browserRenderQueued = false;
    let browserOriginRequest;

    function queueBrowserRender() {
      if (document.getElementById('runtime').value !== 'browser' || !templateEditor) return;
      browserRenderQueued = true;
      clearTimeout(browserRenderTimer);
      browserRenderTimer = setTimeout(function() {
        if (!browserRenderBusy) { browserRenderQueued = false; void renderInBrowser(true); }
      }, 300);
    }

    function setRuntime(value) {
      if (!['server', 'browser'].includes(value)) throw new Error('Unknown rendering runtime: ' + value);
      document.getElementById('runtime').value = value;
      const browser = value === 'browser';
      document.getElementById('runtimeOriginControl').style.display = browser ? '' : 'none';
      document.getElementById('browserHint').style.display = browser ? '' : 'none';
      document.querySelectorAll('[data-server-format]').forEach(function(button) { button.hidden = browser; });
      if (browser && !['html', 'pdf'].includes(currentFormat)) setFormat('html');
      document.getElementById('pdfOptions').style.display = !browser && currentFormat === 'pdf' ? 'flex' : 'none';
      if (!browser) {
        clearTimeout(browserRenderTimer); browserRenderQueued = false;
        if (window.FacetPlayground) window.FacetPlayground.disposeBrowserPage();
        previewHasRender = false; setPreviewState('idle');
      } else markPreviewStale();
      writeUrlState();
    }

    async function browserRuntimeOrigin() {
      const origin = document.getElementById('runtimeOrigin').value.trim();
      if (origin) return origin;
      if (!browserOriginRequest) browserOriginRequest = fetch('/playground/runtime?theme=' + encodeURIComponent(document.getElementById('documentTheme').value)).then(async function(response) {
        const config = await response.json();
        if (!response.ok) throw new Error(config.error);
        return config.runtimeOrigin;
      }).catch(function(error) { browserOriginRequest = undefined; throw error; });
      return browserOriginRequest;
    }

    async function doRender() {
      if (document.getElementById('runtime').value === 'browser') return renderInBrowser(false);
      return renderOnServer();
    }

    async function renderInBrowser(automatic) {
      if (document.getElementById('runtime').value !== 'browser') return;
      if (browserRenderBusy) { browserRenderQueued = true; return; }
      clearTimeout(browserRenderTimer); browserRenderQueued = false; browserRenderBusy = true;
      const revision = previewRevision;
      const preview = document.getElementById('preview');
      ['renderBtn', 'renderDrop', 'runtime', 'runtimeOrigin'].forEach(function(id) { document.getElementById(id).disabled = true; });
      clearLogs(); if (!automatic) openLogs();
      setLogStatus('Rendering in browser...', true);
      setPreviewState('rendering', 'Updating browser preview...');
      previewHasRender = false;
      const started = Date.now();
      try {
        const data = JSON.parse(dataEditor.getValue());
        const dependencies = JSON.parse(depsEditor.getValue());
        if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) throw new Error('Dependencies must be an object of package names and versions');
        const selectedTheme = installedThemes.find(function(theme) { return theme.id === document.getElementById('documentTheme').value; });
        if (!selectedTheme) throw new Error('Selected theme is not installed');
        if (selectedTheme.package) dependencies[selectedTheme.package] = selectedTheme.version;
        if (!window.FacetPlayground) throw new Error('Playground runtime assets have not loaded');
        await window.FacetPlayground.renderBrowserPage({
          container: preview, runtimeOrigin: await browserRuntimeOrigin(), code: templateEditor.getValue(), ext: currentExt,
          header: themeChrome('header'), footer: themeChrome('footer'),
          css: cssEditor.getValue(),
          onStyles: function(styles) { showStyleResults('Browser', styles); },
          themeModule: selectedTheme.module,
          data, dependencies, format: currentFormat,
          onStatus: function(state) { document.getElementById('previewText').textContent = 'Browser runtime: ' + state; setLogStatus(state, state !== 'ready'); addLog('browser', state); },
          onError: function(error) {
            if (browserRenderBusy) return;
            previewHasRender = false; setPreviewState('error', error.message); addLog('error', error.message);
          },
        });
        if (revision !== previewRevision) { window.FacetPlayground.invalidateBrowserPage(); setPreviewState('stale'); return; }
        previewHasRender = true;
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        setPreviewState('done', 'Rendered in browser in ' + elapsed + 's');
        setLogStatus('Done (' + elapsed + 's)', false); addLog('done', 'Browser update completed in ' + elapsed + 's');
        if (!renderHadError) setTimeout(closeLogs, 600);
      } catch (error) {
        if (!window.FacetPlayground || !window.FacetPlayground.showBrowserError(error.message)) preview.innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
        setPreviewState('error', error.message); setLogStatus('Failed', false); addLog('error', error.message);
      } finally {
        browserRenderBusy = false;
        ['renderBtn', 'renderDrop', 'runtime', 'runtimeOrigin'].forEach(function(id) { document.getElementById(id).disabled = false; });
        if (browserRenderQueued) queueBrowserRender();
      }
    }
`;
