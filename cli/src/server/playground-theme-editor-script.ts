import { PAGE_SIZE_PRESETS } from '../utils/page-size-presets.js';
import { ELEMENT_SCALE } from '../utils/type-scale.js';

export const PLAYGROUND_THEME_EDITOR_SCRIPT = String.raw`
    function initThemeEditor() {
      const { isThemeColor, isThemeFontStack, renderThemeColors, renderThemeFonts } = window.FacetPlayground;
      const colorLabels = { surface: 'Background', ink: 'Text', accent: 'Accent', diffAdded: 'Added lines', diffRemoved: 'Removed lines', skill: 'Skills' };
      const colorFields = document.getElementById('themeColors');
      const documentFonts = document.getElementById('themeDocumentFonts');
      const sharedFonts = document.getElementById('themeSharedFonts');
      const defaults = {
        light: { surface: '#ffffff', ink: '#1e293b', accent: '#2563eb', diffAdded: '#16703c', diffRemoved: '#b91c1c', skill: '#6d28d9' },
        dark: { surface: '#16181d', ink: '#e5e7eb', accent: '#93c5fd', diffAdded: '#86efac', diffRemoved: '#fca5a5', skill: '#d8b4fe' },
      };
      const prefix = 'codex-theme-v1:';
      const palette = document.getElementById('themePalette');
      const facetInputs = [...palette.querySelectorAll('[data-facet-setting]')];
      const pageSizes = ${JSON.stringify(PAGE_SIZE_PRESETS)};
      const status = document.getElementById('themeStatus');
      const runtimeStatus = document.getElementById('themeRuntimeStatus');
      const runtimeVariables = document.getElementById('themeRuntimeVariables');
      const runtimeVariablesPanel = document.getElementById('themeRuntimeVariablesPanel');
      const importInput = document.getElementById('themeImport');
      const importStatus = document.getElementById('themeImportStatus');
      const facetExport = document.getElementById('themeFacetExport');
      const facetModule = document.getElementById('themeFacetModule');
      const codexExport = document.getElementById('themeCodexExport');
      const apply = document.getElementById('themeApply');
      const copyFacet = document.getElementById('themeCopyFacet');
      const copyFacetModule = document.getElementById('themeCopyFacetModule');
      const copyCodex = document.getElementById('themeCopyCodex');
      const runtimeDrafts = new Map();
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = colorCanvas.height = 1;
      const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
      let drafts;
      let draftKey;
      let variant = 'light';
      let snapshotKey;
      let requestedRevision;
      let inspection;
      let applying = false;

      function defaultDraft(appearance) {
        return { colors: { ...defaults[appearance] }, fonts: { ui: null, code: null }, document: {}, edited: new Set(), codeThemeId: 'codex', contrast: 60, opaqueWindows: true };
      }

      function fontFamily(name, fallback) { return name?.trim() ? '"' + CSS.escape(name.trim()) + '", ' + fallback : fallback; }

      function opaqueHex(color) {
        if (!colorContext || !CSS.supports('color', color || '')) return;
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = color;
        colorContext.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = colorContext.getImageData(0, 0, 1, 1).data;
        if (alpha === 255) return '#' + [red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('');
      }

      function applyRuntimeStyles(styles) {
        const round = value => Number(value.toFixed(4));
        const fontPx = parseFloat(styles['document font size']);
        const scale = Number(styles['--facet-font-scale']);
        const linePx = parseFloat(styles['document line height']);
        const settings = {
          facetFont: styles['document font family'] || styles['--facet-font-sans'],
          facetMono: styles['--facet-font-mono'],
          facetFontSize: scale > 0 ? round(scale * ${ELEMENT_SCALE.body.pt}) : round(fontPx * 0.75),
          facetLineHeight: linePx > 0 && fontPx > 0 ? round(linePx / fontPx) : undefined,
          ...Object.fromEntries(['top', 'right', 'bottom', 'left'].map(side => {
            const value = styles['page margin ' + side];
            return ['margin' + side[0].toUpperCase() + side.slice(1), value ? Number(value) : undefined];
          })),
        };
        const pageSize = styles['page size']?.trim().toLowerCase();
        const dimensions = Object.hasOwn(pageSizes, pageSize) ? pageSizes[pageSize] : customPageSize(pageSize);
        settings.pageSize = dimensions ? pageSize : undefined;
        settings.landscape = dimensions ? dimensions.width > dimensions.height : undefined;
        const colors = {
          accent: opaqueHex(styles['--facet-brand-blue']),
          ink: opaqueHex(styles['--facet-brand-dark']) || opaqueHex(styles['document text color']),
          surface: opaqueHex(styles['document background']),
        };
        for (const [appearance, draft] of Object.entries(drafts)) {
          for (const [name, value] of Object.entries(settings)) {
            if (draft.edited.has(name)) continue;
            const valid = typeof value === 'boolean' || (typeof value === 'number' ? Number.isFinite(value) : value && (name === 'pageSize' || isThemeFontStack(value)));
            if (valid) draft.document[name] = value;
            else delete draft.document[name];
            if (appearance === variant && palette.elements[name]) setFacetValue(palette.elements[name], valid ? value : undefined);
          }
          if (appearance !== 'light') continue;
          for (const [name, value] of Object.entries(colors)) {
            if (!value || draft.edited.has(name)) continue;
            draft.colors[name] = value;
          }
        }
        runtimeVariables.textContent = Object.keys(styles).filter(name => name.startsWith('--') && styles[name]).sort().map(name => name + ': ' + styles[name] + ';').join('\n');
        runtimeVariablesPanel.hidden = !runtimeVariables.textContent;
        update();
      }

      function stopInspection() {
        inspection?.abort();
        inspection = undefined;
        requestedRevision = undefined;
      }

      function refreshRuntimeStyles() {
        const editor = document.getElementById('theme-editor');
        if (editor.hidden || editor.closest('.main').inert || editor.classList.contains('workspace-theme-open')) return;
        const runtime = document.getElementById('runtime').value === 'browser' ? 'Browser' : 'Node';
        const runtimeName = runtime === 'Browser' ? 'Browser' : 'Server (Node)';
        const theme = document.getElementById('documentTheme').value;
        const key = JSON.stringify([runtime, theme, document.getElementById('example').value, document.getElementById('runtimeOrigin').value]);
        if (key !== draftKey) {
          stopInspection();
          draftKey = key;
          snapshotKey = undefined;
          if (!runtimeDrafts.has(key)) runtimeDrafts.set(key, { light: defaultDraft('light'), dark: defaultDraft('dark') });
          drafts = runtimeDrafts.get(key);
          runtimeVariablesPanel.hidden = true;
          runtimeStatus.textContent = 'Reading ' + runtimeName + ' styles…';
          loadDraft(variant);
        }
        const revision = previewRevision;
        if (styleRevisions[runtime] === revision) {
          const styles = styleResults[runtime];
          const nextSnapshot = JSON.stringify(styles);
          if (snapshotKey !== nextSnapshot) {
            snapshotKey = nextSnapshot;
            applyRuntimeStyles(styles);
          }
          runtimeStatus.textContent = 'Loaded from ' + runtimeName + ' · ' + (styles.theme || theme);
          return;
        }
        if (!templateEditor || requestedRevision === revision) return;
        stopInspection();
        requestedRevision = revision;
        runtimeStatus.textContent = 'Reading ' + runtimeName + ' styles…';
        const controller = new AbortController();
        inspection = controller;
        const inspectStyles = runtime === 'Browser' ? inspectBrowserStyles : inspectNodeStyles;
        inspectStyles(revision, AbortSignal.any([controller.signal, AbortSignal.timeout(90000)])).catch(error => {
          if (!controller.signal.aborted && revision === previewRevision) runtimeStatus.textContent = error.message;
        });
      }

      function facetCss(colors, uiFont, codeFont, settings) {
        return [
          ':root {',
          '  --facet-brand-blue: ' + colors.accent + ';',
          '  --facet-brand-dark: ' + colors.ink + ';',
          '  --facet-font-sans: ' + uiFont + ';',
          '  --facet-font-mono: ' + codeFont + ';',
          ...(settings.facetFontSize ? ['  --facet-font-scale: ' + Number((settings.facetFontSize / ${ELEMENT_SCALE.body.pt}).toFixed(6)) + ';'] : []),
          '}',
          'body {',
          '  background-color: ' + colors.surface + ';',
          '  color: ' + colors.ink + ';',
          '  font-family: var(--facet-font-sans);',
          '}',
          '.prose {',
          '  --tw-prose-body: ' + colors.ink + ';',
          '  --tw-prose-headings: ' + colors.ink + ';',
          '  --tw-prose-bold: ' + colors.ink + ';',
          '  --tw-prose-code: ' + colors.ink + ';',
          '  --tw-prose-links: var(--facet-brand-blue);',
          '}',
          'body a { color: var(--facet-brand-blue); }',
          'body code, body pre, body kbd { font-family: var(--facet-font-mono); }',
          ...(settings.facetLineHeight ? ['body, body p { line-height: ' + settings.facetLineHeight + '; }'] : []),
        ].join('\n');
      }

      function facetLayout(settings) {
        const preset = pageSizes[settings.pageSize || 'a4'] ?? customPageSize(settings.pageSize);
        const rotated = settings.landscape && preset.width < preset.height;
        const mmPerUnit = preset.unit === 'px' ? 25.4 / 96 : 1;
        const width = (rotated ? preset.height : preset.width) * mmPerUnit;
        const height = (rotated ? preset.width : preset.height) * mmPerUnit;
        const pageSize = rotated ? [width, height].map(mm => Number(mm.toFixed(4))).join('x') : settings.pageSize;
        const margins = Object.fromEntries(['Top', 'Right', 'Bottom', 'Left'].flatMap(side => {
          const amount = settings['margin' + side];
          return amount === undefined ? [] : [[side.toLowerCase(), amount]];
        }));
        return { pageSize, margins };
      }

      function updateFacetExports(settings, fontFamily, monoFamily, colors) {
        facetExport.value = facetCss(colors, fontFamily, monoFamily, settings);
        const { pageSize, margins } = facetLayout(settings);
        const themeDefaults = {
          pageSize: pageSize || undefined,
          margins: Object.keys(margins).length ? margins : undefined,
          fontFamily, fontSize: settings.facetFontSize, lineHeight: settings.facetLineHeight,
        };
        facetModule.value = [
          "import { facetTheme, type FacetTheme } from '@flanksource/facet';",
          '', 'export const theme = {', "  id: 'my-theme',", '  extends: facetTheme,',
          '  defaults: ' + JSON.stringify(themeDefaults, null, 2).replaceAll('\n', '\n  ') + ',',
          '} satisfies FacetTheme;',
        ].join('\n');
      }

      function changeDocumentFont(name, value) {
        const draft = drafts[variant];
        draft.edited.add(name);
        draft.document[name] = value;
        update();
      }

      function changeSharedFont(name, value) {
        const { fonts, edited } = drafts[variant];
        fonts[name] = value || null;
        delete fonts[name + 'Face'];
        edited.add(name);
        update();
      }

      function changeColors(nextColors) {
        const draft = drafts[variant];
        for (const name of Object.keys(nextColors)) {
          if (nextColors[name] !== draft.colors[name]) draft.edited.add(name);
        }
        draft.colors = nextColors;
        update();
      }

      function update() {
        const { colors, fonts, document: settings, codeThemeId, contrast, opaqueWindows } = drafts[variant];
        const defaultFontError = value => value.trim() && !isThemeFontStack(value.trim()) ? 'Enter a valid CSS font family or stack (up to 512 characters).' : undefined;
        const sharedFontError = value => value?.length > 80 || /[\r\n]/.test(value ?? '') ? 'Enter a font name of up to 80 characters.' : undefined;
        const documentFields = [
          { name: 'facetFont', label: 'Document font', value: settings.facetFont ?? '', stack: true, error: defaultFontError(settings.facetFont ?? '') },
          { name: 'facetMono', label: 'Document code font', value: settings.facetMono ?? '', stack: true, mode: 'mono', error: defaultFontError(settings.facetMono ?? '') },
        ];
        const sharedFields = [
          { name: 'ui', label: 'Body font', value: fonts.ui ?? '', error: sharedFontError(fonts.ui) },
          { name: 'code', label: 'Code font', value: fonts.code ?? '', mode: 'mono', error: sharedFontError(fonts.code) },
        ];
        renderThemeFonts(documentFonts, documentFields, changeDocumentFont);
        renderThemeFonts(sharedFonts, sharedFields, changeSharedFont);
        renderThemeColors(colorFields, { labels: colorLabels, values: colors, onChange: changeColors });
        const uiFont = fontFamily(fonts.ui, 'system-ui, sans-serif');
        const codeFont = fontFamily(fonts.code, 'ui-monospace, monospace');
        updateFacetExports(settings, settings.facetFont?.trim() || uiFont, settings.facetMono?.trim() || codeFont, colors);
        const { surface, ink, accent, diffAdded, diffRemoved, skill } = colors;
        codexExport.value = prefix + JSON.stringify({
          codeThemeId, variant,
          theme: { surface, ink, accent, fonts, contrast, opaqueWindows, semanticColors: { diffAdded, diffRemoved, skill } },
        });
        const invalid = Object.values(colors).some(value => !isThemeColor(value)) || sharedFields.some(field => field.error);
        const invalidFacet = invalid || documentFields.some(field => field.error) || facetInputs.some(input => !input.validity.valid);
        codexExport.disabled = copyCodex.disabled = invalid;
        facetExport.disabled = facetModule.disabled = copyFacet.disabled = copyFacetModule.disabled = invalidFacet;
        apply.disabled = invalidFacet || !cssEditor || applying;
      }

      function setFacetValue(input, value) {
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else if (input.tagName === 'SELECT') setPageSizeSelection(input, value ?? '');
        else input.value = value ?? '';
        input.setCustomValidity('');
        input.removeAttribute('aria-invalid');
        const error = document.getElementById(input.id + '-error');
        if (error) error.hidden = true;
      }

      function loadDraft(nextVariant) {
        variant = nextVariant;
        palette.elements.variant.value = variant;
        const { document: settings } = drafts[variant];
        for (const input of facetInputs) setFacetValue(input, settings[input.name]);
        status.textContent = '';
        update();
      }

      palette.addEventListener('submit', event => event.preventDefault());
      function updateInput(event) {
        const input = event.target;
        const draft = drafts[variant];
        status.textContent = '';
        if (input.name === 'variant') { loadDraft(input.value); return; }
        if (!input.hasAttribute('data-facet-setting')) return;
        draft.edited.add(input.name);
        if (input.validity.valid) {
          draft.document[input.name] = input.type === 'checkbox' ? input.checked
            : input.type === 'number' ? (input.value === '' ? undefined : input.valueAsNumber) : input.value.trim();
          input.removeAttribute('aria-invalid');
          const error = document.getElementById(input.id + '-error');
          if (error) error.hidden = true;
        }
        update();
      }
      palette.addEventListener('input', event => {
        if (event.target.tagName !== 'SELECT') updateInput(event);
      });
      palette.addEventListener('change', event => {
        if (event.target.tagName === 'SELECT') updateInput(event);
      });
      palette.addEventListener('focusout', event => {
        const input = event.target;
        if (input.hasAttribute('data-facet-setting') && !input.validity.valid) {
          input.setAttribute('aria-invalid', 'true');
          const error = document.getElementById(input.id + '-error');
          if (error) error.hidden = false;
        }
      });

      document.getElementById('themeImportButton').onclick = () => {
        try {
          const value = importInput.value.trim();
          if (!value.startsWith(prefix)) throw new Error('Paste a theme string beginning with ' + prefix);
          const { theme, variant: nextVariant, codeThemeId } = JSON.parse(value.slice(prefix.length));
          if (nextVariant !== 'light' && nextVariant !== 'dark') throw new Error('The theme needs a light or dark appearance.');
          if (typeof codeThemeId !== 'string' || !codeThemeId.trim() || !theme) throw new Error('The theme is missing its palette or base theme.');
          const { surface, ink, accent, fonts, contrast, opaqueWindows, semanticColors } = theme;
          const colors = { surface, ink, accent, diffAdded: semanticColors?.diffAdded, diffRemoved: semanticColors?.diffRemoved, skill: semanticColors?.skill };
          if (!Object.values(colors).every(value => typeof value === 'string' && isThemeColor(value))) throw new Error('The palette needs six hex colors in #rrggbb format.');
          if (!fonts || !['ui', 'code'].every(key => fonts[key] === null || (typeof fonts[key] === 'string' && fonts[key].length <= 80 && !/[\r\n]/.test(fonts[key])))) {
            throw new Error('The theme needs valid body and code font values.');
          }
          if (!Number.isInteger(contrast) || contrast < 0 || contrast > 100 || typeof opaqueWindows !== 'boolean') throw new Error('The theme needs valid contrast and window opacity settings.');
          drafts[nextVariant] = { ...drafts[nextVariant], colors, fonts, codeThemeId, contrast, opaqueWindows };
          for (const name of Object.keys(colorLabels)) drafts[nextVariant].edited.add(name);
          loadDraft(nextVariant);
          importInput.removeAttribute('aria-invalid');
          importStatus.textContent = 'Imported ' + nextVariant + ' theme.';
        } catch (error) {
          importInput.setAttribute('aria-invalid', 'true');
          importStatus.textContent = error instanceof SyntaxError ? 'The theme string contains invalid JSON.' : error.message;
        }
      };

      async function copy(output, label) {
        try {
          await navigator.clipboard.writeText(output.value);
          status.textContent = label + ' copied.';
        } catch {
          output.focus();
          output.select();
          status.textContent = 'Clipboard unavailable. Copy the selected text.';
        }
      }

      document.getElementById('themeReset').onclick = () => {
        drafts[variant] = defaultDraft(variant);
        loadDraft(variant);
        snapshotKey = undefined;
        refreshRuntimeStyles();
        status.textContent = 'Reset ' + variant + ' theme.';
      };
      copyFacet.onclick = () => copy(facetExport, 'Facet CSS');
      copyFacetModule.onclick = () => copy(facetModule, 'Facet theme module');
      copyCodex.onclick = () => copy(codexExport, 'Codex theme');
      apply.onclick = async () => {
        const startMarker = '/* Theme editor start */';
        const endMarker = '/* Theme editor end */';
        const css = [startMarker, facetExport.value, endMarker].join('\n');
        const model = cssEditor.getModel();
        const current = model.getValue();
        const start = current.indexOf(startMarker);
        const end = current.indexOf(endMarker);
        if (start > end || (start < 0 && end >= 0) || start !== current.lastIndexOf(startMarker) || end !== current.lastIndexOf(endMarker)) {
          status.textContent = 'Repair the theme markers in the CSS tab before applying.';
          return;
        }
        const from = model.getPositionAt(start < 0 ? current.length : start);
        const to = model.getPositionAt(end < 0 ? current.length : end + endMarker.length);
        const text = start < 0 && current ? '\n\n' + css : css;
        cssEditor.pushUndoStop();
        cssEditor.executeEdits('theme-editor', [{ range: new monaco.Range(from.lineNumber, from.column, to.lineNumber, to.column), text }]);
        cssEditor.pushUndoStop();
        const { document: settings, edited } = drafts[variant];
        if (edited.has('pageSize') || (edited.has('landscape') && settings.landscape)) setPageSizeSelection(document.getElementById('pageSize'), settings.pageSize || (settings.landscape ? 'a4' : ''));
        if (edited.has('landscape')) document.getElementById('landscape').checked = settings.landscape;
        for (const id of Object.values(MARGIN_PARAMS)) {
          if (edited.has(id)) document.getElementById(id).value = settings[id] ?? '';
        }
        if (['pageSize', 'landscape', ...Object.values(MARGIN_PARAMS)].some(id => edited.has(id))) {
          document.getElementById('outputOptions').open = true;
          markPreviewStale();
        }
        writeUrlState();
        applying = apply.disabled = true;
        try { await renderPreview(false); }
        finally { applying = false; update(); }
      };
      document.addEventListener('facet-editors-ready', () => { if (drafts) update(); refreshRuntimeStyles(); });
      document.addEventListener('facet-preview-styles', refreshRuntimeStyles);
      return { refresh: refreshRuntimeStyles, cancel: stopInspection };
    }
`;
