import type { BrowserContext } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import type { Image } from '../model.js';
import { renderElementPdf } from '../../utils/pdf-overlay.js';

export async function renderWordDiagram(options: {
  context: BrowserContext;
  html: string;
  block: Image;
  viewport: { width: number; height: number };
}): Promise<Uint8Array> {
  const { block } = options;
  try {
    const data = await renderElementPdf({
      browser: options.context, html: options.html, selector: `[data-facet-office-media="${block.mediaId}"]`,
      widthMm: block.box.width * 25.4 / 96, heightMm: block.box.height * 25.4 / 96,
      preserveLayout: true, viewport: options.viewport,
    });
    const pdf = await PDFDocument.load(data);
    if (pdf.getPageCount() !== 1) throw new Error(`Expected one diagram PDF page, received ${pdf.getPageCount()}`);
    return data;
  } catch (cause) {
    throw new Error(`Failed to render Word diagram ${block.source}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}
