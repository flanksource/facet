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
import { injectDebugAnnotations, injectTypographyAnnotations, extractTypographyInfo, type FontCombo } from './debug-annotations.js';
import { VERSION, BUILD_DATE, GIT_COMMIT } from '../version-generated.js';
import puppeteer, { type Browser, type BrowserContext, type Page, type PuppeteerLaunchOptions } from 'puppeteer-core';

type PageProvider = Browser | BrowserContext;
import { Logger } from './logger.js';
import { setPreparedContent } from './browser-readiness.js';
import { applySpawnedProcessPriority, buildLowPriorityCommand } from './subprocess-priority.js';

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

function buildDebugInfo(): import('./pdf-multipass.js').DebugVersionInfo {
  let pkgVersion = 'local';
  try {
    const resolved = require.resolve('@flanksource/facet/package.json');
    pkgVersion = JSON.parse(readFileSync(resolved, 'utf-8')).version;
  } catch {
    pkgVersion = readVersion();
  }
  return { cliVersion: VERSION, buildDate: BUILD_DATE, gitCommit: GIT_COMMIT, pkgVersion };
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

export function resolveChromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return (SYSTEM_CHROME_PATHS[process.platform] ?? []).find(existsSync);
}

export function buildBrowserLaunchOptions(options: {
  chromePath: string;
  platform?: NodeJS.Platform;
}): PuppeteerLaunchOptions {
  const chromeArgs = puppeteer.defaultArgs({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const command = buildLowPriorityCommand({
    command: options.chromePath,
    args: chromeArgs,
    platform: options.platform,
  });
  return {
    executablePath: command.command,
    ignoreDefaultArgs: true,
    args: command.args,
  };
}

async function loadAndPrepare(browser: PageProvider, html: string, widthMm?: number): Promise<Page> {
  const page = await browser.newPage();
  if (widthMm) {
    await page.setViewport({ width: mmToPx(widthMm), height: mmToPx(297) });
  }
  await setPreparedContent(page, html);
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

async function removeEmptyPages(browser: PageProvider, html: string, emptyIndices: Set<number>): Promise<string> {
  const page = await browser.newPage();
  await setPreparedContent(page, html);
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
  browser: PageProvider,
  _html: string,
  typeInfo: PageTypeInfo,
  log: Logger,
  debug?: boolean,
  outputPath?: string,
  debugTypography?: boolean,
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

  // Parse the full report once, then create a minimal document per content
  // group. Previously every group parsed and laid out the entire report before
  // deleting unrelated pages, which scaled poorly for large mixed documents.
  const sourcePage = await loadAndPrepare(browser, html);
  const groupHtml = async (indices: number[]): Promise<string> => sourcePage.evaluate((visibleIndices) => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const visible = new Set(visibleIndices);
    const pages = clone.querySelectorAll('[data-page-size]');
    const keep = new Set<Element>();
    pages.forEach((element, index) => {
      if (visible.has(index)) keep.add(element);
    });
    pages.forEach((element, index) => {
      if (!visible.has(index)) element.remove();
    });
    clone.querySelectorAll('.page-break').forEach((element) => {
      const previous = element.previousElementSibling;
      const next = element.nextElementSibling;
      if (!previous || !next || !keep.has(previous) || !keep.has(next)) element.remove();
    });
    clone.querySelectorAll('script').forEach((script) => script.remove());
    return `<!DOCTYPE html>${clone.outerHTML}`;
  }, indices);

  const results: GroupResult[] = [];
  try {
    for (const group of groups) {
      const dims = resolvePageSize(group.size);
      const margins = computeMarginsForSize(typeInfo.definitions, group.size);
      const elemMargin = typeInfo.pageMargins[group.elementIndices[0]];
      if (elemMargin) {
        margins.left = elemMargin.left;
        margins.right = elemMargin.right;
      }
      const minimalHtml = await groupHtml(group.elementIndices);
      const page = await loadAndPrepare(browser, minimalHtml, dims.width);
      try {
        if (debug || debugTypography) await injectDebugAnnotations(page);
        if (debugTypography) await injectTypographyAnnotations(page);
        const localGroup = { ...group, elementIndices: group.elementIndices.map((_, index) => index) };
        const result = await renderGroup(page, localGroup, dims, margins);
        result.group = group;
        log.info(`  Group ${group.type}/${group.size}: ${result.pageCount} pages (margins=${margins.top}/${margins.bottom}/${margins.left}/${margins.right}mm)`);
        if (debugBasePath) {
          const contentPath = `${debugBasePath}.debug-content-${group.type}-${group.size}.pdf`;
          writeFileSync(contentPath, result.buffer);
          log.info(`Debug: wrote ${contentPath}`);
        }
        results.push(result);
      } finally {
        await page.close();
      }
    }
  } finally {
    await sourcePage.close();
  }

  const { buffer, pageMap, pageSizeMap, pageMarginMap } = await assembleGroups(results, log, typeInfo);
  const composited = await compositeHeaderFooter(Buffer.from(buffer), overlays, pageMap, typeInfo, pageSizeMap, browser, html, FACET_CREATOR);
  if (debug) {
    const debugBuffer = await drawDebugOverlay(composited, pageMap, pageSizeMap, typeInfo, pageMarginMap, buildDebugInfo());
    return Buffer.from(debugBuffer);
  }
  return Buffer.from(composited);
}

async function renderLegacyElementPdf(
  browser: PageProvider,
  html: string,
  selector: string,
  heightMm: number,
  widthMm: number = 210,
): Promise<Buffer | null> {
  const { renderElementPdf } = await import('./pdf-multipass.js');
  const page = await browser.newPage();
  try {
    await setPreparedContent(page, html);
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
  browser: PageProvider,
  html: string,
  page: Page,
  log: Logger,
  debug?: boolean,
  landscape?: boolean,
  overridePageSize?: string,
  outputPath?: string,
  overrideMargins?: PDFMargins,
  debugTypography?: boolean,
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

  if (debug || debugTypography) await injectDebugAnnotations(page);
  if (debugTypography) await injectTypographyAnnotations(page);

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
      const debugBuf = await drawDebugOverlay(pdf, ['default'], [pageInfo.pageSize], noHeaderTypeInfo, undefined, buildDebugInfo());
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

  const composited = await compositeHeaderFooter(contentBuffer, overlays, pageMap, singleTypeInfo, pageSizeMap, browser, html, FACET_CREATOR);
  if (debug) {
    const debugBuf = await drawDebugOverlay(composited, pageMap, pageSizeMap, singleTypeInfo, undefined, buildDebugInfo());
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

export interface PDFMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface BufferPDFOptions {
  landscape?: boolean;
  debug?: boolean;
  debugTypography?: boolean;
  fontSize?: number;
  defaultPageSize?: string;
  margins?: PDFMargins;
  logger?: Logger;
  debugOutputPath?: string;
}

/** The single browser-backed PDF pipeline used by CLI, batch, and server APIs. */
async function renderPDF(
  browser: Browser,
  inputHtml: string,
  options: BufferPDFOptions = {},
): Promise<Buffer> {
  const log = options.logger ?? new Logger(false);
  const html = options.fontSize ? injectFontSize(inputHtml, options.fontSize) : inputHtml;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    const dims = options.defaultPageSize ? resolvePageSize(options.defaultPageSize) : undefined;
    if (dims) await page.setViewport({ width: mmToPx(dims.width), height: mmToPx(dims.height) });
    await setPreparedContent(page, html);
    if (dims) await page.addStyleTag({ content: `body { max-width: ${dims.width}mm !important; }` });

    let fontCombos: FontCombo[] | undefined;
    if (options.debugTypography) {
      fontCombos = await extractTypographyInfo(page);
      log.info(`Typography: found ${fontCombos.length} unique font combinations`);
    }

    const typeInfo = await detectPageTypes(page, options.defaultPageSize) ?? await detectMixedSizes(page);
    let result: Buffer;
    if (typeInfo != null) {
      log.info(`Multi-pass mode: ${typeInfo.definitions.size} type(s), ${typeInfo.pageSizes.length} pages`);
      await page.close();
      result = await renderMultiPass(
        context, html, typeInfo, log, options.debug,
        options.debugOutputPath, options.debugTypography,
      );
    } else {
      log.info('Single-pass mode (no typed headers/footers)');
      result = await renderSinglePass(
        context, html, page, log, options.debug, options.landscape,
        options.defaultPageSize, options.debugOutputPath, options.margins,
        options.debugTypography,
      );
    }

    if (options.debugTypography) {
      result = Buffer.from(await appendDebugFontPage(result, options.fontSize, fontCombos));
    }
    return result;
  } finally {
    if (!page.isClosed()) await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

export async function generatePDFFromHTML(options: PDFOptions): Promise<void> {
  const log = options.logger ?? new Logger(false);
  const chromePath = resolveChromePath();
  log.debug(`Using browser: ${chromePath ?? 'Puppeteer bundled Chromium'}`);
  const browser = await launchBrowser();
  try {
    const result = await renderPDF(browser, options.html, {
      landscape: options.landscape,
      debug: options.debug,
      debugTypography: options.debugTypography,
      fontSize: options.fontSize,
      defaultPageSize: options.defaultPageSize,
      margins: options.margins,
      logger: log,
      debugOutputPath: options.outputPath,
    });
    writeFileSync(options.outputPath, result);
    log.debug(`PDF saved to: ${options.outputPath}`);
  } finally {
    await browser.close();
    log.debug('Browser closed');
  }
}

export async function launchBrowser(): Promise<Browser> {
  const chromePath = resolveChromePath();
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found; set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH');
  }
  const browser = await puppeteer.launch(buildBrowserLaunchOptions({ chromePath }));
  const process = browser.process();
  if (process?.pid !== undefined) {
    applySpawnedProcessPriority({ pid: process.pid, kill: () => process.kill() });
  }
  return browser;
}

export async function generatePDFWithBrowser(
  browser: Browser,
  html: string,
  outputPath: string,
  logger?: Logger,
  debug?: boolean,
  defaultPageSize?: string,
): Promise<void> {
  const log = logger ?? new Logger(false);
  const result = await renderPDF(browser, html, {
    logger: log,
    debug,
    defaultPageSize,
    debugOutputPath: outputPath,
  });
  writeFileSync(outputPath, result);
  log.debug(`PDF saved to: ${outputPath}`);
}

export function generatePDFBuffer(
  browser: Browser,
  html: string,
  options?: BufferPDFOptions,
): Promise<Buffer> {
  return renderPDF(browser, html, options);
}
