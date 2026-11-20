import { describe, expect, it } from 'vitest';
import { paginate } from './paginate.js';
import type { OfficePage, Paragraph, TextStyle } from './model.js';

const style: TextStyle = { font: 'Arial', size: 18, bold: false, italic: false, underline: false, strike: false, color: '000000', align: 'left', lineHeight: 30, before: 0, after: 0, borderWidth: 0 };
const paragraph = (text: string, lines = 1): Paragraph => ({
  kind: 'paragraph', source: 'p', style, box: { x: 0, y: 0, width: 1200, height: lines * 30 },
  runs: [{ text, style }], lines: Array.from({ length: lines }, (_, index) => ({ runs: [{ text: `${text}-${index}`, style }], height: 30 })),
});
const page = (blocks: OfficePage['blocks']): OfficePage => ({ size: 'a4', blocks, width: 1280, height: 720, margins: { top: 0, right: 0, bottom: 0, left: 0 } });

describe('Office slide pagination', () => {
  it('splits paragraphs at measured line boundaries and retains every line once', () => {
    const slides = paginate([page([paragraph('long', 50)])]);
    expect(slides.map((slide) => slide.blocks.map(({ block }) => block.kind === 'paragraph' ? block.lines.length : 0))).toEqual([[24], [24], [2]]);
  });
  it('keeps headings with their following paragraph', () => {
    const heading = { ...paragraph('Heading'), heading: 1 };
    const slides = paginate([page([paragraph('body', 23), heading, paragraph('after')])]);
    expect(slides.map((slide) => slide.blocks.map(({ block }) => block.source === 'p' && block.kind === 'paragraph' ? block.lines[0].runs[0].text : ''))).toEqual([['body-0'], ['Heading-0', 'after-0']]);
  });
  it('rejects an oversized column group instead of clipping or shrinking it', () => {
    const group = { kind: 'group' as const, source: 'div#columns', style, box: { x: 0, y: 0, width: 1200, height: 800 }, blocks: [paragraph('column')] };
    expect(() => paginate([page([group])])).toThrow('div#columns');
  });
  it('uses the standard slide width for every page in the presentation', () => {
    const standard = { ...page([paragraph('standard')]), size: 'powerpoint-standard', width: 960 };
    const slides = paginate([standard, page([paragraph('paper')])]);
    expect(slides.map((slide) => slide.blocks[0].width)).toEqual([960, 960]);
  });
  it('rejects conflicting presentation sizes', () => {
    expect(() => paginate([
      { ...page([paragraph('standard')]), size: 'powerpoint-standard' },
      { ...page([paragraph('wide')]), size: 'powerpoint-wide' },
    ])).toThrow(/conflicting PowerPoint/i);
  });
});
