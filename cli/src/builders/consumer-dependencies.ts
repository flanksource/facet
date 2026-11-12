import { existsSync, globSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { load } from 'js-yaml';
import { satisfies } from 'semver';

interface Workspace {
  overrides?: Record<string, unknown>;
  packages?: string[];
  root: string;
  path: string;
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
}

interface WorkspacePackage {
  name: string;
  version?: string;
  path: string;
}

function findWorkspace(packageDir: string): Workspace | undefined {
  for (let dir = resolve(packageDir); ; dir = dirname(dir)) {
    const path = join(dir, 'pnpm-workspace.yaml');
    if (existsSync(path)) {
      const config = load(readFileSync(path, 'utf-8'));
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error(`Invalid pnpm workspace configuration: ${path}`);
      }
      return { ...config, root: dir, path };
    }
    if (dirname(dir) === dir) return undefined;
  }
}

async function listWorkspacePackages(workspace: Workspace): Promise<WorkspacePackage[]> {
  const patterns = workspace.packages ?? ['**'];
  const excluded = patterns.filter(pattern => pattern.startsWith('!')).map(pattern => `${pattern.slice(1)}/**`);
  const files = new Set(['package.json', ...globSync(patterns.filter(pattern => !pattern.startsWith('!')).map(pattern => `${pattern}/package.json`), { cwd: workspace.root, exclude: ['**/node_modules/**', '**/.*/**', ...excluded] })]);
  return [...files].map(file => {
    const pkg = JSON.parse(readFileSync(join(workspace.root, file), 'utf8'));
    return { name: pkg.name, version: pkg.version, path: realpathSync(dirname(join(workspace.root, file))) };
  });
}

function workspaceLink(options: {
  name: string;
  spec: string;
  packageDir: string;
  workspace: Workspace;
  packages: WorkspacePackage[];
}): string {
  const { name, spec, packageDir, workspace, packages } = options;
  const ref = spec.slice('workspace:'.length);
  const alias = ref.match(/^(@[^/]+\/[^@]+|[^@]+)@(.+)$/);
  const targetName = alias?.[1] ?? name;
  const range = alias?.[2] ?? ref;
  const relativePath = ref.startsWith('.') ? realpathSync(resolve(packageDir, ref)) : undefined;
  const matches = packages.filter(pkg => relativePath ? pkg.path === relativePath : pkg.name === targetName);
  const target = matches.find(pkg => ['*', '^', '~'].includes(range) || relativePath || (pkg.version && satisfies(pkg.version, range)));
  if (!target) {
    throw new Error(`Cannot resolve ${name}@${spec} in workspace ${workspace.path}`);
  }
  // A file: copy would make pnpm install the package's own catalog:/workspace:
  // dependencies outside their workspace. Keep the package in its native tree.
  return `link:${target.path}`;
}

export async function resolveConsumerDependencies(options: {
  dependencies: Record<string, string>;
  packageDir: string;
}): Promise<Record<string, string>> {
  const { dependencies, packageDir } = options;
  let workspace: Workspace | undefined;
  let packages: WorkspacePackage[] | undefined;
  const resolved: Record<string, string> = {};
  for (const [name, declared] of Object.entries(dependencies)) {
    if (typeof declared !== 'string' || !declared) throw new Error(`Invalid dependency specification for ${name} in ${packageDir}`);
    let spec = declared;
    let base = packageDir;
    if (spec.startsWith('catalog:') || spec.startsWith('workspace:')) {
      workspace ??= findWorkspace(packageDir);
      if (!workspace) throw new Error(`Cannot resolve ${name}@${spec}: no pnpm-workspace.yaml above ${packageDir}`);
      if (spec.startsWith('catalog:')) {
        const catalogName = spec.slice('catalog:'.length) || 'default';
        const catalog = catalogName === 'default' ? workspace.catalog : workspace.catalogs?.[catalogName];
        const entry = catalog?.[name];
        if (typeof entry !== 'string' || !entry || entry.startsWith('catalog:')) {
          throw new Error(`Cannot resolve ${name}@${spec}: missing or invalid catalog "${catalogName}" entry in ${workspace.path}`);
        }
        spec = entry;
        base = workspace.root;
      }
      if (spec.startsWith('workspace:')) {
        packages ??= await listWorkspacePackages(workspace);
        spec = workspaceLink({ name, spec, packageDir: base, workspace, packages });
      }
    }
    const protocol = ['file:', 'link:', 'portal:'].find(prefix => spec.startsWith(prefix));
    resolved[name] = protocol ? protocol + resolve(base, spec.slice(protocol.length)) : spec;
  }
  return resolved;
}

export function resolveOverrideValues(overrides: Record<string, unknown> | undefined, packageDir: string): Record<string, unknown> | undefined {
  if (overrides === undefined) return undefined;
  return Object.fromEntries(Object.entries(overrides).map(([name, value]) => {
    if (typeof value === 'string') {
      if (value.startsWith('workspace:')) throw new Error(`facet overrides cannot use the "workspace:" protocol (got "${value}"): use a concrete version or local path`);
      const protocol = ['file:', 'link:', 'portal:'].find(prefix => value.startsWith(prefix));
      return [name, protocol ? protocol + resolve(packageDir, value.slice(protocol.length)) : value];
    }
    return [name, value && typeof value === 'object' ? resolveOverrideValues(value as Record<string, unknown>, packageDir) : value];
  }));
}

export function readWorkspaceOverrides(packageDir: string): Record<string, unknown> | undefined {
  const workspace = findWorkspace(packageDir);
  return workspace ? resolveOverrideValues(workspace.overrides, workspace.root) : undefined;
}

export async function snapshotPackageManifest(packageDir: string): Promise<string | undefined> {
  const path = join(packageDir, 'package.json');
  if (!existsSync(path)) return undefined;
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (pkg[field]) pkg[field] = await resolveConsumerDependencies({ dependencies: pkg[field], packageDir });
  }
  const overrides = { ...readWorkspaceOverrides(packageDir), ...resolveOverrideValues(pkg.pnpm?.overrides, packageDir) };
  if (Object.keys(overrides).length) pkg.pnpm = { ...pkg.pnpm, overrides };
  for (const field of ['overrides', 'resolutions']) {
    if (pkg[field]) pkg[field] = resolveOverrideValues(pkg[field], packageDir);
  }
  return JSON.stringify(pkg, null, 2);
}
