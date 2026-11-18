import { execFile } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readBuildGit } from './build-git.js';
import { openNamedRuntime, deleteNamedRuntime, listNamedRuntimes, publishNamedRuntime } from './named.js';

let cache: string;
beforeEach(() => {
  mkdirSync(resolve('../.tmp'), { recursive: true });
  cache = mkdtempSync(resolve('../.tmp/named-runtime-'));
});
afterEach(() => rmSync(cache, { recursive: true, force: true }));

const name = 'clicky-ui';
const version = '1.2.0';
const run = promisify(execFile);

function publish(prepare = (root: string) => writeFileSync(join(root, 'marker'), 'built')) {
  return publishNamedRuntime({ cache, name, version, prepare: async root => { prepare(root); return {}; } });
}

function listRuntimes(...flags: string[]) {
  return run(process.execPath, [
    resolve(import.meta.dirname, '../loaders/source.mjs'),
    resolve(import.meta.dirname, '../cli.ts'),
    'runtime', 'list', ...flags,
  ], { env: { ...process.env, FACET_CACHE_DIR: cache } });
}

describe('named runtimes', () => {
  it('explains how to build the first runtime while preserving empty selector and JSON output', async () => {
    const empty = await listRuntimes();
    expect(empty.stdout).toBe('');
    expect(empty.stderr).toContain('No named Facet runtimes installed.');
    expect(empty.stderr).toContain('facet runtime build my-runtime');

    const json = await listRuntimes('--json');
    expect(JSON.parse(json.stdout)).toEqual([]);
    expect(json.stderr).not.toContain('facet runtime build my-runtime');
  });

  it('lists build time for older runtimes without recorded Git metadata', async () => {
    const build = await publish();
    const selector = `${name}@${version}`;

    expect((await listRuntimes()).stdout.split('\n')[1]?.split(/ {2,}/)).toEqual([selector, build.builtAt, 'Unknown']);
    expect((await listRuntimes('--selectors')).stdout).toBe(`${selector}\n`);
    expect(JSON.parse((await listRuntimes('--json')).stdout)).toEqual([
      { selector, name, version, builtAt: build.builtAt, path: build.root },
    ]);
  });

  it('records the project commit and dirty state at build time', async () => {
    const project = join(cache, 'project');
    mkdirSync(project);
    const git = (...args: string[]) => run('git', args, { cwd: project });
    await git('init', '--quiet');
    writeFileSync(join(project, 'package.json'), '{}');
    await git('add', 'package.json');
    await git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Initial project');
    const commit = (await git('rev-parse', 'HEAD')).stdout.trim();
    expect(await readBuildGit(project)).toEqual({ commit, dirty: false });
    writeFileSync(join(project, 'new.tsx'), 'export default () => null');
    const provenance = await readBuildGit(project);
    const build = await publishNamedRuntime({ cache, name, version, git: provenance, prepare: async () => ({}) });
    await git('add', 'new.tsx');
    await git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Add a page');

    const selector = `${name}@${version}`;
    expect((await listRuntimes()).stdout.split('\n')[1]?.split(/ {2,}/)).toEqual([selector, build.builtAt, `${commit.slice(0, 12)} (dirty)`]);
    expect(JSON.parse((await listRuntimes('--json')).stdout)).toEqual([
      { selector, name, version, builtAt: build.builtAt, path: build.root, git: { commit, dirty: true } },
    ]);
    const runtime = await openNamedRuntime({ cache, selector: build.root });
    try { expect(runtime.git).toEqual({ commit, dirty: true }); }
    finally { runtime.close(); }
  });

  it('replaces a version for new readers while preserving a leased build', async () => {
    const first = await publish();
    const original = await openNamedRuntime({ cache, selector: name });
    try {
      const second = await publish();
      expect(listNamedRuntimes(cache).map(build => build.root)).toEqual([second.root]);
      expect(original.root).toEqual(first.root);
      const exact = await openNamedRuntime({ cache, selector: `${name}@${version}` });
      expect(exact.root).toEqual(second.root);
      exact.close();
      await expect(deleteNamedRuntime(cache, name)).rejects.toThrow('in use');
    } finally { original.close(); }
    await deleteNamedRuntime(cache, `${name}@${version}`);
    expect(listNamedRuntimes(cache)).toEqual([]);
  });

  it('preserves the current build when preparation fails', async () => {
    const first = await publish();
    await expect(publish(() => { throw new Error('failed compilation'); })).rejects.toThrow('failed compilation');
    expect(listNamedRuntimes(cache).map(build => build.root)).toEqual([first.root]);
  });

  it('serializes concurrent publication and validates delete selectors', async () => {
    const builds = await Promise.all([publish(), publish()]);
    expect(new Set(builds.map(build => build.id)).size).toBe(2);
    const [current] = listNamedRuntimes(cache);
    expect(builds.map(build => build.id)).toContain(current!.id);
    await expect(deleteNamedRuntime(cache, current!.root)).rejects.toThrow('name or name@version');
  });

  it('opens the same runtime after copying its folder out of the cache', async () => {
    const original = await publish();
    const folder = join(cache, 'exported');
    cpSync(original.root, folder, { recursive: true });
    await deleteNamedRuntime(cache, name);
    const exported = await openNamedRuntime({ cache, selector: folder });
    expect(exported).toMatchObject({ id: original.id, name, version, root: realpathSync(folder) });
    exported.close();
  });
});
