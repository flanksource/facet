import { pageSizeOptions } from './page-size-options.js';
import { themeMarginFields } from './playground-theme-margins.js';

export const WORKSPACE_THEME_PICKER = `
  <div id="workspaceThemePicker" hidden>
    <label for="workspaceTheme">Theme</label>
    <select id="workspaceTheme"><option value="">Palette editor</option></select>
    <details id="workspaceThemeNew">
      <summary>New theme</summary>
      <form id="workspaceThemeCreate">
        <label for="workspaceThemeId">Theme ID</label>
        <input type="text" id="workspaceThemeId" name="id" required maxlength="80" pattern="[a-z][a-z0-9\\-]*" placeholder="my-theme">
        <button type="submit">Create theme</button>
      </form>
    </details>
    <p id="workspaceThemeStatus" role="status"></p>
    <div id="workspaceThemeActions" hidden>
      <p id="workspaceThemeLocation"></p>
      <button type="button" id="workspaceThemeBuild">Build &amp; Preview</button>
      <button type="button" id="workspaceThemeUse">Use in Render</button>
      <div role="group" aria-label="Workspace theme views" class="workspace-theme-tabs">
        <button type="button" data-workspace-view="settings" aria-pressed="true">Settings</button>
        <button type="button" data-workspace-view="source" aria-pressed="false">Source</button>
        <button type="button" data-workspace-view="assets" aria-pressed="false">Assets</button>
      </div>
    </div>
  </div>`;

export const WORKSPACE_THEME_PANEL = `
  <div class="theme-workspace" id="workspaceThemePanel" hidden>
    <section id="workspaceThemeSettings" aria-label="Theme settings">
      <p id="workspaceThemeSettingsUnavailable" hidden>This theme's settings are available in Source.</p>
      <div id="workspaceThemeSettingsForms" hidden>
        <form id="workspaceThemeDefaults">
          <fieldset>
            <legend>Document defaults</legend>
            <div id="workspaceThemeFont" class="theme-pickers" data-theme="dark"></div>
            <label for="workspaceThemeFontSize">Base font size</label>
            <input type="text" id="workspaceThemeFontSize" name="fontSize" placeholder="10 or 12pt">
            <label for="workspaceThemeLineHeight">Line height</label>
            <input type="text" id="workspaceThemeLineHeight" name="lineHeight" placeholder="1.5">
            <label for="workspaceThemePageSize">Page size</label>
            <select id="workspaceThemePageSize" name="pageSize">
              <option value="">Document default</option>
              ${pageSizeOptions()}
              <option value="custom">Custom dimensions</option>
            </select>
            <div id="workspaceThemeDimensions" hidden>
              <label for="workspaceThemeWidth">Width (mm)</label>
              <input type="number" id="workspaceThemeWidth" name="width" min="0.01" step="any">
              <label for="workspaceThemeHeight">Height (mm)</label>
              <input type="number" id="workspaceThemeHeight" name="height" min="0.01" step="any">
            </div>
            <label class="theme-checkbox"><input type="checkbox" name="landscape"> Landscape</label>
            ${themeMarginFields(true)}
          </fieldset>
          <button type="submit">Save document defaults</button>
        </form>
        <form id="workspaceThemeColors">
          <fieldset><legend>Palette</legend><div id="workspaceThemeColorFields" class="theme-pickers" data-theme="dark"></div></fieldset>
          <button type="submit">Save palette</button>
        </form>
        <button type="button" id="workspaceThemeReloadSettings">Reload settings</button>
      </div>
    </section>
    <section id="workspaceThemeSource" aria-label="Theme source files" hidden>
      <label for="workspaceThemeFile">Source file</label>
      <select id="workspaceThemeFile"></select>
      <div id="workspaceThemeMonaco" aria-label="Theme source editor"></div>
      <div class="workspace-theme-tabs">
        <button type="button" id="workspaceThemeSaveSource">Save file</button>
        <button type="button" id="workspaceThemeReloadSource">Reload file</button>
      </div>
      <details>
        <summary>Add source file</summary>
        <form id="workspaceThemeAddSource">
          <label for="workspaceThemeNewFile">Relative path</label>
          <input type="text" id="workspaceThemeNewFile" name="path" required placeholder="layouts/Cover.tsx">
          <button type="submit">Add file</button>
        </form>
      </details>
    </section>
    <section id="workspaceThemeAssets" aria-label="Theme assets" hidden>
      <label for="workspaceThemeAsset">Artwork</label>
      <select id="workspaceThemeAsset"></select>
      <img id="workspaceThemeAssetImage" alt="" hidden>
      <form id="workspaceThemeUpload">
        <label for="workspaceThemeUploadFile">Image file</label>
        <input type="file" id="workspaceThemeUploadFile" name="file" accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.avif" required>
        <label for="workspaceThemeAssetPath">Destination path</label>
        <input type="text" id="workspaceThemeAssetPath" name="path" required placeholder="assets/logo.svg">
        <button type="submit">Save asset</button>
      </form>
    </section>
    <details id="workspaceThemeBuildLogs" hidden>
      <summary>Build output</summary>
      <pre id="workspaceThemeBuildOutput"></pre>
    </details>
  </div>`;

export const WORKSPACE_THEME_STYLES = `
  [data-workspace-themes="false"] #workspaceThemePicker,
  #theme-editor.workspace-theme-open #themePaletteTools,
  #theme-editor.workspace-theme-open #themePaletteActions,
  #theme-editor.workspace-theme-open #themeRuntimeStatus { display: none; }
  .workspace-theme-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  #workspaceThemeActions { margin-top: 12px; }
  #workspaceThemeActions button[aria-pressed="true"] { background: #374151; border-color: #93c5fd; }
  #workspaceThemeStatus, #workspaceThemeLocation { font-size: 13px; overflow-wrap: anywhere; margin-block: 8px; }
  #workspaceThemePanel { padding: 0 16px 16px; }
  #workspaceThemePanel form button { margin-top: 10px; }
  #workspaceThemeMonaco { height: 55vh; min-height: 240px; margin-top: 8px; border: 1px solid #48484c; }
  #workspaceThemeAssetImage { max-width: 100%; max-height: 40vh; margin: 12px 0; object-fit: contain; }
  #workspaceThemeBuildOutput { max-height: 20rem; overflow: auto; white-space: pre-wrap; }
`;
