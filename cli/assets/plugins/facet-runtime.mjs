import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dependencyRuntimePlugin } from '__FACET_RUNTIME_COMPILER__';

export function facetRuntimePlugin(facetRoot, target) {
  const runtime = JSON.parse(readFileSync(join(facetRoot, 'runtime.json'), 'utf8'));
  return dependencyRuntimePlugin({ root: runtime.root, cacheDir: runtime.compiledCache, base: runtime.compiled[target] });
}
