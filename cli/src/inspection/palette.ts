export interface PixelGroup {
  rgba: number[];
  pixels: number;
  minX: number; minY: number; maxX: number; maxY: number;
}

function channel(groups: PixelGroup[]): { index: number; range: number } {
  const ranges = [0, 1, 2, 3].map(index => {
    let minimum = 255;
    let maximum = 0;
    for (const group of groups) { minimum = Math.min(minimum, group.rgba[index]); maximum = Math.max(maximum, group.rgba[index]); }
    return { index, range: maximum - minimum };
  });
  return ranges.sort((a, b) => b.range - a.range)[0];
}

export function groupPalette(groups: PixelGroup[], limit: number): PixelGroup[] {
  if (!groups.length) return [];
  const buckets = [groups];
  while (buckets.length < limit) {
    let selected = -1;
    let range = -1;
    for (let index = 0; index < buckets.length; index++) {
      if (buckets[index].length < 2) continue;
      const candidate = channel(buckets[index]).range;
      if (candidate > range) { selected = index; range = candidate; }
    }
    if (selected < 0) break;
    const bucket = buckets[selected];
    const axis = channel(bucket).index;
    bucket.sort((a, b) => a.rgba[axis] - b.rgba[axis] || a.rgba.join(',').localeCompare(b.rgba.join(',')));
    const half = bucket.reduce((sum, group) => sum + group.pixels, 0) / 2;
    let count = 0;
    let split = 0;
    while (split < bucket.length - 1 && count < half) count += bucket[split++].pixels;
    buckets.splice(selected, 1, bucket.slice(0, split), bucket.slice(split));
  }
  return buckets.map(bucket => {
    const result: PixelGroup = { rgba: [0, 0, 0, 0], pixels: 0, minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 };
    for (const group of bucket) {
      result.pixels += group.pixels;
      for (let index = 0; index < 4; index++) result.rgba[index] += group.rgba[index] * group.pixels;
      result.minX = Math.min(result.minX, group.minX); result.minY = Math.min(result.minY, group.minY);
      result.maxX = Math.max(result.maxX, group.maxX); result.maxY = Math.max(result.maxY, group.maxY);
    }
    result.rgba = result.rgba.map(value => Math.round(value / result.pixels));
    return result;
  });
}
