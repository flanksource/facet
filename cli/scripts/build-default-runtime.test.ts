import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { packageRuntime } from './build-default-runtime.js';
import { runtimePlatform, runtimePlatformName } from '../src/runtime/platform.js';

it('ships a dependency environment with its exact versions and platform metadata without leaking install credentials', async () => {
  const parent = resolve('../.tmp');
  mkdirSync(parent, { recursive: true });
  const scratch = mkdtempSync(join(parent, 'runtime-package-'));
  try {
    const root = join(scratch, 'environment');
    mkdirSync(join(root, 'node_modules/react'), { recursive: true });
    writeFileSync(join(root, 'node_modules/react/package.json'), '{"name":"react","version":"18.3.1"}');
    writeFileSync(join(root, '.npmrc'), '//registry.npmjs.org/:_authToken=example-token\n');
    writeFileSync(join(root, 'package.json'), '{"dependencies":{"react":"^18"}}');
    const out = join(scratch, 'package');
    await expect(packageRuntime({ root, out, facetVersion: '1.2.3', dependencies: ['react'] })).rejects.toThrow('credentials');
    rmSync(join(root, '.npmrc'));
    await packageRuntime({ root, out, facetVersion: '1.2.3', dependencies: ['react'] });
    expect(JSON.parse(readFileSync(join(out, 'default-runtime.json'), 'utf8'))).toMatchObject({ facetVersion: '1.2.3', target: runtimePlatform(), versions: { react: '18.3.1' } });
    expect(JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'))).toMatchObject({ name: `@flanksource/facet-runtime-${runtimePlatformName()}`, version: '1.2.3', os: [process.platform], cpu: [process.arch] });
    expect(execFileSync('tar', ['-tzf', join(out, 'default-runtime.tgz')], { encoding: 'utf8' })).toContain('node_modules/react/package.json');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
