export interface Dimensions { widthMm: number; heightMm: number }
export interface SectionInfo {
  index: number;
  size: Dimensions | null;
  orientation: string | null;
  margins: Record<'topMm' | 'rightMm' | 'bottomMm' | 'leftMm' | 'headerMm' | 'footerMm' | 'gutterMm', number | null>;
}
export interface AssetUse {
  part: string;
  relationshipId: string;
  role: 'body' | 'header' | 'footer' | 'font' | 'other';
  kind: 'image' | 'object' | 'font' | 'relationship';
  dimensions?: Dimensions;
  preview?: string;
}
export interface AssetInfo {
  path: string;
  contentType: string;
  format: string;
  bytes: number;
  payloadBytes?: number;
  progIds: string[];
  streams?: string[];
  uses: AssetUse[];
  previewFor: string[];
  pdf?: { pages: Dimensions[] };
}
export interface WordFont {
  name: string;
  kind: 'font' | 'theme';
  sources: string[];
  embedded: { part: string; variant: string }[];
}
export interface PdfFont {
  asset: string;
  name: string;
  type: string;
  embedded: boolean | null;
  subset: boolean;
  pages: number[];
}
export interface DocxInspection {
  sections: SectionInfo[];
  assets: AssetInfo[];
  fonts: { word: WordFont[]; pdf: PdfFont[] };
}
