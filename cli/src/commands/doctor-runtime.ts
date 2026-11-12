import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installedRuntime, installedRuntimePayload } from '../runtime/installed.js';
import { runtimePlatformName } from '../runtime/platform.js';
import { runtimeCacheRoot } from '../runtime/workspace.js';
import { toolPath } from '../runtime/tools.js';
import type { CheckResult } from './doctor.js';

function failure(id: string, name: string, error: unknown): CheckResult {
  return { id, name, status: 'fail', message: error instanceof Error ? error.message : String(error), hint: 'Reinstall Facet with optional dependencies enabled, or run make build in the source checkout.' };
}

export function checkGlobalModuleStore(): CheckResult {
  try {
    const payload = installedRuntimePayload();
    if (runtimePlatformName(payload.target) !== runtimePlatformName()) throw new Error(`Runtime targets ${runtimePlatformName(payload.target)}; expected ${runtimePlatformName()}`);
    const root = join(runtimeCacheRoot(), 'runtimes', payload.sha256);
    return { id: 'global-modules', name: 'Installed page runtime', status: 'pass', message: `${payload.facetVersion} ${runtimePlatformName()} at ${root} (${existsSync(join(root, '.runtime-ready.json')) ? 'extracted' : 'ready to extract'})` };
  } catch (error) { return failure('global-modules', 'Installed page runtime', error); }
}

export async function fixGlobalModuleStore(): Promise<CheckResult> {
  try { await installedRuntime(); return checkGlobalModuleStore(); }
  catch (error) { return failure('global-modules', 'Installed page runtime', error); }
}

export async function checkNativeBindings(): Promise<CheckResult> {
  try {
    await import(pathToFileURL(await toolPath('lightningcss')).href);
    return { id: 'native-bindings', name: 'Native bindings', status: 'pass', message: `${runtimePlatformName()} installed toolchain loads successfully` };
  } catch (error) { return failure('native-bindings', 'Native bindings', error); }
}

export async function checkTsx(): Promise<CheckResult> {
  try {
    const manifest = JSON.parse(readFileSync(await toolPath('tsx/package.json'), 'utf8'));
    return { id: 'tsx', name: 'tsx', status: 'pass', message: manifest.version };
  } catch (error) { return failure('tsx', 'tsx', error); }
}

export async function checkTailwindBin(): Promise<CheckResult> {
  try {
    const manifest = JSON.parse(readFileSync(await toolPath('tailwindcss/package.json'), 'utf8'));
    if (Number(manifest.version.split('.')[0]) !== 4) throw new Error(`Facet requires Tailwind v4; found ${manifest.version}`);
    await toolPath('@tailwindcss/vite');
    return { id: 'tailwindcss', name: 'Tailwind CSS toolchain', status: 'pass', message: manifest.version };
  } catch (error) { return failure('tailwindcss', 'Tailwind CSS toolchain', error); }
}
