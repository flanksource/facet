import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { Command } from 'commander';
import { registerInspectCommand } from './inspect.js';
import { fixture } from '../office/inspect/fixtures.test-utils.js';

describe('facet inspect', () => {
  let directory: string;
  let source: string;
  let stdout: string;
  let stderr: string;
  let exitCode: typeof process.exitCode;
  beforeEach(async () => {
    const root = fileURLToPath(new URL('../../../.tmp/', import.meta.url));
    await mkdir(root, { recursive: true });
    directory = await mkdtemp(join(root, 'inspect-test-'));
    source = join(directory, 'Example Report.docx');
    await writeFile(source, await fixture('<w:sectPr><w:pgSz w:w="1440" w:h="2880"/><w:pgMar w:top="720"/></w:sectPr>').generateAsync({ type: 'uint8array' }));
    stdout = ''; stderr = ''; exitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { stdout += chunk.toString(); return true; });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { stderr += chunk.toString(); return true; });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    process.exitCode = exitCode;
    await rm(directory, { recursive: true, force: true });
  });
  const program = (): Command => {
    const command = new Command().exitOverride();
    registerInspectCommand(command);
    return command;
  };

  it('prints section, asset, Word-font and PDF-font tables with explicit units', async () => {
    await program().parseAsync(['inspect', source], { from: 'user' });
    expect(stdout).toContain('Section settings (mm)');
    expect(stdout).toContain('25.4 × 50.8');
    expect(stdout).toContain('Embedded assets (0)');
    expect(stdout).toContain('Word font references (0)');
    expect(stdout).toContain('Embedded PDF fonts (0)');
    expect(stderr).toBe('');
  });

  it('emits clean JSON without changing the input or creating files', async () => {
    const before = await readFile(source);
    await program().parseAsync(['inspect', source, '--json'], { from: 'user' });
    expect(JSON.parse(stdout)).toMatchObject({ sections: [{ index: 1, size: { widthMm: 25.4, heightMm: 50.8 }, margins: { topMm: 12.7 } }], assets: [], fonts: { word: [], pdf: [] } });
    expect(await readFile(source)).toEqual(before);
    expect(await readdir(directory)).toEqual(['Example Report.docx']);
    expect(stderr).toBe('');
  });

  it('returns a contextual error and nonzero status for a missing input', async () => {
    await program().parseAsync(['inspect', join(directory, 'missing.docx'), '--json'], { from: 'user' });
    expect(process.exitCode).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toContain('missing.docx');
  });

  it('rejects extraction options', async () => {
    await expect(program().parseAsync(['inspect', source, '--extract', directory], { from: 'user' })).rejects.toThrow(/unknown option.*--extract/);
    expect(await readdir(directory)).toEqual(['Example Report.docx']);
  });

  it('rejects extra files instead of silently inspecting only the first one', async () => {
    await expect(program().parseAsync(['inspect', source, source], { from: 'user' })).rejects.toThrow(/too many arguments/i);
    expect(stdout).toBe('');
  });
});
