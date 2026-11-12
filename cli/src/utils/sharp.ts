import { pathToFileURL } from 'node:url';
import { toolPath } from '../runtime/tools.js';
import { cliDependencyPath } from '../runtime/cli-dependencies.js';

type SharpModule = typeof import('sharp').default;

/**
 * Version shipped in the installed toolchain so the SEA binary can load the
 * native addon. Keep in step with the `sharp`
 * dependency in cli/package.json, which is what dev and test runs resolve.
 */
export const SHARP_VERSION = '^0.35.3';

export async function loadSharp(options: { rendering?: boolean } = {}): Promise<SharpModule> {
  const file = options.rendering ? await toolPath('sharp') : cliDependencyPath('sharp');
  return (await import(pathToFileURL(file).href)).default as SharpModule;
}
