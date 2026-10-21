import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { createServer } from 'node:http';
import { launchBrowser } from '../utils/pdf-generator.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { Logger } from '../utils/logger.js';
import { officeLayout } from './layout.js';

describe('live Office layout', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('applies widescreen dimensions before template code measures its content', async () => {
    const server = createServer((_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end('<html><head><style>:root{--facet-font-scale:1}</style></head><body><div id="facet-root"><div data-page-size="a4"><p>Measured content</p></div></div><script>const root=document.querySelector("[data-page-size]");root.setAttribute("data-initial-width",String(root.getBoundingClientRect().width));root.setAttribute("data-initial-font",getComputedStyle(document.body).fontSize);</script></body></html>');
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');
      const html = await snapshotHTML(`http://127.0.0.1:${address.port}`, new Logger(false), { layout: officeLayout('pptx') });
      expect(html).toContain('data-initial-width="1280"');
      expect(html).toContain('data-initial-font="24px"');
    } finally { await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())); }
  });

  it('lays out custom Word page dimensions before extraction', async () => {
    const page = await browser.newPage();
    try {
      const { applyBrowserLayout } = await import('../utils/render-layout.js');
      await page.setContent('<html><body><div data-page-size="297x210"><p>Custom page</p></div></body></html>');
      await page.evaluate(applyBrowserLayout, officeLayout('docx'));
      const width = await page.$eval('[data-page-size]', (element) => element.getBoundingClientRect().width);
      expect(width).toBeCloseTo(297 * 96 / 25.4, 0);
    } finally { await page.close(); }
  });
});
