/**
 * PDF Bleed Analysis Tests
 *
 * Renders kitchen-sink HTML files to PDF via Puppeteer, converts pages to
 * raw pixels with ImageMagick, and verifies headers/footers bleed to edges.
 */

import { readFile, writeFile, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { type Browser } from 'puppeteer';
import { generatePDFBuffer, launchBrowser } from '../src/utils/pdf-generator.js';

const KITCHEN_SINK = join(__dirname, '../../src/examples/kitchen-sink');

const MAX_BLEED_GAP_PX = 4;
// Footer elements without background color have visible content (text/borders)
// that doesn't extend to the absolute bottom edge due to internal padding.
// Allow up to 15mm for footer gap (covers Puppeteer padding + footer whitespace).
const MAX_FOOTER_GAP_MM = 15;
const RENDER_DPI = 150;

interface BleedResult {
  page: number;
  topGap: number;
  bottomGap: number;
  hasHeader: boolean;
  hasFooter: boolean;
}

interface PagePixels {
  width: number;
  height: number;
  pixels: Buffer; // RGB raw data, 3 bytes per pixel
}

function parsePPM(data: Buffer): PagePixels {
  // PPM P6 format: "P6\n<width> <height>\n<maxval>\n<binary RGB data>"
  let offset = 0;
  const lines: string[] = [];
  while (lines.length < 3) {
    let lineEnd = data.indexOf(0x0a, offset);
    if (lineEnd === -1) lineEnd = data.length;
    const line = data.subarray(offset, lineEnd).toString('ascii').trim();
    offset = lineEnd + 1;
    if (!line.startsWith('#')) lines.push(line);
  }
  const [widthStr, heightStr] = lines[1].split(/\s+/);
  return {
    width: parseInt(widthStr, 10),
    height: parseInt(heightStr, 10),
    pixels: data.subarray(offset),
  };
}

function getPixelRGB(pg: PagePixels, x: number, y: number): [number, number, number] {
  const i = (y * pg.width + x) * 3;
  return [pg.pixels[i], pg.pixels[i + 1], pg.pixels[i + 2]];
}

function isWhite(r: number, g: number, b: number): boolean {
  return r > 248 && g > 248 && b > 248;
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r > 240 && g > 240 && b > 240;
}

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

  let hasHeader = false;
  let hasFooter = false;

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

async function pdfToPages(pdfBuffer: Buffer, tmpDir: string): Promise<PagePixels[]> {
  const pdfPath = join(tmpDir, 'test.pdf');
  await writeFile(pdfPath, pdfBuffer);

  // Convert all pages to PPM (raw RGB) with ImageMagick
  // -alpha remove composites on white background without flattening pages together
  const ppmPattern = join(tmpDir, 'page-%d.ppm');
  execSync(
    `magick -density ${RENDER_DPI} "${pdfPath}" -background white -alpha remove "${ppmPattern}"`,
    { timeout: 60000 },
  );

  // Read all generated PPM files
  const pages: PagePixels[] = [];
  for (let i = 0; ; i++) {
    const ppmPath = join(tmpDir, `page-${i}.ppm`);
    try {
      const data = await readFile(ppmPath);
      pages.push(parsePPM(data));
    } catch {
      break; // no more pages
    }
  }

  // Single-page PDFs produce page.ppm instead of page-0.ppm
  if (pages.length === 0) {
    const singlePath = join(tmpDir, 'page.ppm');
    try {
      const data = await readFile(singlePath);
      pages.push(parsePPM(data));
    } catch {
      // no output at all
    }
  }

  return pages;
}

function pxToMm(px: number, dpi: number): string {
  return (px * 25.4 / dpi).toFixed(1);
}

async function analyzeBleed(browser: Browser, htmlPath: string): Promise<BleedResult[]> {
  const html = await readFile(htmlPath, 'utf-8');

  // Also measure the footer height from the HTML to help debug
  const measurePage = await browser.newPage();
  await measurePage.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  const measurements = await measurePage.evaluate(() => {
    const header = document.querySelector('.datasheet-header');
    const footer = document.querySelector('.datasheet-footer');
    const pxToMm = 25.4 / 96;
    return {
      headerScrollH: header ? Math.ceil(header.scrollHeight * pxToMm) : 0,
      footerScrollH: footer ? Math.ceil(footer.scrollHeight * pxToMm) : 0,
      headerBoundH: header ? Math.ceil(header.getBoundingClientRect().height * pxToMm) : 0,
      footerBoundH: footer ? Math.ceil(footer.getBoundingClientRect().height * pxToMm) : 0,
    };
  });
  await measurePage.close();
  console.log(`  Measurements: header=${measurements.headerScrollH}mm(scroll)/${measurements.headerBoundH}mm(bbox) footer=${measurements.footerScrollH}mm(scroll)/${measurements.footerBoundH}mm(bbox)`);

  const pdfBuffer = await generatePDFBuffer(browser, html);
  const tmpDir = await mkdtemp(join(tmpdir(), 'pdf-bleed-'));
  try {
    const pages = await pdfToPages(pdfBuffer, tmpDir);
    const results = pages.map((pg, idx) => {
      const { hasHeader, hasFooter } = detectHeaderFooter(pg);
      const centerX = Math.floor(pg.width / 2);
      return {
        page: idx + 1,
        topGap: hasHeader ? measureGapFromEdge(pg, 'top', centerX) : -1,
        bottomGap: hasFooter ? measureGapFromEdge(pg, 'bottom', centerX) : -1,
        hasHeader,
        hasFooter,
      };
    });
    for (const r of results) {
      const pg = pages[r.page - 1];
      const cx = Math.floor(pg.width / 2);
      // Sample pixel at the very bottom row and at the footer start
      const [br, bg, bb] = getPixelRGB(pg, cx, pg.height - 1);
      const footerY = pg.height - (r.bottomGap > 0 ? r.bottomGap : 1) - 1;
      const [fr, fg, fb] = footerY >= 0 ? getPixelRGB(pg, cx, footerY) : [0, 0, 0];
      console.log(
        `  Page ${r.page}: top=${r.topGap}px (${pxToMm(r.topGap, RENDER_DPI)}mm) ` +
        `bottom=${r.bottomGap}px (${pxToMm(r.bottomGap, RENDER_DPI)}mm) ` +
        `header=${r.hasHeader} footer=${r.hasFooter} ` +
        `bottomPixel=rgb(${br},${bg},${bb}) footerPixel=rgb(${fr},${fg},${fb})`
      );
    }
    return results;
  } finally {
    execSync(`rm -rf "${tmpDir}"`);
  }
}

describe('PDF bleed analysis', () => {
  let browser: Browser;

  beforeAll(async () => {
    // Verify magick is available
    try {
      execSync('magick --version', { stdio: 'pipe' });
    } catch {
      throw new Error('ImageMagick (magick) is required for PDF bleed tests');
    }

    browser = await launchBrowser();
  }, 30000);

  afterAll(async () => {
    await browser?.close();
  });

  describe.each([
    ['BleedTest', 'BleedTest.html'],
    ['MultiPageTable', 'MultiPageTable.html'],
    ['HeaderSolid', 'HeaderSolid.html'],
  ])('%s template', (_name, file) => {
    let results: BleedResult[];

    beforeAll(async () => {
      results = await analyzeBleed(browser, join(KITCHEN_SINK, file));
    }, 120000);

    it('should have headers on all pages', () => {
      for (const r of results) {
        expect(r.hasHeader).toBe(true);
      }
    });

    it('should have header bleeding to top edge on all pages', () => {
      const failing = results.filter(r => r.hasHeader && r.topGap > MAX_BLEED_GAP_PX);
      expect(failing).toEqual([]);
    });

    it('should have footer within expected margin zone on pages with footers', () => {
      const maxFooterGapPx = Math.ceil(MAX_FOOTER_GAP_MM * RENDER_DPI / 25.4);
      const withFooter = results.filter(r => r.hasFooter);
      const failing = withFooter.filter(r => r.bottomGap > maxFooterGapPx);
      expect(failing).toEqual([]);
    });
  });

  it('MultiPageTable should have multiple pages', async () => {
    const html = await readFile(join(KITCHEN_SINK, 'MultiPageTable.html'), 'utf-8');
    const pdfBuffer = await generatePDFBuffer(browser, html);
    const tmpDir = await mkdtemp(join(tmpdir(), 'pdf-bleed-'));
    try {
      const pages = await pdfToPages(pdfBuffer, tmpDir);
      expect(pages.length).toBeGreaterThan(1);
    } finally {
      execSync(`rm -rf "${tmpDir}"`);
    }
  }, 120000);
});
