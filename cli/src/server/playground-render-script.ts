export const PLAYGROUND_RENDER_SCRIPT = `
    async function inspectNodeStyles(revision, signal) {
      const response = await fetch('/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ ...readPlaygroundSource(), format: 'html' }),
      });
      if (!response.ok) throw new Error('Server style preview failed (HTTP ' + response.status + ')');
      const preview = new DOMParser().parseFromString(await response.text(), 'text/html');
      preview.querySelectorAll('script').forEach(script => script.remove());
      signal.throwIfAborted();
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      const { width, height } = document.getElementById('preview').getBoundingClientRect();
      frame.style.cssText = 'position:fixed;visibility:hidden;inset:0;width:' + width + 'px;height:' + height + 'px';
      try {
        const styles = await new Promise((resolve, reject) => {
          const abort = () => reject(signal.reason);
          signal.addEventListener('abort', abort, { once: true });
          frame.onload = () => {
            signal.removeEventListener('abort', abort);
            try { resolve(window.FacetPlayground.inspectStyles(frame.contentDocument)); }
            catch (error) { reject(error); }
          };
          frame.srcdoc = '<!doctype html>' + preview.documentElement.outerHTML;
          document.body.append(frame);
        });
        if (!signal.aborted) showStyleResults('Node', styles, revision);
      } finally { frame.remove(); }
    }

    async function loadPdfPreview(url) {
      const frame = document.createElement('iframe');
      frame.title = 'PDF preview';
      frame.className = 'preview-pending';
      frame.inert = true;
      const signal = AbortSignal.timeout(30000);
      try {
        await new Promise((resolve, reject) => {
          const fail = () => reject(new Error('Could not load the PDF preview from ' + url));
          signal.addEventListener('abort', fail, { once: true });
          frame.onerror = fail;
          frame.onload = () => previewFrameHasError(frame) ? fail() : resolve();
          frame.src = url;
          document.getElementById('preview').append(frame);
        });
        return frame;
      } catch (error) {
        frame.remove();
        throw error;
      } finally {
        frame.onload = frame.onerror = null;
      }
    }

    async function buildServerPreview(payload, body, revision) {
      if (payload.contentType === 'text/html') {
        const frame = document.createElement('iframe');
        frame.title = 'HTML preview';
        frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
        frame.onload = function() { showStyleResults('Node', window.FacetPlayground.inspectStyles(this.contentDocument), revision); };
        frame.srcdoc = payload.data;
        return frame;
      }
      if (!payload.url) throw new Error('Render returned empty result');
      if (payload.contentType === 'image/png') {
        const img = document.createElement('img');
        img.alt = 'PNG render';
        img.onerror = () => { if (revision === previewRevision) onPreviewLoadError(payload.url); };
        img.src = payload.url;
        return img;
      }
      if (body.format === 'docx' || body.format === 'pptx') return buildOfficePreview(payload.url, body, body.format);
      if (payload.contentType === 'application/pdf') return loadPdfPreview(payload.url);
      throw new Error('Unexpected render type: ' + payload.contentType);
    }

    function buildServerRequest(format) {
      const body = { ...readPlaygroundSource(), format };
      const pageSize = document.getElementById('pageSize').value;
      const landscape = document.getElementById('landscape').checked;
      const debug = document.getElementById('debug').checked;
      const debugTypography = document.getElementById('debugTypography').checked;

      const tsEnabled = document.getElementById('timestampEnabled').checked;
      const timestampUrl = tsEnabled ? document.getElementById('timestampUrl').value.trim() : '';

      if (!Object.keys(body.dependencies).length) delete body.dependencies;
      if (format === 'pdf') {
        body.pdfOptions = {};
        const margins = {};
        for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
          const input = document.getElementById('margin' + side);
          if (!input.validity.valid) throw new Error(side + ' margin must be a non-negative number in mm');
          if (input.value !== '') margins[side.toLowerCase()] = input.valueAsNumber;
        }
        if (pageSize) body.pageSizeOverride = pageSize;
        if (landscape) body.pdfOptions.landscape = true;
        if (debug) body.pdfOptions.debug = true;
        if (debugTypography) body.pdfOptions.debugTypography = true;
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
      if (format === 'pdf' && timestampUrl) body.signature = { timestampUrl };
      return body;
    }

    async function renderOnServer() {
      const revision = previewRevision;
      const start = Date.now();
      setLogStatus('Rendering...', true);
      setPreviewState('rendering', 'Rendering ' + currentFormat.toUpperCase() + '\\u2026');
      try {
        const body = buildServerRequest(currentFormat);
        const res = await fetch('/render/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('Render failed (HTTP ' + res.status + '): ' + await res.text());

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

            const type = eventType;
            eventType = 'message';
            if (type === 'result') {
              gotResult = true;
              const elapsed = ((Date.now() - start) / 1000).toFixed(1);
              showTimings(payload.timings);
              if (revision === previewRevision) {
                const content = await buildServerPreview(payload, body, revision);
                if (revision === previewRevision) {
                  disposePlaygroundBrowserPreview();
                  publishPreview(content);
                  setPreviewState('done', 'Rendered in ' + elapsed + 's', payload.timings);
                } else content.remove();
              }
              setLogStatus('Done (' + elapsed + 's)', false);
              addLog('done', 'Completed in ' + elapsed + 's');
              if (!renderHadError) setTimeout(closeLogs, 600);
            } else if (type === 'error') {
              throw new Error(payload.message);
            } else if (!gotResult && (payload.stage || payload.message)) {
              if (revision === previewRevision) setPreviewState('rendering', payload.message);
              setLogStatus(payload.message, true);
              addLog(payload.stage, payload.message, payload.elapsed, payload.duration);
            }
          }

          if (done) break;
        }

        if (!gotResult) throw new Error('The render stream ended without returning a result.');
      } catch (e) {
        if (revision === previewRevision) setPreviewState('error', e.message);
        setLogStatus('Error', false);
        addLog('error', e.message);
      }
    }
`;
