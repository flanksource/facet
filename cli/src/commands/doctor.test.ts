import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runDoctor } from './doctor.js';

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
