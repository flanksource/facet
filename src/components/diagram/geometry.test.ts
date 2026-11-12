import { describe, expect, it } from 'vitest';

import { localRect, measureArrow } from './geometry';

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

const ROOT_LEFT = 40;
const ROOT_TOP = 20;
const ROOT_WIDTH = 800;
const ROOT_HEIGHT = 400;

/** Rects are given in unscaled viewport coordinates; `scale` simulates a CSS-scaled ancestor of the root. */
function rootWith(rects: Record<string, DOMRect>, scale = 1, offsetWidth = ROOT_WIDTH): HTMLDivElement {
  const scaled = ({ left, top, width, height }: DOMRect) => rect(
    ROOT_LEFT + (left - ROOT_LEFT) * scale,
    ROOT_TOP + (top - ROOT_TOP) * scale,
    width * scale,
    height * scale,
  );
  const elements = Object.fromEntries(
    Object.entries(rects).map(([id, value]) => [
      id,
      { getBoundingClientRect: () => scaled(value) },
    ]),
  );
  return {
    getBoundingClientRect: () => rect(ROOT_LEFT, ROOT_TOP, ROOT_WIDTH * scale, ROOT_HEIGHT * scale),
    offsetWidth,
    ownerDocument: {
      getElementById: (id: string) => elements[id] ?? null,
    },
  } as unknown as HTMLDivElement;
}

describe('localRect', () => {
  it('divides the viewport rect by the root scale so it is expressed in root CSS px', () => {
    const root = rootWith({}, 0.5);
    const element = { getBoundingClientRect: () => rect(140, 70, 50, 30) } as unknown as HTMLElement;

    expect(localRect(element, root)).toEqual({
      bottom: 160, height: 60, left: 200, right: 300, top: 100, width: 100,
    });
  });

  it('returns null when the root has no layout box', () => {
    const root = rootWith({}, 1, 0);
    const element = { getBoundingClientRect: () => rect(0, 0, 10, 10) } as unknown as HTMLElement;

    expect(localRect(element, root)).toBeNull();
  });
});

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

  it('produces the same geometry under a root scaled to 50% as at full size', () => {
    const rects = {
      source: rect(100, 100, 100, 60),
      target: rect(400, 120, 120, 80),
    };
    const options = {
      curveness: 0.8,
      endAnchor: 'auto' as const,
      from: 'source',
      path: 'smooth' as const,
      startAnchor: 'auto' as const,
      to: 'target',
    };

    expect(measureArrow({ ...options, root: rootWith(rects, 0.5) }))
      .toEqual(measureArrow({ ...options, root: rootWith(rects, 1) }));
  });

  it('returns null when the root has no layout box', () => {
    expect(measureArrow({
      curveness: 0.8,
      endAnchor: 'left',
      from: 'source',
      path: 'straight',
      root: rootWith({ source: rect(100, 100, 100, 60), target: rect(400, 120, 120, 80) }, 1, 0),
      startAnchor: 'right',
      to: 'target',
    })).toBeNull();
  });

  it('returns perpendicular label normals for horizontal and vertical paths', () => {
    const horizontal = measureArrow({
      curveness: 0.8, endAnchor: 'left', from: 'source', path: 'straight', root,
      startAnchor: 'right', to: 'target',
    });
    const vertical = measureArrow({
      curveness: 0.8, endAnchor: 'top', from: 'source', path: 'straight',
      root: rootWith({ source: rect(100, 100, 100, 60), target: rect(100, 300, 100, 60) }),
      startAnchor: 'bottom', to: 'target',
    });

    expect(horizontal?.labelMiddle.normal.y).toBeLessThan(0);
    expect(vertical?.labelMiddle.normal.x).toBeLessThan(0);
  });
});
