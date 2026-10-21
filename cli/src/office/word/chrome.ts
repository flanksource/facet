import * as D from 'docx';
import type { Chrome } from '../model.js';
import type { PdfChrome } from './pdf-chrome.js';
import { paragraph, twips } from './text.js';
import { pdfObject, pdfOle, type EmbeddedPdf } from './embedded-pdf.js';

export function wordChrome(options: { assets: ReadonlyMap<Chrome, PdfChrome>; pdfs: EmbeddedPdf[] }): {
  render: (chrome: Chrome | undefined, y: number) => D.Paragraph[];
} {
  const parts = new Map<PdfChrome, EmbeddedPdf>();
  let sequence = 0;
  const render = (chrome: Chrome | undefined, y: number): D.Paragraph[] => {
    if (!chrome || chrome.height === 0) return [];
    const asset = options.assets.get(chrome);
    if (!asset) throw new Error(`Missing embedded PDF for Word ${chrome.selector}`);
    let part = parts.get(asset);
    if (!part) {
      const index = parts.size + 1;
      part = { id: `facetPdf${index}`, path: `word/embeddings/facetChrome${index}.bin`, data: pdfOle(asset.data) };
      parts.set(asset, part);
      options.pdfs.push(part);
    }
    return [new D.Paragraph({ spacing: { before: 0, after: 0, line: 1, lineRule: D.LineRuleType.EXACT },
      children: [pdfObject({ part, width: asset.width, height: asset.height, y, shapeId: `facetChromeShape${++sequence}` })] }), ...asset.counters.map((counter) => paragraph(counter, {
      frame: { type: 'absolute', position: { x: twips(counter.box.x), y: twips(y + counter.box.y) },
        width: twips(counter.box.width), height: twips(Math.max(counter.box.height, counter.style.lineHeight)),
        anchor: { horizontal: D.FrameAnchorType.PAGE, vertical: D.FrameAnchorType.PAGE },
        wrap: D.FrameWrap.NONE, space: { horizontal: 0, vertical: 0 } },
    }))];
  };
  return { render };
}
