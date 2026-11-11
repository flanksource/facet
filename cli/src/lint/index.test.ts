import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../utils/logger.js';
import { loadSharp } from '../utils/sharp.js';
import { runLint } from './index.js';

describe('PNG lint command integration', () => {
  let dir: string;
  let blank: string;
  const logger = new Logger();

  beforeEach(async () => {
    const root = resolve('.tmp');
    await mkdir(root, { recursive: true });
    dir = await mkdtemp(join(root, 'png-lint-'));
    await mkdir(join(dir, 'nested'));
    blank = join(dir, 'nested', 'blank.PNG');
    const sharp = await loadSharp();
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#ffffff' } }).png().toFile(blank);
    vi.spyOn(logger, 'log').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it('discovers PNGs recursively alongside TSX files and reports both', async () => {
    await writeFile(join(dir, 'Report.tsx'), 'const colour = <div style={{ color: "#ffffff" }} />;');
    expect(await runLint({ paths: [dir], logger, verbose: false, severity: 'warning' })).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('png-empty'));
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('inline-hex-colors'));
  });

  it('accepts an explicit PNG path and PNG-only rule', async () => {
    expect(await runLint({ paths: [blank], rule: 'png-empty', logger, verbose: false, severity: 'error' })).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('png-empty'));
  });

  it('returns a failing CLI exit status for a PNG finding', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'lint', blank], { encoding: 'utf8' });
    expect({ status: result.status, output: result.stdout }).toEqual({
      status: 1, output: expect.stringContaining('png-empty'),
    });
  });

  it('exports parseable ESLint JSON from the CLI, even with verbose enabled', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'lint', blank, '--json', '--verbose'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual([expect.objectContaining({
      filePath: blank, errorCount: 1, warningCount: 0,
      messages: [expect.objectContaining({ ruleId: 'png-empty', severity: 2, locations: [expect.objectContaining({ type: 'png' })] })],
    })]);
  });

  it('omits files with no findings in JSON output', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'lint', dir, '--rule', 'inline-hex-colors', '--json'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([]);
  });

  it('exports an empty JSON array when no supported files exist', async () => {
    await rm(blank);
    expect(await runLint({ paths: [dir], logger, json: true, verbose: true, severity: 'warning' })).toBe(0);
    expect(logger.log).toHaveBeenCalledExactlyOnceWith('[]');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('preserves JSON warning counts and applies source suppressions', async () => {
    const file = join(dir, 'Report.tsx');
    await writeFile(file, [
      '// facet-lint-disable-next-line',
      'const hidden = <div style={{ color: "#ffffff" }} />;',
      'const visible = <div style={{ color: "#111111" }} />;',
    ].join('\n'));
    expect(await runLint({ paths: [file], rule: 'inline-hex-colors', logger, json: true, verbose: false, severity: 'warning' })).toBe(1);
    expect(JSON.parse(vi.mocked(logger.log).mock.calls[0][0])).toEqual([expect.objectContaining({
      filePath: file, errorCount: 0, warningCount: 1,
      messages: [expect.objectContaining({ ruleId: 'inline-hex-colors', severity: 1, line: 3 })],
    })]);
  });

  it('flushes large JSON reports completely before the CLI exits', async () => {
    const count = 1200;
    const file = join(dir, 'Report.tsx');
    await writeFile(file, 'const colour = <div style={{ color: "#ffffff" }} />;\n'.repeat(count));
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'lint', file, '--rule', 'inline-hex-colors', '--json'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual([expect.objectContaining({
      filePath: file, warningCount: count, messages: expect.any(Array),
    })]);
    expect(JSON.parse(result.stdout)[0].messages).toHaveLength(count);
  });

  it('keeps operational failures on stderr in JSON mode', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/cli.ts'), 'lint', blank, '--rule', 'unknown-rule', '--json', '--verbose'], { encoding: 'utf8' });
    expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({
      status: 2, stdout: '', stderr: expect.stringContaining('Unknown rule: unknown-rule'),
    });
  });

  it('filters PNG rules by name and severity', async () => {
    expect(await runLint({ paths: [blank], rule: 'png-line-crossing', logger, verbose: false, severity: 'warning' })).toBe(0);
    const sharp = await loadSharp();
    await sharp(Buffer.from('<svg width="100" height="100"><path d="M10 50H90M50 10V90" stroke="black" stroke-width="2"/></svg>'))
      .flatten({ background: '#ffffff' }).png().toFile(blank);
    expect(await runLint({ paths: [blank], logger, verbose: false, severity: 'error' })).toBe(0);
    expect(await runLint({ paths: [blank], rule: 'png-line-crossing', logger, verbose: false, severity: 'warning' })).toBe(1);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('pixel (49, 49)'));
  });

  it('does not decode PNGs when a TSX-only rule is selected', async () => {
    await writeFile(blank, 'invalid image');
    expect(await runLint({ paths: [blank], rule: 'inline-hex-colors', logger, verbose: false, severity: 'warning' })).toBe(0);
  });

  it('fails on corrupt PNGs and missing paths rather than silently passing', async () => {
    await writeFile(blank, 'invalid image');
    await expect(runLint({ paths: [blank], logger, verbose: false, severity: 'warning' })).rejects.toThrow('blank.PNG');
    await expect(runLint({ paths: [join(dir, 'missing.png')], logger, verbose: false, severity: 'warning' })).rejects.toThrow('missing.png');
  });
});
