import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
mkdirSync(join(root, '.tmp'), { recursive: true });
const directory = mkdtempSync(join(root, '.tmp/word-export-'));
const source = join(directory, 'Report with spaces.docx');
writeFileSync(source, 'Validation fixture; never opened by Word.');
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function run(...args: string[]) {
  return spawnSync('bash', [join(root, 'cli/scripts/docx-to-pdf.sh'), ...args], {
    encoding: 'utf8',
  });
}

describe('docx-to-pdf argument validation', () => {
  it('describes numbered PNG output beside the DOCX', () => {
    const result = run('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('input.docx\n');
    expect(result.stdout).toContain('input.docx.1.png');
  });

  it.each([
    { name: 'missing input', args: [] },
    { name: 'output argument', args: [source, 'output.pdf'] },
  ])('rejects $name', ({ args }) => {
    expect(run(...args).status).toBe(2);
  });

  it('reports a missing source', () => {
    const result = run(join(directory, 'missing.docx'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Input file does not exist');
  });

  it('preserves existing page captures', () => {
    writeFileSync(`${source}.2.png`, 'Existing page');
    const result = run(source);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Page image already exists');
  });
});
