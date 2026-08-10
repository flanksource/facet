import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadDataFile } from './data-loader.js';

const scratchRoot = resolve(process.cwd(), '.tmp');
const roots: string[] = [];

async function dataFile(extension: string, content: string): Promise<string> {
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(join(scratchRoot, 'data-loader-'));
  const file = join(root, `incident${extension}`);
  roots.push(root);
  await writeFile(file, content);
  return file;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('loadDataFile', () => {
  it.each([
    ['.json', '{"id":"inc-2026-001","detected_at":"2026-08-07T11:36:00Z"}'],
    ['.yaml', 'id: inc-2026-001\ndetected_at: 2026-08-07T11:36:00Z\n'],
    ['.yml', 'id: inc-2026-001\ndetected_at: 2026-08-07T11:36:00Z\n'],
  ])('loads %s object data without coercing timestamps', async (extension, content) => {
    expect(await loadDataFile(await dataFile(extension, content))).toEqual({
      id: 'inc-2026-001',
      detected_at: '2026-08-07T11:36:00Z',
    });
  });

  it('rejects malformed YAML with the source path', async () => {
    const file = await dataFile('.yaml', 'id: [inc-2026-001\n');
    await expect(loadDataFile(file)).rejects.toThrow(`Failed to load YAML data file ${file}`);
  });

  it.each([
    ['an array', '- inc-2026-001\n'],
    ['a scalar', 'inc-2026-001\n'],
  ])('rejects %s at the data-file root', async (_description, content) => {
    const file = await dataFile('.yaml', content);
    await expect(loadDataFile(file)).rejects.toThrow(`Data file ${file} must contain an object`);
  });

  it('rejects unsupported data-file extensions', async () => {
    const file = await dataFile('.toml', 'id = "inc-2026-001"\n');
    await expect(loadDataFile(file)).rejects.toThrow(`Unsupported data file extension .toml: ${file}`);
  });
});
