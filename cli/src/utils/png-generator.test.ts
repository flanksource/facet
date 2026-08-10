import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Browser } from 'puppeteer-core';

import { launchBrowser } from './pdf-generator.js';
import { generatePNGBuffer, normalizePNGOptions, resolveCaptureScale } from './png-generator.js';

const TARGET_WIDTH = 320;
const TARGET_HEIGHT = 180;

function sizedTarget(style = ''): string {
  return `
    <!doctype html>
    <html>
      <body style="margin: 0">
        <section id="export" style="width: ${TARGET_WIDTH}px; height: ${TARGET_HEIGHT}px; background: rgb(220, 38, 38); ${style}">PNG target</section>
        <div>Excluded sibling</div>
      </body>
    </html>
  `;
}

const CONTENT_WIDTH = 120;
const CONTENT_HEIGHT = 60;

/**
 * A target padded with background around a single painted block. The block is
 * inset with the section's own padding rather than its own margin, which would
 * collapse through the section and leave the block flush against the top edge.
 */
function paddedTarget(): string {
  return `
    <!doctype html>
    <html>
      <body style="margin: 0">
        <section id="export" style="box-sizing: border-box; width: ${TARGET_WIDTH}px; height: ${TARGET_HEIGHT}px; padding: 40px 0 0 60px; background: rgb(255, 255, 255)">
          <div style="width: ${CONTENT_WIDTH}px; height: ${CONTENT_HEIGHT}px; background: rgb(220, 38, 38)"></div>
        </section>
      </body>
    </html>
  `;
}

/** A target which paints its background and nothing else. */
function blankTarget(): string {
  return `
    <!doctype html>
    <html>
      <body style="margin: 0">
        <section id="export" style="width: ${TARGET_WIDTH}px; height: ${TARGET_HEIGHT}px; background: rgb(255, 255, 255)"></section>
      </body>
    </html>
  `;
}

function pngDimensions(png: Buffer): { width: number; height: number } {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

describe('normalizePNGOptions', () => {
  // The server normalizes options when parsing the request and generatePNGBuffer
  // normalizes again at capture, so the second pass must not reject its own output.
  it('is idempotent, including the zero autocrop padding it fills in', () => {
    const once = normalizePNGOptions({ selector: '#export' });

    expect(normalizePNGOptions(once)).toEqual(once);
  });

  it('rejects a padding which would do something without autocrop', () => {
    expect(() => normalizePNGOptions({ autocropPadding: 8 }))
      .toThrow('PNG options.autocropPadding has no effect without PNG options.autocrop');
  });
});

describe('resolveCaptureScale', () => {
  const natural = { width: TARGET_WIDTH, height: TARGET_HEIGHT };
  const selector = '#export';

  it('captures at 1x when neither dimension is requested', () => {
    expect(resolveCaptureScale(natural, { selector })).toBe(1);
  });

  it('scales by width when only width is requested', () => {
    expect(resolveCaptureScale(natural, { selector, width: TARGET_WIDTH * 2 })).toBe(2);
  });

  it('scales by height when only height is requested', () => {
    expect(resolveCaptureScale(natural, { selector, height: TARGET_HEIGHT / 2 })).toBe(0.5);
  });

  it('uses the smaller ratio when both dimensions are requested', () => {
    expect(resolveCaptureScale(natural, {
      selector,
      width: TARGET_WIDTH * 2,
      height: TARGET_HEIGHT * 5,
    })).toBe(2);
  });

  it('rejects a collapsed capture target naming the selector', () => {
    expect(() => resolveCaptureScale({ width: TARGET_WIDTH, height: 0 }, { selector }))
      .toThrow(`PNG target rendered at ${TARGET_WIDTH}x0: ${selector}`);
  });
});

describe('generatePNGBuffer', () => {
  let browser: Browser | undefined;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('captures the selected element at its natural size', async () => {
    const png = await generatePNGBuffer(browser!, sizedTarget(), { selector: '#export' });

    expect(pngDimensions(png)).toEqual({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  });

  it('scales the capture to the requested width without reflowing the element', async () => {
    const png = await generatePNGBuffer(browser!, sizedTarget(), {
      selector: '#export',
      width: TARGET_WIDTH * 2,
    });

    expect(pngDimensions(png)).toEqual({ width: TARGET_WIDTH * 2, height: TARGET_HEIGHT * 2 });
  });

  it('scales uniformly by the smaller ratio when width and height are both requested', async () => {
    const png = await generatePNGBuffer(browser!, sizedTarget(), {
      selector: '#export',
      width: TARGET_WIDTH * 2,
      height: TARGET_HEIGHT * 5,
    });

    expect(pngDimensions(png)).toEqual({ width: TARGET_WIDTH * 2, height: TARGET_HEIGHT * 2 });
  });

  it('lays out against the viewport rather than the requested output size', async () => {
    const viewport = { width: 800, height: 600 };
    const png = await generatePNGBuffer(browser!, `
      <!doctype html>
      <html>
        <body style="margin: 0">
          <section id="export" style="width: 100%; height: ${TARGET_HEIGHT}px; background: rgb(220, 38, 38)"></section>
        </body>
      </html>
    `, { selector: '#export', viewport });

    expect(pngDimensions(png)).toEqual({ width: viewport.width, height: TARGET_HEIGHT });
  });

  it('captures body at viewport width and content height by default', async () => {
    const png = await generatePNGBuffer(browser!, `
      <!doctype html>
      <html>
        <body style="margin: 0">
          <div style="height: ${TARGET_HEIGHT}px">Default target</div>
        </body>
      </html>
    `);

    expect(pngDimensions(png)).toEqual({ width: 1280, height: TARGET_HEIGHT });
  });

  it('rejects a target which rendered with no size', async () => {
    await expect(generatePNGBuffer(
      browser!,
      '<html><body><div id="export"></div></body></html>',
      { selector: '#export' },
    )).rejects.toThrow('PNG target rendered at');
  });

  it('trims the background border down to the painted content', async () => {
    const png = await generatePNGBuffer(browser!, paddedTarget(), {
      selector: '#export',
      autocrop: true,
    });

    expect(pngDimensions(png)).toEqual({ width: CONTENT_WIDTH, height: CONTENT_HEIGHT });
  });

  it('leaves the requested padding of background around trimmed content', async () => {
    const padding = 16;
    const png = await generatePNGBuffer(browser!, paddedTarget(), {
      selector: '#export',
      autocrop: true,
      autocropPadding: padding,
    });

    expect(pngDimensions(png)).toEqual({
      width: CONTENT_WIDTH + padding * 2,
      height: CONTENT_HEIGHT + padding * 2,
    });
  });

  it('scales the cropped content to the requested width, not the uncropped target', async () => {
    const png = await generatePNGBuffer(browser!, paddedTarget(), {
      selector: '#export',
      autocrop: true,
      width: CONTENT_WIDTH * 2,
    });

    expect(pngDimensions(png)).toEqual({ width: CONTENT_WIDTH * 2, height: CONTENT_HEIGHT * 2 });
  });

  it('rejects a target which painted nothing but its background', async () => {
    await expect(generatePNGBuffer(browser!, blankTarget(), { selector: '#export', autocrop: true }))
      .rejects.toThrow(`PNG autocrop found no content: the ${TARGET_WIDTH}x${TARGET_HEIGHT} capture of #export is entirely rgb(255, 255, 255)`);
  });

  it('rejects autocrop padding without autocrop', async () => {
    await expect(generatePNGBuffer(browser!, paddedTarget(), { selector: '#export', autocropPadding: 8 }))
      .rejects.toThrow('PNG options.autocropPadding has no effect without PNG options.autocrop');
  });

  it('rejects selectors which do not identify exactly one element', async () => {
    await expect(generatePNGBuffer(
      browser!,
      '<html><body><div class="target"></div><div class="target"></div></body></html>',
      { selector: '.target' },
    )).rejects.toThrow('PNG selector must match exactly one element; matched 2: .target');
  });
});
