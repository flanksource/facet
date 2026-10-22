import type { ColorInventory } from './colors.js';
export interface Dimensions { widthMm: number; heightMm: number }
export interface SectionInfo {
  index: number;
  elementPath: string;
  size: Dimensions | null;
  orientation: string | null;
  margins: Record<'topMm' | 'rightMm' | 'bottomMm' | 'leftMm' | 'headerMm' | 'footerMm' | 'gutterMm', number | null>;
}
export interface AssetUse {
  part: string;
  elementPath?: string;
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
  pdf?: PdfInspection;
  colors?: ColorInventory;
}
export interface WordFont {
  name: string;
  kind: 'font' | 'theme';
  sources: string[];
  embedded: { part: string; variant: string }[];
  locations: { part: string; elementPath: string }[];
}
export interface PdfReference { page: number; object?: string; resource?: string }
export interface PdfPage {
  page: number;
  object: string;
  widthPt: number;
  heightPt: number;
  rotation: number;
  userUnit: number;
  mediaBox: { x: number; y: number; width: number; height: number };
  cropBox: { x: number; y: number; width: number; height: number };
}
export interface PdfImage {
  width: number;
  height: number;
  bytes: number;
  bitsPerComponent?: number;
  imageMask: boolean;
  locations: PdfReference[];
}
export interface PdfInspection { pages: Dimensions[]; pageDetails: PdfPage[]; fonts: PdfFont[]; images: PdfImage[]; colors?: ColorInventory }
export interface PdfFont {
  asset: string;
  name: string;
  type: string;
  embedded: boolean | null;
  subset: boolean;
  pages: number[];
  locations: PdfReference[];
}
export interface DocxInspection {
  part: string;
  sections: SectionInfo[];
  assets: AssetInfo[];
  fonts: { word: WordFont[]; pdf: PdfFont[] };
}
