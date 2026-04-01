import type { Page } from 'puppeteer';

export interface FontCombo {
  family: string;
  size: string;
  weight: string;
  color: string;
  tag: string;
  sample: string;
}

export async function extractTypographyInfo(page: Page): Promise<FontCombo[]> {
  return page.evaluate(() => {
    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const seen = new Set<string>();
    const combos: { family: string; size: string; weight: string; color: string; tag: string; sample: string }[] = [];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node: Element | null;
    while ((node = walker.nextNode() as Element | null)) {
      if (node.classList?.contains('debug-annotation')) continue;
      if (!node.textContent?.trim()) continue;

      const s = window.getComputedStyle(node);
      const family = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const size = pxToPt(s.fontSize);
      const weight = s.fontWeight;
      const color = s.color;
      const key = `${family}|${size}|${weight}|${color}`;

      if (!seen.has(key)) {
        seen.add(key);
        const text = (node.textContent || '').trim().slice(0, 40);
        combos.push({ family, size, weight, color, tag: node.tagName.toLowerCase(), sample: text });
      }
    }
    return combos;
  });
}

export async function injectTypographyAnnotations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const labelStyle = 'font-size:6pt;color:#9333ea;background:rgba(255,255,255,0.92);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline;border:1px solid #c084fc';

    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const rgbToHex = (rgb: string) => {
      const m = rgb.match(/(\d+)/g);
      if (!m || m.length < 3) return rgb;
      return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    };

    const seen = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node: Element | null;
    while ((node = walker.nextNode() as Element | null)) {
      if (node.classList?.contains('debug-annotation')) continue;
      if (!node.textContent?.trim()) continue;

      const s = window.getComputedStyle(node);
      const family = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const size = pxToPt(s.fontSize);
      const weight = s.fontWeight;
      const color = s.color;
      const key = `${family}|${size}|${weight}|${color}`;

      if (!seen.has(key)) {
        seen.add(key);
        const hex = rgbToHex(color);
        const span = document.createElement('span');
        span.setAttribute('style', labelStyle);
        span.textContent = ` [${size} w${weight} ${hex} ${family}]`;
        span.className = 'debug-annotation';
        node.appendChild(span);
      }
    }
  });
}

export async function injectDebugAnnotations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const labelStyle = 'font-size:7pt;color:#e53e3e;background:rgba(255,255,255,0.9);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline';

    const EXPECTED: Record<string, string> = {
      H1: '22pt', H2: '15pt', H3: '12pt', H4: '10pt', P: '9pt',
    };

    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
    };

    const pxToMm = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 25.4 / 96).toFixed(1)}mm`;
    };

    const makeLabel = (text: string): HTMLSpanElement => {
      const span = document.createElement('span');
      span.setAttribute('style', labelStyle);
      span.textContent = ` [${text}]`;
      span.className = 'debug-annotation';
      return span;
    };

    const makeBlockLabel = (text: string): HTMLDivElement => {
      const div = document.createElement('div');
      div.setAttribute('style', `${labelStyle};display:block;margin-bottom:2px;padding:1px 3px`);
      div.textContent = text;
      div.className = 'debug-annotation';
      return div;
    };

    document.querySelectorAll('h1, h2, h3, h4, p').forEach((el) => {
      if (el.closest('.debug-annotation')) return;
      const s = window.getComputedStyle(el);
      const actual = pxToPt(s.fontSize);
      const tag = el.tagName;
      const expected = EXPECTED[tag];
      const match = expected && actual === expected ? '' : ` expected=${expected}`;
      el.appendChild(makeLabel(`${actual}${match}`));
    });

    // Annotate first occurrence of each unique font size per page
    document.querySelectorAll('[data-page-size]').forEach((pageEl) => {
      const seenSizes = new Set<string>();
      const walker = document.createTreeWalker(pageEl, NodeFilter.SHOW_ELEMENT);
      let el: Element | null;
      while ((el = walker.nextNode() as Element | null)) {
        if (el.classList?.contains('debug-annotation')) continue;
        if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'P') continue;
        if (!el.textContent?.trim()) continue;
        const s = window.getComputedStyle(el);
        const size = pxToPt(s.fontSize);
        if (!seenSizes.has(size)) {
          seenSizes.add(size);
          el.appendChild(makeLabel(size));
        }
      }
    });

    document.querySelectorAll('table').forEach((table) => {
      const ts = window.getComputedStyle(table);
      const tableInfo = `table: font=${pxToPt(ts.fontSize)} collapse=${ts.borderCollapse} w=${pxToMm(ts.width)}`;
      table.parentNode?.insertBefore(makeBlockLabel(tableInfo), table);

      const firstTh = table.querySelector('th');
      if (firstTh) {
        const ths = window.getComputedStyle(firstTh);
        firstTh.appendChild(makeLabel(`th: ${pxToPt(ths.fontSize)} pad=${pxToMm(ths.padding)} bg=${ths.backgroundColor}`));
      }

      const firstTd = table.querySelector('td');
      if (firstTd) {
        const tds = window.getComputedStyle(firstTd);
        firstTd.appendChild(makeLabel(`td: ${pxToPt(tds.fontSize)} pad=${pxToMm(tds.padding)}`));
      }
    });
  });
}
