import * as D from 'docx';
import type { Block, Group, Insets, Table, TextStyle } from '../model.js';
import { cellChildren, emptyParagraph, twips, type RenderBlocks } from './text.js';

const sides = ['top', 'right', 'bottom', 'left'] as const;
const zeroPadding = { top: 0, right: 0, bottom: 0, left: 0 };
const noBorders = Object.fromEntries([...sides, 'insideHorizontal', 'insideVertical'].map((side) => [side, { style: D.BorderStyle.NONE, size: 0 }]));

function contentWidth(options: { width: number; padding?: Insets; source: string }): number {
  const width = options.width - (options.padding?.left ?? 0) - (options.padding?.right ?? 0);
  if (!Number.isFinite(width) || width <= 0) throw new Error(`Word content width must be positive: ${options.source} (${width}px after padding)`);
  return width;
}

function cellStyle(style: TextStyle): Omit<D.ITableCellOptions, 'children'> {
  const padding = style.padding ?? zeroPadding;
  return {
    margins: Object.fromEntries(sides.map((side) => [side, twips(padding[side])])),
    verticalAlign: style.verticalAlign ?? 'top',
    shading: style.fill ? { fill: style.fill } : undefined,
    borders: Object.fromEntries(sides.map((side) => {
      const border = style.borders?.[side];
      return [side, { style: !border?.width ? D.BorderStyle.NONE : border.style === 'dashed' ? D.BorderStyle.DASHED : border.style === 'dotted' ? D.BorderStyle.DOTTED : D.BorderStyle.SINGLE,
        size: Math.round((border?.width ?? 0) * 6), color: border?.color ?? '000000' }];
    })),
  };
}

export function dataTable(options: { block: Table; width: number; render: RenderBlocks }): D.Table {
  const { block, width, render } = options;
  const scale = Math.min(1, width / block.box.width);
  const tableWidth = block.box.width * scale;
  const sum = block.columns.reduce((total, column) => total + column, 0);
  return new D.Table({
    width: { size: twips(tableWidth), type: D.WidthType.DXA },
    columnWidths: block.columns.map((column) => twips(column / sum * tableWidth)),
    layout: block.layout === 'fixed' ? D.TableLayoutType.FIXED : D.TableLayoutType.AUTOFIT, borders: noBorders,
    rows: block.rows.map((row) => new D.TableRow({ tableHeader: row.header, cantSplit: true,
      height: { value: twips(row.height), rule: D.HeightRule.ATLEAST },
      children: row.cells.map((cell) => new D.TableCell({
        ...cellStyle(cell.style),
        children: cell.blocks.length ? cellChildren(render(cell.blocks, contentWidth({ width: cell.box.width * scale, padding: cell.style.padding, source: block.source }))) : [emptyParagraph()],
        columnSpan: cell.colSpan, rowSpan: cell.rowSpan,
        width: { size: twips(cell.box.width * scale), type: D.WidthType.DXA },
      })),
    })),
  });
}

function columnRows(block: Group): Array<Exclude<Block, { kind: 'break' }>[]> {
  const rows: Array<Exclude<Block, { kind: 'break' }>[]> = [];
  for (const child of block.blocks) {
    if (child.kind === 'break') throw new Error(`Page break inside a Word column group: ${block.source}`);
    const row = rows[rows.length - 1];
    const previous = row?.[row.length - 1];
    if (!row || !previous || child.box.x < previous.box.x + 0.5) rows.push([child]);
    else row.push(child);
  }
  return rows;
}

function columns(options: { block: Group; width: number; render: RenderBlocks }): D.Table {
  const { block, width, render } = options;
  if (block.display === 'flex') return flexColumns(options);
  const padding = block.style.padding ?? zeroPadding;
  const sourceWidth = block.box.width - padding.left - padding.right;
  const scale = width / sourceWidth;
  const rows = columnRows(block);
  const edges = [...new Set([0, sourceWidth, ...rows.flatMap((row) => row.flatMap((child) => [child.box.x - block.box.x - padding.left, child.box.x - block.box.x - padding.left + child.box.width]))])].sort((a, b) => a - b);
  const boundaries = edges.filter((edge, index) => index === 0 || edge - edges[index - 1] > 0.5);
  const widths = boundaries.slice(1).map((edge, index) => twips((edge - boundaries[index]) * scale));
  return new D.Table({ width: { size: twips(width), type: D.WidthType.DXA }, columnWidths: widths,
    layout: D.TableLayoutType.AUTOFIT, borders: noBorders, margins: zeroPadding,
    rows: rows.map((row) => {
      const cells: D.TableCell[] = [];
      let column = 0;
      for (const child of row) {
        const start = boundaries.findIndex((edge) => Math.abs(edge - (child.box.x - block.box.x - padding.left)) <= 0.5);
        const end = boundaries.findIndex((edge) => Math.abs(edge - (child.box.x - block.box.x - padding.left + child.box.width)) <= 0.5);
        if (start < column || end <= start) throw new Error(`Invalid Word column geometry: ${child.source}`);
        if (start > column) cells.push(new D.TableCell({ children: [emptyParagraph()], borders: noBorders, columnSpan: start - column, margins: zeroPadding,
          width: { size: widths.slice(column, start).reduce((a, b) => a + b, 0), type: D.WidthType.DXA } }));
        const cellWidth = child.box.width * scale;
        cells.push(new D.TableCell({ children: cellChildren(render([child], cellWidth)), margins: zeroPadding, borders: noBorders,
          verticalAlign: block.style.verticalAlign ?? 'top', columnSpan: end - start, width: { size: twips(cellWidth), type: D.WidthType.DXA } }));
        column = end;
      }
      if (column < widths.length) cells.push(new D.TableCell({ children: [emptyParagraph()], margins: zeroPadding, borders: noBorders, columnSpan: widths.length - column,
        width: { size: widths.slice(column).reduce((a, b) => a + b, 0), type: D.WidthType.DXA } }));
      return new D.TableRow({ children: cells, cantSplit: false });
    }),
  });
}

function alignFlow(block: Block, align: TextStyle['align']): Block {
  if (block.kind === 'paragraph') return { ...block, style: { ...block.style, align } };
  if (block.kind === 'group' && block.layout !== 'columns') return { ...block, blocks: block.blocks.map((child) => alignFlow(child, align)) };
  return block;
}

function flexColumns(options: { block: Group; width: number; render: RenderBlocks }): D.Table {
  const { block, width, render } = options;
  return new D.Table({ width: { size: twips(width), type: D.WidthType.DXA },
    layout: D.TableLayoutType.AUTOFIT, borders: noBorders, margins: zeroPadding,
    rows: columnRows(block).map((row) => {
      const total = row.reduce((sum, child) => sum + child.box.width, 0);
      const free = width - total;
      return new D.TableRow({ cantSplit: false, children: row.map((child, index) => {
        const cellWidth = free >= 0 ? child.box.width + free / row.length : child.box.width / total * width;
        const left = index ? (block.gap ?? 0) / 2 : 0;
        const right = index < row.length - 1 ? (block.gap ?? 0) / 2 : 0;
        const contentWidth = cellWidth - left - right;
        if (contentWidth <= 0) throw new Error(`Word flex columns have no content width: ${block.source}`);
        const aligned = block.justify === 'space-between' && row.length > 1 && index === row.length - 1 ? alignFlow(child, 'right') : child;
        return new D.TableCell({ children: cellChildren(render([aligned], contentWidth)),
          margins: { top: 0, bottom: 0, left: twips(left), right: twips(right) }, borders: noBorders,
          verticalAlign: block.style.verticalAlign ?? 'top', width: { size: twips(cellWidth), type: D.WidthType.DXA } });
      }) });
    }),
  });
}

export function groupTable(options: { block: Group; width: number; render: RenderBlocks; float?: D.ITableFloatOptions; height?: number }): D.Table {
  const { block, render } = options;
  const width = options.width;
  const innerWidth = contentWidth({ width, padding: block.style.padding, source: block.source });
  const children = block.layout === 'columns' ? [columns({ block, width: innerWidth, render })] : cellChildren(render(block.blocks, innerWidth));
  return new D.Table({
    width: { size: twips(width), type: D.WidthType.DXA }, columnWidths: [twips(width)],
    layout: D.TableLayoutType.FIXED, borders: noBorders, float: options.float,
    rows: [new D.TableRow({ cantSplit: false, height: options.height ? { value: twips(options.height), rule: D.HeightRule.ATLEAST } : undefined,
      children: [new D.TableCell({ ...cellStyle(block.style), children: children.length ? children : [emptyParagraph()], width: { size: twips(width), type: D.WidthType.DXA } })] })],
  });
}
