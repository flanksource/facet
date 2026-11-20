import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('ships the Oxc execution toolchain without the old transpilers or type checker', () => {
  const packages = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/runtime/packages.json'), 'utf8'));
  expect(packages).toContain('@oxc-node/core');
  expect(packages).not.toContain('tsx');
  expect(packages).not.toContain('typescript');
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'));
  expect(manifest.devDependencies.vite).toBe('8.3.8');
  expect(manifest.devDependencies.rolldown).toBe('1.2.18');
});
