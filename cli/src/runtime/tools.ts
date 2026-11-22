import { createRequire } from 'node:module';
import { join } from 'node:path';
import { installedRuntime } from './installed.js';
import { devRuntime } from './dev.js';
import { selectedRuntime } from './named.js';

export async function toolPath(specifier: string, root = selectedRuntime()?.root): Promise<string> {
  if (root) return createRequire(join(root, 'package.json')).resolve(specifier);
  const dev = devRuntime();
  if (dev) {
    if (specifier === '@flanksource/page-runtime-build/dependencies') return dev.compiler;
    if (specifier === 'sharp') return createRequire(join(dev.facetRoot, 'cli/package.json')).resolve(specifier);
    return createRequire(join(dev.facetRoot, 'package.json')).resolve(specifier);
  }
  const runtime = await installedRuntime();
  return createRequire(join(runtime.root, 'package.json')).resolve(specifier);
}
