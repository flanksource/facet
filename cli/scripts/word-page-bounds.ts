export interface PageBounds { left: number; top: number; width: number; height: number }

export function pageBounds(image: { data: Uint8Array; width: number; height: number; channels: number }): PageBounds[] {
  const pages: PageBounds[] = [];
  for (let y = 0; y < image.height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * image.channels;
      if (image.data[offset] === 255 && image.data[offset + 1] === 255 && image.data[offset + 2] === 255) {
        if (left < 0) left = x;
        right = x;
      }
    }
    if (right - left < image.width / 4) continue;
    const previous = pages.at(-1);
    if (previous && previous.left === left && previous.width === right - left + 1 && previous.top + previous.height === y) {
      previous.height++;
    } else {
      pages.push({ left, top: y, width: right - left + 1, height: 1 });
    }
  }
  return pages.filter(page => page.height >= 8);
}
