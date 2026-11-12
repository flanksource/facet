import { createRequire } from 'node:module';
import { join } from 'node:path';
import { installedRuntime } from './installed.js';
import { devRuntime } from './dev.js';

export async function toolPath(specifier: string): Promise<string> {
  const dev = devRuntime();
  if (dev) {
    if (specifier === '@flanksource/page-runtime-build/dependencies') return dev.compiler;
    return createRequire(join(dev.facetRoot, 'package.json')).resolve(specifier);
  }
  const runtime = await installedRuntime();
  return createRequire(join(runtime.root, 'package.json')).resolve(specifier);
}
