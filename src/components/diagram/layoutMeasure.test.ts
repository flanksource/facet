import { afterEach, describe, expect, it } from 'vitest';

import { measureLayout } from './layoutMeasure';

const SVG_NS = 'http://www.w3.org/2000/svg';

function domRect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}) };
}

function arrowContainer(from: string, to: string, pathGeometry?: { length: number; ctm: Pick<DOMMatrix, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'> }) {
  const container = document.createElement('div');
  Object.assign(container.dataset, { facetArrow: '', facetFrom: from, facetTo: to });
  const svg = document.createElementNS(SVG_NS, 'svg');
  const path = document.createElementNS(SVG_NS, 'path');
  if (pathGeometry) {
    Object.assign(path, {
      getTotalLength: () => pathGeometry.length,
      getPointAtLength: (distance: number) => ({ x: distance, y: 0 }),
      getScreenCTM: () => pathGeometry.ctm,
    });
  }
  svg.append(path);
  container.append(svg);
  return container;
}

function labelElement(name: string, rect: DOMRect) {
  const element = document.createElement('span');
  element.dataset.facetLabel = name;
  element.textContent = name;
  element.getBoundingClientRect = () => rect;
  return element;
}

afterEach(() => {
  delete (Range.prototype as Partial<Range>).getClientRects;
});

describe('measureLayout', () => {
  it('names each label, keeps its non-empty line rects and records the arrow container it lives in', () => {
    const root = document.createElement('div');
    const pill = labelElement('edge "b" -> "c" label', domRect(50, 60, 30, 10));
    const second = arrowContainer('b', 'c');
    second.append(pill);
    root.append(labelElement('step "a" action', domRect(10, 20, 80, 12)), arrowContainer('a', 'b'), second);
    const lineRects = [domRect(12, 20, 40, 12), domRect(0, 0, 0, 12)];
    Range.prototype.getClientRects = () => lineRects as unknown as DOMRectList;

    expect(measureLayout(root).labels).toEqual([
      { name: 'step "a" action', box: { left: 10, top: 20, right: 90, bottom: 32 }, lines: [{ left: 12, top: 20, right: 52, bottom: 32 }] },
      { name: 'edge "b" -> "c" label', box: { left: 50, top: 60, right: 80, bottom: 70 }, lines: [{ left: 12, top: 20, right: 52, bottom: 32 }], arrowGroup: 1 },
    ]);
  });

  it('samples each arrow path every 2px up to its end and maps the points to screen coordinates', () => {
    const root = document.createElement('div');
    root.append(arrowContainer('a', 'b', { length: 5, ctm: { a: 1, b: 0, c: 0, d: 1, e: 10, f: 20 } }));

    expect(measureLayout(root).arrows).toEqual([
      { name: 'a -> b', group: 0, points: [{ x: 10, y: 20 }, { x: 12, y: 20 }, { x: 14, y: 20 }, { x: 15, y: 20 }] },
    ]);
  });

  it('skips arrow sampling where the environment has no SVG geometry', () => {
    const root = document.createElement('div');
    root.append(arrowContainer('a', 'b'));

    expect(measureLayout(root).arrows).toEqual([]);
  });

  it('fails when an arrow path has no screen transform', () => {
    const root = document.createElement('div');
    root.append(arrowContainer('a', 'b', { length: 5, ctm: null as unknown as DOMMatrix }));

    expect(() => measureLayout(root)).toThrow('Diagram: arrow a -> b has no screen transform');
  });
});
