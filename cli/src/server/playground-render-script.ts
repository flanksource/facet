export const PLAYGROUND_RENDER_SCRIPT = `
    async function renderOnServer() {
      const btn = document.getElementById('renderBtn');
      const drop = document.getElementById('renderDrop');
      const preview = document.getElementById('preview');

      btn.disabled = true;
      drop.disabled = true;
      clearLogs();
      openLogs();
      setLogStatus('Rendering...', true);
      setPreviewState('rendering', 'Rendering ' + currentFormat.toUpperCase() + '\\u2026');
      previewHasRender = false;

      const code = templateEditor.getValue();
      const format = currentFormat;
      const pageSize = document.getElementById('pageSize').value;
      const landscape = document.getElementById('landscape').checked;
      const debug = document.getElementById('debug').checked;

      let data = {};
      try {
        data = JSON.parse(dataEditor.getValue());
      } catch (e) {
        preview.innerHTML = '<div class="error">Invalid JSON in data editor:\\n' + e.message + '</div>';
        setPreviewState('error', 'Invalid JSON in data editor');
        btn.disabled = false;
        drop.disabled = false;
        setLogStatus('Failed', false);
        addLog('error', 'Invalid JSON: ' + e.message);
        return;
      }

      let deps = {};
      try {
        deps = JSON.parse(depsEditor.getValue());
        if (!deps || typeof deps !== 'object' || Array.isArray(deps)) throw new Error('Dependencies must be an object of package names and versions');
      } catch (e) {
        preview.innerHTML = '<div class="error">Invalid JSON in dependencies editor:\\n' + e.message + '</div>';
        setPreviewState('error', 'Invalid JSON in dependencies editor');
        setLogStatus('Failed', false);
        addLog('error', 'Invalid JSON in dependencies editor: ' + e.message);
        btn.disabled = false;
        drop.disabled = false;
        return;
      }

      const margins = {};
      const mt = parseFloat(document.getElementById('marginTop').value);
      const mb = parseFloat(document.getElementById('marginBottom').value);
      const ml = parseFloat(document.getElementById('marginLeft').value);
      const mr = parseFloat(document.getElementById('marginRight').value);
      if (!isNaN(mt)) margins.top = mt;
      if (!isNaN(mb)) margins.bottom = mb;
      if (!isNaN(ml)) margins.left = ml;
      if (!isNaN(mr)) margins.right = mr;

      const tsEnabled = document.getElementById('timestampEnabled').checked;
      const timestampUrl = tsEnabled ? document.getElementById('timestampUrl').value.trim() : '';

      const body = { code, format, data, ext: currentExt, theme: document.getElementById('documentTheme').value };
      if (format === 'pdf') {
        body.pdfOptions = {};
        if (pageSize) body.pdfOptions.defaultPageSize = pageSize;
        if (landscape) body.pdfOptions.landscape = true;
        if (debug) body.pdfOptions.debug = true;
        if (Object.keys(margins).length) body.pdfOptions.margins = margins;
        if (!Object.keys(body.pdfOptions).length) delete body.pdfOptions;
      }
      if (format === 'png') {
        const pngWidth = document.getElementById('pngWidth').value;
        const pngHeight = document.getElementById('pngHeight').value;
        const pngViewport = document.getElementById('pngViewport').value.trim();
        body.pngOptions = { selector: document.getElementById('pngSelector').value };
        if (pngWidth) body.pngOptions.width = Number(pngWidth);
        if (pngHeight) body.pngOptions.height = Number(pngHeight);
        if (pngViewport) {
          const parts = pngViewport.split('x');
          body.pngOptions.viewport = { width: Number(parts[0]), height: Number(parts[1]) };
        }
        if (document.getElementById('pngAutocrop').checked) {
          body.pngOptions.autocrop = true;
          const pngAutocropPadding = document.getElementById('pngAutocropPadding').value;
          if (pngAutocropPadding) body.pngOptions.autocropPadding = Number(pngAutocropPadding);
        }
      }
      if (Object.keys(deps).length) body.dependencies = deps;
      if (format === 'pdf' && timestampUrl) body.signature = { timestampUrl };

      const hdr = themeChrome('header');
      const ftr = themeChrome('footer');
      if (hdr) body.headerCode = hdr;
      if (ftr) body.footerCode = ftr;
      body.css = cssEditor.getValue();

      const start = Date.now();
      document.getElementById('runtime').disabled = true;
      document.getElementById('runtimeOrigin').disabled = true;
      try {
        const res = await fetch('/render/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          preview.innerHTML = '<div class="error">Render failed (' + res.status + '):\\n' + err + '</div>';
          setPreviewState('error', 'Render failed (HTTP ' + res.status + ')');
          setLogStatus('Failed', false);
          addLog('error', 'HTTP ' + res.status + ': ' + err);
          btn.disabled = false;
          drop.disabled = false;
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let gotResult = false;
        // Must outlive a single read. A frame's "event:" line and its "data:"
        // line routinely arrive in different chunks once the payload is large
        // (an inlined HTML document always is), and resetting per chunk
        // downgraded those results to unhandled progress messages — the render
        // completed but the preview never updated.
        let eventType = 'message';

        while (true) {
          const { done, value } = await reader.read();

          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          // Nothing follows the final read, so flush the remainder instead of
          // holding it back as a partial line.
          buffer = done ? '' : (lines.pop() || '');

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
              continue;
            }
            if (!line.startsWith('data: ')) {
              if (line === '') eventType = 'message';
              continue;
            }

            let payload;
            try { payload = JSON.parse(line.slice(6)); } catch { continue; }

            if (eventType === 'result') {
              gotResult = true;
              const elapsed = ((Date.now() - start) / 1000).toFixed(1);
              showTimings(payload.timings);
              let rendered = true;
              if (payload.contentType === 'text/html') {
                preview.innerHTML = '<iframe sandbox="allow-same-origin allow-scripts"></iframe>';
                preview.querySelector('iframe').srcdoc = payload.data;
                preview.querySelector('iframe').onload = function() { showStyleResults('Node', window.FacetPlayground.inspectStyles(this.contentDocument)); };
              } else if (payload.contentType === 'image/png' && payload.url) {
                preview.innerHTML = '<img alt="PNG render">';
                const img = preview.querySelector('img');
                img.onerror = function () { onPreviewLoadError(payload.url); };
                img.src = payload.url;
              } else if ((format === 'docx' || format === 'pptx') && payload.url) {
                await showOfficeResult(preview, payload.url, body, format);
              } else if (payload.url) {
                preview.innerHTML = '<iframe></iframe>';
                const frame = preview.querySelector('iframe');
                frame.onload = function () { checkPreviewFrame(frame, payload.url); };
                frame.src = payload.url;
              } else {
                preview.innerHTML = '<div class="error">Render returned empty result</div>';
                rendered = false;
              }
              previewHasRender = rendered;
              setPreviewState(
                rendered ? 'done' : 'error',
                rendered ? 'Rendered in ' + elapsed + 's' : 'Render returned empty result',
                payload.timings,
              );
              setLogStatus('Done (' + elapsed + 's)', false);
              addLog('done', 'Completed in ' + elapsed + 's');
              if (!renderHadError) setTimeout(closeLogs, 600);
            } else if (eventType === 'error') {
              preview.innerHTML = '<div class="error">' + escapeHtml(payload.message) + '</div>';
              setPreviewState('error', payload.message);
              setLogStatus('Failed', false);
              addLog('error', payload.message);
            } else if (payload.stage || payload.message) {
              // A trailing 'done' stage arrives after the result on the success
              // path; it must not reset the banner or blank the render.
              if (!gotResult) setPreviewState('rendering', payload.message);
              setLogStatus(payload.message, true);
              addLog(payload.stage, payload.message, payload.elapsed, payload.duration);
            }
            eventType = 'message';
          }

          if (done) break;
        }

        // The stream ended without a result. Reporting "Done" here left the
        // previous render on screen looking current; it is a failure.
        if (!gotResult && !renderHadError) {
          preview.innerHTML = '<div class="error">The render stream ended without returning a result.</div>';
          setPreviewState('error', 'Render ended without a result');
          setLogStatus('Failed', false);
          addLog('error', 'Stream closed before a result was received');
        }
      } catch (e) {
        if (window.FacetPlayground) window.FacetPlayground.disposeBrowserPage();
        preview.innerHTML = '<div class="error">Render failed:\\n' + escapeHtml(e.message) + '</div>';
        setPreviewState('error', e.message);
        setLogStatus('Error', false);
        addLog('error', e.message);
      } finally {
        document.getElementById('runtime').disabled = false;
        document.getElementById('runtimeOrigin').disabled = false;
        btn.disabled = false;
        drop.disabled = false;
      }
    }
`;
