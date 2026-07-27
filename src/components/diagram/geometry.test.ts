import { describe, expect, it } from 'vitest';

import { measureArrow } from './geometry';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function rootWith(rects: Record<string, DOMRect>): HTMLDivElement {
  const elements = Object.fromEntries(
    Object.entries(rects).map(([id, value]) => [
      id,
      { getBoundingClientRect: () => value },
    ]),
  );
  return {
    getBoundingClientRect: () => rect(40, 20, 800, 400),
    ownerDocument: {
      getElementById: (id: string) => elements[id] ?? null,
    },
  } as unknown as HTMLDivElement;
}

describe('measureArrow', () => {
  const root = rootWith({
    source: rect(100, 100, 100, 60),
    target: rect(400, 120, 120, 80),
  });

  it('resolves a straight right-to-left path relative to the diagram root', () => {
    expect(measureArrow({
      curveness: 0.8,
      endAnchor: 'left',
      from: 'source',
      path: 'straight',
      root,
      startAnchor: 'right',
      to: 'target',
    })).toMatchObject({
      end: { x: 360, y: 140 },
      path: 'M 160 110 L 360 140',
      start: { x: 160, y: 110 },
    });
  });

  it('applies explicit anchor offsets', () => {
    expect(measureArrow({
      curveness: 0.8,
      endAnchor: { position: 'left', offset: { y: 12 } },
      from: 'source',
      path: 'straight',
      root,
      startAnchor: { position: 'right', offset: { y: -8 } },
      to: 'target',
    })).toMatchObject({
      end: { x: 360, y: 152 },
      start: { x: 160, y: 102 },
    });
  });

  it('builds an orthogonal grid route from a vertical anchor', () => {
    const verticalRoot = rootWith({
      source: rect(100, 100, 100, 60),
      target: rect(400, 260, 120, 80),
    });
    expect(measureArrow({
      curveness: 0.8,
      endAnchor: 'left',
      from: 'source',
      gridBreak: '25%',
      path: 'grid',
      root: verticalRoot,
      startAnchor: 'bottom',
      to: 'target',
    })).toMatchObject({
      labelMiddle: { x: 270, y: 175 },
      path: 'M 110 140 L 110 175 L 360 175 L 360 280',
    });
  });

  it('returns null when an endpoint is missing', () => {
    expect(measureArrow({
      curveness: 0.8,
      endAnchor: 'left',
      from: 'missing',
      path: 'straight',
      root,
      startAnchor: 'right',
      to: 'target',
    })).toBeNull();
  });
});
