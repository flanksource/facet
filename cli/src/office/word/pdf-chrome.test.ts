import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { PDFDocument, PDFName } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import { readEmfPdf } from '../emf/decode.js';
import { launchBrowser } from '../../utils/pdf-generator.js';
import { renderElementPdf } from '../../utils/pdf-overlay.js';
import { readOfficeDOM } from '../dom.js';
import { writeDOCX } from '../docx.js';
import { renderWordChrome } from './pdf-chrome.js';

describe('PDF-in-EMF Word header/footer artwork', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('stores the exact PDF bytes, reuses repeated variants, and scales mixed paper sizes', async () => {
    const context = await browser.createBrowserContext();
    try {
      const html = `<html><head><style>body {margin:0;font:10pt Arial} p {margin:0}</style></head><body>
        <header data-header-type="default" data-header-height="10">Default artwork</header>
        <header data-header-type="first" data-header-height="20">First artwork</header>
        <footer data-footer-type="last" data-footer-height="0"></footer>
        <main data-page-size="a4"><p>One</p></main><main data-page-size="a4"><p>Two</p></main>
        <main data-page-size="letter" data-page-type="first"><p>Three</p></main>
        <main data-page-size="a3" data-page-type="last"><p>Four</p></main></body></html>`;
      const page = await context.newPage();
      await page.setContent(html);
      const document = await page.evaluate(readOfficeDOM);
      const assets = await renderWordChrome({ context, html, document });
      expect(assets.size).toBe(4);
      expect(assets.get(document.pages[0].header!)).toBe(assets.get(document.pages[1].header!));
      expect(assets.has(document.pages[3].footer!)).toBe(false);
      const zip = await JSZip.loadAsync(await writeDOCX({ document, assets }));
      const embedded = await Promise.all(Object.values(zip.files).filter((file) => /media\/.+\.emf$/.test(file.name)).map(async (file) => Buffer.from(readEmfPdf(await file.async('uint8array'))!)));
      const unique = [...new Set(assets.values())];
      expect(embedded).toHaveLength(unique.length);
      expect(embedded.map((bytes) => Buffer.from(bytes))).toEqual(unique.map((asset) => Buffer.from(asset.data)));
      const dimensions = await Promise.all(embedded.map(async (bytes) => (await PDFDocument.load(bytes)).getPage(0).getSize()));
      for (const [index, expected] of [[210, 10], [215.9, 20], [297, 15]].entries()) {
        expect(dimensions[index].width).toBeCloseTo(expected[0] * 72 / 25.4, 0);
        expect(dimensions[index].height).toBeCloseTo(expected[1] * 72 / 25.4, 0);
      }
      for (const index of [1, 2]) expect(await zip.file(`word/_rels/header${index}.xml.rels`)!.async('string')).toContain('media/facetPdf1.emf');
      const xml = await zip.file('word/document.xml')!.async('string');
      expect(xml).toContain('w:top="850"');
      expect(await context.pages()).toHaveLength(1);
    } finally { await context.close(); }
  });

  it('removes counter glyphs from both captures while preserving styled, aligned native fields', async () => {
    const context = await browser.createBrowserContext();
    try {
      const html = `<html><head><style>body {margin:0;font:10pt Arial} @media print {footer {color:rgb(18,52,86)}}</style></head><body>
        <footer data-footer-type="default" data-footer-height="12" style="display:flex;justify-content:space-between;align-items:center">
          <span></span><span style="font-weight:700">Page _PG_ of _TL_</span></footer>
        <main data-page-size="a4"><p>Editable body</p></main></body></html>`;
      const page = await context.newPage();
      await page.setContent(html);
      const document = await page.evaluate(readOfficeDOM);
      const assets = await renderWordChrome({ context, html, document });
      const asset = assets.get(document.pages[0].footer!)!;
      expect(asset.counters).toHaveLength(1);
      expect(asset.counters[0].runs[0].text).toBe('Page _PG_ of _TL_');
      expect(asset.counters[0].style).toMatchObject({ bold: true, color: '123456', align: 'right' });
      const pdf = await PDFDocument.load(asset.data);
      expect(pdf.getPage(0).node.Resources()?.get(PDFName.of('Font'))).toBeUndefined();
      expect((await sharp(asset.png).ensureAlpha().stats()).channels[3].max).toBe(0);
      const zip = await JSZip.loadAsync(await writeDOCX({ document, assets }));
      const footer = await zip.file('word/footer1.xml')!.async('string');
      expect(footer).toContain('PAGE');
      expect(footer).toContain('NUMPAGES');
      expect(footer).toContain('w:color w:val="123456"');
      expect(footer).toContain('<w:jc w:val="right"');
      expect(footer).toContain('w:hAnchor="page"');
      expect(footer).not.toMatch(/_PG_|_TL_|v:imagedata|OLEObject/);
      expect(footer).toContain('<wp:anchor');
    } finally { await context.close(); }
  });

  it('clears zero-height and absent headers instead of inheriting the previous PDF', async () => {
    const context = await browser.createBrowserContext();
    try {
      const html = `<html><body><header data-header-type="first" data-header-height="10">First artwork</header>
        <header data-header-type="last" data-header-height="0"></header>
        <main data-page-size="a4" data-page-type="first">First</main><main data-page-size="a4">Second</main>
        <main data-page-size="a4" data-page-type="last">Last</main></body></html>`;
      const page = await context.newPage();
      await page.setContent(html);
      const document = await page.evaluate(readOfficeDOM);
      const assets = await renderWordChrome({ context, html, document });
      const zip = await JSZip.loadAsync(await writeDOCX({ document, assets }));
      expect(Object.keys(zip.files).filter((path) => /media\/.+\.emf$/.test(path))).toHaveLength(1);
      expect(await zip.file('word/header1.xml')!.async('string')).toContain('<w:drawing');
      for (const index of [2, 3]) expect(await zip.file(`word/header${index}.xml`)!.async('string')).not.toContain('<w:drawing');
    } finally { await context.close(); }
  });

  it('closes overlay pages and reports the affected variant when rendering fails', async () => {
    const context = await browser.createBrowserContext();
    try {
      await expect(renderElementPdf({ browser: context, html: '<html><body></body></html>', selector: '#missing', widthMm: 210, heightMm: 10 }))
        .rejects.toThrow('Missing PDF overlay: #missing');
      expect(await context.pages()).toHaveLength(0);
      const chrome = { selector: '#missing', height: 20, blocks: [] };
      await expect(renderWordChrome({ context, html: '<html><body></body></html>', document: { title: 'Missing', pages: [
        { size: 'a4', width: 800, height: 1100, margins: { top: 0, bottom: 0, left: 0, right: 0 }, blocks: [], header: chrome },
      ] } })).rejects.toThrow('Failed to render Word #missing at a4');
      expect(await context.pages()).toHaveLength(0);
    } finally { await context.close(); }
  });
});
