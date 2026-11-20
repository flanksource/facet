import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DevRuntime { facetRoot: string; clickyUiRoot: string; compiler: string }

function isFacetCheckout(root: string): boolean {
  return existsSync(join(root, 'cli/src/cli.ts')) && existsSync(join(root, 'package.json'))
    && JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name === '@flanksource/facet';
}

export function resolveDevRuntime(root: string): DevRuntime {
  if (!isFacetCheckout(root)) throw new Error(`--dev requires a Facet checkout at ${root}; set FACET_PACKAGE_PATH to the checkout`);
  const facetRoot = realpathSync(root);
  const linkedUi = join(facetRoot, 'node_modules/@flanksource/clicky-ui');
  if (!existsSync(join(linkedUi, 'package.json'))) throw new Error(`--dev requires local clicky-ui linked at ${linkedUi}`);
  const clickyUiRoot = realpathSync(linkedUi);
  if (clickyUiRoot.split(/[\\/]/).includes('node_modules')) throw new Error(`--dev requires a local clicky-ui checkout, received installed package ${clickyUiRoot}`);
  for (const library of [facetRoot, clickyUiRoot]) {
    if (!existsSync(join(library, 'dist/runtime/importmap.json'))) throw new Error(`--dev is missing ${library}/dist/runtime/importmap.json; build the library artifacts first`);
  }
  const localCompiler = join(facetRoot, 'node_modules/@flanksource/page-runtime');
  if (!existsSync(localCompiler) || realpathSync(localCompiler).split(/[\\/]/).includes('node_modules')) throw new Error(`--dev requires a local page-runtime checkout linked at ${localCompiler}`);
  let compiler: string;
  try { compiler = createRequire(join(facetRoot, 'package.json')).resolve('@flanksource/page-runtime/build/dependencies'); }
  catch (cause) { throw new Error(`--dev requires the local compiler build; run pnpm --dir ${localCompiler} run build:builder`, { cause }); }
  return { facetRoot, clickyUiRoot, compiler: realpathSync(compiler) };
}

export function activateDevRuntime(cwd: string): void {
  let root = process.env.FACET_DEV_ROOT || process.env.FACET_PACKAGE_PATH;
  if (!root) {
    for (const start of [resolve(cwd), dirname(fileURLToPath(import.meta.url))]) {
      for (let dir = start; ; dir = dirname(dir)) {
        if (isFacetCheckout(dir)) { root = dir; break; }
        if (isFacetCheckout(join(dir, 'facet'))) { root = join(dir, 'facet'); break; }
        if (dir === dirname(dir)) break;
      }
      if (root) break;
    }
  }
  if (!root) throw new Error('--dev could not find a Facet checkout; set FACET_PACKAGE_PATH to the local checkout');
  const runtime = resolveDevRuntime(resolve(root));
  process.env.FACET_DEV_ROOT = runtime.facetRoot;
  process.env.FACET_PACKAGE_PATH = runtime.facetRoot;
}

export function devRuntime(): DevRuntime | undefined {
  return process.env.FACET_DEV_ROOT ? resolveDevRuntime(process.env.FACET_DEV_ROOT) : undefined;
}

export function devRuntimeManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const runtime = devRuntime();
  if (!runtime) return manifest;
  const links = { '@flanksource/facet': `link:${runtime.facetRoot}`, '@flanksource/clicky-ui': `link:${runtime.clickyUiRoot}` };
  const pnpm = manifest.pnpm as { overrides?: Record<string, unknown> } | undefined;
  return { ...manifest, dependencies: { ...manifest.dependencies as Record<string, string>, ...links }, pnpm: { ...pnpm, overrides: { ...pnpm?.overrides, ...links } } };
}
