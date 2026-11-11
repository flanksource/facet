import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { readOfficeDOM } from './dom.js';

describe('Office semantic DOM extraction', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it('retains list ordinals, rich text, column groups and hidden-content filtering', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><div data-page-size="a4"><ol start="3"><li>Three</li><li>Four</li></ol><div style="display:grid;grid-template-columns:1fr 1fr"><p>Left</p><p>Right</p></div><p hidden>Private hidden text</p></div></body></html>');
      const result = await page.evaluate(readOfficeDOM);
      const blocks = result.pages[0].blocks;
      expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'paragraph', 'group']);
      expect(blocks.slice(0, 2).map((block) => block.kind === 'paragraph' ? block.list?.ordinal : undefined)).toEqual([3, 4]);
      expect(JSON.stringify(result)).not.toContain('Private hidden text');
    } finally { await page.close(); }
  });

  it('retains the PDF source selector for a header repeated across logical pages', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><div data-header-type="default"><svg width="20" height="20"><rect width="20" height="20"/></svg></div><div data-page-size="a4"><p>One</p></div><div data-page-size="a4"><p>Two</p></div></body></html>');
      const result = await page.evaluate(readOfficeDOM);
      expect(result.pages.map((item) => item.header?.selector)).toEqual(['[data-header-type="default"]', '[data-header-type="default"]']);
      expect(result.pages.map((item) => item.header?.blocks)).toEqual([[], []]);
      expect(await page.$$('[data-facet-office-media]')).toHaveLength(0);
    } finally { await page.close(); }
  });

  it('keeps numbering on Markdown list items with paragraph wrappers', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><ol start="3"><li><p>Three</p><p>Additional detail</p></li><li><p>Four</p></li></ol></body></html>');
      const result = await page.evaluate(readOfficeDOM);
      expect(result.pages[0].blocks.map((block) => block.kind === 'paragraph' ? block.list?.ordinal : undefined)).toEqual([3, undefined, 4]);
    } finally { await page.close(); }
  });

  it('retains block and inline anchors for PowerPoint slide navigation', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><main id="section"><p>Before <span id="inline">inline target</span> after.</p></main></body></html>');
      const result = await page.evaluate(readOfficeDOM, 'pptx');
      const block = result.pages[0].blocks[0];
      expect(block).toMatchObject({ kind: 'paragraph', anchors: ['section'] });
      if (block.kind !== 'paragraph') throw new Error('Expected a paragraph');
      expect(block.lines.flatMap((line) => line.runs).filter((run) => run.anchors?.includes('inline')).map((run) => run.text)).toEqual(['inline']);
    } finally { await page.close(); }
  });
});
