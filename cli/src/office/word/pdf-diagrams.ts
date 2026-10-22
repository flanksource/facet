import type { BrowserContext } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import type { Image } from '../model.js';
import { renderElementPdf } from '../../utils/pdf-overlay.js';

export async function renderWordDiagram(options: {
  context: BrowserContext;
  html: string;
  block: Image;
  viewport: { width: number; height: number };
}): Promise<{ pdf: Buffer; png: Buffer; timings: { pdf: number; png: number } }> {
  const { block } = options;
  try {
    const result = await renderElementPdf({
      browser: options.context, html: options.html, selector: `[data-facet-office-media="${block.mediaId}"]`,
      widthMm: block.box.width * 25.4 / 96, heightMm: block.box.height * 25.4 / 96,
      preserveLayout: true, viewport: options.viewport, capturePng: true,
    });
    const pdf = await PDFDocument.load(result.pdf);
    if (pdf.getPageCount() !== 1) throw new Error(`Expected one diagram PDF page, received ${pdf.getPageCount()}`);
    if (!result.png || result.timings.png === undefined) throw new Error('Missing diagram PNG capture');
    return { pdf: result.pdf, png: result.png, timings: { pdf: result.timings.pdf, png: result.timings.png } };
  } catch (cause) {
    throw new Error(`Failed to render Word diagram ${block.source}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}
