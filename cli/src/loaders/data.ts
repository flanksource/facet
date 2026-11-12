import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';

export async function runDataLoader(): Promise<void> {
  const [file, ...args] = process.argv.slice(2);
  if (!file) throw new Error('Missing TypeScript data script');
  process.argv = [process.execPath, file, ...args];
  const { tsImport } = await import(pathToFileURL(await toolPath('tsx/esm/api')).href) as typeof import('tsx/esm/api');
  await tsImport(pathToFileURL(file).href, import.meta.url);
}
