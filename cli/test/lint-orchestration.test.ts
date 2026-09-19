import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles, findDiagramCandidates, runLint } from '../src/lint/index.js';
import type { ExternalToolRunner } from '../src/lint/external-runner.js';

const roots: string[] = [];
const logger = { error: () => undefined, info: () => undefined, log: () => undefined, warn: () => undefined };
function root() { const path = mkdtempSync(join(tmpdir(), 'facet-lint-test-')); roots.push(path); return path; }
afterEach(() => { for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe('lint orchestration', () => {
  it('discovers sorted unique supported files and only skips recursive TSX stories', () => {
    const cwd = root(); mkdirSync(join(cwd, 'nested'), { recursive: true }); mkdirSync(join(cwd, 'node_modules')); 
    writeFileSync(join(cwd, 'nested', 'b.md'), 'text'); writeFileSync(join(cwd, 'a.tsx'), ''); writeFileSync(join(cwd, 'nested', 'x.stories.tsx'), ''); writeFileSync(join(cwd, 'node_modules', 'bad.tsx'), '');
    expect(discoverFiles(['.', 'a.tsx'], cwd).map((p) => p.slice(cwd.length + 1))).toEqual(['a.tsx', 'nested/b.md']);
  });
  it('runs Vale and Captain with exact argv and maps diagnostics', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'guide.md'), 'Hello'); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    const calls: string[][] = [];
    const runner: ExternalToolRunner = async (command, args) => { calls.push([command, ...args]); if (command === 'vale') return { stdout: JSON.stringify({ 'guide.md': [{ Check: 'Style.Spacing', Severity: 'warning', Message: 'space', Line: 1, Span: [1, 2] }] }), stderr: '' }; return { stdout: JSON.stringify({ schema_version: 1, files_analyzed: 2, diagrams_analyzed: 1, diagnostics: [] }), stderr: '' }; };
    const diagramRenderer = { render: async (_file: string, _cwd: string, outputDir: string) => { const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, vale: true, diagrams: true, runner, diagramRenderer, logger })).toBe(1);
    expect(calls[0]).toEqual(['vale', '--output=JSON', '--no-exit', '--', 'guide.md']);
    expect(calls[1]).toEqual(['captain', 'diagrams', 'analyze', '--schema-version=1', '--', 'diagram.tsx', 'guide.md']);
  });
  it('renders candidates for diagrams and cleans its temporary directory', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    let rendered = false; let renderedPath = '';
    const calls: string[][] = [];
    const runner: ExternalToolRunner = async (command, args) => { calls.push([command, ...args]); return { stdout: JSON.stringify({ schema_version: 1, files_analyzed: 1, diagrams_analyzed: 1, diagnostics: [] }), stderr: '' }; };
    const diagramRenderer = { render: async (_file: string, _cwd: string, outputDir: string) => { rendered = true; renderedPath = outputDir; const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, runner, diagramRenderer, logger })).toBe(0);
    expect(rendered).toBe(true); expect(existsSync(renderedPath)).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('captain');
    expect(calls[0]).not.toContain('prompt');
  });
  it('maps strict visual issues to source line one and logs model cost', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />'); const logs: string[] = []; const calls: string[][] = [];
    const runner: ExternalToolRunner = async (command, args) => { if (command !== 'captain') throw new Error('unexpected tool'); calls.push([command, ...args]); return calls.length === 1 ? { stdout: JSON.stringify({ schema_version: 1, files_analyzed: 1, diagrams_analyzed: 1, diagnostics: [] }), stderr: '' } : { stdout: JSON.stringify({ model: 'agent:sol:medium', provider: 'anthropic', status: 'completed', inputTokens: 12, outputTokens: 3, duration: '1s', costUSD: 0.04, structuredOutput: { pass: false, summary: 'bad', issues: [{ category: 'spacing', severity: 'warning', location: 'node A', evidence: 'crowded', recommendedFix: 'increase gap' }] } }), stderr: '' }; };
    const loggerWithCapture = { error: () => undefined, info: (message: string) => logs.push(message), log: () => undefined, warn: () => undefined };
    const renderer = { render: async (_file: string, _cwd: string, outputDir: string) => { const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, diagramsAi: true, runner, diagramRenderer: renderer, logger: loggerWithCapture })).toBe(1);
    expect(logs.some((line) => line.includes('model=agent:sol:medium') && line.includes('costUSD=0.04'))).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('prompt');
    expect(calls[1]).toContain('run');
  });
  it('rejects diagrams-ai without diagrams', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagramsAi: true, logger })).toBe(1);
  });
});
