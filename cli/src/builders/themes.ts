import { existsSync, readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export interface InstalledTheme { id: string; module: string; package: string; version: string; root: string }

export function themeFingerprint(root: string, id?: string): string | undefined {
  const theme = discoverThemes(root).find(theme => theme.id === id);
  if (!theme) return undefined;
  const hash = createHash('sha256').update(theme.version);
  const dist = join(theme.root, 'dist');
  for (const file of readdirSync(dist, { recursive: true, encoding: 'utf8' }).sort()) {
    const path = join(dist, file);
    if (statSync(path).isFile()) hash.update(file).update(readFileSync(path));
  }
  return hash.digest('hex');
}

export function discoverThemes(root: string): InstalledTheme[] {
  const manifestPath = join(root, 'package.json');
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const themes: InstalledTheme[] = [];
  const names = new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies }));
  for (const name of [...names].sort()) {
    const path = join(root, 'node_modules', name, 'package.json');
    if (!existsSync(path)) continue;
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    for (const [id, entry] of Object.entries(pkg.facet?.themes ?? {})) {
      if (id === 'facet' || themes.some(theme => theme.id === id)) throw new Error(`Duplicate or reserved theme alias: ${id}`);
      if (!/^[a-z][a-z0-9-]*$/.test(id) || typeof entry !== 'string' || !entry.startsWith('./') || !pkg.exports?.[entry]) throw new Error(`${name}: invalid facet.themes entry ${id}`);
      if (typeof pkg.version !== 'string') throw new Error(`${name}: theme package needs a version`);
      themes.push({ id, module: name + entry.slice(1), package: name, version: pkg.version, root: realpathSync(join(root, 'node_modules', name)) });
    }
  }
  return themes;
}

export function themeEntry(root: string, id = 'facet'): string {
  if (id === 'facet') return '@flanksource/facet/Theme';
  const theme = discoverThemes(root).find(theme => theme.id === id);
  if (!theme) throw new Error(`Unknown theme "${id}". Install its package in the template project and declare facet.themes in that package.`);
  return theme.module;
}
