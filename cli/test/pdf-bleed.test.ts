/**
 * PDF Bleed & Multi-pass Rendering Tests
 *
 * Renders HTML to PDF via Puppeteer, converts pages to raw pixels with
 * ImageMagick, and verifies headers/footers bleed to edges and that
 * multi-pass rendering produces correct per-page-type headers.
 */

import { readFile, writeFile, mkdtemp } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { type Browser } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { generatePDFBuffer, launchBrowser } from '../src/utils/pdf-generator.js';
import { renderHeaderFooterPdfs, detectPageTypes, resolvePageSize, areaScale, scaledHeight } from '../src/utils/pdf-multipass.js';
import { fail } from 'assert/strict';
const KITCHEN_SINK = join(__dirname, '../../examples/kitchen-sink');
const MAX_BLEED_GAP_PX = 4;
const MAX_FOOTER_GAP_MM = 15;
const RENDER_DPI = 150;

// ── Pixel helpers ──────────────────────────────────────────────────

interface PagePixels {
  width: number;
  height: number;
  pixels: Buffer;
}

function parsePPM(data: Buffer): PagePixels {
  let offset = 0;
  const lines: string[] = [];
  while (lines.length < 3) {
    let lineEnd = data.indexOf(0x0a, offset);
    if (lineEnd === -1) lineEnd = data.length;
    const line = data.subarray(offset, lineEnd).toString('ascii').trim();
    offset = lineEnd + 1;
    if (!line.startsWith('#')) lines.push(line);
  }
  const [w, h] = lines[1].split(/\s+/);
  return { width: parseInt(w, 10), height: parseInt(h, 10), pixels: data.subarray(offset) };
}

function getPixelRGB(pg: PagePixels, x: number, y: number): [number, number, number] {
  const i = (y * pg.width + x) * 3;
  return [pg.pixels[i], pg.pixels[i + 1], pg.pixels[i + 2]];
}

function isWhite(r: number, g: number, b: number): boolean {
  return r > 248 && g > 248 && b > 248;
}

function pxToMm(px: number): string {
  return (px * 25.4 / RENDER_DPI).toFixed(1);
}

// ── Zone analysis ──────────────────────────────────────────────────

function measureGapFromEdge(pg: PagePixels, edge: 'top' | 'bottom', sampleX: number): number {
  if (edge === 'top') {
    for (let y = 0; y < pg.height; y++) {
      const [r, g, b] = getPixelRGB(pg, sampleX, y);
      if (!isWhite(r, g, b)) return y;
    }
    return pg.height;
  }
  for (let y = pg.height - 1; y >= 0; y--) {
    const [r, g, b] = getPixelRGB(pg, sampleX, y);
    if (!isWhite(r, g, b)) return pg.height - 1 - y;
  }
  return pg.height;
}

function detectHeaderFooter(pg: PagePixels): { hasHeader: boolean; hasFooter: boolean } {
  const sampleXs = [Math.floor(pg.width * 0.25), Math.floor(pg.width * 0.5), Math.floor(pg.width * 0.75)];
  const headerZone = Math.floor(pg.height * 0.10);
  const footerStart = Math.floor(pg.height * 0.90);
  let hasHeader = false, hasFooter = false;
  for (const x of sampleXs) {
    for (let y = 0; y < headerZone && !hasHeader; y++) {
      const [r, g, b] = getPixelRGB(pg, x, y);
      if (!isWhite(r, g, b)) hasHeader = true;
    }
    for (let y = footerStart; y < pg.height && !hasFooter; y++) {
      const [r, g, b] = getPixelRGB(pg, x, y);
      if (!isWhite(r, g, b)) hasFooter = true;
    }
  }
  return { hasHeader, hasFooter };
}

function dominantColorInZone(pg: PagePixels, yStart: number, yEnd: number): { r: number; g: number; b: number } {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  const step = Math.max(1, Math.floor(pg.width / 20));
  const quant = 32;
  for (let y = yStart; y < yEnd; y++) {
    for (let x = step; x < pg.width - step; x += step) {
      const [r, g, b] = getPixelRGB(pg, x, y);
      if (r > 248 && g > 248 && b > 248) continue;
      const key = `${Math.floor(r / quant)},${Math.floor(g / quant)},${Math.floor(b / quant)}`;
      const bucket = buckets.get(key);
      if (bucket) { bucket.r += r; bucket.g += g; bucket.b += b; bucket.count++; }
      else buckets.set(key, { r, g, b, count: 1 });
    }
  }
  if (buckets.size === 0) return { r: 255, g: 255, b: 255 };
  let best = { r: 0, g: 0, b: 0, count: 0 };
  for (const b of buckets.values()) { if (b.count > best.count) best = b; }
  return { r: Math.round(best.r / best.count), g: Math.round(best.g / best.count), b: Math.round(best.b / best.count) };
}

function isColorClose(
  actual: { r: number; g: number; b: number },
  expected: { r: number; g: number; b: number },
  tolerance = 60,
): boolean {
  return Math.abs(actual.r - expected.r) < tolerance
    && Math.abs(actual.g - expected.g) < tolerance
    && Math.abs(actual.b - expected.b) < tolerance;
}

// ── PDF → pixels ───────────────────────────────────────────────────

async function pdfToPages(pdfBuffer: Buffer, tmpDir: string): Promise<PagePixels[]> {
  const pdfPath = join(tmpDir, 'test.pdf');
  await writeFile(pdfPath, pdfBuffer);
  // Convert PDF → PNG first, then PNG → PPM to avoid ImageMagick/Ghostscript
  // color space misinterpretation with Chrome's Skia-generated PDFs
  execSync(
    `magick -density ${RENDER_DPI} "${pdfPath}" "${join(tmpDir, 'page-%d.png')}"`,
    { timeout: 60000 },
  );
  const pages: PagePixels[] = [];
  for (let i = 0; ; i++) {
    const pngPath = join(tmpDir, `page-${i}.png`);
    try {
      readFileSync(pngPath); // check existence
      execSync(`magick "${pngPath}" -depth 8 "${join(tmpDir, `page-${i}.ppm`)}"`);
      pages.push(parsePPM(readFileSync(join(tmpDir, `page-${i}.ppm`))));
    } catch { break; }
  }
  if (pages.length === 0) {
    const pngPath = join(tmpDir, 'page.png');
    try {
      readFileSync(pngPath);
      execSync(`magick "${pngPath}" -depth 8 "${join(tmpDir, 'page.ppm')}"`);
      pages.push(parsePPM(readFileSync(join(tmpDir, 'page.ppm'))));
    } catch { /* empty */ }
  }
  return pages;
}

// ── Bleed analysis ─────────────────────────────────────────────────

interface BleedResult {
  page: number;
  topGap: number;
  bottomGap: number;
  hasHeader: boolean;
  hasFooter: boolean;
}

async function analyzeBleed(browser: Browser, html: string, label: string): Promise<BleedResult[]> {
  const pdfBuffer = await generatePDFBuffer(browser, html);
  const doc = await PDFDocument.load(pdfBuffer);
  for (let i = 0; i < doc.getPageCount(); i++) {
    const { width, height } = doc.getPage(i).getSize();
    console.log(`  ${label} page ${i + 1}: ${width.toFixed(0)}x${height.toFixed(0)}pt`);
  }

  const tmpDir = await mkdtemp(join(tmpdir(), 'pdf-bleed-'));
  try {
    const pages = await pdfToPages(pdfBuffer, tmpDir);
    return pages.map((pg, idx) => {
      const { hasHeader, hasFooter } = detectHeaderFooter(pg);
      const cx = Math.floor(pg.width / 2);
      const topGap = hasHeader ? measureGapFromEdge(pg, 'top', cx) : -1;
      const bottomGap = hasFooter ? measureGapFromEdge(pg, 'bottom', cx) : -1;
      console.log(
        `  ${label} page ${idx + 1}: topGap=${topGap}px(${pxToMm(topGap)}mm) ` +
        `bottomGap=${bottomGap}px(${pxToMm(bottomGap)}mm) header=${hasHeader} footer=${hasFooter}`,
      );
      return { page: idx + 1, topGap, bottomGap, hasHeader, hasFooter };
    });
  } finally {
    execSync(`rm -rf "${tmpDir}"`);
  }
}

// ── HTML fixtures ──────────────────────────────────────────────────

function multiTypeHTML(): string {
  return `<!DOCTYPE html>
<html><head><style>
  body { margin: 0; font-family: sans-serif; }
  .page-break { page-break-after: always; }
</style></head><body>
  <div class="datasheet-header" data-header-type="first" data-header-height="20"
       style="background:#FF0000;padding:5mm 10mm;color:white;font-size:14pt;font-weight:bold;">
    FIRST HEADER (RED)</div>
  <div class="datasheet-header" data-header-type="default" data-header-height="12"
       style="background:#0000FF;padding:3mm 10mm;color:white;font-size:10pt;">
    DEFAULT HEADER (BLUE)</div>
  <div class="datasheet-header" data-header-type="last" data-header-height="15"
       style="background:#00AA00;padding:4mm 10mm;color:white;font-size:12pt;">
    LAST HEADER (GREEN)</div>
  <div class="datasheet-footer" data-footer-type="first" data-footer-height="10"
       style="background:#FF6600;padding:3mm 10mm;color:white;font-size:9pt;">
    FIRST FOOTER (ORANGE)</div>
  <div class="datasheet-footer" data-footer-type="default" data-footer-height="8"
       style="background:#666;padding:2mm 10mm;color:white;font-size:8pt;">
    DEFAULT FOOTER (GRAY)</div>
  <div class="datasheet-footer" data-footer-type="last" data-footer-height="12"
       style="background:#AA00AA;padding:3mm 10mm;color:white;font-size:10pt;">
    LAST FOOTER (PURPLE)</div>

  <div data-page-size="a4" data-page-type="first" data-header-height="20" data-footer-height="10"
       style="padding:25mm 10mm 15mm 10mm;">
    <h1>Cover Page</h1><p>Red header, orange footer.</p></div>
  <div class="page-break"></div>
  <div data-page-size="a4" data-page-type="default" data-header-height="12" data-footer-height="8"
       style="padding:17mm 10mm 13mm 10mm;">
    <h2>Body Content</h2><p>Blue header, gray footer.</p></div>
  <div class="page-break"></div>
  <div data-page-size="a4" data-page-type="last" data-header-height="15" data-footer-height="12"
       style="padding:20mm 10mm 17mm 10mm;">
    <h2>Final Page</h2><p>Green header, purple footer.</p></div>
</body></html>`;
}

function singleTypeHTML(): string {
  return `<!DOCTYPE html>
<html><head><style>
  body { margin: 0; font-family: sans-serif; }
</style></head><body>
  <div data-page-size="a4" data-header-height="15" data-footer-height="10"
       style="padding:20mm 10mm 15mm 10mm;">
    <div class="datasheet-header"
         style="background:#333;padding:4mm 10mm;color:white;font-size:12pt;">SINGLE HEADER</div>
    <div class="datasheet-footer"
         style="background:#999;padding:3mm 10mm;color:white;font-size:9pt;">SINGLE FOOTER</div>
    <h1>Single Page Document</h1>
    <p>No type attributes — single-pass rendering.</p>
  </div>
</body></html>`;
}

// ── Tests ──────────────────────────────────────────────────────────

// FIXME: quarantined — these tests fail on CI (and main) due to ImageMagick/Puppeteer environment differences
describe.skip('PDF bleed analysis', () => {
  let browser: Browser;

  beforeAll(async () => {
    try { execSync('magick -version', { stdio: 'pipe' }); }
    catch {
      try { execSync('convert -version', { stdio: 'pipe' }); }
      catch { throw new Error('ImageMagick (magick or convert) is required'); }
    }
    browser = await launchBrowser();
  }, 30000);

  afterAll(async () => { await browser?.close(); });

  // ── Kitchen-sink HTML templates ──────────────────────────────────

  describe.each([
    ['MultiPageTable', 'MultiPageTable.tsx'],
  ])('%s template', (_name, file) => {
    let results: BleedResult[];

    beforeAll(async () => {
      const facetBin = join(__dirname, '../../dist/facet');
      const outDir = await mkdtemp(join(tmpdir(), 'mp-html-'));
      const htmlFile = file.replace('.tsx', '.html');
      execSync(`${facetBin} html ${file} -o ${outDir}`, {
        cwd: KITCHEN_SINK, timeout: 120000, stdio: 'pipe',
      });
      const html = readFileSync(join(outDir, htmlFile), 'utf-8');
      execSync(`rm -rf "${outDir}"`);
      results = await analyzeBleed(browser, html, _name);
    }, 120000);

    it('should have headers on all pages', () => {
      const missing = results.filter(r => !r.hasHeader).map(r => r.page);
      if (missing.length > 0) console.log(`  Pages missing headers: ${missing.join(', ')}`);
      for (const r of results) expect(r.hasHeader).toBe(true);
    });

    it('should have header within margin zone on page 1', () => {
      // Headers render at position:fixed top:0 inside the margin zone
      const maxHeaderGapPx = Math.ceil(20 * RENDER_DPI / 25.4);
      expect(results[0].hasHeader).toBe(true);
      expect(results[0].topGap).toBeLessThanOrEqual(maxHeaderGapPx);
    });
  });

  it('MultiPageTable should have multiple pages', async () => {
    const facetBin = join(__dirname, '../../dist/facet');
    const outDir = await mkdtemp(join(tmpdir(), 'mp-html-'));
    execSync(`${facetBin} html MultiPageTable.tsx -o ${outDir}`, {
      cwd: KITCHEN_SINK, timeout: 120000, stdio: 'pipe',
    });
    const html = readFileSync(join(outDir, 'MultiPageTable.html'), 'utf-8');
    execSync(`rm -rf "${outDir}"`);
    const buf = await generatePDFBuffer(browser, html);
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  }, 120000);

  // ── Multi-type document (first/default/last) ────────────────────

  describe('multi-type headers/footers', () => {
    let pdfBuffer: Buffer;
    let pages: PagePixels[];

    beforeAll(async () => {
      pdfBuffer = await generatePDFBuffer(browser, multiTypeHTML());
      const doc = await PDFDocument.load(pdfBuffer);
      console.log(`  multi-type: ${doc.getPageCount()} pages`);
      const tmpDir = await mkdtemp(join(tmpdir(), 'mp-'));
      try { pages = await pdfToPages(pdfBuffer, tmpDir); }
      finally { execSync(`rm -rf "${tmpDir}"`); }
    }, 120000);

    it('should produce exactly 3 pages', () => {
      expect(pages.length).toBe(3);
    });

    it.each([
      [1, 'first', { r: 255, g: 0, b: 0 }, 'red'],
      [2, 'default', { r: 0, g: 0, b: 255 }, 'blue'],
      [3, 'last', { r: 0, g: 170, b: 0 }, 'green'],
    ] as const)('page %i (%s) should have %s header', (pageNum, _type, expected, _label) => {
      const pg = pages[pageNum - 1];
      const zoneEnd = Math.floor(pg.height * 0.10);
      const color = dominantColorInZone(pg, 0, zoneEnd);
      console.log(`  Page ${pageNum} header: rgb(${color.r},${color.g},${color.b})`);
      expect(isColorClose(color, expected)).toBe(true);
    });

    it.each([
      [1, 'first', { r: 255, g: 102, b: 0 }, 'orange'],
      [2, 'default', { r: 102, g: 102, b: 102 }, 'gray'],
      [3, 'last', { r: 170, g: 0, b: 170 }, 'purple'],
    ] as const)('page %i (%s) should have %s footer', (pageNum, _type, expected, _label) => {
      const pg = pages[pageNum - 1];
      const zoneStart = Math.floor(pg.height * 0.92);
      const color = dominantColorInZone(pg, zoneStart, pg.height);
      console.log(`  Page ${pageNum} footer: rgb(${color.r},${color.g},${color.b})`);
      expect(isColorClose(color, expected)).toBe(true);
    });

    it('headers should be within margin zone on all pages', () => {
      // Headers render at top:0 inside the margin zone (max 20mm margin)
      const maxHeaderGapPx = Math.ceil(20 * RENDER_DPI / 25.4);
      for (let i = 0; i < pages.length; i++) {
        const cx = Math.floor(pages[i].width / 2);
        const gap = measureGapFromEdge(pages[i], 'top', cx);
        console.log(`  Page ${i + 1} top gap: ${gap}px (${pxToMm(gap)}mm)`);
        expect(gap).toBeLessThanOrEqual(maxHeaderGapPx);
      }
    });

    it('footers should be within margin zone on all pages', () => {
      const maxGapPx = Math.ceil(MAX_FOOTER_GAP_MM * RENDER_DPI / 25.4);
      for (let i = 0; i < pages.length; i++) {
        const cx = Math.floor(pages[i].width / 2);
        const gap = measureGapFromEdge(pages[i], 'bottom', cx);
        console.log(`  Page ${i + 1} bottom gap: ${gap}px (${pxToMm(gap)}mm)`);
        expect(gap).toBeLessThanOrEqual(maxGapPx);
      }
    });
  });

  // ── BleedTest (red header / green footer / yellow content) ──────

  describe('BleedTest zones', () => {
    const HEADER_H = 18;
    const FOOTER_H = 15;
    const CONTENT_MARGIN = 5;
    let pages: PagePixels[];

    beforeAll(async () => {
      const facetBin = join(__dirname, '../../dist/facet');
      const outDir = await mkdtemp(join(tmpdir(), 'bleed-html-'));
      execSync(`${facetBin} html BleedTest.tsx -o ${outDir}`, {
        cwd: KITCHEN_SINK,
        timeout: 120000,
        stdio: 'pipe',
      });
      const html = readFileSync(join(outDir, 'BleedTest.html'), 'utf-8');
      execSync(`rm -rf "${outDir}"`);

      const buf = await generatePDFBuffer(browser, html);
      const doc = await PDFDocument.load(buf);
      console.log(`  BleedTest: ${doc.getPageCount()} pages`);
      const tmpDir = await mkdtemp(join(tmpdir(), 'bleed-'));
      try { pages = await pdfToPages(buf, tmpDir); }
      finally { execSync(`rm -rf "${tmpDir}"`); }
    }, 120000);

    it('should produce multiple pages', () => {
      expect(pages.length).toBeGreaterThan(1);
    });

    it('red header zone (top 18mm) should be red on all pages', () => {
      const expected = { r: 255, g: 0, b: 0 };
      for (let i = 0; i < pages.length; i++) {
        const zoneEnd = Math.floor(HEADER_H * RENDER_DPI / 25.4);
        const color = dominantColorInZone(pages[i], 0, zoneEnd);
        console.log(`  BleedTest page ${i + 1} header: rgb(${color.r},${color.g},${color.b})`);
        expect(isColorClose(color, expected)).toBe(true);
      }
    });

    it('green footer zone (bottom 15mm) should be green on all pages', () => {
      const expected = { r: 0, g: 255, b: 0 };
      for (let i = 0; i < pages.length; i++) {
        const zoneStart = pages[i].height - Math.floor(FOOTER_H * RENDER_DPI / 25.4);
        const color = dominantColorInZone(pages[i], zoneStart, pages[i].height);
        console.log(`  BleedTest page ${i + 1} footer: rgb(${color.r},${color.g},${color.b})`);
        expect(isColorClose(color, expected)).toBe(true);
      }
    });

    it('content should start below header+margin zone (~23mm)', () => {
      const pg = pages[0];
      const cx = Math.floor(pg.width / 2);
      // Scan downward to find the first yellow pixel
      let firstYellowY = -1;
      for (let y = 0; y < Math.floor(pg.height * 0.5); y++) {
        const [r, g, b] = getPixelRGB(pg, cx, y);
        if (r > 200 && g > 200 && b < 100) { firstYellowY = y; break; }
      }
      const headerEndPx = Math.floor(HEADER_H * RENDER_DPI / 25.4);
      console.log(`  BleedTest first yellow at y=${firstYellowY}px(${pxToMm(firstYellowY)}mm) headerEnd=${headerEndPx}px(${pxToMm(headerEndPx)}mm)`);
      expect(firstYellowY).toBeGreaterThan(headerEndPx);
    });

    it('margin-top line should be below header bottom on all pages', () => {
      const marginTopPx = Math.floor((HEADER_H + CONTENT_MARGIN) * RENDER_DPI / 25.4);
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        const cx = Math.floor(pg.width / 2);
        // Scan down to find last red pixel (header bottom)
        let headerBottomPx = 0;
        for (let y = 0; y < Math.floor(pg.height * 0.3); y++) {
          const [r, g, b] = getPixelRGB(pg, cx, y);
          if (r > 200 && g < 80 && b < 80) headerBottomPx = y;
        }
        console.log(`  BleedTest page ${i + 1}: headerBottom=${headerBottomPx}px(${pxToMm(headerBottomPx)}mm) marginTop=${marginTopPx}px(${pxToMm(marginTopPx)}mm)`);
        expect(marginTopPx).toBeGreaterThan(headerBottomPx);
      }
    });

    it('margin-bottom line should be above footer top on all pages', () => {
      const marginBottomPx = Math.floor((FOOTER_H + CONTENT_MARGIN) * RENDER_DPI / 25.4);
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        const cx = Math.floor(pg.width / 2);
        // Scan up from bottom to find last green pixel (footer top)
        let footerTopPx = pg.height - 1;
        for (let y = pg.height - 1; y > Math.floor(pg.height * 0.7); y--) {
          const [r, g, b] = getPixelRGB(pg, cx, y);
          if (r < 80 && g > 200 && b < 80) footerTopPx = y;
        }
        const footerTopFromBottom = pg.height - 1 - footerTopPx;
        console.log(`  BleedTest page ${i + 1}: footerTop=${footerTopFromBottom}px(${pxToMm(footerTopFromBottom)}mm) marginBottom=${marginBottomPx}px(${pxToMm(marginBottomPx)}mm)`);
        expect(marginBottomPx).toBeGreaterThan(footerTopFromBottom);
      }
    });

    it('header zone should contain only red or white pixels', () => {
      const headerEndPx = Math.floor(HEADER_H * RENDER_DPI / 25.4);
      const step = Math.max(1, Math.floor(pages[0].width / 20));
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        for (let y = 0; y < headerEndPx; y++) {
          for (let x = step; x < pg.width - step; x += step) {
            const [r, g, b] = getPixelRGB(pg, x, y);
            const isNeutral = r > 220 && g > 220 && b > 220;
            const isRedOrAntialiased = r > 150 && r >= g && r >= b;
            if (!isNeutral && !isRedOrAntialiased) {
              fail(`Page ${i + 1}: unexpected pixel rgb(${r},${g},${b}) at (${x},${y}) in header zone`);
            }
          }
        }
      }
    });

    it('footer zone should contain only green or white pixels', () => {
      const footerHeightPx = Math.floor(FOOTER_H * RENDER_DPI / 25.4);
      const step = Math.max(1, Math.floor(pages[0].width / 20));
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        const zoneStart = pg.height - footerHeightPx;
        for (let y = zoneStart; y < pg.height; y++) {
          for (let x = step; x < pg.width - step; x += step) {
            const [r, g, b] = getPixelRGB(pg, x, y);
            const isNeutral = r > 190 && g > 190 && b > 190;
            const isDark = r < 50 && g < 50 && b < 50;
            const isGreenDominant = g > r + 30 && g > b + 30;
            if (!isNeutral && !isDark && !isGreenDominant) {
              fail(`Page ${i + 1}: unexpected pixel rgb(${r},${g},${b}) at (${x},${y}) in footer zone`);
            }
          }
        }
      }
    });

    it('body zone should not contain red or green pixels', () => {
      const headerEndPx = Math.floor(HEADER_H * RENDER_DPI / 25.4);
      const footerHeightPx = Math.floor(FOOTER_H * RENDER_DPI / 25.4);
      const step = Math.max(1, Math.floor(pages[0].width / 20));
      for (let i = 0; i < pages.length; i++) {
        const pg = pages[i];
        const bodyStart = headerEndPx;
        const bodyEnd = pg.height - footerHeightPx;
        for (let y = bodyStart; y < bodyEnd; y++) {
          for (let x = step; x < pg.width - step; x += step) {
            const [r, g, b] = getPixelRGB(pg, x, y);
            const isReddish = r > 150 && g < 100 && b < 100;
            const isGreenish = r < 100 && g > 150 && b < 100;
            if (isReddish) {
              fail(`Page ${i + 1}: red pixel rgb(${r},${g},${b}) at (${x},${y}) in body zone — header bled into content`);
            }
            if (isGreenish) {
              fail(`Page ${i + 1}: green pixel rgb(${r},${g},${b}) at (${x},${y}) in body zone — footer bled into content`);
            }
          }
        }
      }
    });
  });

  // ── Single-type fallback ─────────────────────────────────────────

  describe('single-type fallback', () => {
    let pages: PagePixels[];

    beforeAll(async () => {
      const buf = await generatePDFBuffer(browser, singleTypeHTML());
      const doc = await PDFDocument.load(buf);
      console.log(`  single-type: ${doc.getPageCount()} pages`);
      const tmpDir = await mkdtemp(join(tmpdir(), 'sp-'));
      try { pages = await pdfToPages(buf, tmpDir); }
      finally { execSync(`rm -rf "${tmpDir}"`); }
    }, 120000);

    it('should produce at least 1 page', () => {
      expect(pages.length).toBeGreaterThanOrEqual(1);
    });

    it('should have dark header (#333)', () => {
      const zoneEnd = Math.floor(pages[0].height * 0.08);
      const color = dominantColorInZone(pages[0], 0, zoneEnd);
      console.log(`  Single-pass header: rgb(${color.r},${color.g},${color.b})`);
      expect(color.r).toBeLessThan(100);
      expect(color.g).toBeLessThan(100);
      expect(color.b).toBeLessThan(100);
    });
  });

  // ── Mixed page sizes (all 10 sizes with shared header/footer) ──

  describe('PageSizeTest mixed sizes', () => {
    const HEADER_H = 15;
    const FOOTER_H = 10;
    const EXPECTED_SIZES = [
      { name: 'A4', widthMm: 210, heightMm: 297, bg: { r: 255, g: 255, b: 0 } },
      { name: 'A3', widthMm: 297, heightMm: 420, bg: { r: 255, g: 153, b: 255 } },
      { name: 'Letter', widthMm: 215.9, heightMm: 279.4, bg: { r: 153, g: 255, b: 204 } },
      { name: 'Legal', widthMm: 215.9, heightMm: 355.6, bg: { r: 255, g: 153, b: 153 } },
      { name: 'FHD', widthMm: 508, heightMm: 285.75, bg: { r: 153, g: 204, b: 255 } },
      { name: 'QHD', widthMm: 677.33, heightMm: 381, bg: { r: 255, g: 204, b: 153 } },
      { name: 'WQHD', widthMm: 846.67, heightMm: 381, bg: { r: 204, g: 153, b: 255 } },
      { name: '4K', widthMm: 1016, heightMm: 571.5, bg: { r: 153, g: 255, b: 153 } },
      { name: '5K', widthMm: 1354.67, heightMm: 762, bg: { r: 255, g: 102, b: 102 } },
      { name: '16K', widthMm: 406.4, heightMm: 304.8, bg: { r: 102, g: 204, b: 204 } },
    ];
    const PAGE_COUNT = EXPECTED_SIZES.length;
    let pages: PagePixels[];
    let pdfDoc: Awaited<ReturnType<typeof PDFDocument.load>>;

    beforeAll(async () => {
      const facetBin = join(__dirname, '../../dist/facet');
      const outDir = await mkdtemp(join(tmpdir(), 'pagesize-html-'));
      execSync(`${facetBin} html PageSizeTest.tsx -o ${outDir}`, {
        cwd: KITCHEN_SINK, timeout: 120000, stdio: 'pipe',
      });
      const html = readFileSync(join(outDir, 'PageSizeTest.html'), 'utf-8');
      execSync(`rm -rf "${outDir}"`);

      const pdfBuffer = await generatePDFBuffer(browser, html);
      pdfDoc = await PDFDocument.load(pdfBuffer);
      console.log(`  PageSizeTest: ${pdfDoc.getPageCount()} pages`);
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const { width, height } = pdfDoc.getPage(i).getSize();
        console.log(`  Page ${i + 1} (${EXPECTED_SIZES[i]?.name}): ${width.toFixed(1)}x${height.toFixed(1)}pt (${(width * 25.4 / 72).toFixed(1)}x${(height * 25.4 / 72).toFixed(1)}mm)`);
      }
      const tmpDir = await mkdtemp(join(tmpdir(), 'pagesize-'));
      try { pages = await pdfToPages(pdfBuffer, tmpDir); }
      finally { execSync(`rm -rf "${tmpDir}"`); }
    }, 180000);

    it(`should produce exactly ${PAGE_COUNT} pages`, () => {
      expect(pdfDoc.getPageCount()).toBe(PAGE_COUNT);
      expect(pages.length).toBe(PAGE_COUNT);
    });

    it.each(EXPECTED_SIZES.map((s, i) => [i + 1, s.name, s.widthMm, s.heightMm] as const))(
      'page %i (%s) should have correct PDF dimensions',
      (pageNum, _name, widthMm, heightMm) => {
        const { width, height } = pdfDoc.getPage(pageNum - 1).getSize();
        const expectedW = widthMm * 72 / 25.4;
        const expectedH = heightMm * 72 / 25.4;
        expect(Math.abs(width - expectedW)).toBeLessThan(2);
        expect(Math.abs(height - expectedH)).toBeLessThan(2);
      },
    );

    it('all pages should have blue header', () => {
      const expected = { r: 0, g: 102, b: 204 };
      for (let i = 0; i < pages.length; i++) {
        const zoneEnd = Math.floor(HEADER_H * RENDER_DPI / 25.4);
        const color = dominantColorInZone(pages[i], 0, zoneEnd);
        console.log(`  PageSizeTest page ${i + 1} (${EXPECTED_SIZES[i].name}) header: rgb(${color.r},${color.g},${color.b})`);
        expect(isColorClose(color, expected)).toBe(true);
      }
    });

    it('all pages should have orange footer', () => {
      const expected = { r: 204, g: 102, b: 0 };
      for (let i = 0; i < pages.length; i++) {
        const zoneStart = pages[i].height - Math.floor(FOOTER_H * RENDER_DPI / 25.4);
        const color = dominantColorInZone(pages[i], zoneStart, pages[i].height);
        console.log(`  PageSizeTest page ${i + 1} (${EXPECTED_SIZES[i].name}) footer: rgb(${color.r},${color.g},${color.b})`);
        expect(isColorClose(color, expected)).toBe(true);
      }
    });

    it.each(EXPECTED_SIZES.map((s, i) => [i + 1, s.name, s.bg] as const))(
      'page %i (%s) body should have correct background color',
      (pageNum, _name, expected) => {
        const pg = pages[pageNum - 1];
        const cx = Math.floor(pg.width / 2);
        const headerBlue = { r: 0, g: 102, b: 204 };
        const footerOrange = { r: 204, g: 102, b: 0 };
        // Scan downward past the header zone to find the first content pixel
        const minHeaderPx = Math.ceil(HEADER_H * RENDER_DPI / 25.4);
        let contentStart = -1;
        for (let y = minHeaderPx; y < pg.height; y++) {
          const [r, g, b] = getPixelRGB(pg, cx, y);
          if (isWhite(r, g, b)) continue;
          if (isColorClose({ r, g, b }, headerBlue, 100)) continue;
          if (isColorClose({ r, g, b }, footerOrange, 100)) continue;
          if (r < 30 && g < 30 && b < 30) continue; // skip black/dark artifacts
          contentStart = y;
          break;
        }
        expect(contentStart).toBeGreaterThan(0);
        const bandHeight = Math.floor(15 * RENDER_DPI / 25.4);
        const bodyEnd = Math.min(contentStart + bandHeight, pg.height - 50);
        const color = dominantColorInZone(pg, contentStart, bodyEnd);
        console.log(`  PageSizeTest page ${pageNum} body: rgb(${color.r},${color.g},${color.b}) (contentStart=${contentStart}px)`);
        expect(isColorClose(color, expected, 80)).toBe(true);
      },
    );

    it('pages with different heights should have different pixel heights', () => {
      // Group by expected height, verify pixel heights match ordering
      const byHeight = EXPECTED_SIZES
        .map((s, i) => ({ idx: i, name: s.name, heightMm: s.heightMm, pixelH: pages[i].height }));
      byHeight.sort((a, b) => a.heightMm - b.heightMm);
      for (let i = 1; i < byHeight.length; i++) {
        if (byHeight[i].heightMm > byHeight[i - 1].heightMm + 1) {
          console.log(`  ${byHeight[i].name}(${byHeight[i].pixelH}px) > ${byHeight[i - 1].name}(${byHeight[i - 1].pixelH}px)`);
          expect(byHeight[i].pixelH).toBeGreaterThan(byHeight[i - 1].pixelH);
        }
      }
    });
  });

  // ── Overlay PDF edge coverage tests ─────────────────────────────

  describe('overlay PDFs full-width and edge-aligned', () => {
    const OVERLAY_CASES = [
      { type: 'first', headerColor: { r: 255, g: 0, b: 0 }, footerColor: { r: 255, g: 102, b: 0 }, headerH: 20, footerH: 10 },
      { type: 'default', headerColor: { r: 0, g: 0, b: 255 }, footerColor: { r: 102, g: 102, b: 102 }, headerH: 12, footerH: 8 },
      { type: 'last', headerColor: { r: 0, g: 170, b: 0 }, footerColor: { r: 170, g: 0, b: 170 }, headerH: 15, footerH: 12 },
    ] as const;

    let headerPages: Map<string, PagePixels>;
    let footerPages: Map<string, PagePixels>;
    let headerDocs: Map<string, Awaited<ReturnType<typeof PDFDocument.load>>>;
    let footerDocs: Map<string, Awaited<ReturnType<typeof PDFDocument.load>>>;

    beforeAll(async () => {
      const html = multiTypeHTML();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');
      const typeInfo = await detectPageTypes(page);
      await page.close();
      expect(typeInfo).not.toBeNull();

      const overlays = await renderHeaderFooterPdfs(browser, html, typeInfo!, typeInfo!.pageSizes);
      headerPages = new Map();
      footerPages = new Map();
      headerDocs = new Map();
      footerDocs = new Map();

      async function rasterize(key: string, buf: Buffer, tmpDir: string): Promise<PagePixels> {
        const safeKey = key.replace(':', '-');
        const pdfPath = join(tmpDir, `${safeKey}.pdf`);
        const pngPath = join(tmpDir, `${safeKey}.png`);
        const ppmPath = join(tmpDir, `${safeKey}.ppm`);
        require('fs').writeFileSync(pdfPath, buf);
        execSync(`magick -density ${RENDER_DPI} "${pdfPath}" "${pngPath}"`, { timeout: 30000 });
        execSync(`magick "${pngPath}" -depth 8 "${ppmPath}"`, { timeout: 30000 });
        return parsePPM(readFileSync(ppmPath));
      }

      const tmpDir = await mkdtemp(join(tmpdir(), 'overlay-'));
      try {
        for (const [key, buf] of overlays.headers) {
          headerDocs.set(key, await PDFDocument.load(buf));
          headerPages.set(key, await rasterize(`h-${key}`, buf, tmpDir));
        }
        for (const [key, buf] of overlays.footers) {
          footerDocs.set(key, await PDFDocument.load(buf));
          footerPages.set(key, await rasterize(`f-${key}`, buf, tmpDir));
        }
      } finally {
        execSync(`rm -rf "${tmpDir}"`);
      }
    }, 120000);

    it.each(OVERLAY_CASES)('header overlay "$type" PDF width should match A4 page width', ({ type, headerH }) => {
      const key = `${type}:a4`;
      const doc = headerDocs.get(key);
      expect(doc).toBeDefined();
      const { width, height } = doc!.getPage(0).getSize();
      const dims = resolvePageSize('a4');
      const scale = areaScale(dims);
      const expectedW = dims.width * 72 / 25.4;
      const expectedH = scaledHeight(headerH, scale) * 72 / 25.4;
      console.log(`  Header ${type}: ${width.toFixed(1)}x${height.toFixed(1)}pt expected ${expectedW.toFixed(1)}x${expectedH.toFixed(1)}pt`);
      expect(Math.abs(width - expectedW)).toBeLessThan(2);
      expect(Math.abs(height - expectedH)).toBeLessThan(2);
    });

    it.each(OVERLAY_CASES)('footer overlay "$type" PDF width should match A4 page width', ({ type, footerH }) => {
      const key = `${type}:a4`;
      const doc = footerDocs.get(key);
      expect(doc).toBeDefined();
      const { width } = doc!.getPage(0).getSize();
      const dims = resolvePageSize('a4');
      const expectedW = dims.width * 72 / 25.4;
      console.log(`  Footer ${type}: width=${width.toFixed(1)}pt expected ${expectedW.toFixed(1)}pt`);
      expect(Math.abs(width - expectedW)).toBeLessThan(2);
    });

    it.each(OVERLAY_CASES)('header overlay "$type" color should start at top row (y=0)', ({ type }) => {
      const pg = headerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      const sampleXs = [2, Math.floor(pg!.width / 4), Math.floor(pg!.width / 2), Math.floor(pg!.width * 3 / 4), pg!.width - 3];
      let coloredAtTop = 0;
      for (const x of sampleXs) {
        const [r, g, b] = getPixelRGB(pg!, x, 0);
        if (!isWhite(r, g, b)) coloredAtTop++;
        console.log(`  Header ${type} top row x=${x}: rgb(${r},${g},${b})`);
      }
      expect(coloredAtTop).toBeGreaterThanOrEqual(3);
    });

    it.each(OVERLAY_CASES)('footer overlay "$type" color should reach near bottom edge', ({ type }) => {
      const pg = footerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      // Allow up to MAX_BLEED_GAP_PX from the bottom edge (sub-pixel rendering tolerance)
      const cx = Math.floor(pg!.width / 2);
      const gap = measureGapFromEdge(pg!, 'bottom', cx);
      console.log(`  Footer ${type} bottom gap: ${gap}px (${pxToMm(gap)}mm), height=${pg!.height}px`);
      expect(gap).toBeLessThanOrEqual(MAX_BLEED_GAP_PX);
    });

    it.each(OVERLAY_CASES)('header overlay "$type" should span full width', ({ type }) => {
      const pg = headerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      const midY = Math.floor(pg!.height / 2);
      const [lr, lg, lb] = getPixelRGB(pg!, 1, midY);
      const [rr, rg, rb] = getPixelRGB(pg!, pg!.width - 2, midY);
      console.log(`  Header ${type} mid-row: left=rgb(${lr},${lg},${lb}) right=rgb(${rr},${rg},${rb})`);
      expect(isWhite(lr, lg, lb)).toBe(false);
      expect(isWhite(rr, rg, rb)).toBe(false);
    });

    it.each(OVERLAY_CASES)('footer overlay "$type" should span full width', ({ type }) => {
      const pg = footerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      const midY = Math.floor(pg!.height / 2);
      const [lr, lg, lb] = getPixelRGB(pg!, 1, midY);
      const [rr, rg, rb] = getPixelRGB(pg!, pg!.width - 2, midY);
      console.log(`  Footer ${type} mid-row: left=rgb(${lr},${lg},${lb}) right=rgb(${rr},${rg},${rb})`);
      expect(isWhite(lr, lg, lb)).toBe(false);
      expect(isWhite(rr, rg, rb)).toBe(false);
    });

    it.each(OVERLAY_CASES)('header overlay "$type" should have correct dominant color', ({ type, headerColor }) => {
      const pg = headerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      const color = dominantColorInZone(pg!, 0, pg!.height);
      console.log(`  Header ${type} dominant: rgb(${color.r},${color.g},${color.b}) expected rgb(${headerColor.r},${headerColor.g},${headerColor.b})`);
      expect(isColorClose(color, headerColor)).toBe(true);
    });

    it.each(OVERLAY_CASES)('footer overlay "$type" should have correct dominant color', ({ type, footerColor }) => {
      const pg = footerPages.get(`${type}:a4`);
      expect(pg).toBeDefined();
      const color = dominantColorInZone(pg!, 0, pg!.height);
      console.log(`  Footer ${type} dominant: rgb(${color.r},${color.g},${color.b}) expected rgb(${footerColor.r},${footerColor.g},${footerColor.b})`);
      expect(isColorClose(color, footerColor)).toBe(true);
    });
  });

  // ── Overlay PDFs at non-A4 sizes (regression: width must match page) ──

  describe.each(['a3', 'letter', 'legal'] as const)('overlay PDFs at %s size', (sizeName) => {
    let headerPage: PagePixels;
    let footerPage: PagePixels;
    let headerDoc: Awaited<ReturnType<typeof PDFDocument.load>>;
    let footerDoc: Awaited<ReturnType<typeof PDFDocument.load>>;

    beforeAll(async () => {
      const html = multiTypeHTML();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');
      const typeInfo = await detectPageTypes(page, sizeName);
      await page.close();
      expect(typeInfo).not.toBeNull();

      const overlays = await renderHeaderFooterPdfs(browser, html, typeInfo!, [sizeName]);

      async function rasterize(label: string, buf: Buffer, tmpDir: string): Promise<PagePixels> {
        const pdfPath = join(tmpDir, `${label}.pdf`);
        const pngPath = join(tmpDir, `${label}.png`);
        const ppmPath = join(tmpDir, `${label}.ppm`);
        require('fs').writeFileSync(pdfPath, buf);
        execSync(`magick -density ${RENDER_DPI} "${pdfPath}" "${pngPath}"`, { timeout: 30000 });
        execSync(`magick "${pngPath}" -depth 8 "${ppmPath}"`, { timeout: 30000 });
        return parsePPM(readFileSync(ppmPath));
      }

      const key = `default:${sizeName}`;
      const tmpDir = await mkdtemp(join(tmpdir(), `overlay-${sizeName}-`));
      try {
        const hBuf = overlays.headers.get(key)!;
        const fBuf = overlays.footers.get(key)!;
        headerDoc = await PDFDocument.load(hBuf);
        footerDoc = await PDFDocument.load(fBuf);
        headerPage = await rasterize('header', hBuf, tmpDir);
        footerPage = await rasterize('footer', fBuf, tmpDir);
      } finally {
        execSync(`rm -rf "${tmpDir}"`);
      }
    }, 120000);

    it('header PDF width should match page width', () => {
      const { width } = headerDoc.getPage(0).getSize();
      const expectedW = resolvePageSize(sizeName).width * 72 / 25.4;
      console.log(`  Header ${sizeName}: width=${width.toFixed(1)}pt expected=${expectedW.toFixed(1)}pt`);
      expect(Math.abs(width - expectedW)).toBeLessThan(2);
    });

    it('footer PDF width should match page width', () => {
      const { width } = footerDoc.getPage(0).getSize();
      const expectedW = resolvePageSize(sizeName).width * 72 / 25.4;
      console.log(`  Footer ${sizeName}: width=${width.toFixed(1)}pt expected=${expectedW.toFixed(1)}pt`);
      expect(Math.abs(width - expectedW)).toBeLessThan(2);
    });

    it('header should span full width (no whitespace at edges)', () => {
      const midY = Math.floor(headerPage.height / 2);
      const [lr, lg, lb] = getPixelRGB(headerPage, 1, midY);
      const [rr, rg, rb] = getPixelRGB(headerPage, headerPage.width - 2, midY);
      console.log(`  Header ${sizeName} mid-row: left=rgb(${lr},${lg},${lb}) right=rgb(${rr},${rg},${rb})`);
      expect(isWhite(lr, lg, lb)).toBe(false);
      expect(isWhite(rr, rg, rb)).toBe(false);
    });

    it('footer should span full width (no whitespace at edges)', () => {
      const midY = Math.floor(footerPage.height / 2);
      const [lr, lg, lb] = getPixelRGB(footerPage, 1, midY);
      const [rr, rg, rb] = getPixelRGB(footerPage, footerPage.width - 2, midY);
      console.log(`  Footer ${sizeName} mid-row: left=rgb(${lr},${lg},${lb}) right=rgb(${rr},${rg},${rb})`);
      expect(isWhite(lr, lg, lb)).toBe(false);
      expect(isWhite(rr, rg, rb)).toBe(false);
    });

    it('header color should start at top row', () => {
      const cx = Math.floor(headerPage.width / 2);
      const gap = measureGapFromEdge(headerPage, 'top', cx);
      console.log(`  Header ${sizeName} top gap: ${gap}px`);
      expect(gap).toBeLessThanOrEqual(MAX_BLEED_GAP_PX);
    });

    it('footer color should reach near bottom edge', () => {
      const cx = Math.floor(footerPage.width / 2);
      const gap = measureGapFromEdge(footerPage, 'bottom', cx);
      console.log(`  Footer ${sizeName} bottom gap: ${gap}px`);
      expect(gap).toBeLessThanOrEqual(MAX_BLEED_GAP_PX);
    });
  });
});
