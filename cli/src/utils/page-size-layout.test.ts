import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { generatePDFBuffer, launchBrowser } from './pdf-generator.js';
import { generatePNGBuffer } from './png-generator.js';
import { renderBrowserHTML } from './browser-html.js';
import { pageSizeLayout } from './page-size-layout.js';

describe('page size overrides', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it.each([
    ['google-ads-300x250', 300, 250, 79, 66],
    ['linkedin-portrait', 720, 900, 191, 238],
    ['100x200', 378, 756, 100, 200],
  ] as const)('lays out an explicit template at %s before PNG/PDF capture', async (size, width, height, widthMm, heightMm) => {
    const layout = pageSizeLayout(size)!;
    const html = await renderBrowserHTML({ browser, layout,
      html: '<!doctype html><html><head></head><body style="padding:32px;min-height:100vh"><section data-page-size="facebook-square" data-facet-canvas="true" style="width:1080px;height:1080px"><main>Campaign</main></section></body></html>',
    });
    const png = await generatePNGBuffer(browser, html, { viewport: layout.viewport });
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
    const pdf = await PDFDocument.load(await generatePDFBuffer(browser, html, { defaultPageSize: size }));
    expect(pdf.getPageCount()).toBe(1);
    expect([
      Math.round(pdf.getPage(0).getWidth() * 25.4 / 72),
      Math.round(pdf.getPage(0).getHeight() * 25.4 / 72),
    ]).toEqual([widthMm, heightMm]);
  });

  it('does not introduce a layout override unless requested', () => {
    expect(pageSizeLayout()).toBeUndefined();
  });

  it('overrides mixed page sizes consistently through typed PDF headers and footers', async () => {
    const layout = pageSizeLayout('google-ads-300x250')!;
    const html = await renderBrowserHTML({ browser, layout, html: `<!doctype html><html><head><style>
      [data-page-size] { break-after: page; }
      @media print { [data-header-type], [data-footer-type] { display: none; } }
      </style></head><body>
      <header data-header-type="default" data-header-height="5">Campaign header</header>
      <footer data-footer-type="default" data-footer-height="5">Campaign footer</footer>
      <section data-page-size="a4"><main>First page</main></section>
      <section data-page-size="facebook-square"><main>Second page</main></section>
      </body></html>` });
    const pdf = await PDFDocument.load(await generatePDFBuffer(browser, html, { defaultPageSize: 'google-ads-300x250' }));
    expect(pdf.getPageCount()).toBe(2);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(225, 0);
      expect(page.getHeight()).toBeCloseTo(187.5, 0);
    }
  });

  it('lays out portrait targets in landscape when explicitly requested', async () => {
    const layout = pageSizeLayout('linkedin-portrait', true)!;
    const html = await renderBrowserHTML({ browser, layout,
      html: '<!doctype html><html><head></head><body><section data-page-size="a4">Campaign</section></body></html>',
    });
    const png = await generatePNGBuffer(browser, html, { viewport: layout.viewport });
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([900, 720]);
    const pdf = await PDFDocument.load(await generatePDFBuffer(browser, html, { defaultPageSize: layout.pageSizeOverride, landscape: true }));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(675, 0);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(540, 0);
  });

  it('keeps a landscape canvas on one PDF page when margins reduce its printable area', async () => {
    const layout = pageSizeLayout('google-ads-300x250')!;
    const html = await renderBrowserHTML({ browser, layout,
      html: '<!doctype html><html><head></head><body><section data-page-size="a4"><main>Campaign</main></section></body></html>',
    });
    const pdf = await PDFDocument.load(await generatePDFBuffer(browser, html, {
      defaultPageSize: 'google-ads-300x250', margins: { top: 10, bottom: 10 },
    }));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(225, 0);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(187.5, 0);
  });
});
