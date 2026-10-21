import * as D from 'docx';
import { performance } from 'node:perf_hooks';
import type { Logger } from '../utils/logger.js';
import { PAGE_SIZES, resolvePageSize } from '../utils/pdf-multipass.js';
import type { Block, Chrome, OfficeDocument, OfficePage, Paragraph } from './model.js';
import { wordChrome } from './word/chrome.js';
import type { PdfChrome } from './word/pdf-chrome.js';
import { dataTable, groupTable } from './word/tables.js';
import { wordContents } from './word/toc.js';
import { mm, paragraph, twips, type RenderBlocks, type WordBlock } from './word/text.js';
import { packageEmbeddedPdfs, pdfObject, pdfOle, type EmbeddedPdf } from './word/embedded-pdf.js';
import { logVisual } from './logging.js';

function renderer(options: { document: OfficeDocument; pdfs: EmbeddedPdf[]; logger?: Pick<Logger, 'debug'> }): RenderBlocks {
  const { document, pdfs, logger } = options;
  const contents = wordContents(document);
  let diagrams = 0;
  const render: RenderBlocks = (blocks, width) => blocks.flatMap((block): WordBlock[] => {
    if (block.kind === 'break') return [new D.Paragraph({ children: [new D.PageBreak()] })];
    if (block.kind === 'paragraph') return [paragraph(block, { prefix: contents.prefix(block), anchor: contents.anchor, runPrefix: contents.prefix })];
    const prefix = contents.prefix(block);
    const anchors = prefix.length ? [new D.Paragraph({ children: prefix, keepNext: true, spacing: { before: 0, after: 0, line: 1, lineRule: D.LineRuleType.EXACT } })] : [];
    if (block.kind === 'group') return [...anchors, ...(block.toc ? contents.render(block, width) : [groupTable({ block, width, render })])];
    if (block.kind === 'image') {
      const startedAt = performance.now();
      if (!block.data) throw new Error(`Missing Office image data: ${block.source}`);
      const scale = Math.min(1, width / block.box.width);
      if (block.format === 'pdf') {
        const index = ++diagrams;
        const part = { id: `facetDiagram${index}`, path: `word/embeddings/facetDiagram${index}.bin`, data: pdfOle(block.data) };
        pdfs.push(part);
        const paragraph = new D.Paragraph({ spacing: { before: twips(block.style.before), after: twips(block.style.after) }, children: [
          pdfObject({ part, width: block.box.width * scale, height: block.box.height * scale, shapeId: `facetDiagramShape${index}` }),
        ] });
        logVisual({ logger, format: 'docx', action: 'inserted', block, startedAt, location: part.path });
        return [...anchors, paragraph];
      }
      const paragraph = new D.Paragraph({ spacing: { before: 0, after: 0 }, children: [new D.ImageRun({ type: 'png', data: block.data,
        transformation: { width: Math.round(block.box.width * scale), height: Math.round(block.box.height * scale) },
        altText: { title: block.alt, description: block.alt, name: block.mediaId } })] });
      logVisual({ logger, format: 'docx', action: 'inserted', block, startedAt });
      return [...anchors, paragraph];
    }
    return [...anchors, dataTable({ block, width, render })];
  });
  return render;
}

function section(options: { page: OfficePage; render: RenderBlocks; assets: ReadonlyMap<Chrome, PdfChrome>; chrome: ReturnType<typeof wordChrome>['render'] }): D.ISectionOptions {
  const { page, render, assets, chrome } = options;
  if (!PAGE_SIZES[page.size.toLowerCase()] && !/^\d+(?:\.\d+)?x\d+(?:\.\d+)?$/.test(page.size)) throw new Error(`Invalid Office page size: ${page.size}`);
  const size = resolvePageSize(page.size);
  if (size.width <= 0 || size.height <= 0) throw new Error(`Invalid Office page dimensions: ${page.size}`);
  const width = (size.width - page.margins.left - page.margins.right) * 96 / 25.4;
  if (width <= 0) throw new Error('Word margins leave no content width');
  const headerHeight = page.header ? assets.get(page.header)?.height ?? 0 : 0;
  const footerHeight = page.footer ? assets.get(page.footer)?.height ?? 0 : 0;
  if (size.height * 96 / 25.4 <= headerHeight + footerHeight + (page.margins.top + page.margins.bottom) * 96 / 25.4) throw new Error('Word header/footer and margins leave no content height');
  return {
    properties: { type: D.SectionType.NEXT_PAGE, page: {
      size: { width: mm(size.width), height: mm(size.height) },
      margin: {
        top: mm(page.margins.top) + twips(headerHeight), bottom: mm(page.margins.bottom) + twips(footerHeight),
        left: mm(page.margins.left), right: mm(page.margins.right), header: 0, footer: 0,
      },
    } },
    headers: { default: new D.Header({ children: chrome(page.header, 0) }) },
    footers: { default: new D.Footer({ children: chrome(page.footer, size.height * 96 / 25.4 - footerHeight) }) },
    children: render(page.blocks, width),
  };
}

export async function writeDOCX(options: { document: OfficeDocument; assets: ReadonlyMap<Chrome, PdfChrome>; logger?: Pick<Logger, 'debug'> }): Promise<Buffer> {
  const { document, assets } = options;
  const lists = new Map<string, NonNullable<Paragraph['list']>>();
  const collect = (blocks: Block[]): void => blocks.forEach((block) => {
    if (block.kind === 'paragraph' && block.list) {
      if (block.list.level > 8) throw new Error('Word lists support at most nine nesting levels');
      lists.set(block.list.id, block.list);
    }
    if (block.kind === 'group') collect(block.blocks);
    if (block.kind === 'table') block.rows.forEach((row) => row.cells.forEach((cell) => collect(cell.blocks)));
  });
  document.pages.forEach((page) => collect(page.blocks));
  const pdfs: EmbeddedPdf[] = [];
  const render = renderer({ document, pdfs, logger: options.logger });
  const chrome = wordChrome({ assets, pdfs });
  const buffer = await D.Packer.toBuffer(new D.Document({ title: document.title, creator: 'Facet',
    features: { updateFields: true },
    numbering: { config: [...lists.values()].map((list) => ({ reference: list.id, levels: Array.from({ length: 9 }, (_, level) => ({
      level, format: list.ordered ? D.LevelFormat.DECIMAL : D.LevelFormat.BULLET,
      text: list.ordered ? `%${level + 1}.` : '•', start: list.start,
      style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
    })) })) },
    sections: document.pages.map((page) => section({ page, render, assets, chrome: chrome.render })),
  }));
  return packageEmbeddedPdfs({ document: buffer, pdfs });
}
