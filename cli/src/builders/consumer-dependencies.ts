import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { load } from 'js-yaml';
import { satisfies } from 'semver';
import { resolvePackageManager } from '../utils/package-manager.js';
import { runLowPriority } from '../utils/subprocess-priority.js';

interface Workspace {
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
  const pm = await resolvePackageManager(workspace.root);
  const { stdout } = await runLowPriority({
    command: pm.cmd,
    args: ['--recursive', 'list', '--depth', '-1', '--json'],
    options: { cwd: workspace.root },
    timeoutMs: 30_000,
  });
  const packages: unknown = JSON.parse(stdout.toString());
  if (!Array.isArray(packages) || packages.some(pkg => typeof pkg?.path !== 'string')) {
    throw new Error(`Invalid pnpm workspace package list for ${workspace.path}`);
  }
  return packages;
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
