import { createRequire } from 'node:module';
import { isSea } from 'node:sea';

export function cliDependencyPath(specifier: string): string {
  try { return createRequire(isSea() ? process.execPath : import.meta.url).resolve(specifier); }
  catch (cause) { throw new Error(`Missing CLI dependency ${specifier}; install @flanksource/facet-cli with its normal dependencies, or provide them beside the standalone executable`, { cause }); }
}
