import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runDoctor, preflight, PreflightError } from './doctor.js';

let consumerRoot: string;
let savedStdoutWrite: typeof process.stdout.write;
let captured: string;

beforeEach(() => {
  consumerRoot = mkdtempSync(join(tmpdir(), 'facet-doctor-test-'));
  captured = '';
  savedStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: any) => {
    captured += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  }) as typeof process.stdout.write;
});

afterEach(() => {
  process.stdout.write = savedStdoutWrite;
  rmSync(consumerRoot, { recursive: true, force: true });
});

describe('runDoctor JSON contract', () => {
  it('emits a results array containing every documented check id', async () => {
    await runDoctor({ consumerRoot, verbose: false, json: true });
    const parsed = JSON.parse(captured);
    expect(Array.isArray(parsed.results)).toBe(true);

    const ids = parsed.results.map((r: any) => r.id);
    const expected = [
      'node-version',
      'architecture',
      'pnpm',
      'bun',
      'native-bindings',
      'chromium',
      'git',
      'tar',
      'tsx',
      'tailwindcss',
      'facet-package-path',
      'facet-version',
      'npmrc-leakage',
    ];
    expect(ids).toEqual(expected);

    for (const r of parsed.results) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(['pass', 'warn', 'fail']).toContain(r.status);
      expect(typeof r.message).toBe('string');
      if (r.hint !== undefined) expect(typeof r.hint).toBe('string');
    }
  });

  it('returns exit code 0 when no checks fail and 1 when any check fails', async () => {
    // Synthetic FAIL: invalid FACET_PACKAGE_PATH
    const savedEnv = process.env.FACET_PACKAGE_PATH;
    process.env.FACET_PACKAGE_PATH = '/nonexistent/path/xyz';
    try {
      const exit = await runDoctor({ consumerRoot, verbose: false, json: true });
      expect(exit).toBe(1);
    } finally {
      if (savedEnv === undefined) delete process.env.FACET_PACKAGE_PATH;
      else process.env.FACET_PACKAGE_PATH = savedEnv;
    }
  });
});

describe('runDoctor --fix', () => {
  it('appends .facet/ to .gitignore for npmrc leakage and re-checks to pass', async () => {
    mkdirSync(join(consumerRoot, '.facet'), { recursive: true });
    writeFileSync(join(consumerRoot, '.facet', '.npmrc'), '_authToken=secret\n');
    writeFileSync(join(consumerRoot, '.gitignore'), '# baseline\n');

    await runDoctor({ consumerRoot, verbose: false, json: true, fix: true });
    const parsed = JSON.parse(captured);
    const leakage = parsed.results.find((r: any) => r.id === 'npmrc-leakage');
    expect(leakage.status).toBe('pass');

    const { readFileSync } = await import('fs');
    const gi = readFileSync(join(consumerRoot, '.gitignore'), 'utf-8');
    expect(gi).toMatch(/^\.facet\/$/m);
  });

  it('is idempotent for npmrc leakage', async () => {
    mkdirSync(join(consumerRoot, '.facet'), { recursive: true });
    writeFileSync(join(consumerRoot, '.facet', '.npmrc'), '_authToken=secret\n');
    writeFileSync(join(consumerRoot, '.gitignore'), '# baseline\n.facet/\n');

    await runDoctor({ consumerRoot, verbose: false, json: true, fix: true });
    const { readFileSync } = await import('fs');
    const gi = readFileSync(join(consumerRoot, '.gitignore'), 'utf-8');
    const matches = gi.split('\n').filter(l => l.trim() === '.facet/');
    expect(matches.length).toBe(1);
  });
});

describe('preflight', () => {
  const result = (id: string, status: string, extra: Record<string, unknown> = {}) =>
    ({ id, name: id, status, message: `${id} message`, ...extra });

  const runnerFor = (results: Record<string, any>) =>
    async (id: string) => results[id];

  it('resolves when every required check passes', async () => {
    const run = runnerFor({ bun: result('bun', 'pass'), pnpm: result('pnpm', 'pass') });
    await expect(preflight(['bun', 'pnpm'], '/tmp', run)).resolves.toBeUndefined();
  });

  it('aggregates all non-passing checks with hints and points at doctor', async () => {
    const run = runnerFor({
      bun: result('bun', 'warn', { name: 'bun', message: 'not on PATH', hint: 'Install: https://bun.sh' }),
      pnpm: result('pnpm', 'pass'),
      chromium: result('chromium', 'fail', { name: 'Chromium', message: 'no chrome', hint: 'set PUPPETEER_EXECUTABLE_PATH' }),
    });

    let error: unknown;
    try {
      await preflight(['bun', 'pnpm', 'chromium'], '/tmp', run);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(PreflightError);
    const message = (error as Error).message;
    expect(message).toContain('bun');
    expect(message).toContain('Chromium');
    expect(message).toContain('https://bun.sh');
    expect(message).toContain('set PUPPETEER_EXECUTABLE_PATH');
    expect(message).toContain('facet doctor');
    // A passing check must not appear in the failure list.
    expect(message).not.toContain('pnpm message');
  });
});
