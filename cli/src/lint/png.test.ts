import { describe, expect, it } from 'vitest';
import { loadSharp } from '../utils/sharp.js';
import { lintPng } from './png.js';

const SIZE = 160;
const FILE = 'diagram.png';
const INK = '#334155';
type Rect = { x: number; y: number; width: number; height: number; fill?: string };

async function image(rects: Rect[], background = '#ffffff'): Promise<Buffer> {
  const sharp = await loadSharp();
  const svg = `<svg width="${SIZE}" height="${SIZE}">${rects.map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${r.fill ?? INK}"/>`).join('')}</svg>`;
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background } })
    .composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}

describe('PNG lint', () => {
  it.each(['#ffffff', '#111827', '#00000000'])('reports empty %s images', async background => {
    expect(await lintPng(await image([], background), FILE)).toEqual([
      expect.objectContaining({ file: FILE, rule: 'png-empty', severity: 'error' }),
    ]);
  });

  it.each([1, 3, 6])('reports one crossing for %ipx thick lines with pixel coordinates', async thickness => {
    const issues = await lintPng(await image([
      { x: 20, y: 80, width: 120, height: thickness },
      { x: 80, y: 20, width: thickness, height: 120 },
    ]), FILE);
    expect(issues).toEqual([expect.objectContaining({
      rule: 'png-line-crossing', severity: 'warning', locations: [expect.objectContaining({ type: 'png', x: 80, y: 80, image: { width: SIZE, height: SIZE }, bounds: { x: 80, y: 80, width: thickness, height: thickness } })],
    })]);
  });

  it('detects differently coloured crossing lines', async () => {
    expect(await lintPng(await image([
      { x: 20, y: 80, width: 120, height: 2 },
      { x: 80, y: 20, width: 2, height: 120, fill: '#dc2626' },
    ]), FILE)).toEqual([expect.objectContaining({ rule: 'png-line-crossing' })]);
  });

  it.each(['#ffffff', '#111827', '#00000000'])('detects lines on %s backgrounds', async background => {
    expect(await lintPng(await image([
      { x: 20, y: 80, width: 120, height: 2, fill: '#60a5fa' },
      { x: 80, y: 20, width: 2, height: 120, fill: '#60a5fa' },
    ], background), FILE)).toEqual([expect.objectContaining({ rule: 'png-line-crossing' })]);
  });

  it('allows box corners, T junctions, parallel lines and filled panels', async () => {
    expect(await lintPng(await image([
      { x: 20, y: 20, width: 120, height: 2 },
      { x: 20, y: 20, width: 2, height: 40 },
      { x: 80, y: 20, width: 2, height: 40 },
      { x: 20, y: 70, width: 120, height: 2 },
      { x: 20, y: 80, width: 120, height: 2 },
      { x: 20, y: 100, width: 120, height: 40 },
    ]), FILE)).toEqual([]);
  });

  it('does not mistake text cutouts in a filled panel for crossing lines', async () => {
    const sharp = await loadSharp();
    const svg = `<svg width="${SIZE}" height="${SIZE}"><rect x="10" y="10" width="140" height="140" fill="${INK}"/>
      <text x="20" y="60" fill="white" font-size="14">Example panel</text>
      <text x="20" y="90" fill="white" font-size="14">Diagram label</text></svg>`;
    expect(await lintPng(await sharp(Buffer.from(svg)).png().toBuffer(), FILE)).toEqual([]);
  });

  it('does not report faint visible content as empty', async () => {
    expect(await lintPng(await image([{ x: 40, y: 40, width: 40, height: 40, fill: '#f0f0f0' }]), FILE))
      .toEqual([]);
  });

  it('does not join separate diagonal icon strokes into horizontal and vertical lines', async () => {
    const sharp = await loadSharp();
    const svg = `<svg width="${SIZE}" height="${SIZE}"><g transform="translate(60 50) rotate(-20)">
      <path d="M0 0H30M0 10H30M0 20H30" stroke="${INK}" stroke-width="4"/></g></svg>`;
    expect(await lintPng(await sharp(Buffer.from(svg)).png().toBuffer(), FILE)).toEqual([]);
  });

  it('reports content touching the capture boundary', async () => {
    expect(await lintPng(await image([{ x: 0, y: 40, width: 40, height: 20 }]), FILE))
      .toEqual([expect.objectContaining({ rule: 'png-edge-content', locations: [expect.objectContaining({ type: 'png', x: 0, y: 40 })] })]);
  });

  it('rejects corrupt input and images masquerading as PNG', async () => {
    await expect(lintPng(Buffer.from('invalid'), FILE)).rejects.toThrow();
    const sharp = await loadSharp();
    await expect(lintPng(await sharp(await image([])).jpeg().toBuffer(), FILE)).rejects.toThrow('PNG');
  });
});
