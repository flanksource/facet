import * as D from 'docx';
import type { Paragraph, Run, TextStyle } from '../model.js';

export const twips = (pixels: number): number => Math.round(pixels * 15);
export const mm = (value: number): number => Math.round(value * 1440 / 25.4);
export type WordBlock = D.Paragraph | D.Table | D.TableOfContents;
export type RenderBlocks = (blocks: import('../model.js').Block[], width: number) => WordBlock[];

export function runOptions(style: TextStyle): D.IRunOptions {
  return { font: style.font, size: Math.round(style.size * 2), bold: style.bold, italics: style.italic,
    underline: style.underline ? {} : undefined, strike: style.strike, color: style.color,
    shading: style.fill ? { fill: style.fill } : undefined };
}

function textRuns(run: Run, anchor: (target: string) => string): D.ParagraphChild[] {
  const children = run.text.split(/(_PG_|_TL_|\n)/).filter(Boolean).map((text) => {
    const options = runOptions(run.style);
    if (text === '\n') return new D.TextRun({ ...options, break: 1 });
    if (text === '_PG_' || text === '_TL_') return new D.TextRun({ ...options, children: [text === '_PG_' ? D.PageNumber.CURRENT : D.PageNumber.TOTAL_PAGES] });
    return new D.TextRun({ ...options, text });
  });
  if (!run.href) return children;
  if (run.href.startsWith('#')) return [new D.InternalHyperlink({ anchor: anchor(decodeURIComponent(run.href.slice(1))), children })];
  return [new D.ExternalHyperlink({ link: run.href, children })];
}

export function paragraph(block: Paragraph, options: {
  prefix?: D.ParagraphChild[];
  anchor?: (target: string) => string;
  runPrefix?: (run: Run) => D.ParagraphChild[];
  frame?: D.IFrameOptions;
} = {}): D.Paragraph {
  return new D.Paragraph({
    children: [...(options.prefix ?? []), ...block.runs.flatMap((run) => [
      ...(options.runPrefix?.(run) ?? []), ...textRuns(run, options.anchor ?? ((target) => target)),
    ])],
    heading: block.heading ? Object.values(D.HeadingLevel)[block.heading - 1] : undefined,
    frame: options.frame,
    alignment: D.AlignmentType[block.style.align.toUpperCase() as keyof typeof D.AlignmentType],
    spacing: { before: twips(block.style.before), after: twips(block.style.after), line: twips(block.style.lineHeight), lineRule: D.LineRuleType.AT_LEAST },
    keepNext: Boolean(block.heading),
    numbering: block.list ? { reference: block.list.id, level: block.list.level } : undefined,
    shading: block.style.fill ? { fill: block.style.fill } : undefined,
    wordWrap: block.style.wordWrap ?? false,
  });
}

export function cellChildren(blocks: WordBlock[]): Array<D.Paragraph | D.Table> {
  return blocks.map((block) => {
    if (block instanceof D.TableOfContents) throw new Error('A native Word TOC must be outside a table or header/footer');
    return block;
  });
}

export const emptyParagraph = (): D.Paragraph => new D.Paragraph({ spacing: { before: 0, after: 0, line: 1, lineRule: D.LineRuleType.EXACT }, children: [] });
