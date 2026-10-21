import type { Browser } from 'puppeteer-core';
import { performance } from 'node:perf_hooks';
import { Logger } from '../utils/logger.js';
import { setPreparedContent } from '../utils/browser-readiness.js';
import { injectFontScale, parseFontSize } from '../utils/font-size.js';
import { applyBrowserLayout } from '../utils/render-layout.js';
import { readOfficeDOM } from './dom.js';
import { officeLayout } from './layout.js';
import { writeDOCX } from './docx.js';
import { writePPTX } from './pptx.js';
import { renderWordChrome } from './word/pdf-chrome.js';
import { renderWordDiagram } from './word/pdf-diagrams.js';
import type { Block } from './model.js';
import { logVisual } from './logging.js';

export async function generateOfficeBuffer(options: {
  browser: Browser;
  html: string;
  format: 'docx' | 'pptx';
  fontSize?: number;
  verbose?: boolean | number;
}): Promise<Buffer> {
  const logger = new Logger(options.verbose);
  const layout = officeLayout(options.format, parseFontSize(options.fontSize));
  const html = injectFontScale(options.html, options.fontSize);
  const styledHTML = html.includes('</head>') ? html.replace('</head>', `<style>${layout.css}</style></head>`) : `<style>${layout.css}</style>${html}`;
  const context = await options.browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport(layout.viewport);
    await setPreparedContent(page, styledHTML);
    await page.evaluate(applyBrowserLayout, layout);
    const officeDocument = await page.evaluate(readOfficeDOM, options.format);
    const snapshot = await page.content();
    const hydrate = async (blocks: Block[]): Promise<void> => {
      for (const block of blocks) {
        if (block.kind === 'image') {
          const startedAt = performance.now();
          if (block.box.width <= 0 || block.box.height <= 0) throw new Error(`Office visual has no measurable size: ${block.source}`);
          const element = await page.$(`[data-facet-office-media="${block.mediaId}"]`);
          if (!element) throw new Error(`Office visual disappeared: ${block.source}`);
          block.data = block.format === 'pdf'
            ? await renderWordDiagram({ context, html: snapshot, block, viewport: layout.viewport })
            : await element.screenshot({ type: 'png', omitBackground: true });
          await element.dispose();
          logVisual({ logger, format: options.format, action: 'generated', block, startedAt });
        }
        if (block.kind === 'group') await hydrate(block.blocks);
        if (block.kind === 'table') for (const row of block.rows) for (const cell of row.cells) await hydrate(cell.blocks);
      }
    };
    for (const spec of officeDocument.pages) {
      await hydrate(spec.blocks);
      if (spec.header) await hydrate(spec.header.blocks);
      if (spec.footer) await hydrate(spec.footer.blocks);
    }
    if (!officeDocument.pages.some((spec) => spec.blocks.length)) throw new Error('Office export contains no visible content');
    return options.format === 'docx'
      ? await writeDOCX({ document: officeDocument, assets: await renderWordChrome({ context, html, document: officeDocument }), logger })
      : await writePPTX({ document: officeDocument, logger });
  } finally {
    await context.close();
  }
}
