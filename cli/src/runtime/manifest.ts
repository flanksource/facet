import requiredPackages from './packages.json';
import { SHARP_VERSION } from '../utils/sharp.js';

export const REQUIRED_DEPENDENCIES: readonly string[] = requiredPackages;

export interface EmbeddedFacetPackage {
  version?: string;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  pnpm?: Record<string, unknown>;
}

export interface DefaultModulePackageOptions {
  facetVersion: string;
  facetPackage: EmbeddedFacetPackage | Record<string, unknown>;
}

export function createDefaultModulePackageJson(options: DefaultModulePackageOptions): Record<string, unknown> {
  const facetPackage = options.facetPackage as EmbeddedFacetPackage;
  if (facetPackage.version !== options.facetVersion) {
    throw new Error(
      `Facet CLI ${options.facetVersion} cannot seed modules from @flanksource/facet ${facetPackage.version ?? 'unknown'}`,
    );
  }
  if (!facetPackage.packageManager?.startsWith('pnpm@')) {
    throw new Error('The embedded @flanksource/facet package must pin packageManager to pnpm@<version>');
  }

  const available = { ...facetPackage.dependencies, ...facetPackage.devDependencies };
  const dependencies: Record<string, string> = { '@flanksource/facet': options.facetVersion };
  for (const dependency of REQUIRED_DEPENDENCIES) {
    const version = available[dependency];
    if (version) dependencies[dependency] = version;
  }
  dependencies.lightningcss = '^1.30.2';
  dependencies.sharp = SHARP_VERSION;

  const manifest: Record<string, unknown> = {
    name: '.facet-default-modules',
    private: true,
    type: 'module',
    packageManager: facetPackage.packageManager,
    dependencies,
  };
  if (facetPackage.pnpm) manifest.pnpm = facetPackage.pnpm;
  return manifest;
}

export function defaultModuleNpmrc(): string {
  return [
    'node-linker=hoisted',
    'auto-install-peers=true',
    'strict-peer-dependencies=false',
    'frozen-lockfile=false',
    'prefer-frozen-lockfile=false',
    'verify-store-integrity=false',
    'engine-strict=false',
    'confirm-modules-purge=false',
    '',
  ].join('\n');
}
