import { createRequire } from 'node:module';
import { join } from 'node:path';
import { installedRuntime } from './installed.js';

export async function toolPath(specifier: string): Promise<string> {
  const runtime = await installedRuntime();
  return createRequire(join(runtime.root, 'package.json')).resolve(specifier);
}
