import * as D from 'docx';
import type { Chrome } from '../model.js';
import type { PdfChrome } from './pdf-chrome.js';
import { paragraph, twips } from './text.js';
import { pdfObject } from './embedded-pdf.js';
import type { PdfMedia } from './pdf-media.js';
import { performance } from 'node:perf_hooks';
import type { Logger } from '../../utils/logger.js';
import { logVisual } from '../logging.js';

export function wordChrome(options: { assets: ReadonlyMap<Chrome, PdfChrome>; media: PdfMedia; logger?: Pick<Logger, 'debug'> }): {
  render: (chrome: Chrome | undefined, y: number) => D.Paragraph[];
} {
  const render = (chrome: Chrome | undefined, y: number): D.Paragraph[] => {
    if (!chrome || chrome.height === 0) return [];
    const startedAt = performance.now();
    const asset = options.assets.get(chrome);
    if (!asset) throw new Error(`Missing embedded PDF for Word ${chrome.selector}`);
    const part = options.media.get(asset);
    const result = [new D.Paragraph({ spacing: { before: 0, after: 0, line: 1, lineRule: D.LineRuleType.EXACT },
      children: [pdfObject({ part, width: asset.width, height: asset.height, y, alt: chrome.selector })] }), ...asset.counters.map((counter) => paragraph(counter, {
      frame: { type: 'absolute', position: { x: twips(counter.box.x), y: twips(y + counter.box.y) },
        width: twips(counter.box.width), height: twips(Math.max(counter.box.height, counter.style.lineHeight)),
        anchor: { horizontal: D.FrameAnchorType.PAGE, vertical: D.FrameAnchorType.PAGE },
        wrap: D.FrameWrap.NONE, space: { horizontal: 0, vertical: 0 } },
    }))];
    logVisual({ logger: options.logger, format: 'docx', action: 'inserted', block: { mediaId: chrome.selector, source: chrome.selector, alt: '', format: 'pdf' },
      mediaFormat: 'PDF-in-EMF', elapsedMs: performance.now() - startedAt, location: part.path });
    return result;
  };
  return { render };
}
