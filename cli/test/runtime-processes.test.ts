import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';

test('concurrent processes publish one dependency environment and execute one installation', async () => {
  const parent = resolve('.tmp');
  mkdirSync(parent, { recursive: true });
  const cache = mkdtempSync(join(parent, 'runtime-processes-'));
  try {
    const args = ['--import', pathToFileURL(resolve(createRequire(import.meta.url).resolve('@oxc-node/core/package.json'), '../register.mjs')).href, resolve(import.meta.dirname, 'fixtures/runtime-environment-child.ts'), cache];
    await Promise.all([promisify(execFile)(process.execPath, args), promisify(execFile)(process.execPath, args)]);
    expect(readFileSync(join(cache, 'installations'), 'utf8').trim().split('\n')).toHaveLength(1);
    expect(readdirSync(join(cache, 'environments'))).toHaveLength(1);
  } finally { rmSync(cache, { recursive: true, force: true }); }
});
