import { writeFileSync } from 'fs';
import * as zlib from 'zlib';
import { PDFDocument, PDFName, PDFRawStream, rgb, StandardFonts } from 'pdf-lib';
import type { Browser, Page } from 'puppeteer';
import type { Logger } from './logger.js';

export type PageType = 'first' | 'default' | 'last';

export type PageSize = string;

export interface PageSizeDimensions {
  width: number;
  height: number;
}

export const PAGE_SIZES: Record<string, PageSizeDimensions> = {
  a4: { width: 210, height: 297 },
  'a4-landscape': { width: 297, height: 210 },
  a3: { width: 297, height: 420 },
  'a3-landscape': { width: 420, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  'letter-landscape': { width: 279.4, height: 215.9 },
  legal: { width: 215.9, height: 355.6 },
  'legal-landscape': { width: 355.6, height: 215.9 },
  fhd: { width: 508, height: 285.75 },
  qhd: { width: 677.33, height: 381 },
  wqhd: { width: 846.67, height: 381 },
  '4k': { width: 1016, height: 571.5 },
  '5k': { width: 1354.67, height: 762 },
  '16k': { width: 406.4, height: 304.8 },
};

export function resolvePageSize(name: string): PageSizeDimensions {
  const wxh = name.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (wxh) return { width: parseFloat(wxh[1]), height: parseFloat(wxh[2]) };
  return PAGE_SIZES[name.toLowerCase()] ?? PAGE_SIZES.a4;
}

export function mmToPx(mm: number): number {
  return Math.round(mm * 96 / 25.4);
}

export interface TypeDefinition {
  type: PageType;
  headerHeight: number;
  footerHeight: number;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageTypeInfo {
  types: PageType[];
  pageSizes: string[];
  pageMargins: PageMargins[];
  definitions: Map<PageType, TypeDefinition>;
  heightDetails?: string[];
}

interface RawDetectResult {
  types: string[];
  pageSizes: string[];
  pageMargins: PageMargins[];
  definitions: Record<string, {
    type: string;
    headerHeight: number;
    footerHeight: number;
    headerSource: string;
    footerSource: string;
  }>;
}

export async function detectPageTypes(page: Page, overridePageSize?: string): Promise<PageTypeInfo | null> {
  return page.evaluate((override: string | null): RawDetectResult | null => {
    const headerEls = document.querySelectorAll('[data-header-type]');
    const footerEls = document.querySelectorAll('[data-footer-type]');
    if (headerEls.length === 0 && footerEls.length === 0) return null;

    const pageEls = document.querySelectorAll('[data-page-size]');
    const types: string[] = [];
    const pageSizes: string[] = [];
    const pageMargins: { top: number; right: number; bottom: number; left: number }[] = [];
    pageEls.forEach(el => {
      types.push(el.getAttribute('data-page-type') || 'default');
      pageSizes.push(override ?? (el.getAttribute('data-page-size') || 'a4').toLowerCase());
      pageMargins.push({
        top: parseInt(el.getAttribute('data-margin-top') || '0', 10),
        right: parseInt(el.getAttribute('data-margin-right') || '0', 10),
        bottom: parseInt(el.getAttribute('data-margin-bottom') || '0', 10),
        left: parseInt(el.getAttribute('data-margin-left') || '0', 10),
      });
    });

    const defs: RawDetectResult['definitions'] = {};
    const pxToMm = 25.4 / 96;

    headerEls.forEach(el => {
      const t = el.getAttribute('data-header-type') || 'default';
      if (!defs[t]) defs[t] = { type: t, headerHeight: 0, footerHeight: 0, headerSource: 'none', footerSource: 'none' };
      const explicit = el.getAttribute('data-header-height');
      const measured = Math.ceil((el as HTMLElement).getBoundingClientRect().height * pxToMm);
      defs[t].headerHeight = explicit ? parseInt(explicit, 10) : measured;
      defs[t].headerSource = explicit ? `attr=${explicit}mm` : `measured=${measured}mm`;
    });

    footerEls.forEach(el => {
      const t = el.getAttribute('data-footer-type') || 'default';
      if (!defs[t]) defs[t] = { type: t, headerHeight: 0, footerHeight: 0, headerSource: 'none', footerSource: 'none' };
      const explicit = el.getAttribute('data-footer-height');
      const measured = Math.ceil((el as HTMLElement).getBoundingClientRect().height * pxToMm);
      defs[t].footerHeight = explicit ? parseInt(explicit, 10) : measured;
      defs[t].footerSource = explicit ? `attr=${explicit}mm` : `measured=${measured}mm`;
    });

    return { types, pageSizes, pageMargins, definitions: defs };
  }, overridePageSize ?? null).then(raw => {
    if (!raw) return null;
    const definitions = new Map<PageType, TypeDefinition>();
    const details: string[] = [];
    for (const [k, v] of Object.entries(raw.definitions)) {
      definitions.set(k as PageType, v as TypeDefinition);
      details.push(`${k}: header=${v.headerHeight}mm(${v.headerSource}) footer=${v.footerHeight}mm(${v.footerSource})`);
    }
    return {
      types: raw.types as PageType[],
      pageSizes: raw.pageSizes,
      pageMargins: raw.pageMargins,
      definitions,
      heightDetails: details,
    };
  });
}

// --- Page Groups ---

export interface PageGroup {
  type: PageType;
  size: string;
  elementIndices: number[];
}

export function buildPageGroups(typeInfo: PageTypeInfo): PageGroup[] {
  const groups: PageGroup[] = [];
  for (let i = 0; i < typeInfo.types.length; i++) {
    const type = typeInfo.types[i];
    const size = typeInfo.pageSizes[i] ?? 'a4';
    const last = groups[groups.length - 1];
    if (last && last.type === type && last.size === size) {
      last.elementIndices.push(i);
    } else {
      groups.push({ type, size, elementIndices: [i] });
    }
  }
  if (groups.length === 0) {
    groups.push({ type: 'default', size: 'a4', elementIndices: [0] });
  }
  return groups;
}

export interface RenderMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function computeMarginsForSize(
  definitions: Map<PageType, TypeDefinition>,
  sizeName: string,
): RenderMargins {
  const scale = areaScale(resolvePageSize(sizeName));
  let top = 0, bottom = 0;
  for (const def of definitions.values()) {
    top = Math.max(top, scaledHeight(def.headerHeight, scale));
    bottom = Math.max(bottom, scaledHeight(def.footerHeight, scale));
  }
  return { top, bottom, left: 0, right: 0 };
}

// --- Phase 1: Element-to-PDF rendering ---

const REF_AREA = 210 * 297; // A4 reference area in mm²

export function areaScale(dims: PageSizeDimensions): number {
  return Math.sqrt((dims.width * dims.height) / REF_AREA);
}

export async function renderElementPdf(
  browser: Browser,
  html: string,
  selector: string,
  heightMm: number,
  widthMm: number = 210,
  debugOutputPath?: string,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: mmToPx(widthMm), height: mmToPx(heightMm) });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 300));

    await page.evaluate((sel: string, hMm: number, wMm: number) => {
      const target = document.querySelector(sel) as HTMLElement | null;
      if (!target) return;

      document.body.innerHTML = '';
      document.body.appendChild(target);

      Object.assign(document.body.style, {
        margin: '0', padding: '0', overflow: 'hidden',
        width: `${wMm}mm`, height: `${hMm}mm`,
      });

      Object.assign(target.style, {
        width: '100%', height: '100%', margin: '0',
        boxSizing: 'border-box', overflow: 'hidden',
      });
    }, selector, heightMm, widthMm);

    if (debugOutputPath) {
      writeFileSync(`${debugOutputPath}.html`, await page.content());
    }

    await page.addStyleTag({
      content: `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; } body { max-width: ${widthMm}mm !important; }`,
    });

    const pdfBytes = await page.pdf({
      width: `${widthMm}mm`,
      height: `${heightMm}mm`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    if (debugOutputPath) {
      writeFileSync(`${debugOutputPath}.pdf`, pdfBytes);
    }
    return Buffer.from(pdfBytes);
  } finally {
    await page.close();
  }
}

export function overlayKey(type: PageType, sizeName: string): string {
  return `${type}:${sizeName}`;
}

export function scaledHeight(baseMm: number, scale: number): number {
  return Math.ceil(baseMm * scale);
}

export interface OverlayPdfs {
  headers: Map<string, Buffer>;
  footers: Map<string, Buffer>;
}

export async function renderHeaderFooterPdfs(
  browser: Browser,
  html: string,
  typeInfo: PageTypeInfo,
  pageSizes: string[],
  debugBasePath?: string,
): Promise<OverlayPdfs> {
  const headers = new Map<string, Buffer>();
  const footers = new Map<string, Buffer>();

  const uniqueSizes = [...new Set(pageSizes.length > 0 ? pageSizes : ['a4'])];

  for (const [type, def] of typeInfo.definitions) {
    for (const sizeName of uniqueSizes) {
      const dims = resolvePageSize(sizeName);
      const scale = areaScale(dims);
      const key = overlayKey(type, sizeName);
      if (def.headerHeight > 0) {
        const h = scaledHeight(def.headerHeight, scale);
        const debugPath = debugBasePath ? `${debugBasePath}.debug-header-${key}` : undefined;
        headers.set(key, await renderElementPdf(
          browser, html, `[data-header-type="${type}"]`, h, dims.width, debugPath,
        ));
      }
      if (def.footerHeight > 0) {
        const h = scaledHeight(def.footerHeight, scale);
        const debugPath = debugBasePath ? `${debugBasePath}.debug-footer-${key}` : undefined;
        footers.set(key, await renderElementPdf(
          browser, html, `[data-footer-type="${type}"]`, h, dims.width, debugPath,
        ));
      }
    }
  }

  return { headers, footers };
}

// --- Phase 2: Per-group content rendering ---

export interface GroupResult {
  group: PageGroup;
  buffer: Buffer;
  pageCount: number;
}

export async function detectEmptyPages(page: Page): Promise<Set<number>> {
  const indices = await page.evaluate(() => {
    const empty: number[] = [];
    const pages = document.querySelectorAll('[data-page-size]');
    pages.forEach((el, i) => {
      const main = el.querySelector('main, article') ?? el;
      const text = main.textContent?.trim() ?? '';
      const visibleChildren = main.querySelectorAll('img, svg, canvas, video, iframe, table, [style*="background"]');
      if (text.length === 0 && visibleChildren.length === 0) {
        const children = main.querySelectorAll('*');
        let hasVisibleContent = false;
        children.forEach((child) => {
          if (hasVisibleContent) return;
          const style = window.getComputedStyle(child);
          if (style.backgroundImage !== 'none' || style.borderWidth !== '0px') {
            hasVisibleContent = true;
          }
        });
        if (!hasVisibleContent) empty.push(i);
      }
    });
    return empty;
  });
  return new Set(indices);
}

export async function renderGroup(
  page: Page,
  group: PageGroup,
  dims: PageSizeDimensions,
  margins: RenderMargins,
): Promise<GroupResult> {
  const indices = group.elementIndices;
  await page.evaluate((visibleIndices: number[]) => {
    document.querySelectorAll('[data-header-type], [data-footer-type]').forEach(el => el.remove());
    document.querySelectorAll('.fixed-header, .fixed-footer').forEach(el => el.remove());

    const visible = new Set(visibleIndices);
    const pages = document.querySelectorAll('[data-page-size]');
    const keepSet = new Set<Element>();
    pages.forEach((el, i) => {
      if (visible.has(i)) keepSet.add(el);
    });
    // Remove all non-kept [data-page-size] elements and page-break divs
    pages.forEach((el, i) => {
      if (!visible.has(i)) el.remove();
    });
    document.querySelectorAll('.page-break').forEach(el => {
      // Keep page-break only if it's between two kept elements
      const prev = el.previousElementSibling;
      const next = el.nextElementSibling;
      if (!prev || !next || !keepSet.has(prev) || !keepSet.has(next)) {
        el.remove();
      }
    });
  }, indices);

  const isLandscape = dims.width > dims.height;
  const pdfWidth = isLandscape ? Math.min(dims.width, dims.height) : dims.width;
  const pdfHeight = isLandscape ? Math.max(dims.width, dims.height) : dims.height;
  const topMm = `${margins.top}mm`;
  const bottomMm = `${margins.bottom}mm`;
  const leftMm = `${margins.left}mm`;
  const rightMm = `${margins.right}mm`;
  await page.addStyleTag({
    content: `@page { size: ${dims.width}mm ${dims.height}mm; margin-top: ${topMm} !important; margin-bottom: ${bottomMm} !important; margin-left: ${leftMm} !important; margin-right: ${rightMm} !important; } body { max-width: ${dims.width}mm !important; }`,
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

  const buffer = Buffer.from(pdfBytes);
  const doc = await PDFDocument.load(buffer);
  return { group, buffer, pageCount: doc.getPageCount() };
}

// --- Phase 3: Compositing ---

function mmToPt(mm: number): number {
  return mm * 72 / 25.4;
}

export const PAGE_MARKER = '_PG_';
export const TOTAL_MARKER = '_TL_';

const PAGE_MARKER_HEX = Buffer.from(PAGE_MARKER).toString('hex').toUpperCase();
const TOTAL_MARKER_HEX = Buffer.from(TOTAL_MARKER).toString('hex').toUpperCase();

export function bufferHasPlaceholders(buf: Buffer): boolean {
  if (buf.includes(PAGE_MARKER) || buf.includes(TOTAL_MARKER)) return true;
  if (buf.includes(PAGE_MARKER_HEX) || buf.includes(TOTAL_MARKER_HEX)) return true;
  const deflateHeader = Buffer.from([0x78]);
  let offset = 0;
  while ((offset = buf.indexOf(deflateHeader, offset)) !== -1) {
    try {
      const chunk = zlib.inflateSync(buf.subarray(offset));
      if (chunk.includes(PAGE_MARKER) || chunk.includes(TOTAL_MARKER)
          || chunk.includes(PAGE_MARKER_HEX) || chunk.includes(TOTAL_MARKER_HEX)) return true;
    } catch { /* not a valid zlib stream */ }
    offset++;
  }
  return false;
}

export function replaceInBuffer(buf: Buffer, placeholder: string, value: string): Buffer {
  const padded = value.padEnd(placeholder.length, ' ');
  const result = Buffer.from(buf);
  const search = Buffer.from(placeholder);
  const replace = Buffer.from(padded);
  let idx = 0;
  while ((idx = result.indexOf(search, idx)) !== -1) {
    replace.copy(result, idx);
    idx += replace.length;
  }
  return result;
}

async function replaceInPdfStreams(buf: Buffer, replacements: [string, string][]): Promise<Buffer> {
  const doc = await PDFDocument.load(buf);
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const filter = dict.get(PDFName.of('Filter'));
    let bytes = Buffer.from(obj.contents);
    let compressed = false;

    if (filter?.toString() === '/FlateDecode') {
      try { bytes = zlib.inflateSync(bytes); compressed = true; } catch { continue; }
    }

    let modified = false;
    for (const [placeholder, value] of replacements) {
      const padded = value.padEnd(placeholder.length, ' ');
      const searchAscii = Buffer.from(placeholder);
      const replAscii = Buffer.from(padded);
      let idx = 0;
      while ((idx = bytes.indexOf(searchAscii, idx)) !== -1) {
        replAscii.copy(bytes, idx);
        idx += replAscii.length;
        modified = true;
      }
      const searchHex = Buffer.from(Buffer.from(placeholder).toString('hex').toUpperCase());
      const replHex = Buffer.from(Buffer.from(padded).toString('hex').toUpperCase());
      idx = 0;
      while ((idx = bytes.indexOf(searchHex, idx)) !== -1) {
        replHex.copy(bytes, idx);
        idx += replHex.length;
        modified = true;
      }
    }

    if (modified) {
      const final = compressed ? zlib.deflateSync(bytes) : bytes;
      (obj as any).contents = new Uint8Array(final);
      dict.set(PDFName.of('Length'), doc.context.obj(final.length));
    }
  }
  return Buffer.from(await doc.save());
}

async function embedOverlay(doc: PDFDocument, buf: Buffer): Promise<Awaited<ReturnType<typeof doc.embedPages>>[0]> {
  const srcDoc = await PDFDocument.load(buf);
  const [embedded] = await doc.embedPages(srcDoc.getPages());
  return embedded;
}

export async function compositeHeaderFooter(
  contentBuffer: Buffer,
  overlays: OverlayPdfs,
  pageMap: PageType[],
  typeInfo: PageTypeInfo,
  pageSizeMap?: string[],
  browser?: Browser,
  html?: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(contentBuffer);
  const totalPages = doc.getPageCount();

  const embeddedHeaders = new Map<string, Awaited<ReturnType<typeof doc.embedPages>>[0]>();
  const embeddedFooters = new Map<string, Awaited<ReturnType<typeof doc.embedPages>>[0]>();
  const headerHasPlaceholders = new Map<string, boolean>();
  const footerHasPlaceholders = new Map<string, boolean>();

  const htmlHasTokens = html ? (html.includes(PAGE_MARKER) || html.includes(TOTAL_MARKER)) : false;

  for (const [key, buf] of overlays.headers) {
    const has = htmlHasTokens || bufferHasPlaceholders(buf);
    headerHasPlaceholders.set(key, has);
    if (!has) embeddedHeaders.set(key, await embedOverlay(doc, buf));
  }
  for (const [key, buf] of overlays.footers) {
    const has = htmlHasTokens || bufferHasPlaceholders(buf);
    footerHasPlaceholders.set(key, has);
    if (!has) embeddedFooters.set(key, await embedOverlay(doc, buf));
  }

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const type = pageMap[i] || 'default';
    const def = typeInfo.definitions.get(type);
    const page = pages[i];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const sizeName = pageSizeMap?.[i] ?? 'a4';
    const dims = resolvePageSize(sizeName);
    const scale = areaScale(dims);
    const key = overlayKey(type, sizeName);
    const pageNum = String(i + 1);
    const totalStr = String(totalPages);

    const headerBuf = overlays.headers.get(key);
    if (headerBuf && def) {
      const headerHeightPt = mmToPt(scaledHeight(def.headerHeight, scale));
      let embedded = embeddedHeaders.get(key);
      if (headerHasPlaceholders.get(key) && browser && html) {
        const pageHtml = html.replaceAll(PAGE_MARKER, pageNum).replaceAll(TOTAL_MARKER, totalStr);
        const h = scaledHeight(def.headerHeight, scale);
        const buf = await renderElementPdf(browser, pageHtml, `[data-header-type="${type}"]`, h, dims.width);
        embedded = await embedOverlay(doc, buf);
      }
      if (embedded) {
        page.drawPage(embedded, {
          x: 0,
          y: pageHeight - headerHeightPt,
          width: pageWidth,
          height: headerHeightPt,
        });
      }
    }

    const footerBuf = overlays.footers.get(key);
    if (footerBuf && def) {
      const footerHeightPt = mmToPt(scaledHeight(def.footerHeight, scale));
      let embedded = embeddedFooters.get(key);
      if (footerHasPlaceholders.get(key) && browser && html) {
        const pageHtml = html.replaceAll(PAGE_MARKER, pageNum).replaceAll(TOTAL_MARKER, totalStr);
        const h = scaledHeight(def.footerHeight, scale);
        const buf = await renderElementPdf(browser, pageHtml, `[data-footer-type="${type}"]`, h, dims.width);
        embedded = await embedOverlay(doc, buf);
      }
      if (embedded) {
        page.drawPage(embedded, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: footerHeightPt,
        });
      }
    }
  }

  return doc.save();
}

// --- Assembly ---

export async function assembleGroups(
  results: GroupResult[],
  log: Logger,
  typeInfo?: PageTypeInfo,
): Promise<{ buffer: Uint8Array; pageMap: PageType[]; pageSizeMap: string[]; pageMarginMap: PageMargins[] }> {
  const merged = await PDFDocument.create();
  const pageMap: PageType[] = [];
  const pageSizeMap: string[] = [];
  const pageMarginMap: PageMargins[] = [];
  const defaultMargin: PageMargins = { top: 0, right: 0, bottom: 0, left: 0 };

  for (const { group, buffer, pageCount } of results) {
    const srcDoc = await PDFDocument.load(buffer);
    const indices = Array.from({ length: pageCount }, (_, i) => i);
    const copiedPages = await merged.copyPages(srcDoc, indices);
    const elemMargin = typeInfo?.pageMargins?.[group.elementIndices[0]] ?? defaultMargin;
    for (const copiedPage of copiedPages) {
      merged.addPage(copiedPage);
      pageMap.push(group.type);
      pageSizeMap.push(group.size);
      pageMarginMap.push(elemMargin);
    }
    const { width, height } = copiedPages[0].getSize();
    log.info(`  Group ${group.type}/${group.size} (${group.elementIndices.length} elements): ${pageCount} pages (${width.toFixed(0)}x${height.toFixed(0)}pt)`);
  }

  log.info(`Assembled PDF: ${merged.getPageCount()} pages from ${results.length} groups`);
  return { buffer: await merged.save(), pageMap, pageSizeMap, pageMarginMap };
}

// --- Debug Overlay (pdf-lib) ---

interface DebugLine {
  yPt: number;
  color: { r: number; g: number; b: number };
  label: string;
  labelAbove: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

const COLORS = {
  headerTop: hexToRgb('#e53e3e'),
  headerBottom: hexToRgb('#dd6b20'),
  footerTop: hexToRgb('#3182ce'),
  footerBottom: hexToRgb('#805ad5'),
  margin: hexToRgb('#38a169'),
};

export interface DebugVersionInfo {
  cliVersion: string;
  buildDate: string;
  gitCommit: string;
  pkgVersion: string;
}

export async function drawDebugOverlay(
  pdfBuffer: Buffer | Uint8Array,
  pageMap: PageType[],
  pageSizeMap: string[],
  typeInfo: PageTypeInfo,
  pageMarginMap?: PageMargins[],
  versionInfo?: DebugVersionInfo,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer);
  const font = await doc.embedFont(StandardFonts.Courier);
  const fontSize = 6;
  const pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width: pw, height: ph } = page.getSize();
    const type = pageMap[i] || 'default';
    const sizeName = pageSizeMap[i] ?? 'a4';
    const def = typeInfo.definitions.get(type);
    const dims = resolvePageSize(sizeName);
    const scale = areaScale(dims);
    const headerHMm = def ? scaledHeight(def.headerHeight, scale) : 0;
    const footerHMm = def ? scaledHeight(def.footerHeight, scale) : 0;
    const headerHPt = mmToPt(headerHMm);
    const footerHPt = mmToPt(footerHMm);
    const margins = computeMarginsForSize(typeInfo.definitions, sizeName);
    const marginTopPt = mmToPt(margins.top);
    const marginBottomPt = mmToPt(margins.bottom);

    const lines: DebugLine[] = [
      { yPt: ph - 0.5, color: COLORS.headerTop, label: `header-top 0mm`, labelAbove: false },
      { yPt: ph - headerHPt, color: COLORS.headerBottom, label: `header-bottom ${headerHMm}mm`, labelAbove: false },
      { yPt: ph - marginTopPt, color: COLORS.margin, label: `margin-top ${margins.top.toFixed(1)}mm`, labelAbove: true },
      { yPt: marginBottomPt, color: COLORS.margin, label: `margin-bottom ${margins.bottom.toFixed(1)}mm`, labelAbove: false },
      { yPt: footerHPt, color: COLORS.footerTop, label: `footer-top`, labelAbove: true },
      { yPt: 0.5, color: COLORS.footerBottom, label: `footer-bottom`, labelAbove: true },
    ];

    const dashLen = 3;
    const gapLen = 3;
    for (const { yPt, color, label, labelAbove } of lines) {
      // Draw dashed line
      let x = 0;
      while (x < pw) {
        const end = Math.min(x + dashLen, pw);
        page.drawLine({
          start: { x, y: yPt },
          end: { x: end, y: yPt },
          thickness: 0.5,
          color: rgb(color.r, color.g, color.b),
        });
        x += dashLen + gapLen;
      }
      // Draw label
      const tw = font.widthOfTextAtSize(label, fontSize);
      const labelY = labelAbove ? yPt + 2 : yPt - fontSize - 2;
      const textY = labelAbove ? yPt + 4 : yPt - fontSize;
      page.drawRectangle({
        x: pw - tw - 8,
        y: labelY,
        width: tw + 6,
        height: fontSize + 4,
        color: rgb(1, 1, 1),
        opacity: 0.85,
      });
      page.drawText(label, {
        x: pw - tw - 5,
        y: textY,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    }

    // Draw vertical margin lines (left/right)
    const pm = pageMarginMap?.[i] ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const leftPt = mmToPt(pm.left);
    const rightPt = pw - mmToPt(pm.right);
    const verticals = [
      { xPt: leftPt, label: `margin-left ${pm.left}mm` },
      { xPt: rightPt, label: `margin-right ${pm.right}mm` },
    ];
    for (const { xPt, label: vLabel } of verticals) {
      let y = 0;
      while (y < ph) {
        const end = Math.min(y + dashLen, ph);
        page.drawLine({
          start: { x: xPt, y },
          end: { x: xPt, y: end },
          thickness: 0.5,
          color: rgb(COLORS.margin.r, COLORS.margin.g, COLORS.margin.b),
        });
        y += dashLen + gapLen;
      }
      const tw = font.widthOfTextAtSize(vLabel, fontSize);
      const labelX = xPt + 2;
      page.drawRectangle({
        x: labelX,
        y: ph / 2 - (fontSize + 4) / 2,
        width: tw + 6,
        height: fontSize + 4,
        color: rgb(1, 1, 1),
        opacity: 0.85,
      });
      page.drawText(vLabel, {
        x: labelX + 3,
        y: ph / 2 - fontSize / 2,
        size: fontSize,
        font,
        color: rgb(COLORS.margin.r, COLORS.margin.g, COLORS.margin.b),
      });
    }

    // Badge at bottom
    const badge = `${sizeName.toUpperCase()} | type=${type} | header=${headerHMm}mm footer=${footerHMm}mm | margins=${margins.top}/${margins.bottom}mm | page ${i + 1}`;
    const bw = font.widthOfTextAtSize(badge, fontSize);
    page.drawRectangle({
      x: 4,
      y: 4,
      width: bw + 8,
      height: fontSize + 6,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });
    page.drawText(badge, {
      x: 8,
      y: 7,
      size: fontSize,
      font,
      color: rgb(COLORS.footerBottom.r, COLORS.footerBottom.g, COLORS.footerBottom.b),
    });
  }

  if (versionInfo && pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    const { width: lpw } = lastPage.getSize();
    const parts = [
      `facet ${versionInfo.cliVersion}`,
      `built ${versionInfo.buildDate}`,
      versionInfo.gitCommit || '',
      `pkg ${versionInfo.pkgVersion}`,
    ].filter(Boolean).join(' | ');
    const tw = font.widthOfTextAtSize(parts, fontSize);
    lastPage.drawRectangle({
      x: lpw - tw - 12, y: 4,
      width: tw + 8, height: fontSize + 6,
      color: rgb(0.12, 0.15, 0.23), opacity: 0.9,
    });
    lastPage.drawText(parts, {
      x: lpw - tw - 8, y: 7,
      size: fontSize, font,
      color: rgb(0.89, 0.91, 0.94),
    });
  }

  return doc.save();
}

// --- Debug Typography Page ---

interface FontSample {
  label: string;
  pt: number;
  lineHeight: number;
  margin: string;
}

const FONT_SAMPLES: FontSample[] = [
  { label: 'h1', pt: 22, lineHeight: 26, margin: '0 0 4mm' },
  { label: 'h2', pt: 15, lineHeight: 19, margin: '4mm 0 3mm' },
  { label: 'h3', pt: 12, lineHeight: 15, margin: '3mm 0 2mm' },
  { label: 'h4', pt: 10, lineHeight: 12, margin: '2mm 0 2mm' },
  { label: 'p', pt: 9, lineHeight: 12, margin: '0 0 3mm' },
  { label: 'text-2xl', pt: 24, lineHeight: 0, margin: '' },
  { label: 'text-xl', pt: 18, lineHeight: 0, margin: '' },
  { label: 'text-lg', pt: 15, lineHeight: 0, margin: '' },
  { label: 'text-md', pt: 10, lineHeight: 0, margin: '' },
  { label: 'text-sm', pt: 9, lineHeight: 0, margin: '' },
  { label: 'text-xs', pt: 7, lineHeight: 0, margin: '' },
];

export interface FontComboInfo {
  family: string;
  size: string;
  weight: string;
  color: string;
  tag: string;
  sample: string;
}

export async function appendDebugFontPage(
  pdfBuffer: Buffer | Uint8Array,
  baseFontSize?: number,
  fontCombos?: FontComboInfo[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBuffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([mmToPt(210), mmToPt(297)]);
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;
  const gray = rgb(0.5, 0.5, 0.5);
  const dark = rgb(0.1, 0.1, 0.1);
  const red = rgb(0.9, 0.24, 0.24);
  const lineColor = rgb(0.85, 0.85, 0.85);

  page.drawText('Typography Reference', { x: margin, y, size: 18, font: boldFont, color: dark });
  y -= 24;

  if (baseFontSize) {
    page.drawText(`Base font-size override: ${baseFontSize.toFixed(1)}pt`, { x: margin, y, size: 10, font, color: gray });
    y -= 16;
  }

  // Column headers
  const cols = { label: margin, size: margin + 70, lh: margin + 120, margins: margin + 170, sample: margin + 240 };
  page.drawText('Element', { x: cols.label, y, size: 7, font: boldFont, color: gray });
  page.drawText('Size', { x: cols.size, y, size: 7, font: boldFont, color: gray });
  page.drawText('Line-H', { x: cols.lh, y, size: 7, font: boldFont, color: gray });
  page.drawText('Margin', { x: cols.margins, y, size: 7, font: boldFont, color: gray });
  page.drawText('Sample', { x: cols.sample, y, size: 7, font: boldFont, color: gray });
  y -= 10;

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lineColor });
  y -= 14;

  for (const sample of FONT_SAMPLES) {
    page.drawText(sample.label, { x: cols.label, y: y - sample.pt * 0.2, size: 8, font: boldFont, color: dark });
    page.drawText(`${sample.pt.toFixed(1)}pt`, { x: cols.size, y: y - sample.pt * 0.2, size: 8, font, color: gray });

    if (sample.lineHeight > 0) {
      page.drawText(`${sample.lineHeight.toFixed(1)}pt`, { x: cols.lh, y: y - sample.pt * 0.2, size: 8, font, color: gray });
    }

    if (sample.margin) {
      page.drawText(sample.margin, { x: cols.margins, y: y - sample.pt * 0.2, size: 7, font, color: gray });
    }

    page.drawText('The quick brown fox jumps over the lazy dog', { x: cols.sample, y, size: sample.pt, font, color: dark });

    y -= Math.max(sample.pt * 1.4, 14) + 4;
    if (y < margin + 30) break;
  }

  // Actual font usage from document
  if (fontCombos && fontCombos.length > 0) {
    y -= 10;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lineColor });
    y -= 14;

    const purple = rgb(0.576, 0.2, 0.918);
    page.drawText('Document Font Usage (unique combos)', { x: margin, y, size: 9, font: boldFont, color: purple });
    y -= 14;

    const fc = { tag: margin, size: margin + 50, weight: margin + 100, color: margin + 140, family: margin + 210, sample: margin + 310 };
    page.drawText('Tag', { x: fc.tag, y, size: 7, font: boldFont, color: gray });
    page.drawText('Size', { x: fc.size, y, size: 7, font: boldFont, color: gray });
    page.drawText('Weight', { x: fc.weight, y, size: 7, font: boldFont, color: gray });
    page.drawText('Color', { x: fc.color, y, size: 7, font: boldFont, color: gray });
    page.drawText('Family', { x: fc.family, y, size: 7, font: boldFont, color: gray });
    page.drawText('Sample', { x: fc.sample, y, size: 7, font: boldFont, color: gray });
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.3, color: lineColor });
    y -= 10;

    for (const combo of fontCombos) {
      if (y < margin + 30) {
        page.drawText('... truncated', { x: margin, y, size: 7, font, color: gray });
        break;
      }
      page.drawText(combo.tag, { x: fc.tag, y, size: 7, font, color: dark });
      page.drawText(combo.size, { x: fc.size, y, size: 7, font, color: dark });
      page.drawText(combo.weight, { x: fc.weight, y, size: 7, font, color: dark });
      page.drawText(combo.color, { x: fc.color, y, size: 7, font, color: dark });
      page.drawText(combo.family, { x: fc.family, y, size: 7, font, color: dark });
      page.drawText(combo.sample.slice(0, 20), { x: fc.sample, y, size: 7, font, color: gray });
      y -= 10;
    }
  }

  // Style guide reference box
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lineColor });
  y -= 14;

  page.drawText('Style Guide Reference (print @media)', { x: margin, y, size: 9, font: boldFont, color: red });
  y -= 14;

  const refLines = [
    'body: 10pt/14pt (1.4x)  |  table: 9pt (th: +1pt)  |  footer: 8pt/10pt',
    'h1: 22pt/26pt (1.2x)  |  h2: 15pt/19pt (1.3x)  |  h3: 12pt/15pt (1.3x)  |  h4: 10pt/12pt (1.2x)  |  p: 9pt/12pt (1.3x)',
    'text-xs: 7pt  |  text-sm: 9pt  |  text-md: 10pt  |  text-lg: 15pt  |  text-xl: 18pt  |  text-2xl: 24pt',
  ];
  for (const line of refLines) {
    page.drawText(line, { x: margin, y, size: 7, font, color: gray });
    y -= 11;
  }

  page.drawText('facet --debug-typography', { x: margin, y: 20, size: 7, font, color: gray });
  return doc.save();
}

