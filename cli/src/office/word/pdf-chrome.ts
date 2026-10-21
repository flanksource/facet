import type { BrowserContext } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { areaScale, resolvePageSize, scaledHeight } from '../../utils/pdf-multipass.js';
import { renderElementPdf } from '../../utils/pdf-overlay.js';
import type { Chrome, OfficeDocument, Paragraph, TextStyle } from '../model.js';

export interface PdfChrome {
  data: Uint8Array;
  width: number;
  height: number;
  counters: Paragraph[];
}

// Serialized into Chromium, with coordinates relative to the isolated overlay.
export function readOverlayCounters(): Paragraph[] {
  const counters: Paragraph[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) if (/(_PG_|_TL_)/.test(walker.currentNode.textContent ?? '')) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement!;
    if (parent.closest('script,style')) continue;
    const css = getComputedStyle(parent);
    if (css.display === 'none' || css.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    if (range.getClientRects().length !== 1) throw new Error('Word header/footer page fields must fit on one line');
    const rgb = css.color.match(/[\d.]+/g)?.map(Number);
    if (!rgb || rgb.length < 3) throw new Error(`Invalid Word page-field color: ${css.color}`);
    const style: TextStyle = {
      font: css.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: parseFloat(css.fontSize) * 0.75,
      bold: Number(css.fontWeight) >= 600 || css.fontWeight === 'bold', italic: css.fontStyle === 'italic',
      underline: css.textDecorationLine.includes('underline'), strike: css.textDecorationLine.includes('line-through'),
      color: rgb.slice(0, 3).map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('').toUpperCase(),
      align: ['right', 'center', 'justify'].includes(css.textAlign) ? css.textAlign as TextStyle['align'] : 'left',
      lineHeight: css.lineHeight === 'normal' ? parseFloat(css.fontSize) * 1.2 : parseFloat(css.lineHeight), before: 0, after: 0, borderWidth: 0,
    };
    const flex = parent.parentElement;
    if (flex && getComputedStyle(flex).display.includes('flex') && flex.lastElementChild === parent && getComputedStyle(flex).justifyContent === 'space-between') style.align = 'right';
    counters.push({ kind: 'paragraph', box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      runs: [{ text: node.textContent!, style }], lines: [], style, source: 'header/footer page field' });
    const hidden = document.createElement('span');
    hidden.style.visibility = 'hidden';
    node.replaceWith(hidden);
    hidden.append(node);
  }
  return counters;
}

export async function renderWordChrome(options: {
  context: BrowserContext;
  html: string;
  document: OfficeDocument;
}): Promise<Map<Chrome, PdfChrome>> {
  const result = new Map<Chrome, PdfChrome>();
  const cache = new Map<string, PdfChrome>();
  for (const page of options.document.pages) {
    const size = resolvePageSize(page.size);
    for (const chrome of [page.header, page.footer]) {
      if (!chrome || chrome.height === 0) continue;
      const key = `${chrome.selector}:${page.size}:${chrome.height}`;
      let asset = cache.get(key);
      if (!asset) {
        const heightMm = scaledHeight(chrome.height * 25.4 / 96, areaScale(size));
        let counters: Paragraph[] = [];
        try {
          const data = await renderElementPdf({ browser: options.context, html: options.html, selector: chrome.selector,
            widthMm: size.width, heightMm,
            preparePage: async (page) => { counters = await page.evaluate(readOverlayCounters); } });
          const pdf = await PDFDocument.load(data);
          if (pdf.getPageCount() !== 1) throw new Error(`Expected one PDF page, received ${pdf.getPageCount()}`);
          asset = { data, width: size.width * 96 / 25.4, height: heightMm * 96 / 25.4, counters };
        } catch (cause) {
          throw new Error(`Failed to render Word ${chrome.selector} at ${page.size}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        }
        cache.set(key, asset);
      }
      result.set(chrome, asset);
    }
  }
  return result;
}
