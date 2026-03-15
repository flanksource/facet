const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facet Playground</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; background: #1e1e1e; color: #ccc; }
    .toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #2d2d2d; border-bottom: 1px solid #404040; flex-shrink: 0; }
    .toolbar label { font-size: 13px; }
    .toolbar select, .toolbar button { font-size: 13px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; cursor: pointer; }
    .toolbar button:hover { background: #505050; }
    .toolbar button.primary { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
    .toolbar button.primary:hover { background: #1d4ed8; }
    .toolbar button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .toolbar .sep { width: 1px; height: 20px; background: #555; }
    .toolbar .spacer { flex: 1; }
    .toolbar .status { font-size: 12px; color: #888; }
    .toolbar input[type="checkbox"] { margin-right: 2px; }
    .toolbar input[type="text"] { font-size: 13px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; width: 100px; }
    .main { display: flex; flex: 1; min-height: 0; }
    .editor-panel { display: flex; flex-direction: column; width: 50%; border-right: 1px solid #404040; }
    .editor-tabs { display: flex; background: #252526; border-bottom: 1px solid #404040; flex-shrink: 0; }
    .editor-tabs button { padding: 6px 16px; font-size: 13px; background: none; border: none; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
    .editor-tabs button.active { color: #fff; border-bottom-color: #2563eb; }
    #template-editor, #data-editor { flex: 1; min-height: 0; }
    .right-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .preview-panel { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
    .preview-panel iframe { flex: 1; border: none; width: 100%; }
    .preview-panel .error { padding: 16px; color: #dc2626; font-family: monospace; font-size: 13px; white-space: pre-wrap; background: #fef2f2; flex: 1; overflow: auto; }
    .preview-panel .empty { display: flex; align-items: center; justify-content: center; flex: 1; color: #888; font-size: 14px; background: #f5f5f5; }

    .logs-panel { background: #1a1a2e; border-top: 1px solid #404040; max-height: 180px; overflow-y: auto; flex-shrink: 0; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; }
    .logs-panel.collapsed { max-height: 28px; overflow: hidden; }
    .logs-header { display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: #16213e; cursor: pointer; user-select: none; position: sticky; top: 0; z-index: 1; }
    .logs-header .title { font-size: 11px; font-weight: 600; color: #8892b0; text-transform: uppercase; letter-spacing: 0.5px; }
    .logs-header .badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #2563eb; color: #fff; min-width: 18px; text-align: center; }
    .logs-header .badge.error { background: #dc2626; }
    .logs-header .badge.done { background: #16a34a; }
    .logs-header .spacer { flex: 1; }
    .logs-header .toggle { font-size: 10px; color: #555; }
    .log-entry { padding: 2px 12px; display: flex; gap: 8px; line-height: 1.6; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .log-entry:hover { background: rgba(255,255,255,0.02); }
    .log-time { color: #4a5568; min-width: 52px; flex-shrink: 0; }
    .log-stage { min-width: 100px; flex-shrink: 0; font-weight: 500; }
    .log-msg { color: #a0aec0; flex: 1; }
    .log-stage.parsing { color: #a78bfa; }
    .log-stage.resolving { color: #60a5fa; }
    .log-stage.installing { color: #f59e0b; }
    .log-stage.building { color: #34d399; }
    .log-stage.tailwind { color: #2dd4bf; }
    .log-stage.rendering-html { color: #818cf8; }
    .log-stage.rendering-pdf { color: #f472b6; }
    .log-stage.uploading { color: #fb923c; }
    .log-stage.done { color: #4ade80; }
    .log-stage.error { color: #f87171; }
    .log-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #555; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 4px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong style="color:#fff;font-size:14px;">Facet Playground</strong>
    <div class="sep"></div>
    <label>Format:
      <select id="format">
        <option value="html">HTML</option>
        <option value="pdf">PDF</option>
      </select>
    </label>
    <label>Page Size:
      <select id="pageSize">
        <option value="">Default</option>
        <option value="A4">A4</option>
        <option value="Letter">Letter</option>
        <option value="A3">A3</option>
        <option value="Legal">Legal</option>
        <option value="Tabloid">Tabloid</option>
      </select>
    </label>
    <label><input type="checkbox" id="landscape"> Landscape</label>
    <label><input type="checkbox" id="debug"> Debug</label>
    <div class="sep"></div>
    <label>Facet: <input type="text" id="facetVersion" value="__FACET_VERSION__" placeholder="latest"></label>
    <div class="spacer"></div>
    <span class="status" id="status"></span>
    <button class="primary" id="renderBtn" onclick="doRender()">Render</button>
  </div>
  <div class="main">
    <div class="editor-panel">
      <div class="editor-tabs">
        <button class="active" onclick="switchTab('template', this)">Template (TSX)</button>
        <button onclick="switchTab('data', this)">Data (JSON)</button>
      </div>
      <div id="template-editor"></div>
      <div id="data-editor" style="display:none"></div>
    </div>
    <div class="right-panel">
      <div class="preview-panel" id="preview">
        <div class="empty">Click "Render" to preview your template</div>
      </div>
      <div class="logs-panel" id="logsPanel">
        <div class="logs-header" onclick="toggleLogs()">
          <span class="title">Render Log</span>
          <span class="badge" id="logsBadge" style="display:none">0</span>
          <span class="spacer"></span>
          <span class="toggle" id="logsToggle">&#9660;</span>
        </div>
        <div id="logsBody"></div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"></script>
  <script>
    const DEFAULT_TEMPLATE = \`import React from 'react';

interface ReportData {
  title: string;
  sections: Array<{ title: string; content: string }>;
}

export default function Template({ data }: { data: ReportData }) {
  return (
    <html>
      <head>
        <title>{data.title}</title>
        <style>{\\\`
          body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
          }
          h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; }
          h2 { color: #1e40af; margin-top: 2rem; }
          section { margin-bottom: 2rem; }
        \\\`}</style>
      </head>
      <body>
        <h1>{data.title}</h1>
        {data.sections.map((section, i) => (
          <section key={i}>
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </section>
        ))}
      </body>
    </html>
  );
}\`;

    const DEFAULT_DATA = JSON.stringify({
      title: "My Report",
      sections: [
        { title: "Introduction", content: "Welcome to the Facet template playground." },
        { title: "Details", content: "Edit the template and data, then click Render to preview." }
      ]
    }, null, 2);

    let templateEditor, dataEditor;
    let logsCollapsed = false;

    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('facet-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: { 'editor.background': '#1e1e1e' }
      });
      monaco.editor.setTheme('facet-dark');

      const tsDefaults = monaco.languages.typescript.typescriptDefaults;
      tsDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        allowNonTsExtensions: true,
      });
      tsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });

      tsDefaults.addExtraLib(
        'declare module "react" {\\n' +
        '  export interface CSSProperties { [key: string]: any; }\\n' +
        '  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];\\n' +
        '  export interface ReactElement { type: any; props: any; key: any; }\\n' +
        '  export type ComponentType<P = {}> = (props: P) => ReactElement | null;\\n' +
        '  export type FC<P = {}> = ComponentType<P>;\\n' +
        '  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;\\n' +
        '  export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];\\n' +
        '  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;\\n' +
        '  export function useMemo<T>(factory: () => T, deps: any[]): T;\\n' +
        '  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;\\n' +
        '  export function useRef<T>(initial: T): { current: T };\\n' +
        '  const React: any;\\n' +
        '  export default React;\\n' +
        '}\\n' +
        'declare global {\\n' +
        '  namespace JSX {\\n' +
        '    interface Element extends React.ReactElement {}\\n' +
        '    interface IntrinsicElements { [tag: string]: any; }\\n' +
        '  }\\n' +
        '}\\n',
        'file:///node_modules/@types/react/index.d.ts'
      );

      fetch('/types').then(r => r.text()).then(dts => {
        tsDefaults.addExtraLib(dts, 'file:///node_modules/@flanksource/facet/index.d.ts');
      });

      var templateModel = monaco.editor.createModel(
        DEFAULT_TEMPLATE,
        'typescript',
        monaco.Uri.parse('file:///template.tsx')
      );
      templateEditor = monaco.editor.create(document.getElementById('template-editor'), {
        model: templateModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      dataEditor = monaco.editor.create(document.getElementById('data-editor'), {
        value: DEFAULT_DATA,
        language: 'json',
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });
    });

    function switchTab(tab, btn) {
      document.querySelectorAll('.editor-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('template-editor').style.display = tab === 'template' ? 'block' : 'none';
      document.getElementById('data-editor').style.display = tab === 'data' ? 'block' : 'none';
      if (tab === 'template') templateEditor?.layout();
      else dataEditor?.layout();
    }

    function toggleLogs() {
      const panel = document.getElementById('logsPanel');
      const toggle = document.getElementById('logsToggle');
      logsCollapsed = !logsCollapsed;
      panel.classList.toggle('collapsed', logsCollapsed);
      toggle.innerHTML = logsCollapsed ? '&#9650;' : '&#9660;';
    }

    function clearLogs() {
      document.getElementById('logsBody').innerHTML = '';
      const badge = document.getElementById('logsBadge');
      badge.style.display = 'none';
      badge.className = 'badge';
      badge.textContent = '0';
    }

    function addLog(stage, message, elapsed) {
      const body = document.getElementById('logsBody');
      const badge = document.getElementById('logsBadge');
      const panel = document.getElementById('logsPanel');
      const time = elapsed != null ? (elapsed / 1000).toFixed(1) + 's' : '';
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML =
        '<span class="log-time">' + time + '</span>' +
        '<span class="log-stage ' + stage + '">' + stage + '</span>' +
        '<span class="log-msg">' + escapeHtml(message) + '</span>';
      body.appendChild(entry);
      panel.scrollTop = panel.scrollHeight;

      const count = body.children.length;
      badge.textContent = count;
      badge.style.display = 'inline-block';

      if (stage === 'error') badge.className = 'badge error';
      else if (stage === 'done') badge.className = 'badge done';
      else badge.className = 'badge';
    }

    function escapeHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function updateStatus(text, spinner) {
      const el = document.getElementById('status');
      el.innerHTML = spinner ? '<span class="log-spinner"></span>' + escapeHtml(text) : escapeHtml(text);
    }

    async function doRender() {
      const btn = document.getElementById('renderBtn');
      const preview = document.getElementById('preview');

      btn.disabled = true;
      clearLogs();
      updateStatus('Rendering...', true);
      if (logsCollapsed) toggleLogs();

      const code = templateEditor.getValue();
      const format = document.getElementById('format').value;
      const pageSize = document.getElementById('pageSize').value;
      const landscape = document.getElementById('landscape').checked;
      const debug = document.getElementById('debug').checked;

      let data = {};
      try {
        data = JSON.parse(dataEditor.getValue());
      } catch (e) {
        preview.innerHTML = '<div class="error">Invalid JSON in data editor:\\n' + e.message + '</div>';
        btn.disabled = false;
        updateStatus('', false);
        addLog('error', 'Invalid JSON: ' + e.message);
        return;
      }

      const facetVersion = document.getElementById('facetVersion').value.trim();

      const body = { code, format, data, pdfOptions: {} };
      if (pageSize) body.pdfOptions.defaultPageSize = pageSize;
      if (landscape) body.pdfOptions.landscape = true;
      if (debug) body.pdfOptions.debug = true;
      if (!Object.keys(body.pdfOptions).length) delete body.pdfOptions;
      if (facetVersion) body.dependencies = { '@flanksource/facet': facetVersion };

      const start = Date.now();
      try {
        const res = await fetch('/render/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          preview.innerHTML = '<div class="error">Render failed (' + res.status + '):\\n' + err + '</div>';
          updateStatus('Failed', false);
          addLog('error', 'HTTP ' + res.status + ': ' + err);
          btn.disabled = false;
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let gotResult = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          let eventType = 'message';
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
              if (payload.contentType === 'text/html') {
                preview.innerHTML = '<iframe sandbox="allow-same-origin"></iframe>';
                preview.querySelector('iframe').srcdoc = payload.data;
              } else {
                const bytes = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                preview.innerHTML = '<iframe></iframe>';
                preview.querySelector('iframe').src = url;
              }
              updateStatus('Done (' + elapsed + 's)', false);
            } else if (eventType === 'error') {
              preview.innerHTML = '<div class="error">' + escapeHtml(payload.message) + '</div>';
              updateStatus('Failed', false);
              addLog('error', payload.message);
            } else {
              updateStatus(payload.message, true);
              addLog(payload.stage, payload.message, payload.elapsed);
            }
            eventType = 'message';
          }
        }

        if (!gotResult) {
          const elapsed = ((Date.now() - start) / 1000).toFixed(1);
          updateStatus('Done (' + elapsed + 's)', false);
        }
      } catch (e) {
        preview.innerHTML = '<div class="error">Network error:\\n' + e.message + '</div>';
        updateStatus('Error', false);
        addLog('error', 'Network: ' + e.message);
      } finally {
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>
`;

export function playgroundHtml(facetVersion: string = 'latest'): string {
  return HTML.replace('__FACET_VERSION__', facetVersion);
}
