import type { xarrowPropsType } from 'react-xarrows';

type Anchor = xarrowPropsType['startAnchor'];
type AnchorPosition = 'left' | 'right' | 'top' | 'bottom' | 'middle';

interface Point {
  x: number;
  y: number;
}

export interface LabelPoint extends Point {
  normal: Point;
}

interface PositionedAnchor extends Point {
  position: AnchorPosition;
}

export interface ArrowGeometry {
  end: Point;
  labelEnd: LabelPoint;
  labelMiddle: LabelPoint;
  labelStart: LabelPoint;
  path: string;
  start: Point;
}

const AUTO_ANCHORS: AnchorPosition[] = ['left', 'right', 'top', 'bottom'];

function anchorCandidates(anchor: Anchor): Array<{
  position: AnchorPosition;
  offset: Point;
}> {
  const values = anchor === undefined ? ['auto'] : Array.isArray(anchor) ? anchor : [anchor];
  return values.flatMap((value) => {
    const position = typeof value === 'string' ? value : value.position;
    const offset = typeof value === 'string'
      ? { x: 0, y: 0 }
      : { x: value.offset?.x ?? 0, y: value.offset?.y ?? 0 };
    const positions = position === 'auto' ? AUTO_ANCHORS : [position as AnchorPosition];
    return positions.map((candidate) => ({ position: candidate, offset }));
  });
}

/** A rect in the root's own CSS px, independent of any transform or zoom on its ancestors. */
export interface LocalRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

/** Ratio of rendered to laid-out root width, or null when the root has no layout box. */
export function rootScale(root: HTMLElement, rootRect: DOMRectReadOnly): number | null {
  return root.offsetWidth === 0 ? null : rootRect.width / root.offsetWidth;
}

export function rectInRoot(rect: DOMRectReadOnly, rootRect: DOMRectReadOnly, scale: number): LocalRect {
  const left = (rect.left - rootRect.left) / scale;
  const top = (rect.top - rootRect.top) / scale;
  const width = rect.width / scale;
  const height = rect.height / scale;
  return { bottom: top + height, height, left, right: left + width, top, width };
}

/**
 * The element's rect relative to `root`, in root CSS px. `getBoundingClientRect` includes ancestor
 * transforms, so it is divided by the root's rendered/laid-out width ratio. Null when the root has
 * no layout box (hidden or detached), where no scale can be derived.
 */
export function localRect(element: Element, root: HTMLElement): LocalRect | null {
  const rootRect = root.getBoundingClientRect();
  const scale = rootScale(root, rootRect);
  return scale === null ? null : rectInRoot(element.getBoundingClientRect(), rootRect, scale);
}

function pointForAnchor(
  rect: LocalRect,
  candidate: ReturnType<typeof anchorCandidates>[number],
): PositionedAnchor {
  const { left, top } = rect;
  const points: Record<AnchorPosition, Point> = {
    bottom: { x: left + rect.width / 2, y: top + rect.height },
    left: { x: left, y: top + rect.height / 2 },
    middle: { x: left + rect.width / 2, y: top + rect.height / 2 },
    right: { x: left + rect.width, y: top + rect.height / 2 },
    top: { x: left + rect.width / 2, y: top },
  };
  return {
    position: candidate.position,
    x: points[candidate.position].x + candidate.offset.x,
    y: points[candidate.position].y + candidate.offset.y,
  };
}

function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function closestAnchors(
  startRect: LocalRect,
  endRect: LocalRect,
  startAnchor: Anchor,
  endAnchor: Anchor,
): [PositionedAnchor, PositionedAnchor] {
  const starts = anchorCandidates(startAnchor)
    .map((candidate) => pointForAnchor(startRect, candidate));
  const ends = anchorCandidates(endAnchor)
    .map((candidate) => pointForAnchor(endRect, candidate));
  let closest: [PositionedAnchor, PositionedAnchor] = [starts[0], ends[0]];
  for (const start of starts) {
    for (const end of ends) {
      if (distance(start, end) < distance(...closest)) closest = [start, end];
    }
  }
  return closest;
}

function direction(position: AnchorPosition, from: Point, to: Point): Point {
  switch (position) {
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'top': return { x: 0, y: -1 };
    case 'bottom': return { x: 0, y: 1 };
    case 'middle':
      return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
        ? { x: Math.sign(to.x - from.x), y: 0 }
        : { x: 0, y: Math.sign(to.y - from.y) };
  }
}

function gridRatio(gridBreak: string | undefined): number {
  if (!gridBreak) return 0.5;
  const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(gridBreak.trim());
  if (percent) return Number(percent[1]) / 100;
  return 0.5;
}

function interpolate(start: Point, end: Point, ratio: number): Point {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function pointAlong(points: Point[], ratio: number): LabelPoint {
  const segments = points.slice(1).map((point, index) => ({
    end: point,
    length: distance(points[index], point),
    start: points[index],
  }));
  const target = segments.reduce((total, segment) => total + segment.length, 0) * ratio;
  let traversed = 0;
  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (traversed + segment.length >= target) {
      const point = interpolate(segment.start, segment.end, (target - traversed) / segment.length);
      const dx = (segment.end.x - segment.start.x) / segment.length;
      const dy = (segment.end.y - segment.start.y) / segment.length;
      const normal = Math.abs(dx) >= Math.abs(dy)
        ? { x: dy * Math.sign(dx || 1), y: -Math.abs(dx) }
        : { x: -Math.abs(dy), y: dx * Math.sign(dy || 1) };
      return { ...point, normal };
    }
    traversed += segment.length;
  }
  const point = points.at(-1) ?? points[0];
  return { ...point, normal: { x: 0, y: -1 } };
}

export function measureArrow(options: {
  curveness: number;
  endAnchor: Anchor;
  from: string;
  gridBreak?: string;
  path: xarrowPropsType['path'];
  root: HTMLDivElement;
  startAnchor: Anchor;
  to: string;
}): ArrowGeometry | null {
  const startElement = options.root.ownerDocument.getElementById(options.from);
  const endElement = options.root.ownerDocument.getElementById(options.to);
  if (!startElement || !endElement) return null;
  const startRect = localRect(startElement, options.root);
  const endRect = localRect(endElement, options.root);
  if (!startRect || !endRect) return null;
  const [start, end] = closestAnchors(
    startRect,
    endRect,
    options.startAnchor,
    options.endAnchor,
  );
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return null;

  let path: string;
  let labelPath: Point[] = [start, end];
  if (options.path === 'grid') {
    const ratio = gridRatio(options.gridBreak);
    const startDirection = direction(start.position, start, end);
    if (startDirection.x === 0) {
      const turnY = start.y + (end.y - start.y) * ratio;
      labelPath = [start, { x: start.x, y: turnY }, { x: end.x, y: turnY }, end];
    } else {
      const turnX = start.x + (end.x - start.x) * ratio;
      labelPath = [start, { x: turnX, y: start.y }, { x: turnX, y: end.y }, end];
    }
    path = labelPath
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  } else if (options.path === 'straight') {
    path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  } else {
    const bend = distance(start, end) * options.curveness * 0.5;
    const startDirection = direction(start.position, start, end);
    const endDirection = direction(end.position, end, start);
    path = `M ${start.x} ${start.y} C ${start.x + startDirection.x * bend} ${start.y + startDirection.y * bend}, ${end.x + endDirection.x * bend} ${end.y + endDirection.y * bend}, ${end.x} ${end.y}`;
    const controlStart = { x: start.x + startDirection.x * bend, y: start.y + startDirection.y * bend };
    const controlEnd = { x: end.x + endDirection.x * bend, y: end.y + endDirection.y * bend };
    labelPath = Array.from({ length: 33 }, (_, index) => {
      const t = index / 32;
      const inverse = 1 - t;
      return {
        x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * controlStart.x + 3 * inverse * t ** 2 * controlEnd.x + t ** 3 * end.x,
        y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * controlStart.y + 3 * inverse * t ** 2 * controlEnd.y + t ** 3 * end.y,
      };
    });
  }

  return {
    end,
    labelEnd: pointAlong(labelPath, 0.8),
    labelMiddle: pointAlong(labelPath, 0.5),
    labelStart: pointAlong(labelPath, 0.2),
    path,
    start,
  };
}
