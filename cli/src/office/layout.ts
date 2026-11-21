import { fontScaleCss } from '../utils/font-size.js';
import { PAGE_SIZES } from '../utils/pdf-multipass.js';
import type { BrowserLayout } from '../utils/render-layout.js';
import { presentationSize } from './powerpoint/size.js';
import { PAGE_SIZE_PRESETS } from '../utils/page-size-presets.js';

export function officeLayout(format: 'docx' | 'pptx', fontSize?: number): BrowserLayout {
  const css = 'body { margin: 0; max-width: none !important; } [data-page-size] { height: auto !important; min-height: 0 !important; max-width: none !important; } [data-page-size] main { overflow: visible !important; }';
  const size = presentationSize([]);
  const presentationWidths = Object.entries(PAGE_SIZE_PRESETS).filter(([, preset]) => preset.group === 'PowerPoint')
    .map(([name, preset]) => `body:has([data-page-size="${name}" i]) { --facet-slide-width: ${preset.width}px; }`).join('\n');
  if (format === 'pptx') return {
    viewport: { width: size.width, height: size.height },
    css: `${css} ${fontScaleCss(fontSize ?? 18, 'important')} ${presentationWidths} body { font-size: ${fontSize ?? 18}pt !important; } [data-page-size] { width: var(--facet-slide-width, ${size.width}px) !important; }`,
  };
  return {
    viewport: { width: Math.round(210 * 96 / 25.4), height: Math.round(297 * 96 / 25.4) },
    sizeAttribute: 'data-page-size',
    css: css + (fontSize === undefined ? '' : fontScaleCss(fontSize, 'important')) + Object.entries(PAGE_SIZES).map(([name, dims]) => `[data-page-size="${name}"] { width: ${dims.width}mm !important; }`).join('\n'),
  };
}
