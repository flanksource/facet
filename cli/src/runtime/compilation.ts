import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { RuntimeEnvironment } from './environment.js';
import { toolPath } from './tools.js';
import { runtimeCacheRoot } from './workspace.js';

interface CompiledRuntime {
  root: string;
  imports: Record<string, string>;
  styles: string[];
}

export async function loadCompiledRuntime(root: string, pinned?: string) {
  const styles = join(root, 'node_modules/@flanksource/facet/dist/styles.css');
  if (!existsSync(styles)) throw new Error(`Facet runtime ${pinned ?? root} is missing ${styles}; rebuild the runtime`);
  const compiled = Object.fromEntries((['node', 'browser'] as const).map(target => {
    const directory = join(root, 'page-runtime', target);
    const path = join(directory, 'runtime.json');
    if (!existsSync(path)) throw new Error(`Facet runtime ${pinned ?? root} is missing ${path}; rebuild the runtime`);
    const metadata = JSON.parse(readFileSync(path, 'utf8'));
    if (metadata.schema !== 1 || metadata.target !== target || !metadata.imports || !Array.isArray(metadata.styles)) throw new Error(`Invalid compiled runtime at ${path}`);
    return [target, { ...metadata, root: directory }];
  }));
  return { root, pinned, nodeModules: join(root, 'node_modules'), compiler: await toolPath('@flanksource/page-runtime-build/dependencies', root), compiledCache: root, compiled };
}

export async function compileEnvironment(runtime: RuntimeEnvironment): Promise<RuntimeEnvironment & { compiler: string; compiledCache: string; compiled: Record<'node' | 'browser', CompiledRuntime> }> {
  const compiler = await toolPath('@flanksource/page-runtime-build/dependencies');
  const compiledCache = join(runtimeCacheRoot(), 'compiled');
  const api: {
    runtimeEntries(options: { root: string; libraries: string[] }): string[];
    ensureDependencyRuntime(options: { root: string; cacheDir: string; entries: string[]; target: 'node' | 'browser' }): Promise<CompiledRuntime>;
  } = await import(pathToFileURL(compiler).href + (process.env.FACET_DEV_ROOT ? `?build=${createHash('sha256').update(readFileSync(compiler)).digest('hex')}` : ''));
  let entries: string[] | undefined;
  const compiled = {} as Record<'node' | 'browser', CompiledRuntime>;
  for (const target of ['node', 'browser'] as const) {
    const root = join(runtime.root, 'page-runtime', target);
    compiled[target] = !process.env.FACET_DEV_ROOT && existsSync(join(root, 'runtime.json'))
      ? { ...JSON.parse(readFileSync(join(root, 'runtime.json'), 'utf8')), root }
      : await api.ensureDependencyRuntime({ root: runtime.root, cacheDir: compiledCache, entries: entries ??= api.runtimeEntries({ root: runtime.root, libraries: ['@flanksource/facet'] }), target });
  }
  return { ...runtime, compiler, compiledCache, compiled };
}
