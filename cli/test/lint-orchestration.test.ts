import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles, findDiagramCandidates, runLint } from '../src/lint/index.js';
import type { ExternalToolRunner } from '../src/lint/external-runner.js';
import type { LlmClient } from '../src/lint/llm.js';

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
  it('runs Vale and renders diagrams without invoking an external diagram analyzer', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'guide.md'), 'Hello'); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    const calls: string[][] = [];
    const runner: ExternalToolRunner = async (command, args) => { calls.push([command, ...args]); return { stdout: JSON.stringify({ 'guide.md': [{ Check: 'Style.Spacing', Severity: 'warning', Message: 'space', Line: 1, Span: [1, 2] }] }), stderr: '' }; };
    const diagramRenderer = { render: async (_file: string, _cwd: string, outputDir: string) => { const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, vale: true, diagrams: true, runner, diagramRenderer, logger })).toBe(1);
    expect(calls).toEqual([['vale', '--output=JSON', '--no-exit', '--', 'guide.md']]);
  });
  it('renders candidates and cleans its temporary directory without LLM requests', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    let renderedPath = ''; let requests = 0;
    const llm: LlmClient = { review: async () => { requests++; throw new Error('unexpected LLM request'); } };
    const diagramRenderer = { render: async (_file: string, _cwd: string, outputDir: string) => { renderedPath = outputDir; const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, llm, diagramRenderer, logger })).toBe(0);
    expect(renderedPath).not.toBe(''); expect(existsSync(renderedPath)).toBe(false); expect(requests).toBe(0);
  });
  it('reviews every rendered candidate with the injected provider-neutral client', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    let requests = 0;
    const llm: LlmClient = { review: async ({ imageBase64 }) => { requests++; expect(imageBase64).toBe(Buffer.from('png').toString('base64')); return { text: JSON.stringify({ pass: true, summary: 'good', issues: [] }), provider: 'openai', model: 'test-model', usage: { inputTokens: 12, outputTokens: 3 } }; } };
    const renderer = { render: async (_file: string, _cwd: string, outputDir: string) => { const png = join(outputDir, 'body.png'); writeFileSync(png, 'png'); return png; } };
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagrams: true, diagramsAi: true, llm, diagramRenderer: renderer, logger })).toBe(0);
    expect(requests).toBe(1);
  });
  it('rejects diagrams-ai without diagrams', async () => {
    const cwd = root(); writeFileSync(join(cwd, 'diagram.tsx'), '<Diagram />');
    expect(await runLint({ paths: ['.'], cwd, severity: 'warning', verbose: false, diagramsAi: true, logger })).toBe(1);
  });
});
