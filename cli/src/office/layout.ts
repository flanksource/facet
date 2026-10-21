import { fontScaleCss } from '../utils/font-size.js';
import { PAGE_SIZES } from '../utils/pdf-multipass.js';
import type { BrowserLayout } from '../utils/render-layout.js';
import { SLIDE } from './model.js';

export function officeLayout(format: 'docx' | 'pptx', fontSize?: number): BrowserLayout {
  const css = 'body { margin: 0; max-width: none !important; } [data-page-size] { height: auto !important; min-height: 0 !important; max-width: none !important; } [data-page-size] main { overflow: visible !important; }';
  if (format === 'pptx') return {
    viewport: { width: SLIDE.width, height: SLIDE.height },
    css: `${css} ${fontScaleCss(fontSize ?? 18, 'important')} body { font-size: ${fontSize ?? 18}pt !important; } [data-page-size] { width: ${SLIDE.width}px !important; }`,
  };
  return {
    viewport: { width: Math.round(210 * 96 / 25.4), height: Math.round(297 * 96 / 25.4) },
    sizeAttribute: 'data-page-size',
    css: css + (fontSize === undefined ? '' : fontScaleCss(fontSize, 'important')) + Object.entries(PAGE_SIZES).map(([name, dims]) => `[data-page-size="${name}"] { width: ${dims.width}mm !important; }`).join('\n'),
  };
}
