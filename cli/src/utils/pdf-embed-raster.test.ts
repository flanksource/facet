import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import sharp from 'sharp';
import { launchBrowser } from './pdf-generator.js';
import { rasterizeEmbeds } from './pdf-embed-raster.js';

const WIDTH = 200;
const HEIGHT = 100;
const html = `<html><body><p>Vector paragraph</p>
<figure style="margin:0;width:${WIDTH}px"><div data-facet-diagram data-facet-ready="true" style="width:${WIDTH}px;height:${HEIGHT}px;background:#036"><span>Inside</span></div></figure>
<div data-facet-diagram data-facet-ready="true" style="display:none;width:50px;height:50px"></div>
</body></html>`;

describe('rasterizeEmbeds', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it.each([1, 2, 4] as const)('replaces the outermost figure with a %dx PNG at its CSS size and keeps text', async (scale) => {
    const output = await rasterizeEmbeds({ browser, html, scale, viewport: { width: 800, height: 600 } });
    const page = await browser.newPage();
    try {
      await page.setContent(output);
      const images = await page.$$eval('img', (imgs) => imgs.map((img) => ({ src: img.src, width: img.style.width, height: img.style.height })));
      expect(images.map(({ width, height }) => ({ width, height }))).toEqual([{ width: `${WIDTH}px`, height: `${HEIGHT}px` }]);
      const { width, height } = await sharp(Buffer.from(images[0].src.split(',')[1], 'base64')).metadata();
      expect({ width, height }).toEqual({ width: WIDTH * scale, height: HEIGHT * scale });
      expect(await page.$$eval('figure', (figures) => figures.length)).toBe(0);
      expect(await page.evaluate(() => document.body.textContent)).toContain('Vector paragraph');
      expect(await page.evaluate(() => document.body.textContent)).not.toContain('Inside');
      expect(await page.$$eval('[data-facet-diagram]', (hidden) => hidden.length)).toBe(1);
    } finally {
      await page.close();
    }
  });
});
