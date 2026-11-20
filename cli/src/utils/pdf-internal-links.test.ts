import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { generatePDFBuffer, launchBrowser } from './pdf-generator.js';

describe('multi-pass PDF internal links', () => {
  let browser: Browser;

  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('preserves percent-encoded fragment destinations', async () => {
    const buffer = await generatePDFBuffer(browser, `<html><body>
      <div data-header-type="first" data-header-height="10">Cover</div>
      <div data-header-type="default" data-header-height="10">Body</div>
      <div data-page-size="a4" data-page-type="first"><a href="#benefits%20%26%20fees">Benefits <span data-facet-toc-target="benefits &amp; fees">—</span></a></div>
      <div data-page-size="a4" data-page-type="default"><h2 id="benefits &amp; fees">Benefits and fees</h2></div>
    </body></html>`);
    const pdf = await PDFDocument.load(buffer);
    const destinations = pdf.catalog.lookup(PDFName.of('Dests')) as PDFDict;
    const destination = destinations.lookup(PDFName.of('benefits%20%26%20fees')) as PDFArray;
    expect(destination.get(0).toString()).toBe(pdf.getPage(1).ref.toString());
  });

  it.each([
    ['missing', '', 'matches 0 elements'],
    ['duplicated', '<h2 id="section">One</h2><h2 id="section">Two</h2>', 'matches 2 elements'],
  ])('rejects a %s internal link target', async (_case, headings, message) => {
    await expect(generatePDFBuffer(browser, `<html><body>
      <div data-header-type="first" data-header-height="10">Cover</div>
      <div data-page-size="a4" data-page-type="first"><a href="#section">Section</a>${headings}</div>
    </body></html>`)).rejects.toThrow(message);
  });

  it('retains cover, same-group and return links to the correct overflowing body page', async () => {
    const buffer = await generatePDFBuffer(browser, `<!DOCTYPE html><html><head><style>
      body { margin: 0; } [data-page-size] { break-after: page; }
      h2 { margin: 0; height: 10mm; } a { display: block; }
    </style></head><body>
      <div data-header-type="first" data-header-height="10">Branded header</div>
      <div data-header-type="default" data-header-height="10">Body header</div>
      <div id="cover" data-page-size="a4" data-page-type="first">
        <a href="#details-section">Details <span data-facet-toc-target="details-section">—</span></a>
        <a href="https://example.com/build/123">Build record</a>
      </div>
      <div data-page-size="a4" data-page-type="default">
        <a href="#details-section">Same-group details</a>
        <div style="height:150mm">Introduction</div><div style="height:150mm">Continuation</div>
        <h2 id="details-section">Details</h2><a href="#cover">Back to contents</a>
      </div>
    </body></html>`);
    const pdf = await PDFDocument.load(buffer);
    expect(pdf.getPageCount()).toBe(3);
    const destinations = pdf.catalog.lookup(PDFName.of('Dests'));
    expect(destinations).toBeInstanceOf(PDFDict);
    for (const [name, page] of [['cover', 0], ['details-section', 2]] as const) {
      const destination = (destinations as PDFDict).lookup(PDFName.of(name));
      expect(destination).toBeInstanceOf(PDFArray);
      expect((destination as PDFArray).get(0).toString()).toBe(pdf.getPage(page).ref.toString());
    }
    const actions = pdf.getPages().map(page => {
      const annotations = page.node.lookup(PDFName.of('Annots'));
      return annotations instanceof PDFArray ? annotations.asArray().map(reference => {
        const annotation = pdf.context.lookup(reference) as PDFDict;
        return annotation.lookup(PDFName.of('A')) as PDFDict;
      }) : [];
    });
    const targets = (page: number) => actions[page].filter(action => action?.get(PDFName.of('S')) === PDFName.of('GoTo')).map(action => action.get(PDFName.of('D'))?.toString());
    expect(targets(0)).toContain(PDFName.of('details-section').toString());
    expect(targets(1)).toContain(PDFName.of('details-section').toString());
    expect(targets(2)).toContain(PDFName.of('cover').toString());
    expect(actions[0].some(action => (action?.lookup(PDFName.of('URI')) as PDFString | undefined)?.decodeText() === 'https://example.com/build/123')).toBe(true);
    expect(actions.flat().filter(action => action?.get(PDFName.of('S')) === PDFName.of('URI')).map(action => (action.lookup(PDFName.of('URI')) as PDFString).decodeText())).toEqual(['https://example.com/build/123']);
  });
});
