/**
 * PDF Generation Utilities
 *
 * Uses Puppeteer to convert HTML to PDF.
 * Headers/footers are rendered as separate small PDFs and composited
 * onto content pages using pdf-lib, avoiding position:fixed bleed issues.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import { injectDebugAnnotations } from './debug-annotations.js';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Logger } from './logger.js';

function readVersion(): string {
  try {
    const dir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(dir, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}
const FACET_CREATOR = `Facet v${readVersion()}`;

async function stampPDFMetadata(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer);
  doc.setCreator(FACET_CREATOR);
  doc.setProducer(FACET_CREATOR);
  return Buffer.from(await doc.save());
}
import {
  detectPageTypes,
  detectEmptyPages,
  appendDebugFontPage,
  buildPageGroups,
  renderGroup,
  assembleGroups,
  computeMarginsForSize,
  compositeHeaderFooter,
  drawDebugOverlay,
  renderHeaderFooterPdfs,
  resolvePageSize,
  overlayKey,
  mmToPx,
  type PageTypeInfo,
  type GroupResult,
  type PageType,
  type OverlayPdfs,
} from './pdf-multipass.js';

const SYSTEM_CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
};

function resolveChromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return (SYSTEM_CHROME_PATHS[process.platform] ?? []).find(existsSync);
}

async function loadAndPrepare(browser: Browser, html: string, widthMm?: number): Promise<Page> {
  const page = await browser.newPage();
  if (widthMm) {
    await page.setViewport({ width: mmToPx(widthMm), height: mmToPx(297) });
  }
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluateHandle('document.fonts.ready');
  return page;
}

async function detectMixedSizes(page: Page): Promise<PageTypeInfo | null> {
  const raw = await page.evaluate(() => {
    const pages = document.querySelectorAll('[data-page-size]');
    const sizes: string[] = [];
    const types: string[] = [];
    const margins: {top: number; right: number; bottom: number; left: number}[] = [];
    pages.forEach(el => {
      sizes.push((el.getAttribute('data-page-size') || 'a4').toLowerCase());
      types.push(el.getAttribute('data-page-type') || 'default');
      margins.push({
        top: parseInt(el.getAttribute('data-margin-top') || '0', 10),
        right: parseInt(el.getAttribute('data-margin-right') || '0', 10),
        bottom: parseInt(el.getAttribute('data-margin-bottom') || '0', 10),
        left: parseInt(el.getAttribute('data-margin-left') || '0', 10),
      });
    });
    return { sizes, types, margins };
  });
  if (new Set(raw.sizes).size <= 1) return null;
  return {
    types: raw.types as PageType[],
    pageSizes: raw.sizes,
    pageMargins: raw.margins,
    definitions: new Map(),
  };
}

async function removeEmptyPages(browser: Browser, html: string, emptyIndices: Set<number>): Promise<string> {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((indices: number[]) => {
    const empties = new Set(indices);
    document.querySelectorAll('[data-page-size]').forEach((el, i) => {
      if (empties.has(i)) el.remove();
    });
  }, [...emptyIndices]);
  const cleaned = await page.content();
  await page.close();
  return cleaned;
}

function filterEmptyPages(info: PageTypeInfo, emptyIndices: Set<number>): PageTypeInfo {
  const types: PageType[] = [];
  const pageSizes: string[] = [];
  const pageMargins: typeof info.pageMargins = [];
  for (let i = 0; i < info.types.length; i++) {
    if (!emptyIndices.has(i)) {
      types.push(info.types[i]);
      pageSizes.push(info.pageSizes[i]);
      if (info.pageMargins[i]) pageMargins.push(info.pageMargins[i]);
    }
  }
  return { types, pageSizes, pageMargins, definitions: info.definitions, heightDetails: info.heightDetails };
}

async function renderMultiPass(
  browser: Browser,
  _html: string,
  typeInfo: PageTypeInfo,
  log: Logger,
  debug?: boolean,
  outputPath?: string,
): Promise<Buffer> {
  let html = _html;
  if (typeInfo.heightDetails) {
    for (const detail of typeInfo.heightDetails) log.debug(`  ${detail}`);
  }

  const debugBasePath = debug && outputPath ? outputPath.replace(/\.pdf$/, '') : undefined;

  const emptyCheckPage = await loadAndPrepare(browser, html);
  const emptyIndices = await detectEmptyPages(emptyCheckPage);
  await emptyCheckPage.close();

  if (emptyIndices.size > 0) {
    log.info(`Omitting ${emptyIndices.size} empty page(s): indices ${[...emptyIndices].join(', ')}`);
    typeInfo = filterEmptyPages(typeInfo, emptyIndices);
    if (typeInfo.types.length === 0) {
      log.warn('All pages are empty — skipping PDF generation');
      return Buffer.alloc(0);
    }
    html = await removeEmptyPages(browser, html, emptyIndices);
  }

  const overlays = await renderHeaderFooterPdfs(browser, html, typeInfo, typeInfo.pageSizes, debugBasePath);
  if (debugBasePath) {
    for (const key of overlays.headers.keys()) log.info(`Debug: wrote ${debugBasePath}.debug-header-${key}.html/.pdf`);
    for (const key of overlays.footers.keys()) log.info(`Debug: wrote ${debugBasePath}.debug-footer-${key}.html/.pdf`);
  }
  const groups = buildPageGroups(typeInfo);
  log.info(`Multi-pass: ${groups.length} group(s) from ${typeInfo.types.length} element(s)`);

  const results: GroupResult[] = [];
  for (const group of groups) {
    const dims = resolvePageSize(group.size);
    const margins = computeMarginsForSize(typeInfo.definitions, group.size);
    const elemMargin = typeInfo.pageMargins[group.elementIndices[0]];
    if (elemMargin) {
      margins.left = elemMargin.left;
      margins.right = elemMargin.right;
    }
    const page = await loadAndPrepare(browser, html, dims.width);
    if (debug) await injectDebugAnnotations(page);
    const result = await renderGroup(page, group, dims, margins);
    await page.close();
    log.info(`  Group ${group.type}/${group.size}: ${result.pageCount} pages (margins=${margins.top}/${margins.bottom}/${margins.left}/${margins.right}mm)`);
    if (debugBasePath) {
      const contentPath = `${debugBasePath}.debug-content-${group.type}-${group.size}.pdf`;
      writeFileSync(contentPath, result.buffer);
      log.info(`Debug: wrote ${contentPath}`);
    }
    results.push(result);
  }

  const { buffer, pageMap, pageSizeMap, pageMarginMap } = await assembleGroups(results, log, typeInfo);
  const composited = await compositeHeaderFooter(Buffer.from(buffer), overlays, pageMap, typeInfo, pageSizeMap);
  if (debug) {
    const debugBuffer = await drawDebugOverlay(composited, pageMap, pageSizeMap, typeInfo, pageMarginMap);
    return Buffer.from(debugBuffer);
  }
  return Buffer.from(composited);
}

async function renderLegacyElementPdf(
  browser: Browser,
  html: string,
  selector: string,
  heightMm: number,
  widthMm: number = 210,
): Promise<Buffer | null> {
  const { renderElementPdf } = await import('./pdf-multipass.js');
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const exists = await page.evaluate((sel: string) => !!document.querySelector(sel), selector);
    await page.close();
    if (!exists) return null;
  } catch {
    await page.close().catch(() => {});
    return null;
  }
  return renderElementPdf(browser, html, selector, heightMm, widthMm);
}

// Single-pass overlay pipeline (no typed headers, uses .datasheet-header/.datasheet-footer)
async function renderSinglePass(
  browser: Browser,
  html: string,
  page: Page,
  log: Logger,
  debug?: boolean,
  landscape?: boolean,
  overridePageSize?: string,
  outputPath?: string,
  overrideMargins?: PDFMargins,
): Promise<Buffer> {
  const emptyIndices = await detectEmptyPages(page);
  if (emptyIndices.size > 0) {
    log.info(`Omitting ${emptyIndices.size} empty page(s)`);
    await page.evaluate((indices: number[]) => {
      const empties = new Set(indices);
      const pages = document.querySelectorAll('[data-page-size]');
      pages.forEach((el, i) => { if (empties.has(i)) el.remove(); });
    }, [...emptyIndices]);
  }

  if (debug) await injectDebugAnnotations(page);

  const pageInfo = await page.evaluate((override: string | null): { top: number; bottom: number; pageSize: string } => {
    const pxToMm = 25.4 / 96;
    const pages = document.querySelectorAll('[data-page-size]');
    const header = document.querySelector('.datasheet-header');
    const footer = document.querySelector('.datasheet-footer');
    const measuredHeader = header ? Math.ceil(header.getBoundingClientRect().height * pxToMm) : 0;
    const measuredFooter = footer ? Math.ceil(footer.getBoundingClientRect().height * pxToMm) : 0;
    let maxTop = 0, maxBottom = 0;
    let pageSize = override ?? 'a4';
    pages.forEach(p => {
      const attrH = parseInt(p.getAttribute('data-header-height') || '0', 10);
      const attrF = parseInt(p.getAttribute('data-footer-height') || '0', 10);
      maxTop = Math.max(maxTop, attrH || measuredHeader);
      maxBottom = Math.max(maxBottom, attrF || measuredFooter);
      pageSize = override ?? (p.getAttribute('data-page-size') || 'a4').toLowerCase();
    });
    return { top: maxTop, bottom: maxBottom, pageSize };
  }, overridePageSize ?? null);

  const dims = resolvePageSize(pageInfo.pageSize);
  const isLandscape = landscape ?? (dims.width > dims.height);
  const pdfWidth = isLandscape ? Math.min(dims.width, dims.height) : dims.width;
  const pdfHeight = isLandscape ? Math.max(dims.width, dims.height) : dims.height;
  await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
  await page.addStyleTag({
    content: `@page { size: ${dims.width}mm ${dims.height}mm; } body { max-width: ${dims.width}mm !important; }`,
  });

  // Apply explicit margin overrides
  const marginTop = overrideMargins?.top ?? pageInfo.top;
  const marginBottom = overrideMargins?.bottom ?? pageInfo.bottom;
  const marginLeft = overrideMargins?.left ?? 0;
  const marginRight = overrideMargins?.right ?? 0;

  if (marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0) {
    const pdf = await page.pdf({
      width: `${pdfWidth}mm`,
      height: `${pdfHeight}mm`,
      landscape: isLandscape,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      omitBackground: false,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    if (debug) {
      const noHeaderTypeInfo: PageTypeInfo = {
        types: ['default'], pageSizes: [pageInfo.pageSize], pageMargins: [],
        definitions: new Map([['default', { type: 'default' as PageType, headerHeight: 0, footerHeight: 0 }]]),
      };
      const debugBuf = await drawDebugOverlay(pdf, ['default'], [pageInfo.pageSize], noHeaderTypeInfo);
      return Buffer.from(debugBuf);
    }
    return Buffer.from(pdf);
  }

  log.info(`Single-pass overlay: header=${marginTop}mm footer=${marginBottom}mm left=${marginLeft}mm right=${marginRight}mm size=${pageInfo.pageSize}`);

  const debugBasePath = debug && outputPath ? outputPath.replace(/\.pdf$/, '') : undefined;
  const key = overlayKey('default', pageInfo.pageSize);
  const overlays: OverlayPdfs = { headers: new Map(), footers: new Map() };
  if (pageInfo.top > 0) {
    const buf = await renderLegacyElementPdf(browser, html, '.datasheet-header', pageInfo.top, dims.width);
    if (buf) {
      overlays.headers.set(key, buf);
      if (debugBasePath) {
        writeFileSync(`${debugBasePath}.debug-header-${key}.pdf`, buf);
        log.info(`Debug: wrote ${debugBasePath}.debug-header-${key}.pdf`);
      }
    }
  }
  if (pageInfo.bottom > 0) {
    const buf = await renderLegacyElementPdf(browser, html, '.datasheet-footer', pageInfo.bottom, dims.width);
    if (buf) {
      overlays.footers.set(key, buf);
      if (debugBasePath) {
        writeFileSync(`${debugBasePath}.debug-footer-${key}.pdf`, buf);
        log.info(`Debug: wrote ${debugBasePath}.debug-footer-${key}.pdf`);
      }
    }
  }

  await page.evaluate(() => {
    document.querySelectorAll('.datasheet-header, .datasheet-footer, [data-header-type], [data-footer-type]').forEach(el => el.remove());
  });

  const topMm = `${marginTop}mm`;
  const bottomMm = `${marginBottom}mm`;
  const leftMm = `${marginLeft}mm`;
  const rightMm = `${marginRight}mm`;
  await page.addStyleTag({
    content: `@page { size: ${dims.width}mm ${dims.height}mm; margin-top: ${topMm} !important; margin-bottom: ${bottomMm} !important; margin-left: ${leftMm} !important; margin-right: ${rightMm} !important; }`,
  });

  const pdfBytes = await page.pdf({
    width: `${pdfWidth}mm`,
    height: `${pdfHeight}mm`,
    landscape: isLandscape,
    margin: { top: topMm, bottom: bottomMm, left: leftMm, right: rightMm },
    omitBackground: false,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });

  const contentBuffer = Buffer.from(pdfBytes);
  const doc = await PDFDocument.load(contentBuffer);
  const pageCount = doc.getPageCount();
  const pageMap: PageType[] = Array(pageCount).fill('default');
  const pageSizeMap: string[] = Array(pageCount).fill(pageInfo.pageSize);
  const singleTypeInfo: PageTypeInfo = {
    types: ['default'],
    pageSizes: [pageInfo.pageSize],
    pageMargins: [],
    definitions: new Map([['default', { type: 'default' as PageType, headerHeight: pageInfo.top, footerHeight: pageInfo.bottom }]]),
  };

  const composited = await compositeHeaderFooter(contentBuffer, overlays, pageMap, singleTypeInfo, pageSizeMap);
  if (debug) {
    const debugBuf = await drawDebugOverlay(composited, pageMap, pageSizeMap, singleTypeInfo);
    return Buffer.from(debugBuf);
  }
  return Buffer.from(composited);
}

export interface PDFOptions {
  html: string;
  outputPath: string;
  logger?: Logger;
  debug?: boolean;
  debugTypography?: boolean;
  fontSize?: number;
  defaultPageSize?: string;
  margins?: PDFMargins;
  landscape?: boolean;
}

function injectFontSize(html: string, fontSize: number): string {
  const style = `<style>body{font-size:${fontSize}pt!important}p{font-size:${fontSize}pt!important}</style>`;
  if (html.includes('</head>')) return html.replace('</head>', `${style}</head>`);
  return style + html;
}

export async function generatePDFFromHTML(options: PDFOptions): Promise<void> {
  let { html } = options;
  const { outputPath, logger, debug, debugTypography, fontSize, defaultPageSize, margins, landscape } = options;
  if (fontSize) html = injectFontSize(html, fontSize);
  const log = logger || new Logger(false);

  const chromePath = resolveChromePath();
  log.debug(`Using browser: ${chromePath ?? 'Puppeteer bundled Chromium'}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const dims = defaultPageSize ? resolvePageSize(defaultPageSize) : undefined;
    if (dims) {
      await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
    }
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (dims) {
      await page.addStyleTag({ content: `body { max-width: ${dims.width}mm !important; }` });
    }
    await page.evaluateHandle('document.fonts.ready');

    const typeInfo = await detectPageTypes(page, defaultPageSize) ?? await detectMixedSizes(page);

    let result: Buffer;
    if (typeInfo != null) {
      log.info(`Multi-pass mode: ${typeInfo.definitions.size} type(s), ${typeInfo.pageSizes.length} pages`);
      await page.close();
      result = await renderMultiPass(browser, html, typeInfo, log, debug, outputPath);
    } else {
      log.info('Single-pass mode (no typed headers/footers)');
      result = await renderSinglePass(browser, html, page, log, debug, landscape, defaultPageSize, outputPath, margins);
      await page.close();
    }

    if (debugTypography) {
      result = Buffer.from(await appendDebugFontPage(result, fontSize));
    }
    result = await stampPDFMetadata(result);
    writeFileSync(outputPath, result);
    log.debug(`PDF saved to: ${outputPath}`);
  } finally {
    await browser.close();
    log.debug('Browser closed');
  }
}

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    executablePath: resolveChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function generatePDFWithBrowser(
  browser: Browser,
  html: string,
  outputPath: string,
  logger?: Logger,
  debug?: boolean,
  defaultPageSize?: string,
): Promise<void> {
  const log = logger || new Logger(false);
  const page = await browser.newPage();

  try {
    const dims = defaultPageSize ? resolvePageSize(defaultPageSize) : undefined;
    if (dims) {
      await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
    }
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (dims) {
      await page.addStyleTag({ content: `body { max-width: ${dims.width}mm !important; }` });
    }
    await page.evaluateHandle('document.fonts.ready');

    const typeInfo = await detectPageTypes(page, defaultPageSize) ?? await detectMixedSizes(page);

    let result: Buffer;
    if (typeInfo != null) {
      log.debug(`Multi-pass mode: ${typeInfo.definitions.size} type(s) detected`);
      await page.close();
      result = await renderMultiPass(browser, html, typeInfo, log, debug, outputPath);
    } else {
      result = await renderSinglePass(browser, html, page, log, debug, undefined, defaultPageSize, outputPath);
      await page.close();
    }

    result = await stampPDFMetadata(result);
    writeFileSync(outputPath, result);
    log.debug(`PDF saved to: ${outputPath}`);
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

export interface PDFMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface BufferPDFOptions {
  landscape?: boolean;
  debug?: boolean;
  defaultPageSize?: string;
  margins?: PDFMargins;
}

export async function generatePDFBuffer(
  browser: Browser,
  html: string,
  options?: BufferPDFOptions,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dims = options?.defaultPageSize ? resolvePageSize(options.defaultPageSize) : undefined;
    if (dims) {
      await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
    }
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (dims) {
      await page.addStyleTag({ content: `body { max-width: ${dims.width}mm !important; }` });
    }
    await page.evaluateHandle('document.fonts.ready');

    const typeInfo = await detectPageTypes(page, options?.defaultPageSize) ?? await detectMixedSizes(page);

    if (typeInfo != null) {
      await page.close();
      return stampPDFMetadata(await renderMultiPass(browser, html, typeInfo, new Logger(false), options?.debug));
    }

    const result = await renderSinglePass(browser, html, page, new Logger(false), options?.debug, options?.landscape, options?.defaultPageSize, undefined, options?.margins);
    await page.close();
    return stampPDFMetadata(result);
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}
