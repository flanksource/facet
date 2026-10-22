import type { BrowserLayout } from './render-layout.js';
import { canonicalPageSize, PAGE_SIZE_PRESETS } from './page-size-presets.js';

export function pageSizeLayout(name?: string, landscape?: boolean): BrowserLayout | undefined {
  if (name === undefined) return undefined;
  const size = canonicalPageSize(name);
  const preset = PAGE_SIZE_PRESETS[size];
  const [customWidth, customHeight] = size.split('x').map(Number);
  const unit = preset?.unit ?? 'mm';
  let width = preset?.width ?? customWidth;
  let height = preset?.height ?? customHeight;
  const rotate = landscape === true && width < height;
  if (rotate) [width, height] = [height, width];
  const pxPerUnit = unit === 'px' ? 1 : 96 / 25.4;
  const dimensions = `width: ${width}${unit} !important; max-width: none !important;`;
  const pageHeight = `min(${height}${unit}, var(--facet-printable-height, ${height}${unit}))`;
  return {
    viewport: { width: Math.round(width * pxPerUnit), height: Math.round(height * pxPerUnit) },
    sizeAttribute: 'data-page-size',
    pageSizeOverride: rotate ? `${width * (unit === 'px' ? 25.4 / 96 : 1)}x${height * (unit === 'px' ? 25.4 / 96 : 1)}` : size,
    css: `body { ${dimensions} min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
      [data-page-size] { ${dimensions} margin: 0 !important; box-sizing: border-box !important;
        ${unit === 'px' ? `height: ${pageHeight} !important; min-height: 0 !important; overflow: hidden !important; display: flex; flex-direction: column;` : `height: auto !important; min-height: ${pageHeight} !important;`} }
      ${unit === 'px' ? '[data-page-size] > main { flex: 1; min-height: 0; }' : ''}
      body:not(:has([data-page-size])) { min-height: ${pageHeight} !important; }`,
  };
}
