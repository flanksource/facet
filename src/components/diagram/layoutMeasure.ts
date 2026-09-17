import type { ArrowMeasure, LabelMeasure, Rect } from './layoutCheck';

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

export function measureLayout(root: HTMLElement): { labels: LabelMeasure[]; arrows: ArrowMeasure[] } {
  const arrowContainers = [...root.querySelectorAll<HTMLElement>('[data-facet-arrow]')];
  return {
    labels: measureLabels(root, arrowContainers),
    arrows: arrowContainers.flatMap((container, group) => measureArrow(container, group)),
  };
}
