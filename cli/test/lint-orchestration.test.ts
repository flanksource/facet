import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles, runLint } from '../src/lint/index.js';
import type { ExternalToolRunner } from '../src/lint/external-runner.js';

const roots: string[] = [];
const logger = { error: () => undefined, info: () => undefined, log: () => undefined, warn: () => undefined };
function root() { const path = mkdtempSync(join(tmpdir(), 'facet-lint-test-')); roots.push(path); return path; }
afterEach(() => { for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });

function renderer() {
  return { render: async (_file: string, _cwd: string, outputDir: string) => { const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
}

function captainResult(pass = true): string {
  return JSON.stringify({
    status: 'completed', model: 'claude-sonnet-4-6', provider: 'anthropic',
    inputTokens: 12, outputTokens: 3, duration: '1s', costUSD: 0.04,
    structuredOutput: pass
      ? { pass: true, summary: 'good', issues: [] }
      : { pass: false, summary: 'bad', issues: [{ category: 'spacing', severity: 'warning', location: 'node A', evidence: 'crowded', recommendedFix: 'increase gap' }] },
  });
}

describe('lint orchestration', () => {
  it('discovers sorted unique supported files and only skips recursive TSX stories', () => {
    const cwd = root(); mkdirSync(join(cwd, 'nested'), { recursive: true }); mkdirSync(join(cwd, 'node_modules'));
    writeFileSync(join(cwd, 'nested', 'b.md'), 'text'); writeFileSync(join(cwd, 'a.tsx'), ''); writeFileSync(join(cwd, 'nested', 'x.stories.tsx'), ''); writeFileSync(join(cwd, 'node_modules', 'bad.tsx'), '');
    expect(discoverFiles(['.', 'a.tsx'], cwd).map((p) => p.slice(cwd.length + 1))).toEqual(['a.tsx', 'nested/b.md']);
  });

  it('runs Vale and renders diagrams without invoking Captain', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'guide.md'), 'Hello'); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    const calls: string[][] = [];
    const runner: ExternalToolRunner = async (command, args) => { calls.push([command, ...args]); return { stdout: JSON.stringify({ 'guide.md': [{ Check: 'Style.Spacing', Severity: 'warning', Message: 'space', Line: 1, Span: [1, 2] }] }), stderr: '' }; };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, vale: true, diagrams: true, runner, diagramRenderer: renderer(), logger })).toBe(1);
    expect(calls).toEqual([['vale', '--output=JSON', '--no-exit', '--', 'guide.md']]);
  });

  it('renders candidates and cleans its temporary directory with zero model calls', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    let renderedPath = '';
    const runner: ExternalToolRunner = async () => { throw new Error('unexpected external request'); };
    const diagramRenderer = { render: async (_file: string, _cwd: string, outputDir: string) => { renderedPath = outputDir; const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, runner, diagramRenderer, logger })).toBe(0);
    expect(renderedPath).not.toBe(''); expect(existsSync(renderedPath)).toBe(false);
  });

  it('uses Captain only for explicit visual review and passes the model override', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    const calls: string[][] = []; const logs: string[] = [];
    const runner: ExternalToolRunner = async (command, args) => { calls.push([command, ...args]); return { stdout: captainResult(false), stderr: '' }; };
    const capture = { error: () => undefined, info: (message: string) => logs.push(message), log: () => undefined, warn: () => undefined };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, diagramsAi: true, llmModel: 'api:claude-sonnet-4-6', runner, diagramRenderer: renderer(), logger: capture })).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('captain');
    expect(calls[0]).toContain('prompt');
    expect(calls[0]).not.toContain('diagrams');
    expect(calls[0].slice(-2)).toEqual(['--model', 'api:claude-sonnet-4-6']);
    expect(logs.some((line) => line.includes('provider=anthropic') && line.includes('costUSD=0.04'))).toBe(true);
  });

  it('rejects diagrams-ai without diagrams', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagramsAi: true, logger })).toBe(1);
  });
});
