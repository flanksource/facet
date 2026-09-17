import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';

import { markerShape, variantProps } from './Arrow';
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

describe('markerShape', () => {
  it.each([
    ['arrow1', '<path d="M 0 0 L 1 0.5 L 0 1 L 0.25 0.5 z"'],
    ['heart', '<path d="M 0 0.25 A 0.125 0.125 0 0 1 0.5 0.25 A 0.125 0.125 0 0 1 1 0.25 Q 1 0.625 0.5 1 Q 0 0.625 0 0.25 z"'],
    ['circle', '<circle cx="0.5" cy="0.5" r="0.5"'],
  ] as const)('renders the built-in %s marker', (shape, expectedMarkup) => {
    expect(renderToStaticMarkup(markerShape(shape, COLORS.primary))).toContain(expectedMarkup);
  });

  it('renders custom marker content with the arrow color and marker props', () => {
    const markup = renderToStaticMarkup(markerShape(
      { svgElem: <rect height="1" width="1" />, offsetForward: 0 },
      COLORS.primary,
      { stroke: COLORS.background },
    ));

    expect(markup).toContain(`<g fill="${COLORS.primary}" stroke="${COLORS.background}"><rect height="1" width="1"></rect></g>`);
  });
});
