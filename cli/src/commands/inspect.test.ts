import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture } from '../inspection/fixtures.test-utils.js';

describe('inspect CLI', () => {
  let directory: string;
  let file: string;
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'inspect', ...args], { encoding: 'utf8' });
  beforeEach(async () => {
    await mkdir(resolve('.tmp'), { recursive: true });
    directory = await mkdtemp(resolve('.tmp/inspect-'));
    file = join(directory, 'Example.docx');
    await writeFile(file, await fixture('<w:p><w:r><w:rPr><w:rFonts w:ascii="Example Face"/><w:color w:val="000000"/></w:rPr></w:r></w:p>').generateAsync({ type: 'uint8array' }));
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

  it('emits indented JSON with the exact boolean options and no banner', async () => {
    const before = await readFile(file);
    const result = cli(file, '--fonts=true', '--font-position=false', '--colors=true', '--color-positions=false', '--json');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${JSON.stringify(JSON.parse(result.stdout), null, 2)}\n`);
    expect(result.stdout).not.toContain('locations');
    expect(JSON.parse(result.stdout)[0]).toMatchObject({ fonts: { entries: [{ name: 'Example Face' }] }, colors: { approximate: false, entries: [{ value: '#000000' }] } });
    expect(await readFile(file)).toEqual(before);
  });

  it('omits disabled categories for multiple input files and enables positions independently', () => {
    const result = cli(file, file, '--fonts=false', '--color-positions=true', '--json');
    expect(result.status).toBe(0);
    const values = JSON.parse(result.stdout);
    expect(values).toHaveLength(2);
    expect(values[0]).not.toHaveProperty('fonts');
    expect(values[0].colors.entries[0].locations).toEqual([expect.objectContaining({ part: 'word/document.xml' })]);
  });

  it.each([['--fonts=maybe'], ['--fonts=false', '--font-position=true'], ['--colors=false', '--color-positions=true']])('rejects invalid configuration %s with empty stdout', (...args) => {
    const result = cli(file, ...args, '--json');
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/true or false|requires/);
  });
});
