import type { Block, OfficePage, Paragraph, Row, Table } from './model.js';
import { presentationSize } from './powerpoint/size.js';

export interface PlacedBlock { block: Exclude<Block, { kind: 'break' }>; x: number; y: number; width: number; height: number }
export interface Slide { page: OfficePage; blocks: PlacedBlock[] }

const px = (mm: number): number => mm * 96 / 25.4;

function rowGroups(rows: Row[]): Row[][] {
  const groups: Row[][] = [];
  for (let index = 0; index < rows.length;) {
    const group: Row[] = [];
    let end = index + 1;
    while (index < end) {
      const row = rows[index];
      if (!row) throw new Error('Table rowspan extends beyond its final row');
      end = Math.max(end, ...row.cells.map((cell) => index + cell.rowSpan));
      group.push(row); index++;
    }
    groups.push(group);
  }
  return groups;
}

export function paginate(documentPages: OfficePage[]): Slide[] {
  const size = presentationSize(documentPages);
  const slides: Slide[] = [];
  for (const page of documentPages) {
    const left = px(page.margins.left);
    const right = px(page.margins.right);
    const top = px(page.margins.top) + (page.header?.height ?? 0);
    const bottom = size.height - px(page.margins.bottom) - (page.footer?.height ?? 0);
    const availableWidth = size.width - left - right;
    if (bottom <= top || availableWidth <= 0) throw new Error('Slide margins and chrome leave no content area');
    let slide: Slide = { page, blocks: [] };
    let y = top;
    const first = page.blocks[0];
    const title = first?.kind === 'paragraph' && first.heading ? first : undefined;
    const next = (): void => {
      if (!slide.blocks.length) return;
      slides.push(slide); slide = { page, blocks: [] }; y = top;
      if (title) {
        const height = title.lines.reduce((sum, line) => sum + line.height, 0);
        y += title.style.before;
        slide.blocks.push({ block: title, x: Math.max(left, title.box.x), y, width: Math.min(title.box.width, availableWidth), height });
        y += height + title.style.after;
      }
    };
    const place = (block: PlacedBlock['block'], height: number): void => {
      const spacing = block.style.before;
      if (height + spacing > bottom - top + 0.5) throw new Error(`Office content cannot fit on a slide: ${block.source}`);
      if (y + height + spacing > bottom + 0.5) next();
      if (y + height + spacing > bottom + 0.5) throw new Error(`Office content cannot fit below the slide title: ${block.source}`);
      y += spacing;
      const x = Math.max(left, block.box.x);
      const width = Math.min(block.box.width || availableWidth, size.width - right - x);
      if (width <= 0) throw new Error(`Office content is outside the slide: ${block.source}`);
      slide.blocks.push({ block, x, y, width, height });
      y += height + block.style.after;
    };
    const paragraph = (block: Paragraph): void => {
      if (!block.lines.length && block.anchors?.length) { place(block, 0); return; }
      let start = 0;
      while (start < block.lines.length) {
        let end = start;
        let height = 0;
        while (end < block.lines.length && y + block.style.before + height + block.lines[end].height <= bottom + 0.5) {
          height += block.lines[end].height; end++;
        }
        if (end === start) {
          if (!slide.blocks.length || (slide.blocks.length === 1 && slide.blocks[0].block === title)) throw new Error(`Text line cannot fit on a slide: ${block.source}`);
          next(); continue;
        }
        const lines = block.lines.slice(start, end);
        place({ ...block, lines, runs: lines.flatMap((line, index) => index ? [{ text: '\n', style: block.style }, ...line.runs] : line.runs),
          anchors: start ? undefined : block.anchors, list: start ? undefined : block.list }, height);
        start = end;
        if (start < block.lines.length) next();
      }
    };
    const table = (block: Table): void => {
      const headers = block.rows.filter((row) => row.header);
      const groups = rowGroups(block.rows.filter((row) => !row.header));
      const headerHeight = headers.reduce((sum, row) => sum + row.height, 0);
      let rows = [...headers];
      let height = headerHeight;
      for (const group of groups) {
        const groupHeight = group.reduce((sum, row) => sum + row.height, 0);
        if (groupHeight + headerHeight + block.style.before > bottom - top) throw new Error(`Table row group cannot fit on a slide: ${block.source}`);
        if (y + block.style.before + height + groupHeight > bottom) {
          if (rows.length > headers.length) place({ ...block, rows }, height);
          next(); rows = [...headers]; height = headerHeight;
        }
        rows.push(...group); height += groupHeight;
      }
      if (rows.length) place({ ...block, rows }, height);
    };
    page.blocks.forEach((block, index) => {
      if (block.kind === 'break') { next(); return; }
      if (block.kind === 'paragraph') {
        const following = page.blocks[index + 1];
        const nextHeight = following && following.kind !== 'break'
          ? following.kind === 'paragraph' ? following.lines[0]?.height ?? 0 : following.kind === 'table' ? following.rows[0]?.height ?? 0 : following.box.height
          : 0;
        if (block.heading && y + block.box.height + block.style.before + block.style.after + nextHeight > bottom) next();
        paragraph(block);
      } else if (block.kind === 'table') table(block);
      else if (block.kind === 'image') {
        const scale = Math.min(1, availableWidth / block.box.width, (bottom - top - block.style.before - block.style.after) / block.box.height);
        place({ ...block, box: { ...block.box, width: block.box.width * scale } }, block.box.height * scale);
      } else place(block, block.box.height);
    });
    if (slide.blocks.length) slides.push(slide);
  }
  if (!slides.length) throw new Error('Office export contains no visible content');
  return slides;
}
