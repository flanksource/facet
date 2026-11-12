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

export async function compileEnvironment(runtime: RuntimeEnvironment): Promise<RuntimeEnvironment & { compiler: string; compiledCache: string; compiled: Record<'node' | 'browser', CompiledRuntime> }> {
  const compiler = await toolPath('@flanksource/page-runtime-build/dependencies');
  const compiledCache = join(runtimeCacheRoot(), 'compiled');
  const api: {
    runtimeEntries(options: { root: string; libraries: string[] }): string[];
    ensureDependencyRuntime(options: { root: string; cacheDir: string; entries: string[]; target: 'node' | 'browser' }): Promise<CompiledRuntime>;
  } = await import(pathToFileURL(compiler).href + (process.env.FACET_DEV_ROOT ? `?build=${createHash('sha256').update(readFileSync(compiler)).digest('hex')}` : ''));
  const entries = api.runtimeEntries({ root: runtime.root, libraries: ['@flanksource/facet'] });
  const compiled = {} as Record<'node' | 'browser', CompiledRuntime>;
  for (const target of ['node', 'browser'] as const) {
    const root = join(runtime.root, 'page-runtime', target);
    compiled[target] = !process.env.FACET_DEV_ROOT && existsSync(join(root, 'runtime.json'))
      ? { ...JSON.parse(readFileSync(join(root, 'runtime.json'), 'utf8')), root }
      : await api.ensureDependencyRuntime({ root: runtime.root, cacheDir: compiledCache, entries, target });
  }
  return { ...runtime, compiler, compiledCache, compiled };
}
