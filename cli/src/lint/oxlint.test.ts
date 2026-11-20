import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExternalToolRunner } from './external-runner.js';
import { runLint } from './index.js';
import { OXLINT_RULE, resolveOxlintBinary, runOxlint } from './oxlint.js';

const MESSAGE = '`<rect>` is drawn from data (`zones.map`); write each diagram shape as JSX so it can be edited in place.';
const roots: string[] = [];
const logs: string[] = [];
const logger = { error: (m: string) => logs.push(m), info: () => undefined, log: (m: string) => logs.push(m), warn: () => undefined };
function root(): string { const path = mkdtempSync(join(tmpdir(), 'facet-oxlint-test-')); roots.push(path); return path; }
afterEach(() => { logs.length = 0; for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });

function diagnostic(filename: string, overrides: Record<string, unknown> = {}) {
  return { message: MESSAGE, code: `facet(${OXLINT_RULE})`, severity: 'warning', filename, labels: [{ span: { offset: 10, length: 20, line: 7, column: 26 } }], ...overrides };
}
function stub(diagnostics: unknown[], received: { command?: string; args?: string[]; config?: unknown } = {}): ExternalToolRunner {
  return async (command, args) => {
    received.command = command; received.args = args;
    received.config = JSON.parse(readFileSync(args[args.indexOf('-c') + 1], 'utf8'));
    return { stdout: JSON.stringify({ diagnostics }), stderr: '' };
  };
}

describe('runOxlint', () => {
  it('invokes facet\'s own oxlint through node with the plugin config, JSON output and absolute file paths', async () => {
    const cwd = root(); const received: { command?: string; args?: string[]; config?: unknown } = {};
    await runOxlint({ files: ['a.tsx', 'nested/b.tsx'], cwd, runner: stub([], received) });
    expect(received.command).toBe(process.execPath);
    expect(received.args![0]).toBe(resolveOxlintBinary());
    expect(received.args!.slice(received.args!.indexOf('--format'))).toEqual(['--format', 'json', '--no-ignore', '--', join(cwd, 'a.tsx'), join(cwd, 'nested/b.tsx')]);
    expect(received.config).toEqual({
      jsPlugins: [expect.stringMatching(/facet-diagrams(\.oxlint)?\.(m?js)$/)],
      categories: { correctness: 'off' },
      rules: { 'facet/no-data-driven-diagram': 'warn' },
    });
  });

  it('maps oxlint diagnostics to LintIssues with cwd-relative files', async () => {
    const cwd = root();
    const issues = await runOxlint({ files: ['sub/diagram.tsx'], cwd, runner: stub([diagnostic(join(cwd, 'sub/diagram.tsx'))]) });
    expect(issues).toEqual([{ file: 'sub/diagram.tsx', line: 7, column: 26, rule: 'no-data-driven-diagram', severity: 'warning', message: MESSAGE }]);
  });

  it('accepts cwd-relative filenames and keeps an error severity', async () => {
    const issues = await runOxlint({ files: ['diagram.tsx'], cwd: root(), runner: stub([diagnostic('diagram.tsx', { severity: 'error' })]) });
    expect(issues).toEqual([expect.objectContaining({ file: 'diagram.tsx', severity: 'error' })]);
  });

  it('does not run oxlint when there are no TSX files', async () => {
    const runner: ExternalToolRunner = async () => { throw new Error('should not run'); };
    expect(await runOxlint({ files: [], cwd: root(), runner })).toEqual([]);
  });

  it('fails when oxlint cannot run', async () => {
    const runner: ExternalToolRunner = async () => { throw new Error('"node" exited with code 1: boom'); };
    await expect(runOxlint({ files: ['a.tsx'], cwd: root(), runner })).rejects.toThrow('exited with code 1: boom');
  });

  it.each([
    ['malformed JSON', async () => ({ stdout: 'not json', stderr: '' }), 'oxlint returned malformed JSON output'],
    ['a missing diagnostics array', async () => ({ stdout: '{}', stderr: '' }), 'oxlint returned malformed JSON output'],
  ] as const)('fails on %s', async (_name, runner, message) => {
    await expect(runOxlint({ files: ['a.tsx'], cwd: root(), runner })).rejects.toThrow(message);
  });

  it('fails on a parse error instead of treating the file as clean', async () => {
    const cwd = root();
    const parseError = diagnostic(join(cwd, 'a.tsx'), { code: '', message: 'Unexpected token' });
    await expect(runOxlint({ files: ['a.tsx'], cwd, runner: stub([parseError]) })).rejects.toThrow('oxlint could not lint a.tsx: Unexpected token');
  });

  it('fails on a diagnostic for a file that was not requested', async () => {
    await expect(runOxlint({ files: ['a.tsx'], cwd: root(), runner: stub([diagnostic('other.tsx')]) })).rejects.toThrow('unrequested file: other.tsx');
  });

  it('fails on an unsupported severity', async () => {
    await expect(runOxlint({ files: ['a.tsx'], cwd: root(), runner: stub([diagnostic('a.tsx', { severity: 'advice' })]) })).rejects.toThrow('unsupported severity "advice"');
  });
});

describe('runLint with the data-driven diagram rule', () => {
  it.each([false, true])('prints source findings before rendering and one summary when rendering fails=%s', async (fails) => {
    const cwd = root();
    writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    const failure = new Error('browser failed');
    const diagramRenderer = { render: async () => {
      expect(logs.join('\n')).toContain(MESSAGE);
      if (fails) throw failure;
      return 'diagram.png';
    } };
    const pending = runLint({ paths: ['diagram.tsx'], diagrams: true, cwd, severity: 'warning', verbose: false,
      runner: stub([diagnostic('diagram.tsx', { labels: [{ span: { line: 1, column: 1 } }] })]), diagramRenderer, logger });
    if (fails) await expect(pending).rejects.toBe(failure);
    else expect(await pending).toBe(1);
    expect(logs.join('\n').split(MESSAGE)).toHaveLength(2);
    expect(logs.join('\n').match(/0 errors, 1 warning/g)).toHaveLength(1);
  });

  function project(source: string): string {
    const cwd = root(); mkdirSync(join(cwd, 'docs'));
    writeFileSync(join(cwd, 'Diagram.tsx'), source); writeFileSync(join(cwd, 'docs', 'guide.md'), 'Hello');
    return cwd;
  }
  const lines = ['const a = 1;', 'const b = 2;', '// facet-lint-disable-next-line', 'const c = 3;'].join('\n');

  it('reports oxlint findings only for TSX files and fails the run', async () => {
    const cwd = project(lines); const received: { args?: string[] } = {};
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, runner: stub([diagnostic(join(cwd, 'Diagram.tsx'), { labels: [{ span: { line: 2, column: 1 } }] })], received), logger })).toBe(1);
    expect(received.args!.filter((arg) => arg.endsWith('.tsx'))).toEqual([join(cwd, 'Diagram.tsx')]);
    expect(logs.join('\n')).toContain('no-data-driven-diagram');
  });

  it('honors facet-lint-disable-next-line', async () => {
    const cwd = project(lines);
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, runner: stub([diagnostic(join(cwd, 'Diagram.tsx'), { labels: [{ span: { line: 4, column: 1 } }] })]), logger })).toBe(0);
  });

  it('drops warnings below --severity error', async () => {
    const cwd = project(lines);
    expect(await runLint({ paths: ['.'], cwd, severity: 'error', verbose: false, runner: stub([diagnostic(join(cwd, 'Diagram.tsx'), { labels: [{ span: { line: 1, column: 1 } }] })]), logger })).toBe(0);
  });

  it('--rule no-data-driven-diagram runs only this rule, and another --rule skips oxlint', async () => {
    const cwd = project('const x = <div style={{ color: "#ffffff" }} />;');
    expect(await runLint({ paths: ['.'], cwd, rule: OXLINT_RULE, severity: 'warning', verbose: false, runner: stub([]), logger })).toBe(0);
    const never: ExternalToolRunner = async () => { throw new Error('oxlint must not run'); };
    expect(await runLint({ paths: ['.'], cwd, rule: 'inline-hex-colors', severity: 'warning', verbose: false, runner: never, logger })).toBe(1);
  });

  it('lists the oxlint rule among the available rules', async () => {
    const cwd = project(lines);
    expect(await runLint({ paths: ['.'], cwd, rule: 'nope', severity: 'warning', verbose: false, logger })).toBe(2);
    expect(logs.join('\n')).toContain(OXLINT_RULE);
  });
});
