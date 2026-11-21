export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LabelMeasure {
  name: string;
  box: Rect;
  lines: Rect[];
  arrowGroup?: number;
}

export interface ArrowMeasure {
  name: string;
  group: number;
  points: { x: number; y: number }[];
}

export interface TextMeasure {
  name: string;
  fontPx: number;
}

export interface BoxMeasure {
  name: string;
  fill: string;
  border: string;
  borderStyle: string;
  /** Index of the nearest bordered ancestor box. */
  parent?: number;
}

export interface LayoutMeasure {
  bounds: Rect;
  labels: LabelMeasure[];
  arrows: ArrowMeasure[];
  texts: TextMeasure[];
  boxes: BoxMeasure[];
}

const TOLERANCE_PX = 0.5;
const ARROW_INSET_PX = 1;
const EDGE_TOLERANCE_PX = 1;
const MIN_ARROW_PX = 12;
const MIN_FONT_PX = 8;

function toMm(px: number): number {
  return Math.round((px * 25.4) / 96 * 10) / 10;
}

function overflowErrors(labels: LabelMeasure[]): string[] {
  return labels.flatMap(({ name, box, lines }) => {
    const overflow = Math.max(0, ...lines.map((line) => Math.max(box.left - line.left, line.right - box.right)));
    return overflow > TOLERANCE_PX ? [`label ${name} overflows its box by ${toMm(overflow)}mm`] : [];
  });
}

function linesOverlap(a: Rect, b: Rect): boolean {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > TOLERANCE_PX
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > TOLERANCE_PX;
}

function overlapErrors(labels: LabelMeasure[]): string[] {
  return labels.flatMap((a, index) => labels.slice(index + 1)
    .filter((b) => a.lines.some((lineA) => b.lines.some((lineB) => linesOverlap(lineA, lineB))))
    .map((b) => `labels ${a.name} and ${b.name} overlap`));
}

function crossesLine(point: { x: number; y: number }, line: Rect): boolean {
  return point.x > line.left + ARROW_INSET_PX && point.x < line.right - ARROW_INSET_PX
    && point.y > line.top + ARROW_INSET_PX && point.y < line.bottom - ARROW_INSET_PX;
}

function crossingErrors(labels: LabelMeasure[], arrows: ArrowMeasure[]): string[] {
  return arrows.flatMap((arrow) => labels
    .filter((label) => label.arrowGroup !== arrow.group)
    .filter((label) => arrow.points.some((point) => label.lines.some((line) => crossesLine(point, line))))
    .map((label) => `arrow ${arrow.name} crosses label ${label.name}`));
}

function arrowLength(points: ArrowMeasure['points']): number {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y), 0);
}

function stubErrors(arrows: ArrowMeasure[]): string[] {
  return arrows
    .filter(({ points }) => arrowLength(points) < MIN_ARROW_PX)
    .map(({ name, points }) => `arrow ${name} is a stub, ${toMm(arrowLength(points))}mm long; leave at least ${toMm(MIN_ARROW_PX)}mm between connected nodes`);
}

function outsideErrors(bounds: Rect, arrows: ArrowMeasure[]): string[] {
  const outside = ({ x, y }: { x: number; y: number }) => x < bounds.left - EDGE_TOLERANCE_PX || x > bounds.right + EDGE_TOLERANCE_PX
    || y < bounds.top - EDGE_TOLERANCE_PX || y > bounds.bottom + EDGE_TOLERANCE_PX;
  return arrows.flatMap(({ name, points }) => {
    const end = [points[0], points[points.length - 1]].find((point) => point && outside(point));
    return end ? [`arrow ${name} ends outside the diagram at (${Math.round(end.x)}, ${Math.round(end.y)}); check that both endpoint ids exist`] : [];
  });
}

function tinyTextErrors(texts: TextMeasure[]): string[] {
  return texts
    .filter(({ fontPx }) => fontPx < MIN_FONT_PX)
    .map(({ name, fontPx }) => `text "${name}" is ${Math.round(fontPx * 10) / 10}px; diagram text must be at least ${MIN_FONT_PX}px`);
}

function nestedBoxErrors(boxes: BoxMeasure[]): string[] {
  return boxes.flatMap((inner) => {
    const outer = inner.parent === undefined ? undefined : boxes[inner.parent];
    if (!outer || outer.fill !== inner.fill || outer.border !== inner.border || outer.borderStyle !== inner.borderStyle) return [];
    return [`box "${inner.name}" repeats the fill and border of its container "${outer.name}"; list it as a borderless row or give it its own fill`];
  });
}

export function layoutErrors({ bounds, labels, arrows, texts, boxes }: LayoutMeasure): string[] {
  return [
    ...overflowErrors(labels),
    ...overlapErrors(labels),
    ...crossingErrors(labels, arrows),
    ...stubErrors(arrows),
    ...outsideErrors(bounds, arrows),
    ...tinyTextErrors(texts),
    ...nestedBoxErrors(boxes),
  ];
}
