import { describe, it, expect } from 'vitest';
import { variantProps } from './Arrow';
import { COLORS } from './colors';

// Reference: the diagram Line Style Catalog. Each variant maps to a fixed,
// independently-specified prop bundle — not derived from the function output.
describe('variantProps', () => {
  it('primary: animated dashed blue main flow (stroke 3, head 4)', () => {
    expect(variantProps('primary')).toEqual({
      color: COLORS.primary,
      strokeWidth: 3,
      headSize: 4,
      dashness: { strokeLen: 10, nonStrokeLen: 5, animation: 1 },
    });
  });

  it('secondary: thinner muted animated dashed (stroke 2, head 3)', () => {
    expect(variantProps('secondary')).toEqual({
      color: COLORS.muted,
      strokeWidth: 2,
      headSize: 3,
      dashness: { strokeLen: 6, nonStrokeLen: 4, animation: 1 },
    });
  });

  it('er: solid curved muted relationship (no dashness, curveness 0.4)', () => {
    const props = variantProps('er');
    expect(props.dashness).toBeUndefined();
    expect(props.curveness).toBe(0.4);
    expect(props.color).toBe(COLORS.muted);
    expect(props.strokeWidth).toBe(1.5);
  });

  it('bidirectional: circle endpoints, no dash', () => {
    const props = variantProps('bidirectional');
    expect(props.headShape).toBe('circle');
    expect(props.tailShape).toBe('circle');
    expect(props.dashness).toBeUndefined();
  });
});
