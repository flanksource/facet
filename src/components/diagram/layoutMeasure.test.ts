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

  it('measures the diagram bounds from the root', () => {
    const root = document.createElement('div');
    root.getBoundingClientRect = () => domRect(5, 10, 300, 200);

    expect(measureLayout(root).bounds).toEqual({ left: 5, top: 10, right: 305, bottom: 210 });
  });

  it('records the computed font size of each element holding text, once per element', () => {
    const root = document.createElement('div');
    const title = document.createElement('div');
    title.style.fontSize = '7.5px';
    title.append('Run history', document.createElement('br'), 'Sessions');
    const blank = document.createElement('span');
    blank.style.fontSize = '4px';
    blank.textContent = '  ';
    root.append(title, blank);
    document.body.append(root);

    expect(measureLayout(root).texts).toEqual([{ name: 'Run history', fontPx: 7.5 }]);
    root.remove();
  });

  it('records bordered boxes with their fill, border and nearest bordered ancestor', () => {
    const root = document.createElement('div');
    const zone = document.createElement('section');
    zone.style.cssText = 'border: 1px solid rgb(147, 197, 253); background-color: rgb(239, 246, 255)';
    zone.append('Control plane');
    const wrapper = document.createElement('div');
    const member = document.createElement('div');
    member.style.cssText = 'border: 1px dashed rgb(147, 197, 253); background-color: rgb(255, 255, 255)';
    member.textContent = 'Run API';
    const divider = document.createElement('div');
    divider.style.cssText = 'border-bottom: 1px solid rgb(226, 232, 240)';
    divider.textContent = 'Engine';
    wrapper.append(member, divider);
    zone.append(wrapper);
    root.append(zone);
    document.body.append(root);

    expect(measureLayout(root).boxes).toEqual([
      { name: 'Control planeRun APIEngine', fill: 'rgb(239, 246, 255)', border: 'rgb(147, 197, 253)', borderStyle: 'solid' },
      { name: 'Run API', fill: 'rgb(255, 255, 255)', border: 'rgb(147, 197, 253)', borderStyle: 'dashed', parent: 0 },
    ]);
    root.remove();
  });
});
