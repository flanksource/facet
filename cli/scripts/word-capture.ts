import { execFileSync } from 'node:child_process';
import { mkdir, readFile, realpath, rmdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import sharp from 'sharp';
import { pageBounds } from './word-page-bounds.js';

const automation = join(import.meta.dirname, 'word-capture.applescript');

function warn(message: string) {
  process.stderr.write(`Warning: ${message}; saving captures anyway\n`);
}

function word(action: string, input: string, args: string[] = []) {
  return execFileSync('/usr/bin/osascript', [automation, action, input, pathToFileURL(input).href, ...args], {
    encoding: 'utf8', timeout: 130_000, stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function paperSize(input: string) {
  const zip = await JSZip.loadAsync(await readFile(input));
  const xml = zip.file('word/document.xml');
  if (!xml) throw new Error('DOCX is missing word/document.xml');
  const document = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(await xml.async('string'));
  const sizes: Array<{ width: number; height: number }> = [];
  function visit(node: unknown) {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pgSz') sizes.push({ width: Number(value['@_w']) / 20, height: Number(value['@_h']) / 20 });
      else visit(value);
    }
  }
  visit(document);
  const size = sizes[0];
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) throw new Error('DOCX must declare valid paper dimensions');
  if (sizes.some(other => other.width !== size.width || other.height !== size.height)) throw new Error('Word capture requires the same paper dimensions in every section');
  return size;
}

async function capture(input: string) {
  const size = await paperSize(input).catch(error => {
    warn(error instanceof Error ? error.message : String(error));
    return undefined;
  });
  const scratch = join(import.meta.dirname, '../../.tmp/word-capture');
  await mkdir(scratch, { recursive: true });
  const [status, title] = word('open', input).split('\n');
  const count = Number(status.match(/(\d+)\D*$/)?.[1]);
  if (!Number.isInteger(count) || count < 1) throw new Error(`Cannot read Word page count: ${status}`);
  const windowID = execFileSync('/usr/bin/swift', [join(import.meta.dirname, 'word-window.swift'), title], { encoding: 'utf8', timeout: 120_000 }).trim();
  if (!/^\d+$/.test(windowID)) throw new Error('Cannot determine Word window ID');
  const scroll = (delta: number) => execFileSync('/usr/bin/swift', [join(import.meta.dirname, 'word-window.swift'), title, String(Math.round(delta))], { timeout: 120_000 });
  const snapshot = async () => {
    const path = join(scratch, `${input.split('/').at(-1)}-viewport.png`);
    const [fraction, left, top, width, height, windowWidth] = word('capture', input, ['capture', path, windowID]).split(',').map(Number);
    if (![left, top, width, height, windowWidth].every(Number.isFinite)) throw new Error('Word returned invalid container bounds');
    const metadata = await sharp(path).metadata();
    const scale = metadata.width! / windowWidth;
    const viewport = join(scratch, `${input.split('/').at(-1)}-container.png`);
    await sharp(path).extract({ left: Math.round(left * scale), top: Math.round(top * scale), width: Math.round(width * scale), height: Math.round(height * scale) }).png().toFile(viewport);
    const { data, info } = await sharp(viewport).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pages = pageBounds({ data, ...info });
    if (!pages.length) warn('No white paper found in the Word container; saving the viewport');
    return { path: viewport, pages, height: info.height, fraction, scale };
  };
  scroll(100_000);
  const first = await snapshot();
  const paper = first.pages[0] ?? { left: 0, top: 0, width: (await sharp(first.path).metadata()).width!, height: first.height };
  if (paper.top === 0 || paper.top + paper.height >= first.height) warn('The first Word page may be clipped');
  let pitch = count > 1 ? first.pages[1]?.top - paper.top : paper.height;
  if (!Number.isFinite(pitch) || (count > 1 && pitch <= paper.height)) {
    warn('Cannot determine Word page spacing; page positions will be approximate');
    pitch = paper.height;
  }
  scroll(-100_000);
  let frame = await snapshot();
  const end = frame.pages.at(-1);
  let range = end ? paper.top + (count - 1) * pitch + paper.height - end.top - end.height : NaN;
  if (!Number.isFinite(range) || (count > 1 && (range <= 0 || frame.fraction !== 1))) {
    warn('Cannot measure Word document scroll range; page positions will be approximate');
    range = (count - 1) * pitch;
  }
  scroll(100_000);
  frame = await snapshot();
  for (let index = 0; index < count; index++) {
    if (Number.isFinite(frame.fraction)) scroll((frame.fraction * range - index * pitch) / frame.scale);
    else if (index > 0) {
      warn(`Cannot measure scroll position for page ${index + 1}; advancing by estimated page spacing`);
      scroll(-pitch / frame.scale);
    }
    frame = await snapshot();
    const bounds = frame.pages.find(bounds => bounds.top > 0 && bounds.top + bounds.height < frame.height && Math.round((frame.fraction * range + bounds.top - paper.top) / pitch) === index);
    if (!bounds) warn(`Cannot identify full Word page ${index + 1}; saving the viewport, which may include clipped or adjacent pages`);
    if (bounds && size && Math.abs(bounds.width / bounds.height - size.width / size.height) > 0.02) warn(`Word page ${index + 1} bounds do not match DOCX dimensions`);
    const path = `${input}.${index + 1}.png`;
    const image = sharp(frame.path);
    await writeFile(path, await (bounds ? image.extract(bounds) : image).png().toBuffer(), { flag: 'wx' });
    process.stdout.write(`${path}\n`);
    process.stderr.write(`Captured page ${index + 1}/${count}\n`);
  }
  word('close', input);
}

try {
  const scratch = join(import.meta.dirname, '../../.tmp');
  await mkdir(scratch, { recursive: true });
  const lock = join(scratch, 'word-capture.lock');
  await mkdir(lock);
  try {
    await capture(await realpath(process.argv[2]));
  } finally {
    await rmdir(lock);
  }
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
