import { describe, expect, it, vi } from 'vitest';

vi.mock('./installed.js', () => ({ installedRuntime: async () => { throw new Error('Rendering archive must not be loaded for inspection or lint'); } }));

import { loadPdfJs } from '../utils/pdfjs.js';
import { loadSharp } from '../utils/sharp.js';
import { parseProgram } from '../lint/parser.js';

describe('normal CLI dependencies', () => {
  it('loads the PDF inspector without a rendering archive', async () => {
    expect(typeof (await loadPdfJs()).getDocument).toBe('function');
  });
  it('loads image inspection without a rendering archive', async () => {
    const sharp = await loadSharp();
    const image = await sharp({ create: { width: 2, height: 3, channels: 3, background: '#ffffff' } }).png().toBuffer();
    expect(await sharp(image).metadata()).toMatchObject({ width: 2, height: 3, format: 'png' });
  });
  it('parses lint input without a rendering archive', async () => {
    expect((await parseProgram('export default () => <Page />;')).type).toBe('Program');
  });
});
