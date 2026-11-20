import { mkdir, mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { installModules } from './install.js';
import { defaultModuleNpmrc } from './manifest.js';

test('applies the selected environment workspace overrides during installation', async () => {
  await mkdir(resolve('.tmp'), { recursive: true });
  const root = await mkdtemp(resolve('.tmp/install-overrides-'));
  try {
    for (const [directory, version] of [['original', '1.0.0'], ['override', '2.0.0']]) {
      await mkdir(join(root, directory));
      await writeFile(join(root, directory, 'package.json'), JSON.stringify({ name: 'example-dependency', version }));
    }
    const environment = join(root, 'environment');
    await mkdir(environment);
    await writeFile(join(environment, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@11.22.0', dependencies: { 'example-dependency': `link:${join(root, 'original')}` }, pnpm: { overrides: { 'example-dependency': `link:${join(root, 'override')}` } } }));
    await writeFile(join(environment, '.npmrc'), defaultModuleNpmrc());
    await installModules(environment);
    expect(await realpath(join(environment, 'node_modules/example-dependency'))).toBe(await realpath(join(root, 'override')));
  } finally { await rm(root, { recursive: true, force: true }); }
}, 30_000);
