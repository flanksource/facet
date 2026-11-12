import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { createDefaultModulePackageJson, defaultModuleNpmrc } from '../src/runtime/manifest.js';
import { installModules } from '../src/runtime/install.js';
import { ensureEnvironment } from '../src/runtime/environment.js';
import { runtimePlatform, runtimePlatformName } from '../src/runtime/platform.js';
import { Logger } from '../src/utils/logger.js';
import { runtimePackages } from './runtime-packages.cjs';
import { buildDependencyRuntime, runtimeEntries } from '@flanksource/page-runtime/build/dependencies';
import { stageRenderingRuntime } from './runtime-files.js';

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
      if (!actual.includes(`${join('node_modules', '')}`)) archives[name] = await packLibrary({ directory: actual, scratch, name });
    }
    manifest.facetLocalOverride = { fingerprint: createHash('sha256').update(JSON.stringify(Object.entries(archives).map(([name, archive]) => [name, createHash('sha256').update(readFileSync(archive)).digest('hex')]))).digest('hex') };
    const environment = await ensureEnvironment({ cacheRoot: join(repoRoot, '.tmp/runtime-build-cache'), manifest, npmrc: defaultModuleNpmrc(), logger: new Logger(false), install: async root => {
      mkdirSync(join(root, 'packages'));
      const installed = { ...dependencies };
      for (const [name, archive] of Object.entries(archives)) {
        const file = `packages/${basename(archive)}`;
        cpSync(archive, join(root, file));
        installed[name] = `file:./${file}`;
      }
      writeFileSync(join(root, 'package.json'), JSON.stringify({ ...manifest, dependencies: installed }));
      return installModules(root);
    } });
    const entries = runtimeEntries({ root: environment.root, libraries: ['@flanksource/facet'] });
    for (const target of ['node', 'browser'] as const) {
      await buildDependencyRuntime({ root: environment.root, outDir: join(environment.root, 'page-runtime', target), entries, target });
    }
    const out = join(repoRoot, 'cli/assets/runtimes', runtimePlatformName());
    await packageRuntime({ root: environment.root, out, facetVersion: facet.version, dependencies: Object.keys(dependencies).filter(name => name !== '@flanksource/clicky-ui') });
    console.log(`Prepared installed runtime ${out}`);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await buildDefaultRuntime(resolve(import.meta.dirname, '../..'));
