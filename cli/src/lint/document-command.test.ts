import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture, PNG, relations, pdfFixture } from '../inspection/fixtures.test-utils.js';

describe('document lint CLI', () => {
  let directory: string;
  let source: string;
  beforeEach(async () => {
    await mkdir(resolve('.tmp'), { recursive: true });
    directory = await mkdtemp(resolve('.tmp/document-lint-'));
    source = join(directory, 'Example Report.docx');
    const zip = fixture('<w:p><w:r><w:drawing><a:blip r:embed="picture"/></w:drawing></w:r></w:p><w:sectPr><w:pgSz w:w="1440" w:h="2880"/></w:sectPr>');
    zip.file('word/media/picture.png', PNG);
    zip.file('word/_rels/document.xml.rels', relations([{ id: 'picture', type: 'image', target: 'media/picture.png' }]));
    await writeFile(source, await zip.generateAsync({ type: 'uint8array' }));
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), ...args], { encoding: 'utf8' });

  it('emits native info JSON without modifying the document or creating files', async () => {
    const before = await readFile(source);
    const result = cli('lint', source, '--json');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([expect.objectContaining({
      infoCount: 1, messages: [expect.objectContaining({ ruleId: 'docx-section', level: 'info', locations: [expect.objectContaining({ part: 'word/document.xml' })] })],
    })]);
    expect(await readFile(source)).toEqual(before);
    expect(await readdir(directory)).toEqual(['Example Report.docx']);
  });

  it('adds embedded image entries only with the opt-in flag, without failing info-only lint', () => {
    const result = cli('lint', source, '--embedded-images', '--json');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)[0]).toMatchObject({ infoCount: 2, messages: [expect.objectContaining({ ruleId: 'docx-section' }), expect.objectContaining({ ruleId: 'docx-embedded-image', level: 'info' })] });
  });

  it('uses native human-readable locations and info totals', () => {
    const result = cli('lint', source, '--embedded-images');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('word/document.xml');
    expect(result.stdout).toContain('25.4 × 50.8 mm');
    expect(result.stdout).toContain('2 info');
  });

  it('filters info using severity and discovers mixed document directories', async () => {
    await writeFile(join(directory, 'Example.pdf'), await pdfFixture());
    const result = cli('lint', directory, '--json');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toHaveLength(2);
    expect(JSON.parse(cli('lint', directory, '--severity', 'warning', '--json').stdout)).toEqual([]);
  });

  it('rejects corrupt documents and invalid severity with clean stdout', async () => {
    await writeFile(source, 'invalid docx');
    for (const args of [['lint', source, '--json'], ['lint', source, '--severity', 'bad', '--json']]) {
      const result = cli(...args);
      expect({ status: result.status, stdout: result.stdout }).toEqual({ status: 2, stdout: '' });
      expect(result.stderr).toMatch(/ZIP|severity/);
    }
  });

  it('exports inspection JSON separately from lint diagnostics', () => {
    const result = cli('inspect', source, '--json');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([expect.objectContaining({ format: 'docx', fonts: { status: 'available' } })]);
  });
});
