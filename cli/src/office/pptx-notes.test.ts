import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { writePPTX } from './pptx.js';
import type { OfficePage, Paragraph, TextStyle } from './model.js';

const style: TextStyle = { font: 'Arial', size: 18, bold: false, italic: false, underline: false, strike: false,
  color: '000000', align: 'left', lineHeight: 30, before: 0, after: 0, borderWidth: 0 };
const paragraph = (text: string, lines = 1): Paragraph => {
  const run = { text, style };
  return { kind: 'paragraph', source: 'p', style, box: { x: 0, y: 0, width: 1000, height: lines * 30 },
    runs: [run], lines: Array.from({ length: lines }, () => ({ runs: [{ ...run }], height: 30 })) };
};
const page = (blocks: OfficePage['blocks'], notes?: string): OfficePage => ({ size: 'a4', blocks, width: 1280, height: 720,
  margins: { top: 0, right: 0, bottom: 0, left: 0 }, notes });

async function slideNotes(pages: OfficePage[]): Promise<string[]> {
  const zip = await JSZip.loadAsync(await writePPTX({ document: { title: 'Notes', pages } }));
  const slides = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  return Promise.all(slides.map(async (_, index) => {
    const xml = await zip.file(`ppt/notesSlides/notesSlide${index + 1}.xml`)?.async('string') ?? '';
    // Every notes page also carries its slide-number placeholder; keep only the notes text.
    return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => match[1]).filter((text) => text !== String(index + 1)).join('|');
  }));
}

describe('PowerPoint speaker notes', () => {
  it('writes each page\'s notes to its slide and leaves pages without notes empty', async () => {
    const [first, second, ...rest] = await slideNotes([page([paragraph('Decisions')], 'Ask for D1 first\nD4 can wait'), page([paragraph('Appendix')])]);
    // pptxgenjs writes the notes as one run with CRLF line breaks.
    expect(first).toBe('Ask for D1 first\r\nD4 can wait');
    expect(second).toBe('');
    expect(rest).toEqual([]);
  });

  it('puts a long page\'s notes on its first slide only, not on its continuation slides', async () => {
    const notes = await slideNotes([page([paragraph('Long discussion', 40)], 'Walk through the ledger')]);
    expect(notes.length).toBeGreaterThan(1);
    expect(notes).toEqual(['Walk through the ledger', ...notes.slice(1).map(() => '')]);
  });
});
