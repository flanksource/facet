import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import type { BrowserContext, Page } from 'puppeteer-core';
import { setPreparedContent } from './browser-readiness.js';

export async function renderElementPdf(options: {
  browser: Pick<BrowserContext, 'newPage'>;
  html: string;
  selector: string;
  heightMm: number;
  widthMm: number;
  preserveLayout?: boolean;
  viewport?: { width: number; height: number };
  debugOutputPath?: string;
  capturePng?: boolean;
  preparePage?: (page: Page) => Promise<void>;
}): Promise<{ pdf: Buffer; png?: Buffer; timings: { pdf: number; png?: number } }> {
  const { html, selector, heightMm, widthMm, debugOutputPath } = options;
  if (![widthMm, heightMm].every((value) => Number.isFinite(value) && value > 0)) throw new Error(`Invalid PDF overlay dimensions: ${widthMm}x${heightMm}mm`);
  const page = await options.browser.newPage();
  try {
    await page.setViewport(options.viewport ?? { width: Math.round(widthMm * 96 / 25.4), height: Math.round(heightMm * 96 / 25.4) });
    await setPreparedContent(page, html);
    await page.emulateMediaType(options.preserveLayout ? 'screen' : 'print');
    await page.evaluate(({ selector, heightMm, widthMm, preserveLayout }) => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Missing PDF overlay: ${selector}`);
      let branch = target;
      if (preserveLayout) {
        for (let ancestor = target.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
          for (const sibling of Array.from(ancestor.children)) if (sibling !== branch) sibling.remove();
          ancestor.style.setProperty('display', 'contents', 'important');
          branch = ancestor;
        }
      }
      document.body.replaceChildren(branch);
      Object.assign(document.body.style, { margin: '0', padding: '0', overflow: 'hidden', width: `${widthMm}mm`, height: `${heightMm}mm` });
      Object.assign(target.style, { width: '100%', height: '100%', margin: '0', boxSizing: 'border-box', overflow: 'hidden' });
    }, { selector, heightMm, widthMm, preserveLayout: options.preserveLayout });
    await page.addStyleTag({ content: `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; } body { max-width: ${widthMm}mm !important; }` });
    if (options.preparePage) {
      await page.emulateMediaType('print');
      await options.preparePage(page);
    }
    if (debugOutputPath) writeFileSync(`${debugOutputPath}.html`, await page.content());
    const pngStarted = performance.now();
    const png = options.capturePng ? Buffer.from(await page.screenshot({ type: 'png', omitBackground: true, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: widthMm * 96 / 25.4, height: heightMm * 96 / 25.4 } })) : undefined;
    const pngMs = png ? performance.now() - pngStarted : undefined;
    const pdfStarted = performance.now();
    const bytes = Buffer.from(await page.pdf({ width: `${widthMm}mm`, height: `${heightMm}mm`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true }));
    const pdfMs = performance.now() - pdfStarted;
    if (debugOutputPath) {
      writeFileSync(`${debugOutputPath}.pdf`, bytes);
      if (png) writeFileSync(`${debugOutputPath}.png`, png);
    }
    return { pdf: bytes, png, timings: { pdf: pdfMs, png: pngMs } };
  } finally {
    await page.close();
  }
}
