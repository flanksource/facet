import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { PDFDocument } from 'pdf-lib';
import { readEmfPdf } from './emf/decode.js';
import { launchBrowser } from '../utils/pdf-generator.js';
import { generateOfficeBuffer } from './index.js';
import { officeText } from '../../test/office-xml.js';

describe('Word document layout and fields', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  async function render(body: string): Promise<JSZip> {
    return JSZip.loadAsync(await generateOfficeBuffer({ browser, format: 'docx', html: `<!doctype html><html><head><style>
      body { margin: 0; font: 10pt Arial; } p { margin: 0; }
      table { border-collapse: collapse; } th, td { padding: 6px 10px 8px 12px; border: 1px solid #123456; vertical-align: bottom; }
      </style></head><body>${body}</body></html>` }));
  }

  it('embeds full-width header/footer PDFs in EMF drawings and retains live page fields', async () => {
    const zip = await render(`
      <header data-header-type="default" data-header-height="24" style="height:24mm;background:#2456ab;color:white;display:flex;align-items:center;justify-content:space-between;padding:4px 20px">
        <svg width="80" height="30"><rect width="80" height="30" fill="white"/></svg><div><p>Acme review</p><p>Annual results</p></div>
      </header>
      <footer data-footer-type="default" data-footer-height="12" style="height:12mm;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #123456;padding:4px 20px">
        <span>Confidential</span><span>Page _PG_ of _TL_</span>
      </footer>
      <main data-page-size="a4" data-margin-left="12" data-margin-right="12"><p>Body text</p></main>`);
    const header = await zip.file('word/header1.xml')!.async('string');
    const footer = await zip.file('word/footer1.xml')!.async('string');
    expect(header).toContain('<wp:anchor');
    expect(header).toContain('behindDoc="1"');
    expect(header).toContain('relativeFrom="page"');
    expect(header).toContain('<wp:posOffset>0</wp:posOffset>');
    expect(officeText(header)).toBe('');
    expect(footer).toContain('<wp:anchor');
    expect(footer).toContain('PAGE');
    expect(footer).toContain('NUMPAGES');
    expect(footer).toContain('<w:framePr');
    expect(header + footer).not.toMatch(/v:imagedata|OLEObject|w:tbl/);
    expect(Object.keys(zip.files).filter((path) => /^word\/embeddings\/.+/.test(path))).toHaveLength(0);
    const pdfs = Object.keys(zip.files).filter((path) => /^word\/media\/.+\.emf$/.test(path));
    expect(pdfs).toHaveLength(2);
    for (const [index, path] of pdfs.entries()) {
      const bytes = Buffer.from(readEmfPdf(await zip.file(path)!.async('nodebuffer'))!);
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(210 * 72 / 25.4, 0);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo([24, 12][index] * 72 / 25.4, 0);
    }
    expect(await zip.file('[Content_Types].xml')!.async('string')).toContain('ContentType="image/x-emf"');
    const rels = await zip.file('word/_rels/header1.xml.rels')!.async('string');
    expect(rels).toContain('relationships/image');
    expect(rels).toContain('media/facetPdf');
    expect(officeText(await zip.file('word/document.xml')!.async('string'))).toBe('Body text');
  });

  it('preserves table padding, vertical alignment, grid widths and merged cells', async () => {
    const zip = await render(`<main data-page-size="a4"><table style="width:600px;table-layout:fixed;border-collapse:separate;border-spacing:0">
      <colgroup><col style="width:200px"><col style="width:400px"></colgroup>
      <thead><tr><th>Component</th><th>Requirement</th></tr></thead>
      <tbody><tr><td rowspan="2">Kubernetes</td><td>1.24+</td></tr><tr><td>PostgreSQL 13+</td></tr>
      <tr><td colspan="2">Memory 4GB</td></tr></tbody></table></main>`);
    const xml = await zip.file('word/document.xml')!.async('string');
    const table = new XMLParser({ ignoreAttributes: false }).parse(xml)['w:document']['w:body']['w:tbl'];
    expect(table['w:tr'][0]['w:tc'][0]['w:tcPr']).toMatchObject({
      'w:tcMar': { 'w:top': { '@_w:w': '90' }, 'w:left': { '@_w:w': '180' }, 'w:bottom': { '@_w:w': '120' }, 'w:right': { '@_w:w': '150' } },
      'w:vAlign': { '@_w:val': 'bottom' },
    });
    expect(table['w:tblGrid']['w:gridCol']).toEqual([{ '@_w:w': '3000' }, { '@_w:w': '6000' }]);
    expect(xml).toContain('<w:tblHeader');
    expect(xml).toContain('<w:vMerge w:val="restart"/>');
    expect(xml).toContain('<w:gridSpan w:val="2"/>');
    expect(officeText(xml)).toBe('ComponentRequirementKubernetes1.24+PostgreSQL 13+Memory 4GB');
  });

  it('keeps tables in adjacent grid columns instead of stacking narrow tables', async () => {
    const zip = await render(`<main data-page-size="a4"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div><p>Small variant</p><table style="width:100%"><tr><td>North</td></tr></table></div>
      <div><p>Large variant</p><table style="width:100%"><tr><td>South</td></tr></table></div>
      </div></main>`);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect((xml.match(/<w:tbl>/g) ?? []).length).toBeGreaterThan(2);
    expect(xml).toContain('<w:tblBorders><w:top w:val="none"');
    expect(officeText(xml)).toBe('Small variantNorthLarge variantSouth');
  });

  it('retains underlying grid columns when every cell spans multiple columns', async () => {
    const zip = await render('<main data-page-size="a4"><table style="width:600px"><tr><td colspan="3">All columns</td></tr><tr><td colspan="3">Second row</td></tr></table></main>');
    const xml = await zip.file('word/document.xml')!.async('string');
    const table = new XMLParser({ ignoreAttributes: false }).parse(xml)['w:document']['w:body']['w:tbl'];
    expect(table['w:tblGrid']['w:gridCol']).toHaveLength(3);
    expect(table['w:tr'].map((row: { 'w:tc': { 'w:tcPr': { 'w:gridSpan': { '@_w:val': string } } } }) => row['w:tc']['w:tcPr']['w:gridSpan']['@_w:val'])).toEqual(['3', '3']);
    expect(officeText(xml)).toBe('All columnsSecond row');
  });

  it('creates a native TOC with selected target fields, bookmarks and literal appendix labels', async () => {
    const zip = await render(`<div data-page-size="a4"><main style="padding:12mm"><section data-table-of-contents="true"><h2>Contents</h2><ol>
      <li data-toc-level="1"><a href="#overview"><span>Executive overview</span><span data-facet-toc-target="overview">—</span></a></li>
      <li data-toc-level="2"><a href="#controls"><span>Controls and assurance</span><span data-facet-toc-target="controls">—</span></a></li>
      <li data-toc-level="2"><div><span>Appendix</span><span>A-1</span></div></li>
      </ol></section></main></div><main id="overview" data-page-size="a4"><h1>Overview heading</h1>
      <h2 id="controls">Control heading</h2><h2>Unlisted heading</h2></main>`);
    const xml = await zip.file('word/document.xml')!.async('string');
    const settings = await zip.file('word/settings.xml')!.async('string');
    expect(xml).toContain('TOC ');
    expect(xml).toContain('PAGEREF ');
    expect(xml).toMatch(/TC &quot;Executive overview&quot; \\f/);
    expect(xml).toMatch(/TC &quot;Controls and assurance&quot; \\f/);
    expect(xml).toContain('<w:bookmarkStart');
    expect(xml).toContain('<w:sdt>');
    expect(xml).not.toContain('TC &quot;Unlisted heading');
    expect(officeText(xml)).toContain('Appendix');
    expect(officeText(xml)).toContain('A-1');
    expect(officeText(xml)).not.toContain('—');
    expect(settings).toContain('<w:updateFields');
  });

  it('uses valid Word bookmark names for target IDs containing spaces and punctuation', async () => {
    const zip = await render(`<main data-page-size="a4"><section data-table-of-contents="true"><h2>Contents</h2><ol>
      <li data-toc-level="1"><a href="#controls%20%26%20evidence"><span>Controls &amp; evidence</span><span data-facet-toc-target="controls &amp; evidence">—</span></a></li>
      </ol></section><h1 id="controls &amp; evidence">Controls heading</h1><p><a href="#controls%20%26%20evidence">Return to controls</a></p></main>`);
    const xml = await zip.file('word/document.xml')!.async('string');
    const name = xml.match(/<w:bookmarkStart[^>]*w:name="([^"]+)"/)?.[1];
    expect(name).toMatch(/^[A-Za-z][A-Za-z0-9_]{0,39}$/);
    expect(xml).toContain(`PAGEREF ${name} `);
    expect(xml).toContain(`w:anchor="${name}"`);
    expect(xml).not.toContain('w:anchor="controls%20');
  });

  it('anchors inline elements and empty anchors at their actual position within a paragraph', async () => {
    const zip = await render(`<main data-page-size="a4"><section data-table-of-contents="true"><h2>Contents</h2><ol>
      <li data-toc-level="1"><a href="#inline"><span>Inline wording</span><span data-facet-toc-target="inline">—</span></a></li>
      <li data-toc-level="1"><a href="#empty"><span>Empty anchor</span><span data-facet-toc-target="empty">—</span></a></li>
      <li data-toc-level="1"><a href="#block"><span>Empty block</span><span data-facet-toc-target="block">—</span></a></li>
      </ol></section><p>Before <span id="inline">Selected wording</span> after <a id="empty"></a> tail</p><div id="block"></div></main>`);
    const xml = await zip.file('word/document.xml')!.async('string');
    const bookmarks = [...xml.matchAll(/<w:bookmarkStart[^>]+>/g)];
    expect(bookmarks).toHaveLength(3);
    expect(xml.indexOf('>Before<')).toBeLessThan(bookmarks[0].index!);
    expect(bookmarks[0].index!).toBeLessThan(xml.indexOf('>Selected<'));
    expect(xml.indexOf('>Selected<')).toBeLessThan(bookmarks[1].index!);
    expect(bookmarks[1].index!).toBeLessThan(xml.indexOf('>tail<'));
    expect(xml.indexOf('>tail<')).toBeLessThan(bookmarks[2].index!);
  });

  it.each(['missing', 'duplicate'])('fails on %s TOC targets instead of exporting broken references', async (variant) => {
    const target = variant === 'duplicate' ? '<h1 id="target">First</h1><h2 id="target">Second</h2>' : '<h1>Untargeted heading</h1>';
    await expect(render(`<main data-page-size="a4"><section data-table-of-contents="true"><h2>Contents</h2>
      <ol><li data-toc-level="1"><a href="#target"><span>Selected section</span><span data-facet-toc-target="target">—</span></a></li></ol>
      </section>${target}</main>`)).rejects.toThrow(/TOC target/i);
  });

  it('rejects padding that leaves no usable Word column width', async () => {
    await expect(render('<main data-page-size="a4" data-margin-left="104" data-margin-right="104"><div style="padding:20px"><p>Too narrow</p></div></main>'))
      .rejects.toThrow(/content width/i);
  });
});
