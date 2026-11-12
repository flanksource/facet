import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';

type SharpModule = typeof import('sharp').default;

/**
 * Version shipped in the installed toolchain so the SEA binary can load the
 * native addon. Keep in step with the `sharp`
 * dependency in cli/package.json, which is what dev and test runs resolve.
 */
export const SHARP_VERSION = '^0.35.3';

/**
 * Load the pinned native tool from the installed runtime.
 */
export async function loadSharp(): Promise<SharpModule> {
  return (await import(pathToFileURL(await toolPath('sharp')).href)).default as SharpModule;
}
