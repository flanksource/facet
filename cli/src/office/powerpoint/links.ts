import type PptxGenJS from 'pptxgenjs-plus';
import type { Block } from '../model.js';
import type { Slide } from '../paginate.js';

export interface SlideLinks {
  hyperlink: (href: string) => PptxGenJS.HyperlinkProps;
  target: (id: string) => number;
}

export function slideLinks(slides: Slide[]): SlideLinks {
  const targets = new Map<string, number>();
  const visit = (block: Block, slide: number): void => {
    if (block.kind === 'break') return;
    const add = (anchors: string[] = []): void => {
      for (const anchor of anchors) if (!targets.has(anchor)) targets.set(anchor, slide);
    };
    add(block.anchors);
    if (block.kind === 'paragraph') block.runs.forEach((run) => add(run.anchors));
    if (block.kind === 'group') block.blocks.forEach((child) => visit(child, slide));
    if (block.kind === 'table') block.rows.forEach((row) => row.cells.forEach((cell) => cell.blocks.forEach((child) => visit(child, slide))));
  };
  slides.forEach((slide, index) => slide.blocks.forEach(({ block }) => visit(block, index + 1)));
  const target = (id: string): number => {
    const slide = targets.get(id);
    if (slide === undefined) throw new Error(`PowerPoint internal link target not found: ${id}`);
    return slide;
  };
  return { target, hyperlink: (href) => href.startsWith('#') ? { slide: target(decodeURIComponent(href.slice(1))) } : { url: href } };
}
