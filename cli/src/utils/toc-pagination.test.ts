import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';

import { launchBrowser } from './pdf-generator.js';
import { setPreparedContent } from './browser-readiness.js';
import { resolveAutomaticTableOfContents, resolveTocPageStarts } from './toc-pagination.js';

describe('resolveTocPageStarts', () => {
  it('maps targets to their first physical PDF page', () => {
    const starts = resolveTocPageStarts([
      { id: 'cover', physicalPageCount: 1 },
      { id: 'contents', physicalPageCount: 1 },
      { id: 'summary', physicalPageCount: 2 },
      { id: 'details', physicalPageCount: 1 },
    ], ['summary', 'details']);

    expect([...starts]).toEqual([
      ['summary', 3],
      ['details', 5],
    ]);
  });

  it('rejects a target that does not identify a page', () => {
    expect(() => resolveTocPageStarts([
      { id: 'cover', physicalPageCount: 1 },
    ], ['missing'])).toThrow('missing');
  });

  it('rejects a target used by more than one page', () => {
    expect(() => resolveTocPageStarts([
      { id: 'summary', physicalPageCount: 1 },
      { id: 'summary', physicalPageCount: 1 },
    ], ['summary'])).toThrow('summary');
  });

  it('rejects non-positive physical page counts', () => {
    expect(() => resolveTocPageStarts([
      { id: 'summary', physicalPageCount: 0 },
    ], ['summary'])).toThrow('physical page count');
  });
});

describe('resolveAutomaticTableOfContents', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('replaces automatic labels with physical starts after overflowing pages', async () => {
    const page = await browser.newPage();
    await setPreparedContent(page, `<!DOCTYPE html><html><head><style>
      body { margin: 0; }
      [data-page-size] { break-after: page; }
    </style></head><body>
      <div><span data-facet-toc-target="summary">—</span><span data-facet-toc-target="details">—</span></div>
      <div data-facet-page-id="cover" data-page-size="a4" data-page-type="first" style="height: 250mm"><main>Cover</main></div>
      <div data-facet-page-id="contents" data-page-size="a4" data-page-type="default" style="height: 250mm"><main>Contents</main></div>
      <div data-facet-page-id="summary" data-page-size="a4" data-page-type="default" style="height: 400mm"><main>Summary</main></div>
      <div data-facet-page-id="details" data-page-size="a4" data-page-type="default" style="height: 250mm"><main>Details</main></div>
    </body></html>`);

    try {
      const html = await resolveAutomaticTableOfContents({
        browser,
        sourcePage: page,
        specs: ['first', 'default', 'default', 'default'].map((type) => ({
          type: type as 'first' | 'default',
          size: 'a4',
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
        })),
      });

      expect(html).toContain('data-facet-toc-target="summary">3</span>');
      expect(html).toContain('data-facet-toc-target="details">5</span>');
    } finally {
      await page.close();
    }
  }, 120000);

  it('resolves headings within a flowing Page on their printed sheets', async () => {
    const page = await browser.newPage();
    await setPreparedContent(page, `<!DOCTYPE html><html><head><style>
      body { margin: 0; }
      [data-page-size] { break-after: page; }
      h2 { break-after: avoid-page; }
    </style></head><body>
      <div data-facet-page-id="cover" data-page-size="a4" data-page-type="first" style="height: 250mm">Cover</div>
      <div data-facet-page-id="body" data-page-size="a4" data-page-type="default">
        <div style="height: 20mm"><span data-facet-toc-target="body">—</span><span data-facet-toc-target="intro">—</span><span data-facet-toc-target="details">—</span></div>
        <h2 id="intro">Introduction</h2>
        <div style="height: 240mm">Introduction body</div>
        <h2 id="details">Details</h2>
        <p style="height: 30mm">Details body</p>
      </div>
    </body></html>`);

    try {
      const html = await resolveAutomaticTableOfContents({
        browser,
        sourcePage: page,
        specs: ['first', 'default'].map((type) => ({
          type: type as 'first' | 'default',
          size: 'a4',
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
        })),
      });

      expect(html).toContain('data-facet-toc-target="body">2</span>');
      expect(html).toContain('data-facet-toc-target="intro">2</span>');
      expect(html).toContain('data-facet-toc-target="details">3</span>');
    } finally {
      await page.close();
    }
  }, 120000);

  it('remeasures headings when resolved TOC labels change pagination', async () => {
    const page = await browser.newPage();
    await setPreparedContent(page, `<!DOCTYPE html><html><head><style>
      body { margin: 0; }
      [data-page-size] { break-after: page; }
      h2 { height: 10mm; margin: 0; }
    </style></head><body>
      <div data-page-size="a4" data-page-type="default">
        <div style="height: 280mm"></div>
        <div style="line-height: 20mm"><span data-facet-toc-target="target"></span></div>
        <h2 id="target">Target section</h2>
      </div>
    </body></html>`);

    try {
      const html = await resolveAutomaticTableOfContents({
        browser,
        sourcePage: page,
        specs: [{ type: 'default', size: 'a4', margins: { top: 0, right: 0, bottom: 0, left: 0 } }],
      });

      expect(html).toContain('data-facet-toc-target="target">2</span>');
    } finally {
      await page.close();
    }
  }, 120000);

  it('does not prepare measurement pages when every label is explicit', async () => {
    const page = await browser.newPage();
    await setPreparedContent(page, '<html><body><span>A-1</span><div data-page-size="a4">Appendix</div></body></html>');
    let preparations = 0;

    try {
      const html = await resolveAutomaticTableOfContents({
        browser,
        sourcePage: page,
        specs: [{ type: 'default', size: 'a4', margins: { top: 0, right: 0, bottom: 0, left: 0 } }],
        preparePage: async () => { preparations += 1; },
      });

      expect(html).toContain('<span>A-1</span>');
      expect(preparations).toBe(0);
    } finally {
      await page.close();
    }
  });

  it('rejects duplicate section anchors before printing', async () => {
    const page = await browser.newPage();
    await setPreparedContent(page, '<html><body><span data-facet-toc-target="duplicated">—</span><div data-page-size="a4"><h2 id="duplicated">First</h2><h2 id="duplicated">Second</h2></div></body></html>');
    try {
      await expect(resolveAutomaticTableOfContents({
        browser,
        sourcePage: page,
        specs: [{ type: 'default', size: 'a4', margins: { top: 0, right: 0, bottom: 0, left: 0 } }],
      })).rejects.toThrow('matches more than one element');
    } finally {
      await page.close();
    }
  });
});
