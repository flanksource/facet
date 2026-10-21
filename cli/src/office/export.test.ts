import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import JSZip from 'jszip';
import { launchBrowser } from '../utils/pdf-generator.js';
import { generateOfficeBuffer } from './index.js';
import { officeText } from '../../test/office-xml.js';

const report = `<!doctype html><html><head><title>Acme report</title><style>
body { font-family: Arial; font-size: 10pt; margin: 0; }
table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #888; padding: 6px; }
</style></head><body>
<div data-header-type="default" data-header-height="10"><p>Acme header</p></div>
<div data-footer-type="default" data-footer-height="10"><p>Page _PG_ of _TL_</p></div>
<div data-page-size="a4" data-page-type="default" data-margin-left="10">
<h1>Quarterly review</h1><p>Revenue <strong>increased</strong> by <em>ten percent</em>. <a href="https://example.com">Details</a></p>
<ol><li>First action</li><li>Second action</li></ol>
<table><thead><tr><th>Region</th><th>Revenue</th></tr></thead><tbody><tr><td>North</td><td>120</td></tr></tbody></table>
<svg width="80" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="40" fill="blue"/></svg>
</div></body></html>`;

describe('editable Office exports', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it.each(['docx', 'pptx'] as const)('writes native %s text, tables, links, chrome and media', async (format) => {
    const bytes = await generateOfficeBuffer({ browser, html: report, format });
    const zip = await JSZip.loadAsync(bytes);
    const xmlPath = format === 'docx' ? 'word/document.xml' : 'ppt/slides/slide1.xml';
    const xml = await zip.file(xmlPath)!.async('string');
    expect(officeText(xml)).toContain('Quarterly review');
    expect(officeText(xml)).toContain('increased');
    expect(officeText(xml)).toContain('North');
    expect(xml).toContain(format === 'docx' ? '<w:tbl>' : '<a:tbl>');
    expect(xml).not.toContain('altChunk');
    expect(Object.keys(zip.files).some((path) => /\/(media)\/.+\.png$/.test(path))).toBe(true);
    const relationships = await zip.file(format === 'docx' ? 'word/_rels/document.xml.rels' : 'ppt/slides/_rels/slide1.xml.rels')!.async('string');
    expect(relationships).toContain('https://example.com');
    const allXml = await Promise.all(Object.values(zip.files).filter((file) => file.name.endsWith('.xml')).map((file) => file.async('string')));
    if (format === 'docx') {
      expect(Object.keys(zip.files).filter((path) => /word\/embeddings\/.+\.bin$/.test(path))).toHaveLength(2);
      expect(xml).toContain('<w:b/>');
      expect(xml).toContain('<w:ilvl');
      expect(allXml.join('')).toContain('PAGE');
      expect(allXml.join('')).toContain('NUMPAGES');
    } else {
      expect(allXml.map(officeText).join('\n')).toContain('Acme header');
      expect(xml).toContain('startAt="2"');
      const paragraphs = xml.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? [];
      expect(paragraphs.every((item) => (item.match(/<a:pPr[ >]/g) ?? []).length <= 1)).toBe(true);
    }
  });

  it('continues long tables across widescreen slides without losing or duplicating rows', async () => {
    const rows = Array.from({ length: 75 }, (_, index) => `<tr><td>Item ${index.toString().padStart(3, '0')}</td><td>Value ${index}</td></tr>`).join('');
    const html = `<html><body><div data-page-size="a4"><h1>Inventory</h1><table><thead><tr><th>Item name</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html, format: 'pptx' }));
    const slides = Object.values(zip.files).filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file.name));
    expect(slides.length).toBeGreaterThan(1);
    const xml = await Promise.all(slides.map((slide) => slide.async('string')));
    expect(xml.every((slide) => officeText(slide).includes('Item name'))).toBe(true);
    for (let index = 0; index < 75; index++) expect(xml.map(officeText).join('').split(`Item ${index.toString().padStart(3, '0')}`).length - 1).toBe(1);
    expect(await zip.file('ppt/presentation.xml')!.async('string')).toContain('cx="12192000" cy="6858000"');
  });

  it('fails on interactive content instead of silently dropping it', async () => {
    await expect(generateOfficeBuffer({ browser, html: '<html><body><input value="Lost input"/></body></html>', format: 'docx' })).rejects.toThrow(/input/i);
  });

  it('preserves merged cells and mixed Word section sizes', async () => {
    const html = '<html><body><div data-page-size="a4"><table><tr><td rowspan="2">Merged row</td><td>Top</td></tr><tr><td>Bottom</td></tr><tr><td colspan="2">Merged columns</td></tr></table></div><div data-page-size="297x210"><p>Landscape section</p></div></body></html>';
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html, format: 'docx' }));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(officeText(xml)).toContain('Merged rowTopBottomMerged columnsLandscape section');
    expect(xml).toContain('w:vMerge w:val="restart"');
    expect(xml).toContain('w:gridSpan w:val="2"');
    expect(xml).toContain('w:w="16838" w:h="11906"');
  });

  it('preserves native rich text across paragraph continuation slides', async () => {
    const sentences = Array.from({ length: 100 }, (_, index) => `Sentence-${index.toString().padStart(3, '0')} has <strong>bold words</strong>.`).join(' ');
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html: `<html><body><p>${sentences}</p></body></html>`, format: 'pptx' }));
    const slides = Object.values(zip.files).filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file.name));
    expect(slides.length).toBeGreaterThan(1);
    const xml = (await Promise.all(slides.map((slide) => slide.async('string')))).join('');
    const text = officeText(`<root>${xml.replace(/<\?xml[^>]*\?>/g, '')}</root>`);
    for (let index = 0; index < 100; index++) expect(text.split(`Sentence-${index.toString().padStart(3, '0')}`).length - 1).toBe(1);
    expect(xml).toContain('b="1"');
  });

  it.each(['docx', 'pptx'] as const)('embeds paragraph-wrapped Markdown images in %s', async (format) => {
    const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="blue"/></svg>');
    const html = `<html><body><p>Before image</p><p><img alt="Quarterly chart" src="data:image/svg+xml,${svg}"/></p><p>After image</p></body></html>`;
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html, format }));
    expect(Object.keys(zip.files).filter((path) => /\/media\/.+\.png$/.test(path))).toHaveLength(1);
    const xml = await zip.file(format === 'docx' ? 'word/document.xml' : 'ppt/slides/slide1.xml')!.async('string');
    expect(officeText(xml)).toContain('Before imageAfter image');
  });
});
