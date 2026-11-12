import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';

export async function runDataLoader(): Promise<void> {
  const [file, ...args] = process.argv.slice(2);
  if (!file) throw new Error('Missing TypeScript data script');
  process.argv = [process.execPath, file, ...args];
  const { createImporter } = await import(pathToFileURL(await toolPath('@oxc-node/core/importer')).href) as typeof import('@oxc-node/core/importer');
  await createImporter(pathToFileURL(file), { interopDefault: false }).import(pathToFileURL(file));
}
