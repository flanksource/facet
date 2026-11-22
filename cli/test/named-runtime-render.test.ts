import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { installedRuntimePayload } from '../src/runtime/installed.js';
import { publishNamedRuntime } from '../src/runtime/named.js';
import { materializeRuntime } from '../src/runtime/payload.js';
import { assetPath } from '../src/utils/assets.js';

const { buildPackage } = require('../scripts/pack-npm-cli.cjs');
const run = promisify(execFile);

test('pinned rendering consumes the prepared artifacts without a package manager or dependency compiler', async () => {
  const repoRoot = resolve(import.meta.dirname, '../..');
  const scratch = join(repoRoot, '.tmp');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, 'pinned-render-'));
  const project = join(root, 'project');
  const install = join(root, 'cli');
  const cache = join(root, 'cache');
  const bin = join(root, 'bin');
  const payload = installedRuntimePayload();
  try {
    const source = await materializeRuntime({ payload, archive: () => assetPath('default-runtime.tgz'), cacheRoot: join(root, 'seed'), facetVersion: payload.facetVersion });
    const runtime = await publishNamedRuntime({ cache, name: 'test-runtime', version: 'demo', prepare: async destination => {
      cpSync(source.root, destination, { recursive: true });
      const path = join(destination, 'package.json');
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      manifest.dependencies['@flanksource/facet'] = 'file:./package-snapshots/facet.tgz';
      writeFileSync(path, JSON.stringify(manifest));
      return {};
    } });
    buildPackage({ version: payload.facetVersion, repoRoot, outDir: install, templateDir: join(repoRoot, 'cli/npm/facet-cli'), bundlePath: join(repoRoot, 'cli/dist-sea/cli.cjs') });
    mkdirSync(project);
    mkdirSync(bin);
    for (const name of ['pnpm', 'npm', 'corepack']) writeFileSync(join(bin, name), '#!/bin/sh\nexit 73\n', { mode: 0o755 });
    writeFileSync(join(project, 'Page.tsx'), 'import React from "react"; import { Page } from "@flanksource/facet"; import { Aws } from "@flanksource/icons/mi"; import { UiSearch } from "@flanksource/clicky-ui/icons"; export default () => <Page><Aws /><UiSearch />Runtime exports example</Page>;');
    writeFileSync(join(project, 'Missing.tsx'), 'import React from "react"; import { example } from "missing-runtime-example"; export default () => <div>{example}</div>;');
    writeFileSync(join(project, 'package.json'), '{"dependencies":{"missing-runtime-example":"*"}}');
    const env = { ...process.env, FACET_DEV_ROOT: '', FACET_PACKAGE_PATH: join(project, 'absent'), FACET_CACHE_DIR: cache, PATH: `${bin}${delimiter}${process.env.PATH}`, npm_config_registry: 'http://127.0.0.1:9' };
    const cli = (args: string[]) => run(process.execPath, [join(install, 'facet.cjs'), ...args], { cwd: project, env });
    await expect(cli(['html', 'Missing.tsx', '--runtime', 'test-runtime', '-o', join(root, 'missing.html')]))
      .rejects.toThrow('import missing-runtime-example is absent from Facet runtime test-runtime@demo');
    for (const [index, selector] of ['test-runtime@demo', runtime.root].entries()) {
      const output = join(root, `report-${index}.html`);
      await cli(['html', 'Page.tsx', '--runtime', selector, '--clear-cache', '--output', output]);
      expect(readFileSync(output, 'utf8')).toContain('Runtime exports example');
    }
    expect(['environments', 'compiled', 'runtimes'].filter(dir => existsSync(join(cache, dir)))).toEqual([]);
    writeFileSync(join(project, 'package.json'), '{"dependencies":{"@flanksource/icons":"0.0.0"}}');
    const installedCli = (args: string[]) => run(process.execPath, [join(install, 'facet.cjs'), ...args], { cwd: project, env: { ...env, FACET_PACKAGE_PATH: '' } });
    for (const [index, flags] of [[], ['--skip-modules']].entries()) {
      const output = join(root, `installed-${index}.html`);
      await installedCli(['html', 'Page.tsx', ...flags, '--output', output]);
      expect(readFileSync(output, 'utf8')).toContain('Runtime exports example');
    }
    expect(['environments', 'compiled'].filter(dir => existsSync(join(cache, dir)))).toEqual([]);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 240_000);
