import PptxGenJS from 'pptxgenjs-plus';
import { performance } from 'node:perf_hooks';
import type { Logger } from '../utils/logger.js';
import type { Block, OfficeDocument, Run, Table, TextStyle } from './model.js';
import { SLIDE } from './model.js';
import { paginate } from './paginate.js';
import { logVisual } from './logging.js';
import { slideLinks, type SlideLinks } from './powerpoint/links.js';
import { drawDecoration } from './powerpoint/decorations.js';

function textOptions(style: TextStyle): PptxGenJS.TextPropsOptions {
  return { fontFace: style.font, fontSize: style.size, bold: style.bold, italic: style.italic,
    underline: style.underline ? { style: 'sng' } : undefined, strike: style.strike ? 'sngStrike' : undefined,
    color: style.color };
}

function runsToPPTX({ runs, page, total, link }: { runs: Run[]; page: number; total: number; link: SlideLinks }): PptxGenJS.TextProps[] {
  return runs.map((run) => ({ text: run.pageTarget ? String(link.target(run.pageTarget)) : run.text.replace(/_PG_/g, String(page)).replace(/_TL_/g, String(total)),
    options: { ...textOptions(run.style), hyperlink: run.href ? link.hyperlink(run.href) : undefined } }));
}

function tableRows({ block, page, total, link }: { block: Table; page: number; total: number; link: SlideLinks }): PptxGenJS.TableRow[] {
  return block.rows.map((row) => row.cells.map((cell) => {
    const runs = cell.blocks.flatMap((child): Run[] => {
      if (child.kind !== 'paragraph') throw new Error(`PowerPoint table cells require text content: ${block.source}`);
      return [...child.runs, { text: '\n', style: child.style }];
    });
    if (runs.length) runs.pop();
    const border = (side: 'top' | 'right' | 'bottom' | 'left'): PptxGenJS.BorderProps => {
      const edge = cell.style.borders?.[side];
      const width = edge?.width ?? cell.style.borderWidth;
      if (width && edge && !['solid', 'dashed', 'none', 'hidden'].includes(edge.style)) throw new Error(`Unsupported PowerPoint table border style ${edge.style}: ${block.source}`);
      return { type: !width || edge?.style === 'none' || edge?.style === 'hidden' ? 'none' : edge?.style === 'dashed' ? 'dash' : 'solid',
        color: edge?.color ?? cell.style.border ?? '000000', pt: width * 0.75 };
    };
    const padding = cell.style.padding;
    return { text: runsToPPTX({ runs, page, total, link }), options: {
      ...textOptions(cell.style), align: cell.style.align, colspan: cell.colSpan, rowspan: cell.rowSpan,
      fill: cell.style.fill ? { color: cell.style.fill } : undefined,
      border: [border('top'), border('right'), border('bottom'), border('left')],
      margin: padding ? [padding.top / 96, padding.right / 96, padding.bottom / 96, padding.left / 96] : 0,
      valign: cell.style.verticalAlign === 'center' ? 'middle' : cell.style.verticalAlign,
      lineSpacing: cell.style.lineHeight * 0.75, paraSpaceBefore: 0, paraSpaceAfter: 0,
    } };
  }));
}

function draw(options: {
  slide: PptxGenJS.PresSlide; block: Block; x: number; y: number; width: number; height: number; page: number; total: number;
  logger?: Pick<Logger, 'debug'>; link: SlideLinks;
}): void {
  const { slide, block, x, y, width, height, page, total } = options;
  if (block.kind === 'break') return;
  const bounds = { x: x / 96, y: y / 96, w: width / 96, h: height / 96 };
  if (block.kind === 'image') {
    const startedAt = performance.now();
    if (block.format !== 'png') throw new Error(`PowerPoint requires a PNG visual: ${block.source}`);
    if (!block.data) throw new Error(`Missing Office image data: ${block.source}`);
    slide.addImage({ ...bounds, data: `image/png;base64,${Buffer.from(block.data).toString('base64')}`, altText: block.alt });
    logVisual({ logger: options.logger, format: 'pptx', action: 'inserted', block, elapsedMs: performance.now() - startedAt, location: `slide ${page}` });
  } else if (block.kind === 'table') {
    const widthSum = block.columns.reduce((sum, value) => sum + value, 0);
    slide.addTable(tableRows({ block, page, total, link: options.link }), { ...bounds,
      colW: block.columns.map((value) => value / widthSum * bounds.w),
      rowH: block.rows.map((row) => row.height / 96),
      autoPage: false, margin: 0,
    });
  } else if (block.kind === 'paragraph') {
    if (!block.runs.some((run) => run.text.trim())) return;
    slide.addText(runsToPPTX({ runs: block.runs, page, total, link: options.link }), { ...textOptions(block.style), ...bounds,
      align: block.style.align, margin: 0, paraSpaceBefore: 0, paraSpaceAfter: 0,
      lineSpacingMultiple: undefined, lineSpacing: block.style.lineHeight * 0.75, valign: 'top', fit: 'none',
      fill: block.style.fill ? { color: block.style.fill } : undefined,
      bullet: block.list ? block.list.ordered ? { type: 'number', startAt: block.list.ordinal } : { type: 'bullet' } : undefined,
      indentLevel: block.list?.level,
    });
  } else {
    drawDecoration({ slide, style: block.style, source: block.source, x, y, width, height });
    block.blocks.forEach((child) => {
      if (child.kind === 'break') throw new Error(`Page break inside an indivisible column group: ${block.source}`);
      draw({ ...options, block: child, x: x + child.box.x - block.box.x, y: y + child.box.y - block.box.y, width: child.box.width, height: child.box.height });
    });
  }
}

export async function writePPTX(options: { document: OfficeDocument; logger?: Pick<Logger, 'debug'> }): Promise<Buffer> {
  const { document, logger } = options;
  const presentation = new PptxGenJS();
  presentation.defineLayout({ name: 'FACET_WIDE', width: SLIDE.inchesWidth, height: SLIDE.inchesHeight });
  presentation.layout = 'FACET_WIDE';
  presentation.title = document.title;
  presentation.author = 'Facet';
  const slides = paginate(document.pages);
  if (!slides.some(({ blocks }) => blocks.some(({ block }) => block.kind !== 'paragraph' || block.runs.some((run) => run.text.trim())))) throw new Error('PowerPoint export contains no visible content');
  const link = slideLinks(slides);
  slides.forEach((spec, index) => {
    const slide = presentation.addSlide();
    const position = { slide, page: index + 1, total: slides.length, logger, link };
    const chrome = (blocks: Block[], offset: number): void => blocks.forEach((block) => {
      if (block.kind === 'break') throw new Error('Page breaks are not supported in slide headers or footers');
      draw({ ...position, block, x: block.box.x, y: offset + block.box.y, width: block.box.width, height: block.box.height });
    });
    if (spec.page.header) chrome(spec.page.header.blocks, 0);
    spec.blocks.forEach((block) => draw({ ...position, ...block }));
    if (spec.page.footer) chrome(spec.page.footer.blocks, SLIDE.height - spec.page.footer.height);
  });
  return await presentation.write({ outputType: 'nodebuffer' }) as Buffer;
}
