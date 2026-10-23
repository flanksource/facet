import type { ArrowMeasure, BoxMeasure, LabelMeasure, LayoutMeasure, Rect, TextMeasure } from './layoutCheck';

const ARROW_SAMPLE_PX = 2;

function toRect({ left, top, right, bottom }: DOMRect): Rect {
  return { left, top, right, bottom };
}

function measureLabels(root: HTMLElement, arrowContainers: Element[]): LabelMeasure[] {
  return [...root.querySelectorAll<HTMLElement>('[data-facet-label]')].map((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const lines = [...range.getClientRects()].filter((line) => line.width > 0 && line.height > 0).map(toRect);
    const container = element.closest('[data-facet-arrow]');
    return {
      name: element.dataset.facetLabel!,
      box: toRect(element.getBoundingClientRect()),
      lines,
      ...(container ? { arrowGroup: arrowContainers.indexOf(container) } : {}),
    };
  });
}

function measureArrow(container: HTMLElement, group: number): ArrowMeasure[] {
  const path = container.querySelector<SVGPathElement>(':scope > svg > path');
  // Environments without SVG layout (jsdom) have no path geometry to sample.
  if (!path || typeof path.getTotalLength !== 'function') return [];
  const name = `${container.dataset.facetFrom} -> ${container.dataset.facetTo}`;
  const ctm = path.getScreenCTM();
  if (!ctm) throw new Error(`Diagram: arrow ${name} has no screen transform`);
  const length = path.getTotalLength();
  const distances = [...Array.from({ length: Math.ceil(length / ARROW_SAMPLE_PX) }, (_, index) => index * ARROW_SAMPLE_PX), length];
  const points = distances.map((distance) => {
    const { x, y } = path.getPointAtLength(distance);
    return { x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f };
  });
  return [{ name, group, points }];
}

const NAME_CHARS = 40;
const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

const elementName = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_CHARS) || `<${element.tagName.toLowerCase()}>`;

function measureTexts(root: HTMLElement): TextMeasure[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  const texts: TextMeasure[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    const text = (node.textContent ?? '').trim();
    if (!element || !text || seen.has(element)) continue;
    seen.add(element);
    const fontSize = getComputedStyle(element).fontSize;
    // Environments without style resolution (jsdom) report no font size to check.
    if (!fontSize) continue;
    texts.push({ name: text.slice(0, NAME_CHARS), fontPx: parseFloat(fontSize) });
  }
  return texts;
}

function isBordered(style: CSSStyleDeclaration): boolean {
  return SIDES.every((side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
    && !['none', 'hidden', ''].includes(style.getPropertyValue(`border-${side.toLowerCase()}-style`)));
}

function measureBoxes(root: HTMLElement): BoxMeasure[] {
  const index = new Map<Element, number>();
  const boxes: BoxMeasure[] = [];
  for (const element of root.querySelectorAll('*')) {
    const style = getComputedStyle(element);
    if (!isBordered(style)) continue;
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== root && !index.has(ancestor)) ancestor = ancestor.parentElement;
    const parent = ancestor ? index.get(ancestor) : undefined;
    index.set(element, boxes.length);
    boxes.push({
      name: elementName(element),
      fill: style.backgroundColor,
      border: style.borderTopColor,
      borderStyle: style.borderTopStyle,
      ...(parent === undefined ? {} : { parent }),
    });
  }
  return boxes;
}

export function measureLayout(root: HTMLElement): LayoutMeasure {
  const arrowContainers = [...root.querySelectorAll<HTMLElement>('[data-facet-arrow]')];
  return {
    bounds: toRect(root.getBoundingClientRect()),
    labels: measureLabels(root, arrowContainers),
    arrows: arrowContainers.flatMap((container, group) => measureArrow(container, group)),
    texts: measureTexts(root),
    boxes: measureBoxes(root),
  };
}
