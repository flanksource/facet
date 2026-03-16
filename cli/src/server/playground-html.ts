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
    .toolbar .sep { width: 1px; height: 20px; background: #555; }
    .toolbar .spacer { flex: 1; }
    .toolbar .status { font-size: 12px; color: #888; }
    .toolbar input[type="checkbox"] { margin-right: 2px; }
    .toolbar input[type="text"] { font-size: 13px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; width: 100px; }
    .toolbar input[type="number"] { font-size: 13px; padding: 4px 4px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; width: 42px; text-align: center; }
    .margin-group { display: flex; align-items: center; gap: 2px; font-size: 12px; color: #888; }
    .margin-group span { color: #666; }
    .main { display: flex; flex: 1; min-height: 0; }
    .editor-panel { display: flex; flex-direction: column; width: 50%; border-right: 1px solid #404040; }
    .editor-tabs { display: flex; background: #252526; border-bottom: 1px solid #404040; flex-shrink: 0; }
    .editor-tabs button { padding: 6px 16px; font-size: 13px; background: none; border: none; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
    .editor-tabs button.active { color: #fff; border-bottom-color: #2563eb; }
    #template-editor, #data-editor, #deps-editor, #header-editor, #footer-editor { flex: 1; min-height: 0; }
    .preview-panel { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
    .preview-panel iframe { flex: 1; border: none; width: 100%; }
    .preview-panel .error { padding: 16px; color: #dc2626; font-family: monospace; font-size: 13px; white-space: pre-wrap; background: #fef2f2; flex: 1; overflow: auto; }
    .preview-panel .empty { display: flex; align-items: center; justify-content: center; flex: 1; color: #888; font-size: 14px; background: #f5f5f5; }

    /* Split render button */
    .render-group { display: flex; align-items: stretch; position: relative; }
    .render-group .render-main { background: #2563eb; color: #fff; border: 1px solid #2563eb; font-weight: 600; border-radius: 4px 0 0 4px; padding: 4px 12px; cursor: pointer; font-size: 13px; }
    .render-group .render-main:hover { background: #1d4ed8; }
    .render-group .render-main:disabled { opacity: 0.6; cursor: not-allowed; }
    .render-group .render-drop { background: #2563eb; color: #fff; border: 1px solid #1d4ed8; border-left: 1px solid rgba(255,255,255,0.2); border-radius: 0 4px 4px 0; padding: 4px 6px; cursor: pointer; font-size: 10px; display: flex; align-items: center; }
    .render-group .render-drop:hover { background: #1d4ed8; }
    .render-group .render-drop:disabled { opacity: 0.6; cursor: not-allowed; }
    .render-menu { display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; background: #3c3c3c; border: 1px solid #555; border-radius: 6px; overflow: hidden; z-index: 100; min-width: 140px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .render-menu.open { display: block; }
    .render-menu button { display: block; width: 100%; text-align: left; padding: 8px 14px; font-size: 13px; background: none; border: none; color: #ccc; cursor: pointer; }
    .render-menu button:hover { background: #505050; }
    .render-menu button .check { color: #2563eb; margin-right: 6px; font-weight: bold; }

    /* Logs button */
    .logs-btn { position: relative; }
    .logs-btn .dot { position: absolute; top: 1px; right: 1px; width: 7px; height: 7px; border-radius: 50%; background: #2563eb; display: none; }
    .logs-btn .dot.error { background: #dc2626; }

    /* Log dialog */
    .log-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; align-items: center; justify-content: center; }
    .log-overlay.open { display: flex; }
    .log-dialog { background: #1a1a2e; border: 1px solid #404040; border-radius: 10px; width: 640px; max-width: 90vw; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden; transition: width 0.2s ease, max-height 0.2s ease; }
    .log-dialog.has-errors { width: 820px; max-height: 85vh; }
    .log-dialog-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #16213e; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; }
    .log-dialog-header .title { font-size: 13px; font-weight: 600; color: #8892b0; text-transform: uppercase; letter-spacing: 0.5px; }
    .log-dialog-header .badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: #2563eb; color: #fff; min-width: 18px; text-align: center; }
    .log-dialog-header .badge.error { background: #dc2626; }
    .log-dialog-header .badge.done { background: #16a34a; }
    .log-dialog-header .spacer { flex: 1; }
    .log-dialog-header .close-btn { background: none; border: none; color: #555; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
    .log-dialog-header .close-btn:hover { color: #aaa; }
    .log-dialog-body { flex: 1; overflow-y: auto; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; padding: 4px 0; }
    .log-dialog-footer { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-top: 1px solid #2a2a4a; background: #16213e; flex-shrink: 0; }
    .log-dialog-footer .status-text { font-size: 12px; color: #888; flex: 1; }

    .log-entry { padding: 2px 16px; display: flex; gap: 8px; line-height: 1.6; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .log-entry:hover { background: rgba(255,255,255,0.02); }
    .log-time { color: #4a5568; min-width: 52px; flex-shrink: 0; }
    .log-stage { min-width: 100px; flex-shrink: 0; font-weight: 500; }
    .log-msg { color: #a0aec0; flex: 1; }

    /* Error block styling */
    .log-error-block { margin: 8px 16px; padding: 12px 14px; background: #1c1017; border: 1px solid #5c2020; border-radius: 6px; border-left: 3px solid #f87171; }
    .log-error-block .error-title { color: #f87171; font-weight: 600; font-size: 12px; margin-bottom: 6px; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
    .log-error-block .error-location { color: #60a5fa; font-size: 11px; margin-bottom: 8px; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
    .log-error-block .error-code { background: #0d1117; border: 1px solid #30363d; border-radius: 4px; padding: 8px 10px; margin: 6px 0; font-size: 12px; line-height: 1.5; white-space: pre; overflow-x: auto; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
    .log-error-block .error-code .line-num { color: #484f58; margin-right: 12px; user-select: none; }
    .log-error-block .error-code .line-error { color: #f87171; }
    .log-error-block .error-code .line-normal { color: #a0aec0; }
    .log-error-block .error-code .caret-line { color: #f87171; font-weight: bold; }
    .log-error-block .error-detail { color: #d4a0a0; font-size: 12px; white-space: pre-wrap; word-break: break-word; margin-top: 6px; font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; }
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
    <div class="margin-group">
      Margins<span>(mm):</span>
      <input type="number" id="marginTop" placeholder="T" min="0" value="10" title="Top margin (mm)">
      <input type="number" id="marginBottom" placeholder="B" min="0" value="10" title="Bottom margin (mm)">
      <input type="number" id="marginLeft" placeholder="L" min="0" value="10" title="Left margin (mm)">
      <input type="number" id="marginRight" placeholder="R" min="0" value="10" title="Right margin (mm)">
    </div>
    <div class="spacer"></div>
    <button class="logs-btn" id="logsBtn" onclick="openLogs()" title="View render log">
      Logs <span class="dot" id="logsDot"></span>
    </button>
    <div class="render-group">
      <button class="render-main" id="renderBtn" onclick="doRender()">Render HTML</button>
      <button class="render-drop" id="renderDrop" onclick="toggleRenderMenu(event)">&#9660;</button>
      <div class="render-menu" id="renderMenu">
        <button onclick="setFormat('html')"><span class="check" id="checkHtml">&#10003;</span>HTML</button>
        <button onclick="setFormat('pdf')"><span class="check" id="checkPdf">&nbsp;</span>PDF</button>
      </div>
    </div>
  </div>
  <div class="main">
    <div class="editor-panel">
      <div class="editor-tabs">
        <button class="active" onclick="switchTab('template', this)">Template</button>
        <button onclick="switchTab('header', this)">Header</button>
        <button onclick="switchTab('footer', this)">Footer</button>
        <button onclick="switchTab('data', this)">Data</button>
        <button onclick="switchTab('deps', this)">Deps</button>
      </div>
      <div id="template-editor"></div>
      <div id="header-editor" style="display:none"></div>
      <div id="footer-editor" style="display:none"></div>
      <div id="data-editor" style="display:none"></div>
      <div id="deps-editor" style="display:none"></div>
    </div>
    <div class="preview-panel" id="preview">
      <div class="empty">Click "Render" to preview your template</div>
    </div>
  </div>

  <div class="log-overlay" id="logOverlay" onclick="onOverlayClick(event)">
    <div class="log-dialog">
      <div class="log-dialog-header">
        <span class="title">Render Log</span>
        <span class="badge" id="logsBadge" style="display:none">0</span>
        <span class="spacer"></span>
        <button class="close-btn" onclick="closeLogs()">&times;</button>
      </div>
      <div class="log-dialog-body" id="logsBody"></div>
      <div class="log-dialog-footer">
        <span class="status-text" id="logStatusText"></span>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"></script>
  <script>
    const DEFAULT_TEMPLATE = \`import React from 'react';
import {
  DatasheetTemplate, Page, StatCard, MetricGrid,
  Badge, Status, CompactTable, SpecificationTable,
  ProgressBar, ScoreGauge,
} from '@flanksource/facet';
import {
  IoCheckmarkCircle, IoWarning, IoCloseCircle,
  IoShieldCheckmark, IoServer, IoCloudDone, IoPulse,
  IoSpeedometer, IoTime, IoRocket, IoGitBranch,
} from 'react-icons/io5';

export default function Template({ data }: { data: any }) {
  return (
    <DatasheetTemplate title={data.title}>
      <Page title={data.title} product={data.product} margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {data.stats.map((s: any, i: number) => (
              <StatCard key={i} variant="bordered" value={s.value} label={s.label}
                icon={{ uptime: IoCloudDone, items: IoServer, checks: IoPulse, alerts: IoShieldCheckmark }[s.icon] || IoServer}
                color={s.color} size="sm" />
            ))}
          </div>

          <SpecificationTable title="System Requirements" specifications={data.specs} />

          <CompactTable variant="reference" title="API Reference"
            columns={['Command', 'Description', 'Example']}
            data={data.apiRef} />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Service Health</h3>
            <div className="space-y-2">
              {data.services.map((s: any, i: number) => (
                <ProgressBar key={i} title={s.name} percentage={s.uptime} variant={s.uptime > 99 ? 'success' : s.uptime > 95 ? 'warning' : 'danger'} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="status" status="success" label="Healthy" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="warning" label="Degraded" icon={IoWarning} />
            <Badge variant="status" status="error" label="Critical" icon={IoCloseCircle} />
            <Badge variant="metric" label="Latency" value={data.latency} icon={IoSpeedometer} />
            <Badge variant="metric" label="Deploys" value={data.deploys} icon={IoRocket} />
          </div>

          <div className="flex gap-6 items-end">
            <ScoreGauge score={data.securityScore} label="Security" size="sm" />
            <ScoreGauge score={data.reliabilityScore} label="Reliability" size="sm" />
            <ScoreGauge score={data.maintainabilityScore} label="Maintainability" size="sm" />
          </div>

          <CompactTable variant="inline" title="Release Info" data={data.release} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}\`;

    const DEFAULT_DATA = JSON.stringify({
      title: "Infrastructure Report",
      product: "Mission Control",
      stats: [
        { value: "99.9%", label: "Uptime", icon: "uptime", color: "green" },
        { value: "156", label: "Config Items", icon: "items", color: "blue" },
        { value: "23", label: "Health Checks", icon: "checks", color: "green" },
        { value: "3", label: "Alerts", icon: "alerts", color: "red" },
      ],
      specs: [
        { category: "Kubernetes", value: "1.24+" },
        { category: "PostgreSQL", value: "13+" },
        { category: "Memory", value: "4GB minimum" },
        { category: "Deployment", value: ["SaaS", "Self-hosted", "Hybrid"] },
      ],
      apiRef: [
        ["search_catalog", "Find config items", "search_catalog('pods')"],
        ["get_config", "Get item details", "get_config('nginx')"],
        ["run_health_check", "Execute check", "run_health_check('api')"],
      ],
      services: [
        { name: "API Gateway", uptime: 99.95 },
        { name: "Auth Service", uptime: 99.8 },
        { name: "Data Pipeline", uptime: 97.2 },
        { name: "Search Index", uptime: 99.99 },
      ],
      latency: "45ms",
      deploys: "2,847",
      securityScore: 8.5,
      reliabilityScore: 9.1,
      maintainabilityScore: 7.2,
      release: [
        { label: "Version", value: "2.0.0" },
        { label: "Date", value: "March 2026" },
        { label: "License", value: "Apache 2.0" },
      ],
    }, null, 2);

    const DEFAULT_HEADER = \`import React from 'react';
import { Header } from '@flanksource/facet';
import { IoShieldCheckmark } from 'react-icons/io5';

export default function MyHeader() {
  return (
    <Header
      variant="solid"
      title="Infrastructure Report"
      subtitle="Mission Control Platform"
      logo={<IoShieldCheckmark style={{ width: '12mm', height: '12mm', color: 'white' }} />}
    />
  );
}\`;

    const DEFAULT_FOOTER = \`import React from 'react';
import { Footer } from '@flanksource/facet';

export default function MyFooter() {
  return (
    <Footer
      variant="compact"
      company="Acme Corp"
      web="https://example.com"
      email="team@example.com"
    />
  );
}\`;

    const DEFAULT_DEPS = JSON.stringify({
      "@flanksource/facet": "__FACET_VERSION__",
      "react-icons": "^5.4.0"
    }, null, 2);

    let templateEditor, dataEditor, depsEditor, headerEditor, footerEditor;
    let currentFormat = 'html';
    let renderHadError = false;

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
      tsDefaults.addExtraLib(
        'declare module "react/jsx-runtime" {\\n' +
        '  export function jsx(type: any, props: any, key?: any): any;\\n' +
        '  export function jsxs(type: any, props: any, key?: any): any;\\n' +
        '  export const Fragment: any;\\n' +
        '}\\n',
        'file:///node_modules/@types/react/jsx-runtime.d.ts'
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

      depsEditor = monaco.editor.create(document.getElementById('deps-editor'), {
        value: DEFAULT_DEPS,
        language: 'json',
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      var headerModel = monaco.editor.createModel(
        DEFAULT_HEADER,
        'typescript',
        monaco.Uri.parse('file:///header.tsx')
      );
      headerEditor = monaco.editor.create(document.getElementById('header-editor'), {
        model: headerModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      var footerModel = monaco.editor.createModel(
        DEFAULT_FOOTER,
        'typescript',
        monaco.Uri.parse('file:///footer.tsx')
      );
      footerEditor = monaco.editor.create(document.getElementById('footer-editor'), {
        model: footerModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });
    });

    function switchTab(tab, btn) {
      document.querySelectorAll('.editor-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['template', 'header', 'footer', 'data', 'deps'].forEach(function(t) {
        document.getElementById(t + '-editor').style.display = tab === t ? 'block' : 'none';
      });
      var editors = { template: templateEditor, header: headerEditor, footer: footerEditor, data: dataEditor, deps: depsEditor };
      if (editors[tab]) editors[tab].layout();
    }

    /* Render format menu */
    function setFormat(fmt) {
      currentFormat = fmt;
      document.getElementById('renderBtn').textContent = 'Render ' + fmt.toUpperCase();
      document.getElementById('checkHtml').innerHTML = fmt === 'html' ? '&#10003;' : '&nbsp;';
      document.getElementById('checkPdf').innerHTML = fmt === 'pdf' ? '&#10003;' : '&nbsp;';
      closeRenderMenu();
    }

    function toggleRenderMenu(e) {
      e.stopPropagation();
      document.getElementById('renderMenu').classList.toggle('open');
    }

    function closeRenderMenu() {
      document.getElementById('renderMenu').classList.remove('open');
    }

    document.addEventListener('click', closeRenderMenu);

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

    function setLogStatus(text, spinner) {
      const el = document.getElementById('logStatusText');
      el.innerHTML = spinner ? '<span class="log-spinner"></span>' + escapeHtml(text) : escapeHtml(text);
    }

    function escapeHtml(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    async function doRender() {
      const btn = document.getElementById('renderBtn');
      const drop = document.getElementById('renderDrop');
      const preview = document.getElementById('preview');

      btn.disabled = true;
      drop.disabled = true;
      clearLogs();
      openLogs();
      setLogStatus('Rendering...', true);

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
        btn.disabled = false;
        drop.disabled = false;
        setLogStatus('Failed', false);
        addLog('error', 'Invalid JSON: ' + e.message);
        return;
      }

      let deps = {};
      try {
        deps = JSON.parse(depsEditor.getValue());
      } catch (e) {
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

      const body = { code, format, data, pdfOptions: {} };
      if (pageSize) body.pdfOptions.defaultPageSize = pageSize;
      if (landscape) body.pdfOptions.landscape = true;
      if (debug) body.pdfOptions.debug = true;
      if (Object.keys(margins).length) body.pdfOptions.margins = margins;
      if (!Object.keys(body.pdfOptions).length) delete body.pdfOptions;
      if (Object.keys(deps).length) body.dependencies = deps;

      const hdr = headerEditor.getValue().trim();
      const ftr = footerEditor.getValue().trim();
      if (hdr) body.headerCode = hdr;
      if (ftr) body.footerCode = ftr;

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
                preview.innerHTML = '<iframe sandbox="allow-same-origin allow-scripts"></iframe>';
                preview.querySelector('iframe').srcdoc = payload.data;
              } else if (payload.url) {
                preview.innerHTML = '<iframe></iframe>';
                preview.querySelector('iframe').src = payload.url;
              } else if (payload.data) {
                try {
                  const bytes = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  preview.innerHTML = '<iframe></iframe>';
                  preview.querySelector('iframe').src = URL.createObjectURL(blob);
                } catch (pdfErr) {
                  preview.innerHTML = '<div class="error">Failed to decode PDF: ' + escapeHtml(pdfErr.message) + '</div>';
                }
              } else {
                preview.innerHTML = '<div class="error">Render returned empty result</div>';
              }
              setLogStatus('Done (' + elapsed + 's)', false);
              addLog('done', 'Completed in ' + elapsed + 's');
              if (!renderHadError) setTimeout(closeLogs, 600);
            } else if (eventType === 'error') {
              preview.innerHTML = '<div class="error">' + escapeHtml(payload.message) + '</div>';
              setLogStatus('Failed', false);
              addLog('error', payload.message);
            } else if (payload.stage || payload.message) {
              setLogStatus(payload.message, true);
              addLog(payload.stage, payload.message, payload.elapsed, payload.duration);
            }
            eventType = 'message';
          }
        }

        if (!gotResult) {
          const elapsed = ((Date.now() - start) / 1000).toFixed(1);
          setLogStatus('Done (' + elapsed + 's)', false);
          if (!renderHadError) setTimeout(closeLogs, 600);
        }
      } catch (e) {
        preview.innerHTML = '<div class="error">Network error:\\n' + e.message + '</div>';
        setLogStatus('Error', false);
        addLog('error', 'Network: ' + e.message);
      } finally {
        btn.disabled = false;
        drop.disabled = false;
      }
    }
  </script>
</body>
</html>
`;

export function playgroundHtml(facetVersion: string = 'latest'): string {
  return HTML.replaceAll('__FACET_VERSION__', facetVersion);
}
