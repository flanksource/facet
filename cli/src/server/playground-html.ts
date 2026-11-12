import { PLAYGROUND_CONTROLS_SCRIPT } from './playground-controls-script.js';
import { PLAYGROUND_EXAMPLES_SCRIPT } from './playground-examples-script.js';
import { PLAYGROUND_RENDER_SCRIPT } from './playground-render-script.js';
import { PLAYGROUND_RUNTIME_SCRIPT } from './playground-runtime-script.js';
import { pageSizeOptions } from './page-size-options.js';

// assets/brand/web/favicon.svg, inlined so `facet serve` needs no icon route.
const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g transform="translate(-43.01 -43.01) scale(1.336)"><path fill="#131f3b" d="M88 36H144V72H124V100H140V132H124V220H88V132H60V100H88Z"/><path fill="#3578e5" d="M160 36L196 72V116H160Z"/></g></svg>';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facet Playground</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; background: #1e1e1e; color: #ccc; }
    .toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #2d2d2d; border-bottom: 1px solid #404040; flex-shrink: 0; }
    .toolbar label { font-size: 13px; }
    .toolbar select, .toolbar button { font-size: 13px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; cursor: pointer; }
    .toolbar button:hover { background: #505050; }
    .toolbar .sep { width: 1px; height: 20px; background: #555; }
    .toolbar .format-options { align-items: center; gap: 8px; }
    .toolbar input[type="url"] { width: 240px; max-width: 100%; padding: 4px 8px; border: 1px solid #555; border-radius: 4px; background: #3c3c3c; color: #ccc; }
    .browser-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 8px 12px; color: #555; font-size: 12px; }
    .browser-actions:empty { display: none; }
    .browser-actions a { color: #1d4ed8; }
    .browser-actions button { padding: 5px 10px; border: 0; border-radius: 4px; background: #2563eb; color: white; cursor: pointer; }
    @media (max-width: 700px) {
      .toolbar { flex-wrap: wrap; }
      .toolbar .format-options { flex-wrap: wrap; width: 100%; }
      #pageSize { max-width: calc(100vw - 32px); }
      .main { flex-direction: column; }
      .editor-panel { width: 100% !important; height: 45%; border-right: 0 !important; border-bottom: 1px solid #404040; }
      #runtimeOriginControl { max-width: 100%; }
    }
    .toolbar .spacer { flex: 1; }
    .toolbar .status { font-size: 12px; color: #888; }
    .toolbar input[type="checkbox"] { margin-right: 2px; }
    .toolbar input[type="text"] { font-size: 13px; padding: 4px 8px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; width: 100px; }
    .toolbar input[type="number"] { font-size: 13px; padding: 4px 4px; border-radius: 4px; border: 1px solid #555; background: #3c3c3c; color: #ccc; width: 42px; text-align: center; }
    #pngOptions input[type="number"] { width: 58px; }
    #pngSelector { width: 160px; }
    #pngViewport { width: 80px; }
    .margin-group { display: flex; align-items: center; gap: 2px; font-size: 12px; color: #888; }
    .margin-group span { color: #666; }
    .main { display: flex; flex: 1; min-height: 0; }
    .editor-panel { display: flex; flex-direction: column; width: 50%; border-right: 1px solid #404040; }
    .editor-tabs { display: flex; background: #252526; border-bottom: 1px solid #404040; flex-shrink: 0; overflow-x: auto; white-space: nowrap; }
    .editor-tabs button { padding: 6px 16px; font-size: 13px; background: none; border: none; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
    .editor-tabs button.active { color: #fff; border-bottom-color: #2563eb; }
    #template-editor, #data-editor, #deps-editor, #header-editor, #footer-editor, #css-editor { flex: 1; min-height: 0; }
    .preview-panel { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
    .preview-body { flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative; }
    .render-menu [hidden] { display: none; }
    .preview-panel iframe { flex: 1; border: none; width: 100%; }
    .preview-panel img { max-width: 100%; max-height: 100%; object-fit: contain; margin: auto; }
    .preview-panel .error { padding: 16px; color: #dc2626; font-family: monospace; font-size: 13px; white-space: pre-wrap; background: #fef2f2; flex: 1; overflow: auto; }
    .preview-panel .empty { display: flex; align-items: center; justify-content: center; flex: 1; color: #888; font-size: 14px; background: #f5f5f5; }

    /* Render banner — the pane's own status line. Survives body replacement, so
       it can report staleness and timings without the log dialog being open. */
    .preview-banner { display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 12px;
                      background: #f5f5f5; border-bottom: 1px solid #e0e0e0; color: #555; flex-shrink: 0; }
    .preview-banner .preview-dot { width: 8px; height: 8px; border-radius: 50%; background: #bbb; flex-shrink: 0; }
    .preview-banner .preview-text { flex-shrink: 0; }
    .preview-banner .preview-timings { color: #999; font-size: 11px; margin-left: auto; text-align: right;
                                       overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-banner.stale { background: #fffbeb; border-bottom-color: #fde68a; color: #92400e; }
    .preview-banner.stale .preview-dot { background: #f59e0b; }
    .preview-banner.rendering { background: #eff6ff; border-bottom-color: #bfdbfe; color: #1d4ed8; }
    .preview-banner.rendering .preview-dot { background: #2563eb; animation: preview-pulse 1s ease-in-out infinite; }
    .preview-banner.done { background: #f0fdf4; border-bottom-color: #bbf7d0; color: #166534; }
    .preview-banner.done .preview-dot { background: #16a34a; }
    .preview-banner.error { background: #fef2f2; border-bottom-color: #fecaca; color: #b91c1c; }
    .preview-banner.error .preview-dot { background: #dc2626; }
    @keyframes preview-pulse { 50% { opacity: 0.25; } }

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
    .log-stage.rendering-png { color: #38bdf8; }
    .log-stage.uploading { color: #fb923c; }
    .log-stage.timing { color: #fbbf24; }
    .log-stage.done { color: #4ade80; }
    .log-stage.error { color: #f87171; }
    .log-spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #555; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 4px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Mode toggle + Fill-PDF island */
    .mode-toggle { display: inline-flex; border: 1px solid #555; border-radius: 6px; overflow: hidden; }
    .mode-toggle button { background: #3c3c3c; color: #ccc; border: none; padding: 4px 12px; font-size: 13px; cursor: pointer; }
    .mode-toggle button.active { background: #2563eb; color: #fff; }
    #fill-pdf-root { display: none; flex: 1; min-height: 0; }
    body.mode-fill .main { display: none; }
    body.mode-fill #fill-pdf-root { display: flex; }
    body.mode-fill .render-only { display: none !important; }
  </style>
  <link rel="stylesheet" href="/playground-form.css">
</head>
<body>
  <div class="toolbar">
    <strong style="color:#fff;font-size:14px;">Facet Playground</strong>
    <div class="mode-toggle">
      <button id="modeRender" class="active" onclick="setMode('render')">Render</button>
      <button id="modeFill" onclick="setMode('fill')">Fill PDF</button>
    </div>
    <div class="render-only" style="display:contents">
    <div class="sep"></div>
    <label>Theme: <select id="documentTheme" onchange="themeChanged()"><option value="facet">facet</option></select></label>
    <label>Runtime:
      <select id="runtime" onchange="setRuntime(this.value)">
        <option value="server">Server (Node)</option>
        <option value="browser">Browser (Clicky UI / WASM)</option>
      </select>
    </label>
    <label id="runtimeOriginControl" style="display:none">Runtime origin:
      <input id="runtimeOrigin" type="url" placeholder="Automatic on localhost" aria-label="Hosted browser runtime origin (optional on localhost)">
    </label>
    <span class="status" id="browserHint" style="display:none">Live TSX / MDX · HTML or single-page PDF</span>
    <label>Example:
      <select id="example" onchange="loadExample(this.value)">
        <option value="datasheet">Datasheet</option>
        <option value="diagram">Live Diagram</option>
        <option value="markdown">Markdown</option>
        <option value="mdx">MDX</option>
      </select>
    </label>
    <div class="format-options" id="pdfOptions" style="display:none">
    <div class="sep"></div>
    <label>Page Size:
      <select id="pageSize">
        <option value="">Default</option>
        ${pageSizeOptions()}
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
    <div class="sep"></div>
    <label><input type="checkbox" id="timestampEnabled" onchange="toggleTimestamp()"> Timestamp</label>
    <input type="text" id="timestampUrl" value="http://timestamp.digicert.com"
           style="display:none;width:220px" placeholder="TSA URL">
    </div>
    <div class="format-options" id="pngOptions" style="display:none">
      <div class="sep"></div>
      <label title="Scales the capture; empty captures the target at its natural size">Scale to:
        <input type="number" id="pngWidth" min="1" placeholder="W" aria-label="PNG output width in pixels">
        ×
        <input type="number" id="pngHeight" min="1" placeholder="H" aria-label="PNG output height in pixels">
      </label>
      <input type="text" id="pngSelector" value="body" aria-label="CSS selector for the PNG capture target">
      <input type="text" id="pngViewport" placeholder="1280x800" aria-label="Browser viewport used to lay out the page">
      <label title="Trims the uniform background border off the capture before scaling">
        <input type="checkbox" id="pngAutocrop"> Autocrop
      </label>
      <input type="number" id="pngAutocropPadding" min="0" placeholder="Pad"
             title="Background margin left around autocropped content, in capture pixels"
             aria-label="Autocrop padding in pixels">
    </div>
    <div class="spacer"></div>
    <button class="logs-btn" id="logsBtn" onclick="openLogs()" title="View render log">
      Logs <span class="dot" id="logsDot"></span>
    </button>
    <div class="render-group">
      <button class="render-main" id="renderBtn" onclick="doRender()" disabled>Render HTML</button>
      <button class="render-drop" id="renderDrop" onclick="toggleRenderMenu(event)" disabled>&#9660;</button>
      <div class="render-menu" id="renderMenu">
        <button onclick="setFormat('html')"><span class="check" id="checkHtml">&#10003;</span>HTML</button>
        <button onclick="setFormat('pdf')"><span class="check" id="checkPdf">&nbsp;</span>PDF</button>
        <button data-server-format onclick="setFormat('png')"><span class="check" id="checkPng">&nbsp;</span>PNG</button>
        <button data-server-format onclick="setFormat('docx')"><span class="check" id="checkDocx">&nbsp;</span>Word (DOCX)</button>
        <button data-server-format onclick="setFormat('pptx')"><span class="check" id="checkPptx">&nbsp;</span>PowerPoint (PPTX)</button>
      </div>
    </div>
    </div>
  </div>
  <div class="main">
    <div class="editor-panel">
      <div class="editor-tabs">
        <button class="active" onclick="switchTab('template', this)">Template</button>
        <button onclick="switchTab('header', this)">Header</button>
        <button onclick="switchTab('footer', this)">Footer</button>
        <button onclick="switchTab('css', this)">CSS</button>
        <button onclick="switchTab('data', this)">Data</button>
        <button onclick="switchTab('deps', this)">Deps</button>
      </div>
      <div id="template-editor"></div>
      <div id="header-editor" style="display:none"></div>
      <div id="footer-editor" style="display:none"></div>
      <div id="css-editor" style="display:none"></div>
      <div id="data-editor" style="display:none"></div>
      <div id="deps-editor" style="display:none"></div>
    </div>
    <div class="preview-panel">
      <div class="preview-banner" id="previewBanner">
        <span class="preview-dot"></span>
        <span class="preview-text" id="previewText">Click "Render" to preview your template</span>
        <span class="preview-timings" id="previewTimings"></span>
      </div>
      <div class="preview-body" id="preview"></div>
    </div>
  </div>
  <div id="fill-pdf-root"></div>

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
${PLAYGROUND_EXAMPLES_SCRIPT}
${PLAYGROUND_CONTROLS_SCRIPT}
${PLAYGROUND_RUNTIME_SCRIPT}
${PLAYGROUND_RENDER_SCRIPT}
  </script>
  <script src="/playground-form.js"></script>
  <script>
    var __fillMounted = false;
    function setMode(mode) {
      var fill = mode === 'fill';
      document.body.classList.toggle('mode-fill', fill);
      document.getElementById('modeRender').classList.toggle('active', !fill);
      document.getElementById('modeFill').classList.toggle('active', fill);
      if (fill && !__fillMounted && window.FacetPlayground && window.FacetPlayground.mountFillPdf) {
        window.FacetPlayground.mountFillPdf('#fill-pdf-root');
        __fillMounted = true;
      }
      writeUrlState();
    }

    // Apply URL state now that setMode (and all toolbar helpers) are defined.
    // The example is applied later, once the Monaco editors exist.
    initUrlRouting();
  </script>
</body>
</html>
`;

export function playgroundHtml(facetVersion: string = 'latest'): string {
  return HTML.replaceAll('__FACET_VERSION__', facetVersion);
}
