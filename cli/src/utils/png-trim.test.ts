import { describe, expect, it } from 'vitest';

import { cropClip, measureContentBounds } from './png-trim.js';
import { loadSharp } from './sharp.js';

const CANVAS = { width: 100, height: 60 };
const CONTENT = { left: 30, top: 20, width: 20, height: 10 };
const BACKGROUND = '#ffffff';
const FOREGROUND = '#dc2626';
const BANNER = '#3578e5';
const SELECTOR = '#export';

type Block = { left: number; top: number; width: number; height: number; colour?: string };

async function canvasWith(...blocks: Block[]): Promise<Buffer> {
  const sharp = await loadSharp();
  const composite = await Promise.all(blocks.map(async block => ({
    input: await sharp({
      create: { width: block.width, height: block.height, channels: 3, background: block.colour ?? FOREGROUND },
    }).png().toBuffer(),
    left: block.left,
    top: block.top,
  })));
  return sharp({ create: { ...CANVAS, channels: 3, background: BACKGROUND } })
    .composite(composite)
    .png()
    .toBuffer();
}

describe('measureContentBounds', () => {
  it('bounds content surrounded by background on every side', async () => {
    expect(await measureContentBounds(await canvasWith(CONTENT), { selector: SELECTOR })).toEqual(CONTENT);
  });

  it('keeps content flush against the top-left corner, whose colour is never the background', async () => {
    const flush = { left: 0, top: 0, width: CONTENT.width, height: CONTENT.height };

    expect(await measureContentBounds(await canvasWith(flush), { selector: SELECTOR }))
      .toEqual({ left: 0, top: 0, width: flush.width, height: flush.height });
  });

  // A full-bleed banner leaves the capture with two background colours: blue at
  // the top edge, white at the bottom. Each edge has to trim against its own.
  it('trims each edge against its own colour when a full-bleed banner tops the background', async () => {
    const banner = { left: 0, top: 0, width: CANVAS.width, height: 8, colour: BANNER };
    const bannerText = { left: 10, top: 4, width: 2, height: 2, colour: BACKGROUND };
    const framed = await canvasWith(banner, bannerText, CONTENT);

    expect(await measureContentBounds(framed, { selector: SELECTOR })).toEqual({
      left: 0,
      top: bannerText.top,
      width: CANVAS.width,
      height: CONTENT.top + CONTENT.height - bannerText.top,
    });
  });

  it('returns the whole image when content reaches every edge', async () => {
    const edges = await canvasWith(
      { left: 50, top: 0, width: 1, height: 1 },
      { left: 0, top: 30, width: 1, height: 1 },
      { left: CANVAS.width - 1, top: 30, width: 1, height: 1 },
      { left: 50, top: CANVAS.height - 1, width: 1, height: 1 },
    );

    expect(await measureContentBounds(edges, { selector: SELECTOR }))
      .toEqual({ left: 0, top: 0, ...CANVAS });
  });

  it('rejects a flat image naming the selector and the colour', async () => {
    await expect(measureContentBounds(await canvasWith(), { selector: SELECTOR }))
      .rejects.toThrow(`PNG autocrop found no content: the ${CANVAS.width}x${CANVAS.height} capture of ${SELECTOR} is entirely rgb(255, 255, 255)`);
  });

  it('rejects an image which is nothing but two flat bands', async () => {
    const banded = await canvasWith({ left: 0, top: 0, width: CANVAS.width, height: 25, colour: BANNER });

    await expect(measureContentBounds(banded, { selector: SELECTOR }))
      .rejects.toThrow('is made up entirely of flat bands (rgb(53, 120, 229) and rgb(255, 255, 255))');
  });
});

describe('cropClip', () => {
  const capture = { x: 12, y: 8, ...CANVAS };

  it('offsets the content bounds by the capture origin', () => {
    expect(cropClip(capture, CONTENT, 0)).toEqual({
      x: capture.x + CONTENT.left,
      y: capture.y + CONTENT.top,
      width: CONTENT.width,
      height: CONTENT.height,
    });
  });

  it('grows the clip by the padding on every side', () => {
    const padding = 5;

    expect(cropClip(capture, CONTENT, padding)).toEqual({
      x: capture.x + CONTENT.left - padding,
      y: capture.y + CONTENT.top - padding,
      width: CONTENT.width + padding * 2,
      height: CONTENT.height + padding * 2,
    });
  });

  it('clamps padding to the capture box rather than inventing background', () => {
    const flush = { left: 0, top: 0, width: CANVAS.width, height: CONTENT.height };

    expect(cropClip(capture, flush, 5)).toEqual({
      x: capture.x,
      y: capture.y,
      width: CANVAS.width,
      height: CONTENT.height + 5,
    });
  });
});
