import Xarrow, { type xarrowPropsType } from 'react-xarrows';
import { COLORS } from './colors';

/**
 * Named arrow styles from the diagram Line Style Catalog. Pass `variant`
 * instead of repeating color/stroke/dash props per arrow.
 *
 * - `primary`   — main data flow in flow/pipeline diagrams (animated dashed)
 * - `secondary` — supplementary flows (thinner, muted, animated dashed)
 * - `er`        — foreign-key relationships in entity-model diagrams (solid, curved)
 * - `bidirectional` — non-directional connections (solid, circle endpoints)
 */
export type ArrowVariant = 'primary' | 'secondary' | 'er' | 'bidirectional';

type VariantProps = Pick<
  xarrowPropsType,
  'color' | 'strokeWidth' | 'headSize' | 'dashness' | 'curveness' | 'headShape' | 'tailShape' | 'showHead'
>;

/** Pure mapping of variant → react-xarrows props. Exported for unit testing. */
export function variantProps(variant: ArrowVariant): VariantProps {
  switch (variant) {
    case 'primary':
      return {
        color: COLORS.primary,
        strokeWidth: 3,
        headSize: 4,
        dashness: { strokeLen: 10, nonStrokeLen: 5, animation: 1 },
      };
    case 'secondary':
      return {
        color: COLORS.muted,
        strokeWidth: 2,
        headSize: 3,
        dashness: { strokeLen: 6, nonStrokeLen: 4, animation: 1 },
      };
    case 'er':
      return {
        color: COLORS.muted,
        strokeWidth: 1.5,
        headSize: 4,
        curveness: 0.4,
      };
    case 'bidirectional':
      return {
        color: COLORS.muted,
        strokeWidth: 2,
        headSize: 3,
        headShape: 'circle',
        tailShape: 'circle',
        showHead: true,
      };
  }
}

export interface ArrowProps extends Omit<xarrowPropsType, keyof VariantProps> {
  /** Preset style bundle. Individual props below override the preset. */
  variant?: ArrowVariant;
  color?: string;
  strokeWidth?: number;
  headSize?: number;
  dashness?: xarrowPropsType['dashness'];
  curveness?: number;
  headShape?: xarrowPropsType['headShape'];
  tailShape?: xarrowPropsType['tailShape'];
  showHead?: boolean;
}

/**
 * A diagram arrow. Thin wrapper over react-xarrows `Xarrow` that applies a
 * named `variant` preset; any explicitly-passed prop overrides the preset.
 */
export default function Arrow({ variant = 'primary', ...overrides }: ArrowProps) {
  const props = { ...variantProps(variant), ...overrides };
  return <Xarrow {...(props as xarrowPropsType)} />;
}
