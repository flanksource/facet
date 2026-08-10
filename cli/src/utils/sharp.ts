import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type SharpModule = typeof import('sharp').default;

/**
 * Version installed into `.facet/` so the SEA binary — which cannot embed a
 * native addon — can resolve sharp at runtime. Keep in step with the `sharp`
 * dependency in cli/package.json, which is what dev and test runs resolve.
 */
export const SHARP_VERSION = '^0.35.3';

function isModuleNotFound(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND';
}

/**
 * Resolves sharp from the package install (dev, tests, library consumers) and
 * falls back to the .facet module store, which is where the SEA binary finds
 * native modules — libvips cannot be embedded in the single-file bundle.
 * Anything other than a resolution failure (a broken native binding, say) is
 * rethrown so it surfaces instead of being retried against the wrong location.
 */
export async function loadSharp(consumerRoot = process.cwd()): Promise<SharpModule> {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    if (!isModuleNotFound(error)) throw error;
  }
  const facetPackage = join(consumerRoot, '.facet', 'package.json');
  try {
    const facetRequire = createRequire(facetPackage);
    const module = await import(pathToFileURL(facetRequire.resolve('sharp')).href);
    return (module.default ?? module) as SharpModule;
  } catch (error) {
    if (!isModuleNotFound(error)) throw error;
    throw new Error(
      `sharp is required for PNG autocrop but is not resolvable from this build or from ${facetPackage}. `
      + 'Run any render once to populate .facet/, then retry; `facet doctor` reports the resolved path.',
    );
  }
}
