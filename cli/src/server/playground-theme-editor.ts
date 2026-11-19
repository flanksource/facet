import { pageSizeOptions } from './page-size-options.js';
import { THEME_MARGIN_STYLES, themeMarginFields } from './playground-theme-margins.js';
import { WORKSPACE_THEME_PANEL, WORKSPACE_THEME_PICKER } from './playground-workspace-theme.js';

function numericField(name: string, label: string, min: number, max?: number): string {
  return `<label for="theme-${name}">${label}</label>
    <input id="theme-${name}" name="${name}" type="number" min="${min}" ${max === undefined ? '' : `max="${max}"`} step="any" data-facet-setting aria-describedby="theme-${name}-error">
    <p id="theme-${name}-error" class="theme-error" hidden>Enter a number ${max === undefined ? `of at least ${min}` : `between ${min} and ${max}`}.</p>`;
}

export const PLAYGROUND_THEME_EDITOR_HTML = `
  <section id="theme-editor" role="tabpanel" aria-labelledby="themeTab" hidden>
    <div class="theme-editor-controls">
      <div class="theme-editor-heading">
        <h1>Theme editor</h1>
        <div id="themePaletteActions">
          <button type="button" id="themeReset">Reset</button>
          <button type="button" id="themeApply" disabled>Apply to Render</button>
        </div>
      </div>
      ${WORKSPACE_THEME_PICKER}
      <p id="themeRuntimeStatus" class="theme-runtime-status" role="status"></p>
      <div id="themePaletteTools">
      <form id="themePalette">
        <fieldset class="theme-variant">
          <legend>Appearance</legend>
          <label><input type="radio" name="variant" value="light" checked> Light</label>
          <label><input type="radio" name="variant" value="dark"> Dark</label>
        </fieldset>
        <details class="theme-document-settings" open>
          <summary>Facet document settings</summary>
          <fieldset>
            <legend>Page layout</legend>
            <label for="theme-pageSize">Page size</label>
            <select id="theme-pageSize" name="pageSize" data-facet-setting>
              <option value="">Document default</option>
              ${pageSizeOptions()}
            </select>
            <label class="theme-checkbox"><input type="checkbox" name="landscape" data-facet-setting> Landscape</label>
            ${themeMarginFields()}
          </fieldset>
          <fieldset>
            <legend>Typography</legend>
            <div id="themeDocumentFonts" class="theme-pickers theme-fonts" data-theme="dark"></div>
            <div class="theme-fonts">
              <div>${numericField('facetFontSize', 'Base font size (pt, optional)', 0.1, 1000)}</div>
              <div>${numericField('facetLineHeight', 'Line height (×, optional)', 0.1)}</div>
            </div>
          </fieldset>
        </details>
        <fieldset>
          <legend>Colors</legend>
          <div id="themeColors" class="theme-pickers" data-theme="dark"></div>
        </fieldset>
        <fieldset>
          <legend>Shared fonts</legend>
          <div id="themeSharedFonts" class="theme-pickers theme-fonts" data-theme="dark"></div>
        </fieldset>
      </form>
      <details>
        <summary>Import Codex theme</summary>
        <label for="themeImport">Codex theme string</label>
        <textarea id="themeImport" rows="3" spellcheck="false" aria-describedby="themeImportStatus"></textarea>
        <button type="button" id="themeImportButton">Import</button>
        <p id="themeImportStatus" role="status"></p>
      </details>
      <details class="theme-export">
        <summary>Facet CSS</summary>
        <label for="themeFacetExport">Stylesheet</label>
        <textarea id="themeFacetExport" rows="6" readonly spellcheck="false"></textarea>
        <button type="button" id="themeCopyFacet">Copy CSS</button>
      </details>
      <details class="theme-export">
        <summary>Facet theme module</summary>
        <label for="themeFacetModule">theme.ts</label>
        <textarea id="themeFacetModule" rows="8" readonly spellcheck="false"></textarea>
        <button type="button" id="themeCopyFacetModule">Copy theme module</button>
      </details>
      <details class="theme-export" id="themeRuntimeVariablesPanel" hidden>
        <summary>Runtime CSS variables</summary>
        <pre id="themeRuntimeVariables"></pre>
      </details>
      <details class="theme-export">
        <summary>Codex theme string</summary>
        <label for="themeCodexExport">Paste into Appearance → Import</label>
        <textarea id="themeCodexExport" rows="6" readonly spellcheck="false"></textarea>
        <button type="button" id="themeCopyCodex">Copy theme</button>
      </details>
      <p class="theme-status" id="themeStatus" role="status"></p>
      </div>
    </div>
    ${WORKSPACE_THEME_PANEL}
  </section>`;

export const PLAYGROUND_THEME_EDITOR_STYLES = `
    #theme-editor { flex: 1; min-height: 0; overflow: auto; background: #1e1e1e; }
    #theme-editor :is(button, input:not([type="radio"]):not([type="checkbox"]), select, textarea):not(.theme-pickers *) {
      font: inherit; color: inherit; background: #202020; border: 1px solid #616166; border-radius: 5px;
    }
    #theme-editor button:not(.theme-pickers *) { padding: 6px 10px; cursor: pointer; }
    #theme-editor button:not(.theme-pickers *):hover { background: #3e3e42; }
    #theme-editor button:not(.theme-pickers *):disabled { opacity: .55; cursor: default; }
    #theme-editor :focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
    .theme-editor-controls { padding: 16px; background: #252526; }
    .theme-editor-heading { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding-block: 8px; background: #252526; }
    #themePaletteActions { display: flex; flex-wrap: wrap; gap: 8px; }
    .theme-editor-heading h1 { color: #fafafa; font-size: 17px; }
    .theme-runtime-status { color: #bdbdc3; font-size: 12px; margin-top: 8px; overflow-wrap: anywhere; }
    #theme-editor fieldset { min-width: 0; border: 0; margin: 16px 0; }
    #theme-editor legend { font-size: 12px; font-weight: 700; color: #bdbdc3; margin-bottom: 4px; }
    #theme-editor label { display: block; color: #e6e6e8; font-size: 13px; margin: 7px 0 4px; }
    #theme-editor .theme-variant label, #theme-editor .theme-checkbox { display: inline-flex; align-items: center; gap: 5px; margin-right: 12px; }
    #theme-editor :is(input[type="text"], input[type="number"], select, textarea):not(.theme-pickers *) { width: 100%; min-width: 0; padding: 6px 8px; }
    .theme-document-settings { padding: 10px 0; border-block: 1px solid #48484c; }
    .theme-document-settings summary { font-weight: 650; }
    #theme-editor textarea { resize: vertical; font: 12px/1.5 ui-monospace, monospace; }
    .theme-fonts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: 0 10px; }
    .theme-fonts > div { min-width: 0; }
    .theme-font-sample { font-size: 1rem; }
    #theme-editor [aria-invalid="true"] { border-color: #fb9d98; }
    .theme-error, #themeImportStatus { font-size: 12px; margin-top: 4px; }
    .theme-error, #themeImport[aria-invalid="true"] ~ #themeImportStatus { color: #fb9d98; }
    #theme-editor summary { font-size: 13px; cursor: pointer; }
    #theme-editor details button:not(.theme-pickers *) { margin-top: 6px; }
    #theme-editor #themeApply { color: white; background: #1d4ed8; border-color: #7599ff; }
    #theme-editor #themeApply:not(:disabled):hover { background: #2563eb; }
    .theme-export { padding: 12px 0; border-top: 1px solid #48484c; }
    .theme-export pre { max-height: 240px; overflow: auto; padding-top: 8px; font: 12px/1.5 ui-monospace, monospace; }
    .theme-status { margin-top: 12px; font-size: 13px; }
    ${THEME_MARGIN_STYLES}
`;
