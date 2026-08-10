import { loadSharp } from './sharp.js';

/** Painted-content box within a captured image, in image pixels. */
export interface ContentBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CaptureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

function offsetOf(image: RawImage, x: number, y: number): number {
  return (y * image.width + x) * image.channels;
}

function sameColour(image: RawImage, offset: number, reference: number): boolean {
  for (let channel = 0; channel < image.channels; channel += 1) {
    if (image.data[offset + channel] !== image.data[reference + channel]) return false;
  }
  return true;
}

function rowIsAll(image: RawImage, y: number, reference: number): boolean {
  let offset = offsetOf(image, 0, y);
  for (let x = 0; x < image.width; x += 1, offset += image.channels) {
    if (!sameColour(image, offset, reference)) return false;
  }
  return true;
}

function columnIsAll(image: RawImage, x: number, reference: number): boolean {
  for (let y = 0; y < image.height; y += 1) {
    if (!sameColour(image, offsetOf(image, x, y), reference)) return false;
  }
  return true;
}

function describeColour(image: RawImage, offset: number): string {
  const [r, g, b] = [image.data[offset], image.data[offset + 1] ?? image.data[offset], image.data[offset + 2] ?? image.data[offset]];
  const rgb = `rgb(${r}, ${g}, ${b})`;
  if (image.channels < 4) return rgb;
  const alpha = image.data[offset + 3] / 255;
  return alpha === 1 ? rgb : `${rgb} at ${alpha} alpha`;
}

function bands(image: RawImage, first: number, second: number): string {
  return `made up entirely of flat bands (${describeColour(image, first)} and ${describeColour(image, second)})`;
}

function noContent(image: RawImage, selector: string, describedAs: string): Error {
  return new Error(
    `PNG autocrop found no content: the ${image.width}x${image.height} capture of ${selector} `
    + `is ${describedAs}. Check the selector, and pass --live for templates whose content `
    + '(such as a Diagram) only mounts in the browser.',
  );
}

/**
 * Bounding box of everything the page painted over its background, close to
 * ImageMagick `-trim`: each edge is trimmed inwards while whole rows or columns
 * still match that edge's own colour. Per-edge colours matter because a capture
 * often has more than one flat band — a full-bleed banner at the top over a
 * differently-coloured page background below.
 *
 * Each scan spans the whole image, so the four edges are independent: content
 * flush against a corner keeps that corner's row and column from being uniform,
 * which is what stops the content's own colour being read as the background
 * (ImageMagick, which matches against the corner pixels, trims it away).
 *
 * Exact matching (no fuzz) is right for a lossless capture: anti-aliasing only
 * touches the first content-bearing row, which is kept. A solid band of colour
 * reaching an edge is indistinguishable from background and is trimmed with it.
 */
export async function measureContentBounds(
  png: Buffer,
  options: { selector: string; consumerRoot?: string },
): Promise<ContentBounds> {
  const sharp = await loadSharp(options.consumerRoot);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const image: RawImage = { data, width: info.width, height: info.height, channels: info.channels };

  const topColour = offsetOf(image, 0, 0);
  let top = 0;
  while (top < image.height && rowIsAll(image, top, topColour)) top += 1;
  if (top === image.height) {
    throw noContent(image, options.selector, `entirely ${describeColour(image, topColour)}`);
  }

  const bottomColour = offsetOf(image, 0, image.height - 1);
  let bottom = image.height;
  while (bottom > top && rowIsAll(image, bottom - 1, bottomColour)) bottom -= 1;
  if (bottom === top) {
    throw noContent(image, options.selector, bands(image, topColour, bottomColour));
  }

  const leftColour = offsetOf(image, 0, 0);
  let left = 0;
  while (left < image.width && columnIsAll(image, left, leftColour)) left += 1;

  const rightColour = offsetOf(image, image.width - 1, 0);
  let right = image.width;
  while (right > left && columnIsAll(image, right - 1, rightColour)) right -= 1;
  if (right === left) {
    throw noContent(image, options.selector, bands(image, leftColour, rightColour));
  }
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Content bounds as a page-space capture clip. Padding is applied in the
 * capture's own pixels — before any output scaling — and clamped to the capture
 * box: content flush against an edge had no background border there to begin
 * with, so none is invented.
 */
export function cropClip(capture: CaptureBox, bounds: ContentBounds, padding: number): CaptureBox {
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(capture.width, bounds.left + bounds.width + padding);
  const bottom = Math.min(capture.height, bounds.top + bounds.height + padding);
  return {
    x: capture.x + left,
    y: capture.y + top,
    width: right - left,
    height: bottom - top,
  };
}
