import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { createServer } from 'node:http';
import { launchBrowser } from '../utils/pdf-generator.js';
import { snapshotHTML } from '../bundler/live-snapshot.js';
import { Logger } from '../utils/logger.js';
import { officeLayout } from './layout.js';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import LaneLabel from '../../../src/components/diagram/FlowLaneLabel.js';
import Header from '../../../src/components/Header.js';
import Footer from '../../../src/components/Footer.js';

const rootRequire = createRequire(new URL('../../../package.json', import.meta.url));
const { createElement }: typeof import('react') = rootRequire('react');
const { renderToStaticMarkup }: typeof import('react-dom/server') = rootRequire('react-dom/server');

describe('live Office layout', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it.each([
    ['a4', 1280], ['powerpoint-wide', 1280], ['powerpoint-standard', 960],
  ])('applies %s dimensions before template code measures its content', async (pageSize, width) => {
    const server = createServer((_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end(`<html><head><style>:root{--facet-font-scale:1}</style></head><body><div id="facet-root"><div data-page-size="${pageSize}"><p>Measured content</p></div></div><script>const root=document.querySelector("[data-page-size]");root.setAttribute("data-initial-width",String(root.getBoundingClientRect().width));root.setAttribute("data-initial-font",getComputedStyle(document.body).fontSize);</script></body></html>`);
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');
      const html = await snapshotHTML(`http://127.0.0.1:${address.port}`, new Logger(false), { layout: officeLayout('pptx') });
      expect(html).toContain(`data-initial-width="${width}"`);
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

  it('keeps narrow swimlane labels inside their lanes at presentation font sizes', async () => {
    const page = await browser.newPage();
    try {
      const css = await readFile(new URL('../../../dist/styles.css', import.meta.url), 'utf8');
      const label = renderToStaticMarkup(createElement(LaneLabel, {
        lane: { key: 'user', label: 'Engineer', color: '#112233' }, mutedColor: '#445566', showDivider: false, showDetail: false,
      }));
      await page.setContent(`<html><head><style>${css}${officeLayout('pptx').css}</style></head><body><div style="width:33mm;height:28mm">${label}</div></body></html>`);
      const overflow = await page.$eval('[data-facet-label]', (label) => {
        const box = label.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(label);
        return Math.max(0, ...Array.from(range.getClientRects()).map((line) => Math.max(box.left - line.left, line.right - box.right)));
      });
      expect(overflow).toBeLessThanOrEqual(0.5);
    } finally { await page.close(); }
  });

  it.each(['header', 'footer'] as const)('bounds custom %s children to the declared height', async (kind) => {
    const page = await browser.newPage();
    try {
      const chrome = renderToStaticMarkup(createElement(kind === 'header' ? Header : Footer, { height: 12 },
        createElement('div', { 'data-content': '', style: { height: '100%' } }, 'Editable chrome')));
      await page.setContent(`<html><body style="height:4000px">${chrome}</body></html>`);
      const height = await page.$eval('[data-content]', (element) => element.getBoundingClientRect().height);
      expect(height).toBeCloseTo(12 * 96 / 25.4, 1);
    } finally { await page.close(); }
  });
});
