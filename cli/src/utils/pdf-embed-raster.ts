import type { Browser, BrowserContext } from 'puppeteer-core';
import { setPreparedContent } from './browser-readiness.js';
import { EMBED_SELECTOR, type EmbedSize } from './embed.js';

const TARGET_ATTRIBUTE = 'data-facet-embed-raster';

/**
 * Replace every outermost figure and diagram with a PNG of itself, captured at
 * `scale` device pixels per CSS pixel, so `--embed-format png` PDFs carry
 * raster visuals while the surrounding text stays vector.
 */
export async function rasterizeEmbeds(options: {
  browser: Pick<Browser | BrowserContext, 'newPage'>;
  html: string;
  scale: EmbedSize;
  viewport?: { width: number; height: number };
}): Promise<string> {
  const page = await options.browser.newPage();
  try {
    await page.setViewport({ ...(options.viewport ?? page.viewport() ?? { width: 800, height: 600 }), deviceScaleFactor: options.scale });
    await setPreparedContent(page, options.html);
    const count = await page.evaluate(({ selector, attribute }) => {
      const targets = Array.from(document.querySelectorAll(selector)).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !el.parentElement?.closest(selector);
      });
      targets.forEach((el, index) => el.setAttribute(attribute, String(index)));
      return targets.length;
    }, { selector: EMBED_SELECTOR, attribute: TARGET_ATTRIBUTE });
    for (let index = 0; index < count; index++) {
      const element = await page.$(`[${TARGET_ATTRIBUTE}="${index}"]`);
      if (!element) throw new Error(`Embedded visual ${index} disappeared before capture`);
      try {
        const png = Buffer.from(await element.screenshot({ type: 'png', omitBackground: true, captureBeyondViewport: true }));
        await element.evaluate((el, src) => {
          const rect = el.getBoundingClientRect();
          const css = getComputedStyle(el);
          const caption = el.closest('figure')?.querySelector('figcaption');
          const img = document.createElement('img');
          img.src = src;
          img.alt = el.getAttribute('alt') ?? el.getAttribute('aria-label') ?? caption?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
          Object.assign(img.style, {
            display: css.display.startsWith('inline') ? 'inline-block' : 'block',
            width: `${rect.width}px`, height: `${rect.height}px`, maxWidth: 'none',
            margin: css.margin, breakInside: 'avoid', breakBefore: css.breakBefore, breakAfter: css.breakAfter,
          });
          el.replaceWith(img);
        }, `data:image/png;base64,${png.toString('base64')}`);
      } finally {
        await element.dispose();
      }
    }
    return await page.content();
  } finally {
    await page.close();
  }
}
