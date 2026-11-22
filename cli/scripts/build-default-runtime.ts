import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { createDefaultModulePackageJson, defaultModuleNpmrc } from '../src/runtime/manifest.js';
import { installModules } from '../src/runtime/install.js';
import { runtimePlatform, runtimePlatformName } from '../src/runtime/platform.js';
import { runtimePackages } from './runtime-packages.cjs';
import * as compilerApi from '@flanksource/page-runtime/build/dependencies';
import { stageRenderingRuntime } from './runtime-files.js';
import { buildRuntimeBase, installRuntimePeers } from '../src/runtime/build-layers.js';
import { createRuntimeBuildProgress } from '../src/runtime/build-progress.js';

const run = promisify(execFile);

export async function packageRuntime(options: { root: string; out: string; facetVersion: string; dependencies: string[] }): Promise<void> {
  if (existsSync(join(options.root, '.npmrc'))) throw new Error('Runtime environment still contains installation credentials');
  const versions = Object.fromEntries(options.dependencies.map(name => [name, JSON.parse(readFileSync(join(options.root, 'node_modules', name, 'package.json'), 'utf8')).version as string]));
  mkdirSync(options.out, { recursive: true });
  const archive = join(options.out, 'default-runtime.tgz');
  const projection = mkdtempSync(join(options.out, '.rendering-'));
  try {
    await stageRenderingRuntime({ root: options.root, out: projection, packages: options.dependencies });
    await run('tar', ['-czf', archive, '-C', projection, '.'], { maxBuffer: 16 * 1024 * 1024 });
  } finally { rmSync(projection, { recursive: true, force: true }); }
  const target = runtimePlatform();
  writeFileSync(join(options.out, 'default-runtime.json'), JSON.stringify({ schema: 1, facetVersion: options.facetVersion, target, versions, sha256: createHash('sha256').update(readFileSync(archive)).digest('hex') }, null, 2));
  writeFileSync(join(options.out, 'package.json'), JSON.stringify({ name: `@flanksource/facet-runtime-${runtimePlatformName()}`, version: options.facetVersion, description: 'Precompiled Facet rendering runtime and toolchain', license: 'Apache-2.0', os: [target.platform], cpu: [target.arch], ...(target.libc ? { libc: [target.libc] } : {}), files: ['default-runtime.json', 'default-runtime.tgz'] }, null, 2));
}

export async function packLibrary(options: { directory: string; scratch: string; name: string; includeRuntimePackages?: boolean }): Promise<string> {
  const staging = join(options.scratch, options.name.replace(/[/@]/g, '-'));
  mkdirSync(staging, { recursive: true });
  const original = join(options.scratch, `${options.name.replace(/[/@]/g, '-')}-original.tgz`);
  await run('pnpm', ['--config.ignoreScripts=true', 'pack', '--out', original], { cwd: options.directory, maxBuffer: 32 * 1024 * 1024 });
  await run('tar', ['-xzf', original, '-C', staging, '--strip-components', '1']);
  for (const pattern of ['dist/facet', 'dist/facet.exe', '**/default-runtime.tgz', '**/default-runtime.json']) {
    for (const file of globSync(pattern, { cwd: staging })) rmSync(join(staging, file), { force: true });
  }
  if (options.includeRuntimePackages) {
    const manifest = JSON.parse(readFileSync(join(staging, 'package.json'), 'utf8'));
    manifest.optionalDependencies = { ...manifest.optionalDependencies, ...runtimePackages(manifest.version) };
    writeFileSync(join(staging, 'package.json'), JSON.stringify(manifest, null, 2));
  }
  const archive = join(options.scratch, `${options.name.replace(/[/@]/g, '-')}.tgz`);
  await run('pnpm', ['--config.ignoreScripts=true', 'pack', '--out', archive], { cwd: staging, maxBuffer: 32 * 1024 * 1024 });
  return archive;
}

export async function buildDefaultRuntime(repoRoot: string): Promise<void> {
  mkdirSync(join(repoRoot, '.tmp'), { recursive: true });
  const scratch = mkdtempSync(join(repoRoot, '.tmp/build-runtime-'));
  try {
    const facet = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const manifest = createDefaultModulePackageJson({ facetVersion: facet.version, facetPackage: facet });
    const dependencies = manifest.dependencies as Record<string, string>;
    dependencies['@flanksource/clicky-ui'] = facet.peerDependencies['@flanksource/clicky-ui'];
    dependencies['@oxc-node/core'] = facet.devDependencies['@oxc-node/core'];
    dependencies['@flanksource/page-runtime-build'] = '0.1.0';
    const compilerRoot = resolve(createRequire(import.meta.url).resolve('@flanksource/page-runtime/build/dependencies'), '..');
    const compiler = JSON.parse(readFileSync(join(compilerRoot, 'package.json'), 'utf8'));
    const css = JSON.parse(readFileSync(join(dirname(createRequire(import.meta.url).resolve('lightningcss')), '../package.json'), 'utf8'));
    dependencies.rolldown = compiler.dependencies.rolldown;
    const pnpm = manifest.pnpm as { overrides?: Record<string, unknown> } | undefined;
    manifest.pnpm = { ...pnpm, overrides: { ...pnpm?.overrides, rolldown: dependencies.rolldown, lightningcss: css.version } };
    const archives: Record<string, string> = {};
    for (const name of Object.keys(dependencies)) {
      const directory = name === '@flanksource/page-runtime-build'
        ? resolve(createRequire(import.meta.url).resolve('@flanksource/page-runtime/build/dependencies'), '..')
        : [join(repoRoot, 'node_modules', name), join(repoRoot, 'cli/node_modules', name)].find(path => existsSync(join(path, 'package.json')));
      if (!directory && name !== '@flanksource/facet') throw new Error(`Build runtime dependency ${name} is not installed`);
      const actual = name === '@flanksource/facet' ? repoRoot : realpathSync(directory!);
      dependencies[name] = JSON.parse(readFileSync(join(actual, 'package.json'), 'utf8')).version;
      // Local checkouts and pkg.pr.new previews are not on npm, so ship them as tarballs.
      if (!actual.includes(`${join('node_modules', '')}`) || dependencies[name].includes('-preview-')) archives[name] = await packLibrary({ directory: actual, scratch, name });
    }
    const root = join(scratch, 'runtime');
    mkdirSync(join(root, 'packages'), { recursive: true });
    const installed = { ...dependencies };
    for (const [name, archive] of Object.entries(archives)) {
      const file = `packages/${basename(archive)}`;
      cpSync(archive, join(root, file));
      installed[name] = `file:./${file}`;
    }
    const progress = createRuntimeBuildProgress(process.stderr);
    const npmrc = defaultModuleNpmrc();
    const config = { ...manifest, dependencies: installed };
    writeFileSync(join(root, 'package.json'), JSON.stringify(config));
    writeFileSync(join(root, '.npmrc'), npmrc);
    progress.stage('install', 'Installing Clicky UI, Facet, and runtime tools');
    await installModules(root, { progress: progress.output });
    await installRuntimePeers(root, config, progress);
    await buildRuntimeBase({ root, api: compilerApi, npmrc, progress });
    rmSync(join(root, '.npmrc'));
    const out = join(repoRoot, 'cli/assets/runtimes', runtimePlatformName());
    progress.stage('publish', 'Packaging the installed runtime');
    await packageRuntime({ root, out, facetVersion: facet.version, dependencies: Object.keys(dependencies) });
    progress.done(`Prepared Facet runtime ${facet.version}`);
    console.log(`Prepared installed runtime ${out}`);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await buildDefaultRuntime(resolve(import.meta.dirname, '../..'));
