import type { Page } from 'puppeteer';

export async function injectDebugAnnotations(page: Page): Promise<void> {
  await page.evaluate(() => {
    const labelStyle = 'font-size:7pt;color:#e53e3e;background:rgba(255,255,255,0.9);padding:0 2px;border-radius:2px;margin-left:4px;font-weight:normal;font-style:normal;line-height:1;white-space:nowrap;display:inline;vertical-align:baseline';

    const pxToPt = (px: string) => {
      const n = parseFloat(px);
      return isNaN(n) ? px : `${(n * 72 / 96).toFixed(1)}pt`;
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
      el.appendChild(makeLabel(pxToPt(s.fontSize)));
    });

    document.querySelectorAll('table').forEach((table) => {
      const ts = window.getComputedStyle(table);
      const tableInfo = `table: font-size=${pxToPt(ts.fontSize)} border-collapse=${ts.borderCollapse} width=${ts.width}`;
      table.parentNode?.insertBefore(makeBlockLabel(tableInfo), table);

      const firstTh = table.querySelector('th');
      if (firstTh) {
        const ths = window.getComputedStyle(firstTh);
        firstTh.appendChild(makeLabel(`th: ${pxToPt(ths.fontSize)} pad=${ths.padding} bg=${ths.backgroundColor}`));
      }

      const firstTd = table.querySelector('td');
      if (firstTd) {
        const tds = window.getComputedStyle(firstTd);
        firstTd.appendChild(makeLabel(`td: ${pxToPt(tds.fontSize)} pad=${tds.padding}`));
      }
    });
  });
}
