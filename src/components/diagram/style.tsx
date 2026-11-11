import { createContext, useContext, type ReactNode } from 'react';
import type { BoxStyle, ContainerStyle, NodeFonts, NodePalette } from './nodeStyles';

export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = typeof DENSITIES[number];

/** Inline spacing and type per density; inline so no consumer has to scan for generated classes. */
export const DENSITY_TOKENS: Record<Density, { header: string; body: string; footer: string; gap: string; title: string; detail: string }> = {
  compact: { header: '8px', body: '8px', footer: '4px 0', gap: '8px', title: '0.6875rem', detail: '0.59375rem' },
  comfortable: { header: '8px 12px', body: '12px', footer: '8px 0', gap: '12px', title: '0.75rem', detail: '0.625rem' },
  spacious: { header: '12px 16px', body: '16px', footer: '10px 0', gap: '16px', title: '0.875rem', detail: '0.6875rem' },
};

export type Orientation = 'row' | 'column';

/**
 * The default node shapes for each layout/… placement. A placement says how a
 * whole figure is arranged; nodes inside it pick the box and container style
 * that arrangement reads best with, unless a node sets its own variant.
 */
export const PLACEMENT_SHAPES = {
  bands: { box: 'pill', container: 'lane', orientation: 'row' },
  'framed-tiers': { box: 'pill', container: 'lane', orientation: 'row' },
  matrix: { box: 'tinted', container: 'zone', orientation: 'row' },
  subgrid: { box: 'card', container: 'panel', orientation: 'row' },
  iso: { box: 'tile', container: 'frame', orientation: 'row' },
  radial: { box: 'pill', container: 'zone', orientation: 'row' },
  planes: { box: 'card', container: 'column', orientation: 'column' },
  nested: { box: 'outlined', container: 'boundary', orientation: 'column' },
  hub: { box: 'header', container: 'zone', orientation: 'column' },
  grid: { box: 'outlined', container: 'zone', orientation: 'row' },
  graph: { box: 'outlined', container: 'zone', orientation: 'row' },
  columns: { box: 'card', container: 'column', orientation: 'column' },
  lanes: { box: 'pill', container: 'lane', orientation: 'row' },
  snake: { box: 'outlined', container: 'zone', orientation: 'row' },
  'fan-out': { box: 'card', container: 'card-group', orientation: 'row' },
  ring: { box: 'pill', container: 'zone', orientation: 'row' },
  rail: { box: 'tile', container: 'frame', orientation: 'row' },
  gantt: { box: 'accent', container: 'lane', orientation: 'row' },
} as const satisfies Record<string, { box: BoxStyle; container: ContainerStyle; orientation: Orientation }>;

export type DiagramPlacement = keyof typeof PLACEMENT_SHAPES;
export const PLACEMENTS = Object.keys(PLACEMENT_SHAPES) as DiagramPlacement[];

export interface DiagramStyle {
  palette?: NodePalette;
  fonts?: NodeFonts;
  density?: Density;
  placement?: DiagramPlacement;
}

const DiagramStyleContext = createContext<DiagramStyle>({});

/**
 * Sets the palette, fonts, density and placement for every BoxNode and
 * ContainerNode below it. Nested providers override only the fields they set;
 * a prop on a node always wins.
 */
export function DiagramStyleProvider({ children, ...style }: DiagramStyle & { children: ReactNode }) {
  const parent = useContext(DiagramStyleContext);
  if (style.placement !== undefined && !Object.prototype.hasOwnProperty.call(PLACEMENT_SHAPES, style.placement)) {
    throw new Error(`Unknown diagram placement: ${style.placement}. Expected one of ${PLACEMENTS.join(', ')}.`);
  }
  if (style.density !== undefined && !DENSITIES.includes(style.density)) {
    throw new Error(`Unknown diagram density: ${style.density}. Expected one of ${DENSITIES.join(', ')}.`);
  }
  const defined = Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined));
  return <DiagramStyleContext.Provider value={{ ...parent, ...defined }}>{children}</DiagramStyleContext.Provider>;
}

/** The style in effect: provider values, with density defaulting to comfortable. */
export function useDiagramStyle() {
  const style = useContext(DiagramStyleContext);
  return {
    ...style,
    density: style.density ?? 'comfortable',
    shape: style.placement ? PLACEMENT_SHAPES[style.placement] : undefined,
  };
}
