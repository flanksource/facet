export interface Raster {
  width: number;
  height: number;
  foreground: Uint8Array;
  pixels: Buffer;
}

interface Line {
  start: number;
  end: number;
  first: number;
  last: number;
}

const MIN_LENGTH = 24;
const MAX_THICKNESS = 6;

function thinStroke(image: Raster, index: number, vertical: boolean): boolean {
  const x = index % image.width;
  const y = Math.floor(index / image.width);
  const distance = MAX_THICKNESS + 1;
  if (vertical ? x < distance || x >= image.width - distance : y < distance || y >= image.height - distance) return false;
  const offset = vertical ? distance : distance * image.width;
  return [-offset, offset].every(delta => [0, 1, 2].some(channel =>
    Math.abs(image.pixels[index * 3 + channel] - image.pixels[(index + delta) * 3 + channel]) > 24));
}

function findLines(image: Raster, vertical: boolean): Line[] {
  const length = vertical ? image.height : image.width;
  const breadth = vertical ? image.width : image.height;
  const lines: Line[] = [];
  let previous: Line[] = [];
  for (let row = 0; row < breadth; row++) {
    const current: Line[] = [];
    let start = -1;
    let end = -1;
    let hits = 0;
    for (let col = 0; col <= length; col++) {
      const index = vertical ? col * image.width + row : row * image.width + col;
      if (col < length && thinStroke(image, index, vertical)) {
        if (start < 0) start = col;
        end = col + 1;
        hits++;
        continue;
      }
      if (col < length && col - end < MAX_THICKNESS) continue;
      if (start >= 0 && end - start >= MIN_LENGTH && hits / (end - start) >= 0.9) {
        const existing = previous.find(line =>
          Math.abs(line.start - start) <= MAX_THICKNESS && Math.abs(line.end - end) <= MAX_THICKNESS);
        if (existing) {
          existing.last = row;
          current.push(existing);
        } else {
          const line = { start, end, first: row, last: row };
          lines.push(line);
          current.push(line);
        }
      }
      start = -1;
      hits = 0;
    }
    previous = current;
  }
  return lines.filter(line => line.last - line.first < MAX_THICKNESS);
}

export function findCrossings(image: Raster): { x: number; y: number; bounds: { x: number; y: number; width: number; height: number } }[] {
  const horizontal = findLines(image, false);
  const vertical = findLines(image, true);
  const crossings: ReturnType<typeof findCrossings> = [];
  for (const h of horizontal) {
    for (const v of vertical) {
      if (v.first > h.start + MAX_THICKNESS && v.last < h.end - MAX_THICKNESS
        && h.first > v.start + MAX_THICKNESS && h.last < v.end - MAX_THICKNESS) {
        if (!crossings.some(point => Math.abs(point.x - v.first) <= MAX_THICKNESS
          && Math.abs(point.y - h.first) <= MAX_THICKNESS)) {
          crossings.push({ x: v.first, y: h.first, bounds: { x: v.first, y: h.first, width: v.last - v.first + 1, height: h.last - h.first + 1 } });
        }
      }
    }
  }
  return crossings;
}
