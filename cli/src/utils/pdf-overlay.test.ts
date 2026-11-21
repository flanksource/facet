import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { launchBrowser } from './pdf-generator.js';
import { renderElementPdf } from './pdf-overlay.js';

describe('paired PDF and PNG overlay capture', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('captures matching print bounds after preparation and writes both debug sidecars', async () => {
    const scratch = await mkdtemp(join(resolve('../.tmp'), 'paired-overlay-'));
    const context = await browser.createBrowserContext();
    try {
      const debugOutputPath = join(scratch, 'overlay');
      const result = await renderElementPdf({ browser: context, html: '<html><head><style>@media print { #art {background:#123456} }</style></head><body><header id="art"><span id="counter">Page _PG_</span></header></body></html>',
        selector: '#art', widthMm: 25.4, heightMm: 12.7, capturePng: true, debugOutputPath,
        preparePage: async (page) => { await page.$eval('#counter', (element) => element.remove()); },
      });
      const pdf = await PDFDocument.load(result.pdf);
      expect(pdf.getPage(0).getSize()).toEqual({ width: 72, height: 36 });
      const bitmap = await sharp(result.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([bitmap.info.width, bitmap.info.height, ...bitmap.data.subarray(0, 4)]).toEqual([96, 48, 18, 52, 86, 255]);
      expect(await readFile(`${debugOutputPath}.pdf`)).toEqual(result.pdf);
      expect(await readFile(`${debugOutputPath}.png`)).toEqual(result.png);
      expect(await context.pages()).toHaveLength(0);
    } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
  });

  it('returns only a PDF when PNG capture is not requested', async () => {
    const result = await renderElementPdf({ browser, html: '<html><body><div id="art">Artwork</div></body></html>', selector: '#art', widthMm: 25.4, heightMm: 12.7 });
    expect(result.pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.png).toBeUndefined();
  });
});
