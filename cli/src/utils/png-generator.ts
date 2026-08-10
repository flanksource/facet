import type { Browser, BoundingBox, ElementHandle, Page } from 'puppeteer-core';

import type { PNGOptions, PNGViewport } from '../types.js';
import { renderMermaidInPage, waitForPageReady } from './browser-readiness.js';
import { type CaptureBox, cropClip, measureContentBounds } from './png-trim.js';

/**
 * Capture options. `width`/`height` stay optional after normalization: absent
 * means "capture the target at its natural rendered size", and present means
 * "rasterize that same layout at a scale factor" — never a resize of the DOM.
 */
export interface NormalizedPNGOptions {
  width?: number;
  height?: number;
  selector: string;
  viewport: PNGViewport;
  autocrop: boolean;
  autocropPadding: number;
}

export const DEFAULT_PNG_SELECTOR = 'body';

/**
 * Layout viewport. Diagrams freeze their own width once settled, so the baked
 * coordinates survive other viewer widths — but the capture width still bounds
 * how much horizontal room a diagram gets, and puppeteer's 800px default
 * squeezes typical multi-column layouts.
 */
export const DEFAULT_PNG_VIEWPORT: PNGViewport = { width: 1280, height: 800 };

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

export function normalizePNGOptions(
  options: PNGOptions = {},
  field = 'PNG options',
): NormalizedPNGOptions {
  const selector = options.selector?.trim() ?? DEFAULT_PNG_SELECTOR;
  if (!selector) throw new Error(`${field}.selector must be a non-empty CSS selector`);
  const viewport = options.viewport ?? DEFAULT_PNG_VIEWPORT;
  const autocrop = options.autocrop ?? false;
  // Zero padding is the normalized default, so only a padding that would do
  // something is an error — normalizing an already-normalized object (the
  // server parses options up front, then again at capture) must be a no-op.
  if (!autocrop && options.autocropPadding) {
    throw new Error(`${field}.autocropPadding has no effect without ${field}.autocrop`);
  }
  return {
    ...(options.width === undefined
      ? {}
      : { width: positiveInteger(options.width, `${field}.width`) }),
    ...(options.height === undefined
      ? {}
      : { height: positiveInteger(options.height, `${field}.height`) }),
    selector,
    viewport: {
      width: positiveInteger(viewport.width, `${field}.viewport.width`),
      height: positiveInteger(viewport.height, `${field}.viewport.height`),
    },
    autocrop,
    autocropPadding: options.autocropPadding === undefined
      ? 0
      : nonNegativeInteger(options.autocropPadding, `${field}.autocropPadding`),
  };
}

/** Parses a `<width>x<height>` viewport spec as accepted by `--viewport` / `pngViewport`. */
export function parsePNGViewport(raw: string, field: string): PNGViewport {
  const match = /^(\d+)\s*x\s*(\d+)$/i.exec(raw.trim());
  if (!match) {
    throw new Error(`${field} must be <width>x<height> in pixels, for example 1920x1080`);
  }
  return {
    width: positiveInteger(Number(match[1]), `${field} width`),
    height: positiveInteger(Number(match[2]), `${field} height`),
  };
}

export async function resolvePNGTarget(
  page: Page,
  options: NormalizedPNGOptions,
): Promise<ElementHandle<Element>> {
  let targets: ElementHandle<Element>[];
  try {
    targets = await page.$$(options.selector);
  } catch (error) {
    throw new Error(`Invalid PNG selector "${options.selector}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (targets.length !== 1) {
    throw new Error(
      `PNG selector must match exactly one element; matched ${targets.length}: ${options.selector}`,
    );
  }
  return targets[0];
}

/**
 * Uniform rasterization scale for the capture. Requesting both dimensions fits
 * the output inside them rather than padding to exactly that box, so the
 * captured aspect ratio always matches what the browser laid out.
 */
export function resolveCaptureScale(
  natural: { width: number; height: number },
  options: Pick<NormalizedPNGOptions, 'width' | 'height' | 'selector'>,
): number {
  if (!Number.isFinite(natural.width) || natural.width <= 0
    || !Number.isFinite(natural.height) || natural.height <= 0) {
    throw new Error(
      `PNG target rendered at ${natural.width}x${natural.height}: ${options.selector}. `
      + 'The element is empty or collapsed — check the selector, and pass --live for templates '
      + 'whose content (such as a Diagram) only mounts in the browser.',
    );
  }
  const ratios: number[] = [];
  if (options.width !== undefined) ratios.push(options.width / natural.width);
  if (options.height !== undefined) ratios.push(options.height / natural.height);
  return ratios.length === 0 ? 1 : Math.min(...ratios);
}

/**
 * Tightens the capture to painted content. The probe is taken at scale 1 so its
 * pixels map 1:1 onto CSS pixels (`deviceScaleFactor` is pinned to 1), which
 * keeps the crop — and therefore any requested output scale — in the same
 * coordinate space as the element's bounding box.
 */
async function autocropClip(
  page: Page,
  box: BoundingBox,
  options: NormalizedPNGOptions,
): Promise<CaptureBox> {
  const probe = await page.screenshot({
    type: 'png',
    captureBeyondViewport: true,
    clip: { ...box, scale: 1 },
  });
  const bounds = await measureContentBounds(Buffer.from(probe), { selector: options.selector });
  return cropClip(box, bounds, options.autocropPadding);
}

export async function generatePNGBuffer(
  browser: Browser,
  html: string,
  rawOptions: PNGOptions = {},
): Promise<Buffer> {
  const options = normalizePNGOptions(rawOptions);
  const page = await browser.newPage();
  try {
    await page.setViewport({ ...options.viewport, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await renderMermaidInPage(page);
    await waitForPageReady(page);
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));

    const target = await resolvePNGTarget(page, options);
    const box = await target.boundingBox();
    if (!box) {
      throw new Error(`PNG target is not visible: ${options.selector}`);
    }
    // Cropping happens before scaling so `width`/`height` size the trimmed
    // result, and the final capture is always rasterized by the browser rather
    // than resampled from the probe.
    const clip = options.autocrop ? await autocropClip(page, box, options) : box;
    // `ElementHandle.screenshot` rebuilds the clip from the bounding box and
    // discards `clip.scale`, so scaling has to go through `page.screenshot`.
    const bytes = await page.screenshot({
      type: 'png',
      captureBeyondViewport: true,
      clip: { ...clip, scale: resolveCaptureScale(clip, options) },
    });
    return Buffer.from(bytes);
  } finally {
    await page.close();
  }
}
