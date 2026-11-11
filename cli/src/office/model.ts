export interface Box { x: number; y: number; width: number; height: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Border { color?: string; width: number; style: string }

export interface TextStyle {
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  fill?: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  before: number;
  after: number;
  border?: string;
  borderWidth: number;
  padding?: Insets;
  borders?: Record<keyof Insets, Border>;
  verticalAlign?: 'top' | 'center' | 'bottom';
  wordWrap?: boolean;
}

export interface Run { text: string; style: TextStyle; href?: string; anchors?: string[]; pageTarget?: string }
export interface Line { runs: Run[]; height: number }
export interface BlockBase { box: Box; style: TextStyle; source: string; anchors?: string[] }
export interface Paragraph extends BlockBase {
  kind: 'paragraph';
  runs: Run[];
  lines: Line[];
  heading?: number;
  list?: { ordered: boolean; level: number; start: number; ordinal: number; id: string };
}
export interface Image extends BlockBase { kind: 'image'; format: 'png' | 'pdf'; mediaId: string; data?: Uint8Array; preview?: Uint8Array; alt: string }
export interface Cell { blocks: Block[]; colSpan: number; rowSpan: number; box: Box; style: TextStyle }
export interface Row { cells: Cell[]; header: boolean; height: number }
export interface Table extends BlockBase { kind: 'table'; rows: Row[]; columns: number[]; layout?: 'auto' | 'fixed' }
export interface TocEntry { title: string; target?: string; page?: string; level: number; style: TextStyle }
export interface Group extends BlockBase {
  kind: 'group';
  blocks: Block[];
  layout?: 'columns' | 'stack';
  display?: 'flex' | 'grid';
  gap?: number;
  justify?: string;
  toc?: { title?: Paragraph; entries: TocEntry[] };
}
export interface Break { kind: 'break' }
export type Block = Paragraph | Image | Table | Group | Break;
export interface Chrome { blocks: Block[]; height: number; selector: string }
export interface OfficePage {
  size: string;
  blocks: Block[];
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  header?: Chrome;
  footer?: Chrome;
}
export interface OfficeDocument { title: string; pages: OfficePage[] }
