import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { readEmfPdf } from './emf/decode.js';
import JSZip from 'jszip';
import { PDFDocument, PDFName } from 'pdf-lib';
import { launchBrowser } from '../utils/pdf-generator.js';
import { generateOfficeBuffer } from './index.js';
import sharp from 'sharp';
import { officeText } from '../../test/office-xml.js';

const DIAGRAM_WIDTH = 320;
const DIAGRAM_HEIGHT = 120;

const html = `<html><head><style>
body {margin:0;font:10pt Arial} figure {margin:0;width:480px;height:180px}
.report figure {background:#eee} .report figure span {font-family:monospace}
</style></head><body><header data-header-type="default" data-header-height="10">Header artwork</header>
<main class="report" data-page-size="a4"><h1>Architecture</h1><p><a href="https://example.com">Reference</a></p>
<figure id="architecture"><figcaption>Architecture figure</figcaption><div data-facet-diagram data-facet-ready="true">
<svg width="100" height="50"><path d="M0 0L100 50" stroke="blue"/></svg><span>Vector text</span></div></figure>
<table><tr><td><figure style="width:240px;height:100px"><figcaption>Roadmap figure</figcaption>
<div style="display:grid;grid-template-columns:1fr 1fr"><span>Plan</span><span>Deliver</span></div></figure></td></tr></table>
<div data-facet-diagram data-facet-ready="true" style="width:320px;height:120px"><span>Standalone diagram</span></div>
<p>Editable conclusion</p><svg width="20" height="20"><rect width="20" height="20" fill="green"/></svg>
</main></body></html>`;

describe('PDF diagrams in Word documents', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('embeds complete figures and standalone diagrams as PDF-in-EMF drawings alongside native text, links and images', async () => {
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html, format: 'docx' }));
    const xml = await zip.file('word/document.xml')!.async('string');
    const relationships = await zip.file('word/_rels/document.xml.rels')!.async('string');
    expect(xml.match(/<wp:inline\b/g)).toHaveLength(4);
    expect(xml).not.toContain('OLEObject');
    expect(xml).not.toContain('v:imagedata');
    expect(xml).not.toContain('position:absolute');
    expect(officeText(xml)).toBe('ArchitectureReferenceEditable conclusion');
    expect(relationships).toContain('https://example.com');
    expect(relationships).toContain('/relationships/image');
    expect(relationships.match(/\/relationships\/image/g)).toHaveLength(4);
    expect(Object.keys(zip.files).filter((path) => /word\/media\/.+\.png$/.test(path))).toHaveLength(1);
    expect(await zip.file('word/header1.xml')!.async('string')).toContain('<wp:anchor');
    const parts = Object.values(zip.files).filter((file) => /media\/facetPdf\d+\.emf$/.test(file.name));
    expect(parts).toHaveLength(4);
    for (const [index, part] of parts.slice(0, 3).entries()) {
      const pdf = await PDFDocument.load(readEmfPdf(await part.async('uint8array'))!);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo([360, 180, 240][index], 0);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo([135, 75, 90][index], 0);
      expect(pdf.getPage(0).node.Resources()?.get(PDFName.of('Font'))).toBeDefined();
    }
  });

  const diagram = `<html><body><figure><div data-facet-ready="true" style="width:${DIAGRAM_WIDTH}px;height:${DIAGRAM_HEIGHT}px"><svg width="100" height="50"><path d="M0 0L100 50" stroke="blue"/></svg></div></figure></body></html>`;
  const media = (zip: JSZip, extension: string) => Object.values(zip.files).filter((file) => new RegExp(`/media/.+\\.${extension}$`).test(file.name));

  it('keeps PowerPoint diagram captures as PNG images by default', async () => {
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html: diagram, format: 'pptx' }));
    expect(Object.keys(zip.files).some((path) => path.includes('/embeddings/'))).toBe(false);
    expect(media(zip, 'png')).toHaveLength(1);
    expect(media(zip, 'emf')).toHaveLength(0);
  });

  it('embeds PowerPoint figures as PDF-in-EMF pictures with --embed-format pdf', async () => {
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html: diagram, format: 'pptx', embedFormat: 'pdf' }));
    const [part] = media(zip, 'emf');
    expect(media(zip, 'emf')).toHaveLength(1);
    expect(media(zip, 'png')).toHaveLength(0);
    expect(await zip.file('[Content_Types].xml')!.async('string')).toContain('Extension="emf"');
    const pdf = await PDFDocument.load(readEmfPdf(await part.async('uint8array'))!);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('inserts Word figures as plain PNG pictures with --embed-format png', async () => {
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html: diagram, format: 'docx', embedFormat: 'png' }));
    expect(media(zip, 'emf')).toHaveLength(0);
    expect(media(zip, 'png')).toHaveLength(1);
  });

  it.each([1, 2, 3] as const)('captures PNG visuals at %dx the CSS size with --embed-size', async (embedSize) => {
    const zip = await JSZip.loadAsync(await generateOfficeBuffer({ browser, html: diagram, format: 'pptx', embedSize }));
    const [png] = media(zip, 'png');
    const { width, height } = await sharp(await png.async('nodebuffer')).metadata();
    expect({ width, height }).toEqual({ width: DIAGRAM_WIDTH * embedSize, height: DIAGRAM_HEIGHT * embedSize });
  });
});
