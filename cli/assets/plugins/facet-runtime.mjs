import { existsSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { dependencyRuntimePlugin } from '__FACET_RUNTIME_COMPILER__';

export function facetRuntimePlugin(facetRoot, target) {
  const runtime = JSON.parse(readFileSync(join(facetRoot, 'runtime.json'), 'utf8'));
  const base = runtime.compiled[target];
  const plugin = dependencyRuntimePlugin({ root: runtime.root, cacheDir: runtime.compiledCache, base, versions: runtime.versions });
  if (!runtime.pinned) return plugin;
  return {
    ...plugin,
    resolveId(source, importer, options) {
      if (importer && !source.startsWith('.') && !source.startsWith('\0') && !isAbsolute(source) && !isBuiltin(source) && !/^[a-z][a-z0-9+.-]*:/i.test(source) && !Object.hasOwn(base.imports, source)) {
        const [file] = source.split(/[?#]/);
        const name = /^(?:@[^/]+\/)?[^/]+/.exec(file)?.[0];
        const asset = (file !== source || /\.(css|json)$/.test(file)) && name && existsSync(join(runtime.nodeModules, name, 'package.json'));
        if (!asset) throw new Error(`${importer}: import ${source} is absent from Facet runtime ${runtime.pinned}; add the dependency and run facet runtime build`);
      }
      return plugin.resolveId.call(this, source, importer, options);
    },
  };
}
