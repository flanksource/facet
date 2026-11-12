import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { selfExecBase } from '../src/utils/self-exec.js';

test('self-executes TypeScript data scripts through the installed toolchain and preserves arguments', async () => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/runtime-data-'));
  try {
    const file = join(root, 'oxc-data.ts');
    for (const name of ['oxc-data.ts', 'oxc-message.ts']) copyFileSync(join(import.meta.dirname, 'fixtures', name), join(root, name));
    const [command, ...args] = selfExecBase();
    const { stdout } = await promisify(execFile)(command, [...args, file, 'Data from runtime'], { env: { ...process.env, FACET_LOADER: 'data', FACET_CACHE_DIR: resolve('../.tmp/runtime-fixture-cache') } });
    expect(JSON.parse(stdout)).toEqual({ message: 'Data from runtime' });
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 60_000);
