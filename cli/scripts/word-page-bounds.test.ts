import { describe, expect, it } from 'vitest';
import { pageBounds, type PageBounds } from './word-page-bounds.js';

function viewport(pages: PageBounds[]) {
  const width = 120;
  const height = 160;
  const channels = 3;
  const data = new Uint8Array(width * height * channels).fill(236);
  for (const page of pages) {
    for (let y = page.top; y < page.top + page.height; y++) {
      for (let x = page.left; x < page.left + page.width; x++) {
        const offset = (y * width + x) * channels;
        data.fill(255, offset, offset + channels);
        if (x > page.left + 4 && x < page.left + page.width - 4 && y % 8 === 0) data.fill(30, offset, offset + channels);
      }
    }
  }
  return { data, width, height, channels };
}

describe('Word page bounds', () => {
  it('finds separate paper rectangles despite text and table rows', () => {
    const pages = [{ left: 25, top: 8, width: 70, height: 60 }, { left: 25, top: 75, width: 70, height: 60 }];
    expect(pageBounds(viewport(pages))).toEqual(pages);
  });

  it('retains clipped rectangles so the caller can reject incomplete pages', () => {
    const pages = [{ left: 25, top: 0, width: 70, height: 40 }, { left: 25, top: 47, width: 70, height: 113 }];
    expect(pageBounds(viewport(pages))).toEqual(pages);
  });

  it('rejects a viewport without white paper', () => {
    expect(pageBounds(viewport([]))).toEqual([]);
  });
});
