import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import Page from '../../../src/components/Page.js';
import Document from '../../../src/components/Document.js';
import { generatePDFBuffer, launchBrowser } from './pdf-generator.js';
import { generatePNGBuffer } from './png-generator.js';

const rootRequire = createRequire(new URL('../../../package.json', import.meta.url));
const { createElement }: typeof import('react') = rootRequire('react');
const { renderToStaticMarkup }: typeof import('react-dom/server') = rootRequire('react-dom/server');

describe('platform canvas exports', () => {
  let browser: Browser;
  let css: string;
  beforeAll(async () => {
    browser = await launchBrowser();
    css = await readFile(new URL('../../../dist/styles.css', import.meta.url), 'utf8');
  });
  afterAll(async () => { await browser?.close(); });

  it.each([
    ['facebook-square', 1080, 1080],
    ['linkedin-portrait', 720, 900],
    ['reddit-banner', 1072, 128],
    ['google-ads-300x250', 300, 250],
    ['google-ads-320x50', 320, 50],
    ['powerpoint-standard', 960, 720],
  ])('exports %s at the native PNG and PDF dimensions', async (pageSize, width, height) => {
    const html = '<!doctype html>' + renderToStaticMarkup(createElement(Document, { pageSize, css },
      createElement(Page, { id: 'canvas' }, createElement('div', null, 'Acme canvas'))));
    for (const selector of ['body', '#canvas']) {
      const png = await generatePNGBuffer(browser, html, { selector });
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
    }
    const pdf = await PDFDocument.load(await generatePDFBuffer(browser, html));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(width * 0.75, 0);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(height * 0.75, 0);
  });
});
