import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runExternalTool } from './external-runner.js';
import { lintBeforeRender } from './render-gate.js';

const DATA_DRIVEN = [
  'export default function Diagram({ zones }) {',
  '  return <svg>{zones.map((zone) => <rect x={zone.x} width={10} height={10} />)}</svg>;',
  '}',
].join('\n');
const roots: string[] = [];
const logs: string[] = [];
const logger = { error: (m: string) => logs.push(m), info: () => undefined, log: (m: string) => logs.push(m), warn: () => undefined };
function template(source: string): { cwd: string; file: string } {
  const cwd = mkdtempSync(join(tmpdir(), 'facet-render-gate-')); roots.push(cwd);
  const file = join(cwd, 'Diagram.tsx'); writeFileSync(file, source);
  return { cwd, file };
}
afterEach(() => { logs.length = 0; for (const path of roots.splice(0)) rmSync(path, { recursive: true, force: true }); });

describe('lintBeforeRender (--lint on html/png/pdf)', () => {
  it('prints a data-driven template\'s warning and lets the render continue', async () => {
    const { cwd, file } = template(DATA_DRIVEN);
    await expect(lintBeforeRender({ templates: [file], verbose: false, logger, cwd, runner: runExternalTool })).resolves.toBeUndefined();
    expect(logs.join('\n')).toContain('`<rect>` is drawn from data (`zones.map`)');
    expect(logs.join('\n')).toContain('no-data-driven-diagram');
  });

  it('throws on a lint error so the render is skipped', async () => {
    const { cwd, file } = template('export default () => <style>{"@page { size: A4 }"}</style>;');
    await expect(lintBeforeRender({ templates: [file], verbose: false, logger, cwd, runner: runExternalTool })).rejects.toThrow('lint reported errors, rendering skipped');
    expect(logs.join('\n')).toContain('conflicting-print-css');
  });
});

describe('facet html --lint', () => {
  const cli = [process.execPath, '--import', 'tsx', resolve('src/cli.ts')];
  // A dead Facet server makes the render fail right after lint, so no browser or install is needed.
  const render = (file: string) => spawnSync(cli[0], [...cli.slice(1), 'html', file, '--lint', '--facet-url', 'http://127.0.0.1:1'], { encoding: 'utf8' });

  it('prints the report before rendering', () => {
    const { file } = template(DATA_DRIVEN);
    const result = render(file);
    expect(result.stdout).toContain('no-data-driven-diagram');
    expect(result.stdout).toContain('`<rect>` is drawn from data');
    expect(result.stderr + result.stdout).toContain('HTML generation failed');
  });

  it('skips rendering when lint reports an error', () => {
    const { file } = template('export default () => <style>{"@page { size: A4 }"}</style>;');
    const result = render(file);
    expect({ status: result.status, output: result.stdout + result.stderr }).toEqual({
      status: 1, output: expect.stringContaining('HTML generation failed: lint reported errors, rendering skipped'),
    });
  });
});
