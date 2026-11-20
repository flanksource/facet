import * as D from 'docx';
import type { Block, Group, OfficeDocument, TocEntry } from '../model.js';
import { paragraph, runOptions, twips, type WordBlock } from './text.js';

interface TocSection { identifier: string; entries: TocEntry[] }

export function wordContents(document: OfficeDocument): {
  anchor: (target: string) => string;
  prefix: (block: { anchors?: string[] }) => D.ParagraphChild[];
  render: (block: Group, width: number) => WordBlock[];
} {
  const anchors = new Map<string, number>();
  const recipes = new Map<Group, Array<TocSection | TocEntry>>();
  const targets = new Map<string, Array<{ section: TocSection; entry: TocEntry }>>();
  let sequence = 0;
  const collect = (blocks: Block[]): void => blocks.forEach((block) => {
    if (block.kind === 'break') return;
    block.anchors?.forEach((anchor) => anchors.set(anchor, (anchors.get(anchor) ?? 0) + 1));
    if (block.kind === 'paragraph') block.runs.forEach((run) => run.anchors?.forEach((anchor) => anchors.set(anchor, (anchors.get(anchor) ?? 0) + 1)));
    if (block.kind === 'group' && block.toc) {
      const parts: Array<TocSection | TocEntry> = [];
      let section: TocSection | undefined;
      for (const entry of block.toc.entries) {
        if (entry.target === undefined) { parts.push(entry); section = undefined; continue; }
        if (!section) { section = { identifier: `facet_toc_${sequence++}`, entries: [] }; parts.push(section); }
        section.entries.push(entry);
        const references = targets.get(entry.target) ?? [];
        references.push({ section, entry });
        targets.set(entry.target, references);
      }
      recipes.set(block, parts);
    }
    if (block.kind === 'group') collect(block.blocks);
    if (block.kind === 'table') block.rows.forEach((row) => row.cells.forEach((cell) => collect(cell.blocks)));
  });
  document.pages.forEach((page) => collect(page.blocks));
  for (const target of targets.keys()) {
    if (anchors.get(target) !== 1) throw new Error(`Office TOC target must exist exactly once: ${target} (found ${anchors.get(target) ?? 0})`);
  }
  const bookmarks = new Map([...anchors.keys()].map((target, index) => [target, `facet_anchor_${index}`]));
  const bookmark = (target: string): string => {
    const name = bookmarks.get(target);
    if (!name) throw new Error(`Missing Word bookmark target: ${target}`);
    return name;
  };
  const entryParagraph = (entry: TocEntry, width: number): D.Paragraph => new D.Paragraph({
    style: `TOC${entry.level}`, spacing: { before: 0, after: twips(8), line: twips(entry.style.lineHeight), lineRule: D.LineRuleType.AT_LEAST },
    indent: { left: twips((entry.level - 1) * 6 * 96 / 25.4) },
    tabStops: [{ type: D.TabStopType.RIGHT, position: twips(width), leader: D.LeaderType.DOT }],
    children: entry.target === undefined ? [new D.TextRun({ ...runOptions(entry.style), text: entry.title }), new D.TextRun({ children: [new D.Tab()] }), new D.TextRun(entry.page ?? '')] : [
      new D.InternalHyperlink({ anchor: bookmark(entry.target), children: [new D.TextRun({ ...runOptions(entry.style), text: entry.title }),
        new D.TextRun({ children: [new D.Tab()] }), new D.SimpleField(`PAGEREF ${bookmark(entry.target)} \\h`)] }),
    ],
  });
  return {
    anchor: bookmark,
    prefix: (block) => (block.anchors ?? []).filter((anchor) => bookmarks.has(anchor)).flatMap((anchor) => [
      new D.Bookmark({ id: bookmark(anchor), children: [] }),
      ...(targets.get(anchor) ?? []).map(({ section, entry }) => new D.SimpleField(`TC "${entry.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" \\f ${section.identifier} \\l ${entry.level}`)),
    ]),
    render: (block, width) => [
      ...(block.toc?.title ? [paragraph(block.toc.title)] : []),
      ...(recipes.get(block) ?? []).map((part) => 'identifier' in part ? new D.TableOfContents('Table of contents', {
        tcFieldIdentifier: part.identifier, tcFieldLevelRange: '1-3', hyperlink: true,
        contentChildren: part.entries.map((entry) => entryParagraph(entry, width)),
      }) : entryParagraph(part, width)),
    ],
  };
}
