import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Logger } from '../utils/logger.js';
import { ensureEnvironment } from './environment.js';

const directories: string[] = [];
function options() {
  const parent = resolve('../.tmp');
  mkdirSync(parent, { recursive: true });
  const cacheRoot = mkdtempSync(join(parent, 'runtime-environment-'));
  directories.push(cacheRoot);
  return {
    cacheRoot,
    manifest: { name: 'consumer-a', dependencies: { react: '18.3.1', 'example-kit': '1.2.3' } },
    npmrc: 'registry=https://registry.npmjs.org/\n',
    logger: new Logger(false),
    install: async (root: string) => {
      mkdirSync(join(root, 'node_modules/react'), { recursive: true });
      mkdirSync(join(root, 'node_modules/example-kit'), { recursive: true });
      writeFileSync(join(root, 'node_modules/react/package.json'), '{"version":"18.3.1"}');
      writeFileSync(join(root, 'node_modules/example-kit/package.json'), '{"version":"1.2.3"}');
      writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
      return '11.22.0';
    },
  };
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('shared runtime dependency environments', () => {
  it('installs once for concurrent projects with identical dependencies regardless of metadata and key ordering', async () => {
    const first = options();
    let installs = 0;
    const install = async (root: string) => { installs++; return first.install(root); };
    const [a, b] = await Promise.all([
      ensureEnvironment({ ...first, install }),
      ensureEnvironment({ ...first, install, manifest: { scripts: { build: 'other' }, name: 'consumer-b', dependencies: { 'example-kit': '1.2.3', react: '18.3.1' } } }),
    ]);
    expect({ installs, sameEnvironment: a.root === b.root }).toEqual({ installs: 1, sameEnvironment: true });
    expect(readFileSync(join(a.root, 'pnpm-lock.yaml'), 'utf8')).toContain('lockfileVersion');
  });

  it('keeps registry routing and dependency overrides in cache identity', async () => {
    const input = options();
    const a = await ensureEnvironment(input);
    const b = await ensureEnvironment({ ...input, npmrc: 'registry=https://packages.example.com/\n' });
    const c = await ensureEnvironment({ ...input, manifest: { ...input.manifest, pnpm: { overrides: { react: '18.3.1' } } } });
    expect(new Set([a.identity, b.identity, c.identity]).size).toBe(3);
  });

  it('does not persist authentication credentials in ready environments', async () => {
    const input = options();
    const a = await ensureEnvironment({ ...input, npmrc: input.npmrc + '//registry.npmjs.org/:_authToken=example-token\n' });
    const b = await ensureEnvironment(input);
    expect(a.identity).toBe(b.identity);
    expect(existsSync(join(a.root, '.npmrc'))).toBe(false);
  });

  it('never publishes an incomplete install and retries preparation after a failure', async () => {
    const input = options();
    await expect(ensureEnvironment({ ...input, install: async () => { throw new Error('installation interrupted'); } })).rejects.toThrow('installation interrupted');
    const ready = await ensureEnvironment(input);
    expect(existsSync(join(ready.root, '.ready.json'))).toBe(true);
  });

  it('reports a corrupted published environment without silently installing again', async () => {
    const input = options();
    const ready = await ensureEnvironment(input);
    rmSync(join(ready.nodeModules, 'react'), { recursive: true });
    await expect(ensureEnvironment({ ...input, install: async () => { throw new Error('unexpected install'); } })).rejects.toThrow(/react/);
  });

  it('clears only the selected environment by publishing a new generation and preserves active readers', async () => {
    const input = options();
    const original = await ensureEnvironment(input);
    const replacement = await ensureEnvironment({ ...input, invalidate: true });
    expect(replacement.root).not.toBe(original.root);
    expect(existsSync(join(original.nodeModules, 'react/package.json'))).toBe(true);
    expect(await ensureEnvironment(input)).toEqual(replacement);
  });

  it('reuses linked dependencies after a source edit while invalidating changes to their dependency manifest', async () => {
    const input = options();
    const local = join(input.cacheRoot, 'library');
    mkdirSync(local);
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'example-kit', version: '1.2.3', dependencies: {} }));
    writeFileSync(join(local, 'index.js'), 'export const value = 1;');
    const manifest = { dependencies: { ...input.manifest.dependencies, 'example-kit': `file:${local}` }, facetLocalOverride: { path: local, fingerprint: 'first-build' } };
    let installs = 0;
    const install = async (root: string) => { installs++; return input.install(root); };
    const first = await ensureEnvironment({ ...input, install, manifest });
    writeFileSync(join(local, 'index.js'), 'export const value = 2;');
    const second = await ensureEnvironment({ ...input, install, manifest: { ...manifest, facetLocalOverride: { path: local, fingerprint: 'second-build' } } });
    expect({ installs, sameEnvironment: first.root === second.root }).toEqual({ installs: 1, sameEnvironment: true });
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'example-kit', version: '1.2.3', dependencies: { react: '^18' } }));
    const third = await ensureEnvironment({ ...input, install, manifest });
    expect(third.identity).not.toBe(first.identity);
    expect(installs).toBe(2);
  });

  it('invalidates a linked override when its dependencies change', async () => {
    const input = options();
    const local = join(input.cacheRoot, 'override');
    mkdirSync(local);
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'example-kit', version: '1.2.3', dependencies: {} }));
    const manifest = { ...input.manifest, pnpm: { overrides: { 'example-kit': `link:${local}` } } };
    const first = await ensureEnvironment({ ...input, manifest });
    writeFileSync(join(local, 'package.json'), JSON.stringify({ name: 'example-kit', version: '1.2.3', dependencies: { react: '^18' } }));
    expect((await ensureEnvironment({ ...input, manifest })).identity).not.toBe(first.identity);
  });
});
