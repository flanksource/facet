import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';
import { launchBrowser } from '../utils/pdf-generator.js';
import { EMBED_SELECTOR } from '../utils/embed.js';
import { readOfficeDOM, type OfficeDOMOptions } from './dom.js';

const DOCX: OfficeDOMOptions = { format: 'docx', embedFormat: 'pdf', embedSelector: EMBED_SELECTOR };
const DIAGRAM = '<div data-page-size="a4"><figure><div data-facet-diagram data-facet-ready="true" style="width:120px;height:60px"></div><figcaption>Flow</figcaption></figure></div>';

describe('Office semantic DOM extraction', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); });

  it.each([
    ['color(srgb 1 0 0)', 'FF0000'],
    ['oklch(0 0 0)', '000000'],
    ['oklch(1 0 0)', 'FFFFFF'],
    ['color(display-p3 1 0 0)', 'FF0000'],
  ])('converts computed %s colors to Office sRGB hex', async (color, expected) => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<p style="color:${color}">Color sample</p>`);
      const result = await page.evaluate(readOfficeDOM, DOCX);
      expect(result.pages[0].blocks[0]).toMatchObject({ kind: 'paragraph', style: { color: expected } });
    } finally { await page.close(); }
  });

  it('retains list ordinals, rich text, column groups and hidden-content filtering', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><div data-page-size="a4"><ol start="3"><li>Three</li><li>Four</li></ol><div style="display:grid;grid-template-columns:1fr 1fr"><p>Left</p><p>Right</p></div><p hidden>Private hidden text</p></div></body></html>');
      const result = await page.evaluate(readOfficeDOM, DOCX);
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
      const result = await page.evaluate(readOfficeDOM, DOCX);
      expect(result.pages.map((item) => item.header?.selector)).toEqual(['[data-header-type="default"]', '[data-header-type="default"]']);
      expect(result.pages.map((item) => item.header?.blocks)).toEqual([[], []]);
      expect(await page.$$('[data-facet-office-media]')).toHaveLength(0);
    } finally { await page.close(); }
  });

  it('keeps numbering on Markdown list items with paragraph wrappers', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><ol start="3"><li><p>Three</p><p>Additional detail</p></li><li><p>Four</p></li></ol></body></html>');
      const result = await page.evaluate(readOfficeDOM, DOCX);
      expect(result.pages[0].blocks.map((block) => block.kind === 'paragraph' ? block.list?.ordinal : undefined)).toEqual([3, undefined, 4]);
    } finally { await page.close(); }
  });

  it('retains block and inline anchors for PowerPoint slide navigation', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<html><body><main id="section"><p>Before <span id="inline">inline target</span> after.</p></main></body></html>');
      const result = await page.evaluate(readOfficeDOM, { ...DOCX, format: 'pptx' });
      const block = result.pages[0].blocks[0];
      expect(block).toMatchObject({ kind: 'paragraph', anchors: ['section'] });
      if (block.kind !== 'paragraph') throw new Error('Expected a paragraph');
      expect(block.lines.flatMap((line) => line.runs).filter((run) => run.anchors?.includes('inline')).map((run) => run.text)).toEqual(['inline']);
    } finally { await page.close(); }
  });

  it('reads SlideNotes paragraphs per page and keeps them out of the slide content', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<html><body>
        <div data-page-size="powerpoint-wide"><p>Visible</p><details data-facet-slide-notes style="display:none"><summary>Speaker notes</summary><div data-facet-slide-notes-body><p>First  note</p><ul><li>Second note</li></ul></div></details></div>
        <div data-page-size="powerpoint-wide"><p>Plain</p><details data-facet-slide-notes style="display:none"><summary>Speaker notes</summary><div data-facet-slide-notes-body>Only text</div></details></div>
        <div data-page-size="powerpoint-wide"><p>None</p></div></body></html>`);
      const result = await page.evaluate(readOfficeDOM, { ...DOCX, format: 'pptx' });
      expect(result.pages.map((item) => item.notes)).toEqual(['First note\nSecond note', 'Only text', undefined]);
      expect(JSON.stringify(result.pages.map((item) => item.blocks))).not.toMatch(/note/i);
    } finally { await page.close(); }
  });

  it.each([
    ['pptx', 'pdf', [{ kind: 'image', format: 'pdf' }]],
    ['docx', 'pdf', [{ kind: 'image', format: 'pdf' }]],
    ['docx', 'png', [{ kind: 'image', format: 'png' }, { kind: 'paragraph' }]],
    ['pptx', 'png', [{ kind: 'image', format: 'png' }, { kind: 'paragraph' }]],
  ] as const)('%s with --embed-format %s captures a figure as %j', async (format, embedFormat, expected) => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<html><body>${DIAGRAM}</body></html>`);
      const result = await page.evaluate(readOfficeDOM, { format, embedFormat, embedSelector: EMBED_SELECTOR });
      expect(result.pages[0].blocks).toMatchObject(expected);
    } finally { await page.close(); }
  });
});
