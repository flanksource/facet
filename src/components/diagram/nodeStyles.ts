export const BOX_STYLES = [
  'outlined', 'header', 'tinted', 'card', 'dashed', 'stacked',
  'chip-dark', 'pill', 'tile', 'accent', 'borderless', 'ghost',
] as const;

export type BoxStyle = typeof BOX_STYLES[number];

export const CONTAINER_STYLES = [
  'zone', 'boundary', 'binding', 'region', 'header', 'panel',
  'frame', 'exception', 'lane', 'column', 'card-group',
] as const;

export type ContainerStyle = typeof CONTAINER_STYLES[number];

export interface NodePalette {
  accent: string;
  tint: string;
  containerTint: string;
  border: string;
  surface: string;
  panel: string;
  panelBorder: string;
  text: string;
  muted: string;
  onAccent: string;
  dark: string;
  onDark: string;
}

export interface NodeFonts {
  heading: string;
  body: string;
  mono: string;
}
import { COLORS } from './colors';


export const DEFAULT_NODE_PALETTE: NodePalette = {
  accent: COLORS.primary, tint: COLORS.background, containerTint: '#fbfdff', border: COLORS.primary,
  surface: '#ffffff', text: '#0f172a', muted: COLORS.muted,
  panel: '#f1f5f9', panelBorder: '#cbd5e1',
  onAccent: '#ffffff', dark: '#0f172a', onDark: '#ffffff',
};

export const BOX_CLASSES: Record<BoxStyle, string> = {
  outlined: 'rounded-md border bg-white',
  header: 'rounded-xl overflow-hidden border-2',
  tinted: 'rounded-md border',
  card: 'rounded-md border',
  dashed: 'rounded-md border border-dashed',
  stacked: 'relative isolate rounded-md border',
  'chip-dark': 'rounded-lg border',
  pill: 'rounded-full border',
  tile: 'aspect-square flex flex-col items-center justify-center rounded-sm',
  accent: 'rounded-r-md border border-l-4',
  borderless: 'border-0',
  ghost: 'rounded-md border border-dashed opacity-60',
};

export const CONTAINER_CLASSES: Record<ContainerStyle, string> = {
  zone: 'rounded-md border border-solid',
  boundary: 'rounded-md border border-dashed',
  binding: 'rounded-md border border-solid',
  region: 'rounded-md border border-dashed',
  header: 'rounded-md border border-solid',
  panel: 'rounded-md border border-solid',
  frame: 'rounded-md border border-dashed',
  exception: 'rounded-md border border-dashed',
  lane: 'rounded-md border border-solid',
  column: 'min-h-32 rounded-md border border-dashed',
  'card-group': 'rounded-md border-0',
};
