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

const TOLERANCE_PX = 0.5;
const ARROW_INSET_PX = 1;

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

export function layoutErrors({ labels, arrows }: { labels: LabelMeasure[]; arrows: ArrowMeasure[] }): string[] {
  return [...overflowErrors(labels), ...overlapErrors(labels), ...crossingErrors(labels, arrows)];
}
