export const PLAYGROUND_CONTROLS_SCRIPT = `
    /* Render format menu */
    function setFormat(fmt) {
      currentFormat = fmt;
      document.getElementById('renderBtn').textContent = 'Render ' + fmt.toUpperCase();
      document.getElementById('checkHtml').innerHTML = fmt === 'html' ? '&#10003;' : '&nbsp;';
      document.getElementById('checkPdf').innerHTML = fmt === 'pdf' ? '&#10003;' : '&nbsp;';
      document.getElementById('checkPng').innerHTML = fmt === 'png' ? '&#10003;' : '&nbsp;';
      document.getElementById('pdfOptions').style.display = fmt === 'pdf' ? 'flex' : 'none';
      document.getElementById('pngOptions').style.display = fmt === 'png' ? 'flex' : 'none';
      closeRenderMenu();
      // A PDF render must not stay on screen under a "Render PNG" button.
      markPreviewStale();
      writeUrlState();
    }

    function toggleRenderMenu(e) {
      e.stopPropagation();
      document.getElementById('renderMenu').classList.toggle('open');
    }

    function closeRenderMenu() {
      document.getElementById('renderMenu').classList.remove('open');
    }

    document.addEventListener('click', closeRenderMenu);

    function toggleTimestamp() {
      document.getElementById('timestampUrl').style.display =
        document.getElementById('timestampEnabled').checked ? '' : 'none';
      writeUrlState();
    }

    /* URL routing — toolbar state is serialized to the query string so a
       configured playground is shareable and survives a reload. Only
       non-default values are written, keeping shared links short. */
    const DEFAULT_TSA = 'http://timestamp.digicert.com';
    const MARGIN_PARAMS = { mt: 'marginTop', mb: 'marginBottom', ml: 'marginLeft', mr: 'marginRight' };

    function writeUrlState() {
      if (!routingReady) return;
      const p = new URLSearchParams();
      if (document.body.classList.contains('mode-fill')) p.set('mode', 'fill');
      const example = document.getElementById('example').value;
      if (example && example !== 'datasheet') p.set('example', example);
      if (currentFormat !== 'html') p.set('format', currentFormat);
      if (currentFormat === 'png') {
        const width = document.getElementById('pngWidth').value;
        const height = document.getElementById('pngHeight').value;
        const selector = document.getElementById('pngSelector').value;
        const viewport = document.getElementById('pngViewport').value.trim();
        if (width) p.set('pngWidth', width);
        if (height) p.set('pngHeight', height);
        if (selector !== 'body') p.set('pngSelector', selector);
        if (viewport) p.set('pngViewport', viewport);
        if (document.getElementById('pngAutocrop').checked) {
          p.set('pngAutocrop', '1');
          const padding = document.getElementById('pngAutocropPadding').value;
          if (padding) p.set('pngAutocropPadding', padding);
        }
      }
      const pageSize = document.getElementById('pageSize').value;
      if (pageSize) p.set('pageSize', pageSize);
      if (document.getElementById('landscape').checked) p.set('landscape', '1');
      if (document.getElementById('debug').checked) p.set('debug', '1');
      for (const key in MARGIN_PARAMS) {
        const v = document.getElementById(MARGIN_PARAMS[key]).value;
        if (v !== '' && v !== '10') p.set(key, v);
      }
      if (document.getElementById('timestampEnabled').checked) {
        p.set('timestamp', '1');
        const tsa = document.getElementById('timestampUrl').value.trim();
        if (tsa && tsa !== DEFAULT_TSA) p.set('tsa', tsa);
      }
      const qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }

    // Applies all toolbar state from the URL. The example dropdown is set here so
    // the URL stays consistent immediately; its editor content is swapped in later,
    // once the Monaco editors exist.
    function applyUrlToolbar(p) {
      const example = p.get('example');
      if (example && EXAMPLES[example]) document.getElementById('example').value = example;
      const pageSize = p.get('pageSize');
      if (pageSize) document.getElementById('pageSize').value = pageSize;
      document.getElementById('landscape').checked = p.get('landscape') === '1';
      document.getElementById('debug').checked = p.get('debug') === '1';
      for (const key in MARGIN_PARAMS) {
        if (p.has(key)) document.getElementById(MARGIN_PARAMS[key]).value = p.get(key);
      }
      if (p.get('timestamp') === '1') {
        document.getElementById('timestampEnabled').checked = true;
        const tsa = p.get('tsa');
        if (tsa) document.getElementById('timestampUrl').value = tsa;
        toggleTimestamp();
      }
      const format = p.get('format');
      if (format === 'pdf' || format === 'png') setFormat(format);
      if (p.has('pngWidth')) document.getElementById('pngWidth').value = p.get('pngWidth');
      if (p.has('pngHeight')) document.getElementById('pngHeight').value = p.get('pngHeight');
      if (p.has('pngSelector')) document.getElementById('pngSelector').value = p.get('pngSelector');
      if (p.has('pngViewport')) document.getElementById('pngViewport').value = p.get('pngViewport');
      document.getElementById('pngAutocrop').checked = p.get('pngAutocrop') === '1';
      if (p.has('pngAutocropPadding')) {
        document.getElementById('pngAutocropPadding').value = p.get('pngAutocropPadding');
      }
      if (p.get('mode') === 'fill') setMode('fill');
    }

    // Controls without an existing inline handler need a listener to keep the URL in sync.
    function bindUrlSync() {
      ['pageSize', 'landscape', 'debug', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
       'timestampUrl', 'pngWidth', 'pngHeight', 'pngSelector', 'pngViewport',
       'pngAutocrop', 'pngAutocropPadding']
        .forEach(function(id) {
          const el = document.getElementById(id);
          const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
          el.addEventListener(ev, writeUrlState);
        });
    }

    function initUrlRouting() {
      applyUrlToolbar(new URLSearchParams(location.search));
      bindUrlSync();
      routingReady = true;
    }

    /* Log dialog */
    function openLogs() {
      document.getElementById('logOverlay').classList.add('open');
    }

    function closeLogs() {
      document.getElementById('logOverlay').classList.remove('open');
    }

    function onOverlayClick(e) {
      if (e.target === document.getElementById('logOverlay')) closeLogs();
    }

    function clearLogs() {
      document.getElementById('logsBody').innerHTML = '';
      const badge = document.getElementById('logsBadge');
      badge.style.display = 'none';
      badge.className = 'badge';
      badge.textContent = '0';
      document.getElementById('logStatusText').innerHTML = '';
      const dot = document.getElementById('logsDot');
      dot.style.display = 'none';
      dot.className = 'dot';
      document.querySelector('.log-dialog').classList.remove('has-errors');
      renderHadError = false;
    }

    function formatErrorBlock(raw) {
      const text = String(raw || '');
      const lines = text.split('\\n');

      // Try to parse structured build errors (esbuild/vite style)
      // Patterns: "file:line:col: error: message" or "ERROR: message"
      const locMatch = text.match(/^(?:.*?\\n)?\\s*([\\/\\w._-]+\\.\\w+):([\\d]+):([\\d]+):?\\s*(error|warning)?:?\\s*(.*)$/m);
      const codeLines = [];
      const otherLines = [];
      let inCodeBlock = false;

      for (const line of lines) {
        // Lines with line numbers like "  42 |  code" or leading caret "     ^"
        if (/^\\s*\\d+\\s*[|\\u2502]/.test(line) || /^\\s*[~^]+\\s*$/.test(line) || /^\\s*\\|\\s*\\^/.test(line)) {
          codeLines.push(line);
          inCodeBlock = true;
        } else if (inCodeBlock && /^\\s*$/.test(line)) {
          inCodeBlock = false;
        } else {
          otherLines.push(line);
        }
      }

      const el = document.createElement('div');
      el.className = 'log-error-block';

      // Title
      if (locMatch) {
        const title = document.createElement('div');
        title.className = 'error-title';
        title.textContent = locMatch[5] || 'Build error';
        el.appendChild(title);

        const loc = document.createElement('div');
        loc.className = 'error-location';
        loc.textContent = locMatch[1] + ':' + locMatch[2] + ':' + locMatch[3];
        el.appendChild(loc);
      } else {
        // Extract first meaningful line as title
        const firstLine = otherLines.find(l => l.trim()) || 'Error';
        const title = document.createElement('div');
        title.className = 'error-title';
        title.textContent = firstLine.replace(/^(error|Error):?\\s*/, '');
        el.appendChild(title);
      }

      // Code snippet block
      if (codeLines.length > 0) {
        const code = document.createElement('div');
        code.className = 'error-code';
        code.innerHTML = codeLines.map(function(line) {
          const escaped = escapeHtml(line);
          if (/^\\s*[~^]+\\s*$/.test(line) || /^\\s*\\|\\s*\\^/.test(line)) {
            return '<span class="caret-line">' + escaped + '</span>';
          }
          // Highlight the error line (often has no | prefix or is marked)
          const numMatch = line.match(/^\\s*(\\d+)\\s*[|\\u2502]/);
          if (numMatch && locMatch && numMatch[1] === locMatch[2]) {
            return '<span class="line-error">' + escaped + '</span>';
          }
          return '<span class="line-normal">' + escaped + '</span>';
        }).join('\\n');
        el.appendChild(code);
      }

      // Remaining detail lines (skip the first if already used as title, skip empty leading/trailing)
      const detail = otherLines
        .filter(function(l, i) {
          if (locMatch) return !l.match(/^\\s*([\\/\\w._-]+\\.\\w+):[\\d]+:[\\d]+/);
          return i > 0 || !l.trim();
        })
        .join('\\n').trim();

      if (detail) {
        const detailEl = document.createElement('div');
        detailEl.className = 'error-detail';
        detailEl.textContent = detail;
        el.appendChild(detailEl);
      }

      return el;
    }

    function addLog(stage, message, elapsed, duration) {
      const body = document.getElementById('logsBody');
      const badge = document.getElementById('logsBadge');
      const dot = document.getElementById('logsDot');
      const dialog = document.querySelector('.log-dialog');

      if (stage === 'error') {
        body.appendChild(formatErrorBlock(message));
        dialog.classList.add('has-errors');
        badge.className = 'badge error';
        dot.className = 'dot error';
        renderHadError = true;
      } else {
        const time = duration != null ? '+' + (duration / 1000).toFixed(1) + 's' : '';
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML =
          '<span class="log-time">' + time + '</span>' +
          '<span class="log-stage ' + stage + '">' + stage + '</span>' +
          '<span class="log-msg">' + escapeHtml(message) + '</span>';
        body.appendChild(entry);

        if (stage === 'done') {
          badge.className = 'badge done';
          dot.className = 'dot';
        } else {
          if (!renderHadError) badge.className = 'badge';
        }
      }

      body.scrollTop = body.scrollHeight;
      const count = body.children.length;
      badge.textContent = count;
      badge.style.display = 'inline-block';
      dot.style.display = 'block';
    }

    function showTimings(timings) {
      if (!Array.isArray(timings)) return;
      timings.forEach(function(timing) {
        addLog('timing', timing.description, undefined, timing.durationMs);
      });
    }

    function setLogStatus(text, spinner) {
      const el = document.getElementById('logStatusText');
      el.innerHTML = spinner ? '<span class="log-spinner"></span>' + escapeHtml(text) : escapeHtml(text);
    }

    function escapeHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    /* Preview banner — the pane's own status line.

       The body is blanked for every state that does not have a current render
       to show, so a stale render can never sit under changed source. 'done' and
       'error' leave the body alone; their caller fills it first. */
    const PREVIEW_BLANKS = { idle: 1, stale: 1, rendering: 1 };
    const PREVIEW_TEXT = {
      idle: 'Click "Render" to preview your template',
      stale: 'Template changed \\u2014 click Render',
      rendering: 'Rendering\\u2026',
      done: 'Rendered',
      error: 'Render failed',
    };

    function setPreviewState(state, detail, timings) {
      document.getElementById('previewBanner').className = 'preview-banner ' + state;
      document.getElementById('previewText').textContent = detail || PREVIEW_TEXT[state];
      document.getElementById('previewTimings').textContent = formatPreviewTimings(timings);
      if (PREVIEW_BLANKS[state]) document.getElementById('preview').innerHTML = '';
    }

    function formatPreviewTimings(timings) {
      if (!Array.isArray(timings) || !timings.length) return '';
      return timings
        .map(function(t) { return t.description + ' ' + (t.durationMs / 1000).toFixed(1) + 's'; })
        .join(' \\u00b7 ');
    }

    // Only a pane that is actually showing a render can go stale, so edits made
    // before the first render (including the example applied from the URL on
    // load) leave the idle prompt in place.
    let previewHasRender = false;

    function markPreviewStale() {
      if (!previewHasRender) return;
      previewHasRender = false;
      setPreviewState('stale');
    }

    // An <iframe> fires no error event for an HTTP failure — it renders the JSON
    // error envelope as a document instead. /results is same-origin, so read it
    // back. A real PDF is drawn by the browser's viewer and exposes no such text.
    function checkPreviewFrame(frame, url) {
      let text;
      try {
        const body = frame.contentDocument && frame.contentDocument.body;
        text = body ? body.textContent.trim() : '';
      } catch (e) {
        return;
      }
      if (text.charAt(0) === '{' && text.indexOf('"error"') !== -1) onPreviewLoadError(url);
    }

    // Surfaces a result that failed to load — an evicted cache entry (404) or,
    // with --api-key, a subresource the browser cannot authenticate (401).
    function onPreviewLoadError(url) {
      setPreviewState('error', 'Could not load the render \\u2014 it may have expired');
      document.getElementById('preview').innerHTML =
        '<div class="error">The server did not return the render at ' + escapeHtml(url)
        + '.\\nIt may have been evicted from the render cache. Click Render again.</div>';
    }

`;
