import { PAGE_SIZE_PRESETS } from '../utils/page-size-presets.js';

export const WORKSPACE_THEME_SCRIPT = String.raw`
  function initWorkspaceThemeEditor() {
    const { isThemeColor, isThemeFontStack, renderThemeColors, renderThemeFonts } = window.FacetPlayground;
    const byId = id => document.getElementById('workspaceTheme' + id);
    const selector = byId('');
    const status = byId('Status');
    const panel = byId('Panel');
    const defaultsForm = byId('Defaults');
    const colorsForm = byId('Colors');
    const viewButtons = [...byId('Actions').querySelectorAll('[data-workspace-view]')];
    const fileSelector = byId('File');
    const assetSelector = byId('Asset');
    const upload = byId('Upload');
    const presets = ${JSON.stringify(PAGE_SIZE_PRESETS)};
    const margins = ['top', 'right', 'bottom', 'left'];
    const sourceLanguages = { jsx: 'javascript', js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript',
      tsx: 'typescript', css: 'css', json: 'json', md: 'markdown', mdx: 'markdown' };
    const root = '/workspace/themes';
    let themes = [];
    let active;
    let busy = false;
    let settings;
    let defaultsDirty = false;
    let colorsDirty = false;
    let fontFamily = '';
    let colors = {};
    let files = [];
    let source;
    let editor;
    let asset;
    let assetUrl;
    let booted = false;

    async function request(path, options = {}) {
      const response = await fetch(root + path, { ...options, headers: { 'X-Facet-Workspace': '1', ...options.headers } });
      if (response.ok) return response;
      const { error } = await response.json();
      const failure = new Error(error.message);
      failure.details = error.details;
      throw failure;
    }

    function json(method, value, headers) {
      return { method, body: JSON.stringify(value), headers: { 'Content-Type': 'application/json', ...headers } };
    }

    function themePath(path) { return '/' + encodeURIComponent(active.id) + '/' + path; }
    function filePath(path) { return themePath('file?path=' + encodeURIComponent(path)); }
    function options(list, placeholder) {
      return [new Option(placeholder, ''), ...list.map(value => new Option(value, value))];
    }

    async function run(action) {
      if (busy) return;
      busy = true;
      selector.disabled = true;
      panel.inert = true;
      byId('Actions').inert = true;
      byId('New').inert = true;
      status.textContent = '';
      try { await action(); }
      catch (error) {
        status.textContent = error.message;
        if (error.details) showBuildLog(error.details);
      } finally {
        selector.disabled = false;
        panel.inert = false;
        byId('Actions').inert = false;
        byId('New').inert = false;
        busy = false;
      }
    }

    function showBuildLog(output) {
      byId('BuildOutput').textContent = output;
      byId('BuildLogs').hidden = !output;
    }

    function readDimensions() {
      const selected = defaultsForm.elements.pageSize.value;
      const preset = presets[selected || 'a4'];
      const toMm = preset?.unit === 'px' ? 25.4 / 96 : 1;
      const width = selected === 'custom' ? defaultsForm.elements.width.valueAsNumber : preset.width * toMm;
      const height = selected === 'custom' ? defaultsForm.elements.height.valueAsNumber : preset.height * toMm;
      const rotate = defaultsForm.elements.landscape.checked && height > width;
      return { selected, rotate, width: rotate ? height : width, height: rotate ? width : height };
    }

    function formDefaults() {
      const next = {};
      const font = fontFamily.trim();
      if (font && !isThemeFontStack(font)) throw new Error('Enter a valid CSS font family or stack.');
      if (font) next.fontFamily = font;
      for (const name of ['fontSize', 'lineHeight']) {
        const value = defaultsForm.elements[name].value.trim();
        if (value) next[name] = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : value;
      }
      const { selected, rotate, width, height } = readDimensions();
      if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Enter positive custom page dimensions');
      if (rotate || selected === 'custom') next.pageSize = [width, height].map(value => Number(value.toFixed(4))).join('x');
      else if (selected) next.pageSize = selected;
      const insets = Object.fromEntries(margins.flatMap(side => defaultsForm.elements[side].value ? [[side, defaultsForm.elements[side].valueAsNumber]] : []));
      if (Object.keys(insets).length) next.margins = insets;
      return next;
    }

    function showFontPicker() {
      const error = fontFamily.trim() && !isThemeFontStack(fontFamily.trim()) ? 'Enter a valid CSS font family or stack (up to 512 characters).' : undefined;
      renderThemeFonts(byId('Font'), [{ name: 'fontFamily', label: 'Font family', value: fontFamily, stack: true, error }], (_name, value) => {
        fontFamily = value;
        defaultsDirty = true;
        showFontPicker();
      });
    }

    function showColorPickers() {
      const labels = Object.fromEntries(Object.keys(colors).map(name => [name, name]));
      renderThemeColors(byId('ColorFields'), { labels, values: colors, allowShortHex: true, onChange(nextColors) {
        colors = nextColors;
        colorsDirty = true;
        showColorPickers();
      } });
    }

    function updateCustomDimensions() {
      byId('Dimensions').hidden = defaultsForm.elements.pageSize.value !== 'custom';
    }

    async function loadSettings() {
      byId('SettingsForms').hidden = true;
      byId('SettingsUnavailable').hidden = active.settings;
      if (!active.settings) return;
      settings = await (await request(themePath('settings'))).json();
      defaultsForm.reset();
      const values = settings.defaults;
      fontFamily = values.fontFamily ?? '';
      showFontPicker();
      for (const name of ['fontSize', 'lineHeight']) defaultsForm.elements[name].value = values[name] ?? '';
      if (values.pageSize && !Object.hasOwn(presets, values.pageSize)) {
        const [width, height] = values.pageSize.split('x');
        defaultsForm.elements.pageSize.value = 'custom';
        defaultsForm.elements.width.value = width;
        defaultsForm.elements.height.value = height;
      } else defaultsForm.elements.pageSize.value = values.pageSize || '';
      for (const side of margins) defaultsForm.elements[side].value = values.margins?.[side] ?? '';
      colors = settings.colors;
      showColorPickers();
      colorsForm.hidden = !Object.keys(colors).length;
      defaultsDirty = colorsDirty = false;
      byId('SettingsForms').hidden = false;
      updateCustomDimensions();
    }

    async function saveSettings(kind, value) {
      const key = kind + 'Revision';
      const response = await request(themePath('settings'), json('PUT', { kind, value }, { 'If-Match': settings[key] }));
      settings[key] = (await response.json()).revision;
      if (kind === 'defaults') defaultsDirty = false;
      else colorsDirty = false;
      status.textContent = 'Saved. Build & Preview to render the updated package.';
    }

    async function readFiles() {
      files = (await (await request(themePath('files'))).json()).files;
      fileSelector.replaceChildren(...options(files.filter(file => file.kind === 'source').map(file => file.path), 'Select a source file'));
      assetSelector.replaceChildren(...options(files.filter(file => file.kind === 'asset').map(file => file.path), 'New asset'));
      fileSelector.value = source?.path || '';
      assetSelector.value = asset?.path || '';
    }

    async function loadSource(path) {
      if (!editor) {
        await new Promise((resolve, reject) => {
          if (typeof window.require !== 'function') { reject(new Error('Monaco editor failed to load')); return; }
          window.require(['vs/editor/editor.main'], resolve, reject);
        });
        editor = monaco.editor.create(byId('Monaco'), { theme: 'vs-dark', automaticLayout: true, minimap: { enabled: false }, ariaLabel: 'Theme source' });
      }
      const response = path ? await request(filePath(path)) : undefined;
      const text = response ? await response.text() : '';
      const file = files.find(file => file.path === path);
      source = response ? { ...file, text, revision: response.headers.get('etag') } : undefined;
      fileSelector.value = path;
      monaco.editor.setModelLanguage(editor.getModel(), sourceLanguages[path.split('.').at(-1)] || 'plaintext');
      editor.setValue(text);
      editor.updateOptions({ readOnly: !source?.writable });
      byId('SaveSource').disabled = !source?.writable;
      byId('ReloadSource').disabled = !source;
    }

    async function loadAsset(path) {
      const response = path ? await request(filePath(path)) : undefined;
      if (assetUrl) URL.revokeObjectURL(assetUrl);
      assetUrl = response ? URL.createObjectURL(await response.blob()) : undefined;
      asset = response ? { path, revision: response.headers.get('etag') } : undefined;
      const image = byId('AssetImage');
      if (assetUrl) image.src = assetUrl;
      else image.removeAttribute('src');
      image.alt = path;
      image.hidden = !assetUrl;
      assetSelector.value = path;
      upload.elements.path.value = path;
    }

    async function openView(view) {
      for (const button of viewButtons) {
        const id = button.dataset.workspaceView;
        button.setAttribute('aria-pressed', String(id === view));
        byId(id[0].toUpperCase() + id.slice(1)).hidden = id !== view;
      }
      panel.scrollTop = 0;
      if (view === 'settings' && !settings) await loadSettings();
      if (view === 'source' && !source) await loadSource(files.find(file => /(^|\/)theme\.tsx?$/.test(file.path))?.path || '');
      if (view === 'source') editor?.layout();
      if (view === 'assets' && !asset) await loadAsset('');
    }

    async function renderWithTheme() {
      await loadThemeCatalog(active.id);
      await renderPreview(false);
    }

    async function selectTheme(id) {
      active = themes.find(theme => theme.id === id);
      selector.value = active?.id || '';
      panel.hidden = byId('Actions').hidden = !active;
      document.getElementById('theme-editor').classList.toggle('workspace-theme-open', !!active);
      if (active) themeEditor?.cancel();
      else openPaletteEditor();
      writeUrlState();
      settings = source = asset = undefined;
      defaultsDirty = colorsDirty = false;
      showBuildLog('');
      if (assetUrl) URL.revokeObjectURL(assetUrl);
      assetUrl = undefined;
      if (!active) return;
      byId('Location').textContent = active.directory;
      byId('Use').disabled = !active.build;
      await readFiles();
      await openView('settings');
    }

    function sourceDirty() { return !!source?.writable && editor.getValue() !== source.text; }
    function hasDraft() { return sourceDirty() || defaultsDirty || colorsDirty; }
    async function listThemes(id) {
      themes = (await (await request('')).json()).themes;
      selector.replaceChildren(...options(themes.map(theme => theme.id), 'Palette editor'));
      await selectTheme(id);
    }

    byId('Picker').hidden = false;
    selector.onchange = () => {
      if (hasDraft() && !window.confirm('Switch themes and discard unsaved changes?')) { selector.value = active?.id || ''; return; }
      void run(() => selectTheme(selector.value));
    };
    byId('Create').onsubmit = event => {
      event.preventDefault();
      if (hasDraft() && !window.confirm('Create a theme and discard unsaved changes?')) return;
      void run(async () => {
        const result = await request('', json('POST', { id: byId('Id').value }));
        const created = await result.json();
        byId('New').open = false;
        byId('Create').reset();
        await listThemes(created.id);
        status.textContent = 'Theme created. In ' + created.directory + ', run pnpm install before the first build.';
      });
    };
    for (const button of viewButtons) button.onclick = () => void run(() => openView(button.dataset.workspaceView));
    defaultsForm.oninput = () => { defaultsDirty = true; updateCustomDimensions(); };
    defaultsForm.onsubmit = event => { event.preventDefault(); void run(() => saveSettings('defaults', formDefaults())); };
    colorsForm.onsubmit = event => {
      event.preventDefault();
      void run(() => {
        if (Object.values(colors).some(color => !isThemeColor(color, true))) throw new Error('Enter a valid hex color in each palette field.');
        return saveSettings('colors', colors);
      });
    };
    byId('ReloadSettings').onclick = () => {
      if ((!defaultsDirty && !colorsDirty) || window.confirm('Reload settings and discard unsaved changes?')) void run(loadSettings);
    };
    fileSelector.onchange = () => {
      if (sourceDirty() && !window.confirm('Switch files and discard unsaved changes?')) { fileSelector.value = source.path; return; }
      void run(() => loadSource(fileSelector.value));
    };
    byId('ReloadSource').onclick = () => {
      if (source && (!sourceDirty() || window.confirm('Reload the file and discard unsaved changes?'))) void run(() => loadSource(source.path));
    };
    byId('SaveSource').onclick = () => void run(async () => {
      const text = editor.getValue();
      const result = await request(filePath(source.path), { method: 'PUT', body: text, headers: {
        'Content-Type': 'text/plain; charset=utf-8', 'If-Match': source.revision,
      } });
      source.revision = (await result.json()).revision;
      source.text = text;
      status.textContent = 'Saved ' + source.path + '.';
    });
    byId('AddSource').onsubmit = event => {
      event.preventDefault();
      if (sourceDirty() && !window.confirm('Add a file and discard unsaved changes?')) return;
      void run(async () => {
        const path = byId('NewFile').value.trim();
        await request(filePath(path), { method: 'PUT', body: '', headers: { 'Content-Type': 'text/plain', 'If-None-Match': '*' } });
        byId('AddSource').reset();
        await readFiles();
        await loadSource(path);
        editor.focus();
      });
    };
    assetSelector.onchange = () => void run(() => loadAsset(assetSelector.value));
    upload.elements.file.onchange = () => {
      const file = upload.elements.file.files[0];
      if (file && !asset) upload.elements.path.value = 'assets/' + file.name;
    };
    upload.onsubmit = event => {
      event.preventDefault();
      void run(async () => {
        const path = upload.elements.path.value.trim();
        const file = upload.elements.file.files[0];
        if (!/\.(svg|png|jpe?g|webp|gif|avif)$/i.test(path)) throw new Error('Choose an image destination with a supported file extension');
        await request(filePath(path), { method: 'PUT', body: file, headers: path === asset?.path ? { 'If-Match': asset.revision } : { 'If-None-Match': '*' } });
        upload.elements.file.value = '';
        await readFiles();
        await loadAsset(path);
        status.textContent = 'Saved ' + path + '.';
      });
    };
    byId('Build').onclick = () => void run(async () => {
      if (hasDraft()) throw new Error('Save your changes before building the theme.');
      showBuildLog('');
      status.textContent = 'Building ' + active.id + '…';
      const { build, output } = await (await request(themePath('build'), { method: 'POST' })).json();
      active.build = build;
      showBuildLog(output);
      byId('Use').disabled = false;
      await renderWithTheme();
      status.textContent = 'Build complete.';
    });
    byId('Use').onclick = () => void run(renderWithTheme);
    return {
      refresh() {
        if (booted) {
          if (!active) openPaletteEditor();
          return;
        }
        const requested = new URLSearchParams(location.search).get('workspaceTheme') ||
          new URLSearchParams(location.search).get('theme') || document.getElementById('documentTheme').value;
        void run(async () => { await listThemes(requested); booted = true; });
      },
    };
  }
`;
