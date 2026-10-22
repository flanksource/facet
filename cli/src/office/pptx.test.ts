import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { writePPTX } from './pptx.js';
import type { OfficePage, Paragraph, Table, TextStyle } from './model.js';
import { first, parseXml } from './inspect/xml.js';

const style: TextStyle = { font: 'Arial', size: 18, bold: false, italic: false, underline: false, strike: false,
  color: '000000', align: 'left', lineHeight: 30, before: 0, after: 0, borderWidth: 0 };
const paragraph = (text: string, options: { lines?: number; href?: string; anchors?: string[] } = {}): Paragraph => {
  const run = { text, style, href: options.href };
  return { kind: 'paragraph', source: 'p', style, box: { x: 0, y: 0, width: 1000, height: (options.lines ?? 1) * 30 },
    runs: [run], lines: Array.from({ length: options.lines ?? 1 }, () => ({ runs: [{ ...run }], height: 30 })), anchors: options.anchors };
};
const page = (blocks: OfficePage['blocks']): OfficePage => ({ size: 'a4', blocks, width: 1280, height: 720,
  margins: { top: 0, right: 0, bottom: 0, left: 0 } });

describe('native PowerPoint content', () => {
  it('resolves internal links to the destination slide after continuation pagination', async () => {
    const zip = await JSZip.loadAsync(await writePPTX({ document: { title: 'Linked review', pages: [
      page([paragraph('Open appendix', { href: '#appendix%20details' }), paragraph('External reference', { href: 'https://example.com' })]),
      page([paragraph('Long discussion', { lines: 25 })]),
      page([paragraph('Appendix', { anchors: ['appendix details'] })]),
    ] } }));
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    const rels = await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string');
    expect(rels).toContain('Target="slide4.xml"');
    expect(rels).not.toContain('#appendix');
    expect(rels).toContain('https://example.com');
    expect(xml).toContain('action="ppaction://hlinksldjump"');
  });

  it('rejects unresolved internal links with the missing target', async () => {
    await expect(writePPTX({ document: { title: 'Broken link', pages: [page([paragraph('Missing', { href: '#missing-section' })])] } }).then(() => undefined))
      .rejects.toThrow(/missing-section/);
  });

  it('links to the continuation slide containing an inline anchor', async () => {
    const discussion = paragraph('Discussion', { lines: 25 });
    discussion.lines[24].runs[0].anchors = ['inline-target'];
    const zip = await JSZip.loadAsync(await writePPTX({ document: { title: 'Inline navigation', pages: [
      page([paragraph('Open inline target', { href: '#inline-target' })]), page([discussion]),
    ] } }));
    expect(await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string')).toContain('Target="slide3.xml"');
  });

  it('retains an empty anchor before visible content without adding a text shape', async () => {
    const marker = { ...paragraph('', { anchors: ['section-start'] }), runs: [], lines: [] };
    const zip = await JSZip.loadAsync(await writePPTX({ document: { title: 'Section marker', pages: [
      page([paragraph('Open section', { href: '#section-start' })]), page([marker, paragraph('Section content')]),
    ] } }));
    expect(await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string')).toContain('Target="slide2.xml"');
    expect((await zip.file('ppt/slides/slide2.xml')!.async('string')).match(/<p:sp>/g)).toHaveLength(1);
  });

  it('rejects a presentation containing only an empty anchor', async () => {
    const marker = { ...paragraph('', { anchors: ['empty'] }), runs: [], lines: [] };
    await expect(writePPTX({ document: { title: 'Empty review', pages: [page([marker])] } }).then(() => undefined))
      .rejects.toThrow(/no visible content/i);
  });

  it('preserves native table padding, alignment, per-side borders and row merges', async () => {
    const cellStyle: TextStyle = { ...style, verticalAlign: 'center', padding: { top: 8, right: 16, bottom: 24, left: 32 },
      borders: { top: { color: '112233', width: 2, style: 'solid' }, right: { color: '445566', width: 3, style: 'dashed' },
        bottom: { color: '778899', width: 4, style: 'solid' }, left: { color: 'AABBCC', width: 1, style: 'solid' } } };
    const cell = (text: string, rowSpan = 1) => ({ blocks: [paragraph(text)], style: cellStyle, colSpan: 1, rowSpan,
      box: { x: 0, y: 0, width: 400, height: 120 } });
    const table: Table = { kind: 'table', source: 'table#ledger', style, columns: [400, 400], box: { x: 0, y: 0, width: 800, height: 240 },
      rows: [{ header: false, height: 120, cells: [cell('Merged region', 2), cell('North')] },
        { header: false, height: 120, cells: [cell('South')] }] };
    const zip = await JSZip.loadAsync(await writePPTX({ document: { title: 'Native table', pages: [page([table])] } }));
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    const tree = parseXml({ path: 'slide1.xml', xml });
    const properties = first(first(tree, 'tbl')!.children, 'tcPr')!;
    expect(properties.attributes).toMatchObject({ marT: '76200', marR: '152400', marB: '228600', marL: '304800', anchor: 'ctr' });
    expect(['lnT', 'lnR', 'lnB', 'lnL'].map((side) => first(first(properties.children, side)!.children, 'srgbClr')?.attributes.val))
      .toEqual(['112233', '445566', '778899', 'AABBCC']);
    expect(xml).toContain('rowSpan="2"');
    expect(xml).toContain('vMerge="1"');
  });
});
