import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';

import { launchBrowser } from './pdf-generator.js';
import { setPreparedContent } from './browser-readiness.js';

describe('setPreparedContent', () => {
  it('waits for imported styles before reporting the page ready', async () => {
    const server = createServer((_request, response) => {
      setTimeout(() => {
        response.writeHead(200, { 'Content-Type': 'text/css' });
        response.end('body { color: rgb(1, 2, 3); }');
      }, 150);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
      const address = server.address() as AddressInfo;
      await setPreparedContent(page, `<html><head><style>@import url("http://127.0.0.1:${address.port}/style.css");</style></head><body>Report</body></html>`);
      expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(1, 2, 3)');
    } finally {
      await page.close();
      await browser.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 120000);

  it('rejects a failed imported stylesheet instead of printing with fallback fonts', async () => {
    const server = createServer((_request, response) => {
      response.writeHead(503, { 'Content-Type': 'text/css' });
      response.end('Unavailable');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
      const address = server.address() as AddressInfo;
      await expect(setPreparedContent(page, `<html><head><style>@import url("http://127.0.0.1:${address.port}/style.css");</style></head><body>Report</body></html>`)).rejects.toThrow('stylesheet');
    } finally {
      await page.close();
      await browser.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 120000);
});
