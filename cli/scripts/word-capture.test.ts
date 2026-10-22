import { writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import JSZip from 'jszip';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

const desktop = vi.hoisted(() => ({ screenshot: new Uint8Array(), count: 1 }));
vi.mock('node:child_process', () => ({
  execFileSync: (command: string, args: string[]) => {
    if (command === '/usr/bin/swift') return '123';
    if (args[1] === 'open') return `Page 1 of ${desktop.count}\nCapture fixture`;
    if (args[1] === 'close') return '';
    writeFileSync(args[5], desktop.screenshot);
    return '0,0,0,100,130,100';
  },
}));

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
let directory: string;
afterEach(async () => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe('Word PNG capture', () => {
  it.each([
    { name: 'unavailable paper dimensions', paper: true, dimensions: false, warning: 'DOCX must declare valid paper dimensions', width: 80, height: 100 },
    { name: 'unmeasurable paper bounds', paper: false, dimensions: true, warning: 'No white paper found', width: 100, height: 130 },
    { name: 'mismatched paper dimensions', paper: true, dimensions: true, warning: 'Word page 1 bounds do not match DOCX dimensions', width: 80, height: 100 },
    { name: 'unmeasurable page spacing', paper: true, dimensions: true, warning: 'Cannot determine Word page spacing', width: 80, height: 100, count: 2 },
    { name: 'clipped paper', paper: true, dimensions: true, warning: 'The first Word page may be clipped', width: 100, height: 130, clipped: true },
  ])('warns and saves PNGs with $name', async ({ paper, dimensions, warning, width, height, count = 1, clipped = false }) => {
    vi.resetModules();
    const scratch = resolve(import.meta.dirname, '../../.tmp');
    await mkdir(scratch, { recursive: true });
    directory = await mkdtemp(join(scratch, 'word-capture-test-'));
    directory = await realpath(directory);
    const input = join(directory, 'Report with spaces.docx');
    desktop.count = count;
    const zip = new JSZip();
    zip.file('word/document.xml', `<document><sectPr>${dimensions ? '<pgSz w="2000" h="2000"/>' : ''}</sectPr></document>`);
    await writeFile(input, await zip.generateAsync({ type: 'nodebuffer' }));
    let image = sharp({ create: { width: 100, height: 130, channels: 3, background: '#808080' } });
    if (paper) image = image.composite([{
      input: await sharp({ create: { width: 80, height: 100, channels: 3, background: '#ffffff' } }).png().toBuffer(),
      left: 10, top: clipped ? 0 : 10,
    }]);
    desktop.screenshot = await image.png().toBuffer();
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    process.argv = ['node', 'word-capture.ts', input];

    await import('./word-capture.js');

    expect(stderr.mock.calls.flat().join('')).toContain(`Warning: ${warning}`);
    expect(process.exitCode).toBe(originalExitCode);
    expect(stdout).toHaveBeenCalledWith(`${input}.1.png\n`);
    for (let page = 1; page <= count; page++) {
      expect(await sharp(await readFile(`${input}.${page}.png`)).metadata()).toMatchObject({
        format: 'png', width: page > 1 ? 100 : width, height: page > 1 ? 130 : height,
      });
    }
  });
});
