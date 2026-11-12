import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { load } from 'js-yaml';

export function dependencyManifest(input: Record<string, unknown>): Record<string, unknown> {
  const declared = input.dependencies;
  if (!declared || typeof declared !== 'object' || Array.isArray(declared) || Object.values(declared).some(spec => typeof spec !== 'string' || !spec)) throw new Error('Runtime dependencies must map package names to nonempty version strings');
  const manifest = Object.fromEntries(['dependencies', 'packageManager', 'pnpm', 'overrides', 'resolutions', 'facetLocalOverride'].filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  const local: Record<string, unknown> = {};
  const dependencies = { ...manifest.dependencies as Record<string, string> };
  for (const [name, spec] of Object.entries(dependencies)) {
    const protocol = ['file:', 'link:', 'portal:'].find(prefix => spec.startsWith(prefix));
    if (!protocol) continue;
    const path = realpathSync(resolve(spec.slice(protocol.length)));
    if (statSync(path).isDirectory()) {
      dependencies[name] = `link:${path}`;
      local[path] = localManifest(path);
    } else local[path] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  const override = manifest.facetLocalOverride as { path?: string } | undefined;
  if (override?.path) manifest.facetLocalOverride = { path: override.path };
  const collectOverride = (value: unknown): void => {
    if (typeof value === 'string') {
      const protocol = ['file:', 'link:', 'portal:'].find(prefix => value.startsWith(prefix));
      if (!protocol) return;
      const path = realpathSync(resolve(value.slice(protocol.length)));
      local[path] = statSync(path).isDirectory() ? localManifest(path) : createHash('sha256').update(readFileSync(path)).digest('hex');
    } else if (value && typeof value === 'object') Object.values(value).forEach(collectOverride);
  };
  for (const field of ['pnpm', 'overrides', 'resolutions']) collectOverride(manifest[field]);
  return { ...manifest, dependencies, ...(Object.keys(local).length ? { localDependencies: local } : {}) };
}

function localManifest(path: string): Record<string, unknown> {
  const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
  const result = Object.fromEntries(['name', 'version', 'dependencies', 'peerDependencies', 'optionalDependencies', 'pnpm', 'overrides', 'resolutions'].filter(key => pkg[key] !== undefined).map(key => [key, pkg[key]]));
  for (let directory = path; ; directory = dirname(directory)) {
    const workspace = join(directory, 'pnpm-workspace.yaml');
    if (existsSync(workspace)) {
      const config = load(readFileSync(workspace, 'utf8')) as Record<string, unknown>;
      result.workspace = Object.fromEntries(['catalog', 'catalogs', 'overrides'].filter(key => config[key] !== undefined).map(key => [key, config[key]]));
      break;
    }
    if (dirname(directory) === directory) break;
  }
  return result;
}
