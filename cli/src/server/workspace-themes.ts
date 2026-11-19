import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  linkSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync,
  renameSync, rmdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { publishPackage, readPublication, type Publication } from '@flanksource/page-runtime/publication';
import { packageThemes, type InstalledTheme } from '../builders/themes.js';
import { workspaceThemeStarter } from './workspace-theme-starter.js';
import { RenderError } from './errors.js';

const run = promisify(execFile);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json', '.md', '.mdx']);
const assetTypes: Readonly<Record<string, string>> = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
};
const excluded = new Set(['node_modules', 'dist', 'coverage', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);
const themeId = /^[a-z][a-z0-9-]*$/;

export interface ThemeEditorFiles {
  defaults: string;
  palette: { file: string; selector: string };
}

interface WorkspaceTheme extends InstalledTheme {
  directory: string;
  editor?: ThemeEditorFiles;
}

export interface BuiltWorkspaceTheme extends InstalledTheme {
  sourceRoot: string;
  build: string;
}

export interface WorkspaceThemeFile {
  path: string;
  kind: 'source' | 'asset';
  mime: string;
  writable: boolean;
}

function stat(path: string) {
  return lstatSync(path, { throwIfNoEntry: false });
}

function revisionOf(bytes: Buffer) {
  return '"' + createHash('sha256').update(bytes).digest('hex') + '"';
}

function allowedSegment(name: string) {
  return /^[\w][\w .@+-]*$/u.test(name) && !excluded.has(name.toLowerCase());
}

export function workspaceThemeFile(path: string): WorkspaceThemeFile {
  if (!path || !path.split('/').every(allowedSegment)) throw new RenderError('INVALID_REQUEST', `Invalid theme path: ${path}`, 400);
  const ext = extname(path).toLowerCase();
  const asset = assetTypes[ext];
  if (!asset && !sourceExtensions.has(ext)) throw new RenderError('INVALID_REQUEST', `Unsupported theme file: ${path}`, 400);
  return { path, kind: asset ? 'asset' : 'source', mime: asset ?? 'text/plain; charset=utf-8', writable: path.toLowerCase() !== 'package.json' };
}

export function workspaceFileLimit(file: WorkspaceThemeFile) {
  return file.kind === 'asset' ? 16 * 1024 * 1024 : 2 * 1024 * 1024;
}

function editorFiles(value: unknown, id: string): ThemeEditorFiles | undefined {
  if (value === undefined) return undefined;
  const entry = value as Partial<ThemeEditorFiles> | null;
  if (typeof entry?.defaults !== 'string' || extname(entry.defaults) !== '.json' ||
      typeof entry.palette?.file !== 'string' || extname(entry.palette.file) !== '.css' ||
      typeof entry.palette.selector !== 'string' || !entry.palette.selector.trim() ||
      !workspaceThemeFile(entry.defaults).writable || !workspaceThemeFile(entry.palette.file).writable) {
    throw new Error(`Invalid facet.themeEditor entry for ${id}`);
  }
  return { defaults: entry.defaults, palette: { file: entry.palette.file, selector: entry.palette.selector } };
}

function packagePath(root: string, path: string, createParents = false): string {
  const segments = path.split('/');
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = join(current, segment);
    const info = stat(current);
    if (!info && createParents) mkdirSync(current);
    else if (!info?.isDirectory()) throw new RenderError('INVALID_REQUEST', `Invalid theme directory or symlink in path: ${path}`, 400);
  }
  const file = join(current, segments.at(-1)!);
  const info = stat(file);
  if (info && !info.isFile()) throw new RenderError('INVALID_REQUEST', `Invalid theme file or symlink: ${path}`, 400);
  return file;
}

function listFiles(root: string, prefix = ''): WorkspaceThemeFile[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    if (!allowedSegment(entry.name)) return [];
    const path = prefix + entry.name;
    if (entry.isDirectory()) return listFiles(root, path + '/');
    if (!entry.isFile()) return [];
    const ext = extname(path).toLowerCase();
    return sourceExtensions.has(ext) || Object.hasOwn(assetTypes, ext) ? [workspaceThemeFile(path)] : [];
  });
}

function publishedTheme(theme: WorkspaceTheme, publication: Publication): BuiltWorkspaceTheme {
  const manifest = JSON.parse(readFileSync(join(publication.directory, 'package.json'), 'utf8'));
  const built = packageThemes(publication.directory, publication.name, manifest).find(entry => entry.id === theme.id);
  if (!built || built.package !== theme.package || built.version !== theme.version || built.module !== theme.module) {
    throw new Error(`The package identity for ${theme.id} changed. Build the theme again.`);
  }
  return { ...built, sourceRoot: theme.root, build: publication.build };
}

export class WorkspaceThemes {
  readonly root: string;
  private readonly builds = new Map<string, Promise<{ theme: BuiltWorkspaceTheme; output: string }>>();

  constructor(root: string) {
    this.root = realpathSync(root);
    if (!stat(this.root)?.isDirectory()) throw new Error(`Themes directory must be a directory: ${root}`);
  }

  list(): WorkspaceTheme[] {
    const themes = new Map<string, WorkspaceTheme>();
    for (const directory of readdirSync(this.root, { withFileTypes: true })) {
      if (!directory.isDirectory() || !allowedSegment(directory.name)) continue;
      const root = join(this.root, directory.name);
      const file = join(root, 'package.json');
      if (!stat(file)?.isFile()) continue;
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      if (!manifest.facet?.themes) continue;
      if (typeof manifest.name !== 'string' || !/^(?:@[\w.-]+\/)?[\w.-]+$/.test(manifest.name)) throw new Error(`Invalid theme package name in ${file}`);
      for (const theme of packageThemes(root, manifest.name, manifest)) {
        if (themes.has(theme.id)) throw new Error(`Duplicate workspace theme alias: ${theme.id}`);
        themes.set(theme.id, { ...theme, directory: directory.name, editor: editorFiles(manifest.facet.themeEditor?.[theme.id], theme.id) });
      }
    }
    return [...themes.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  get(id: string): WorkspaceTheme {
    const theme = this.list().find(theme => theme.id === id);
    if (!theme) throw new RenderError('INVALID_REQUEST', `Unknown workspace theme: ${id}`, 404);
    return theme;
  }

  files(id: string): WorkspaceThemeFile[] {
    return listFiles(this.get(id).root);
  }

  readFile(id: string, path: string) {
    const file = workspaceThemeFile(path);
    const target = packagePath(this.get(id).root, path);
    const info = stat(target);
    if (!info) throw new RenderError('INVALID_REQUEST', `Theme file not found: ${path}`, 404);
    if (info.size > workspaceFileLimit(file)) throw new RenderError('INVALID_REQUEST', `Theme file is too large: ${path}`, 413);
    const bytes = readFileSync(target);
    return { bytes, revision: revisionOf(bytes), file };
  }

  saveFile({ id, path, bytes, revision }: { id: string; path: string; bytes: Buffer; revision: string }): string {
    const theme = this.get(id);
    const file = workspaceThemeFile(path);
    if (!file.writable) throw new RenderError('INVALID_REQUEST', `Theme file is read-only: ${path}`, 403);
    if (bytes.length > workspaceFileLimit(file)) throw new RenderError('INVALID_REQUEST', `Theme file is too large: ${path}`, 413);
    if (this.builds.has(theme.root)) throw new RenderError('INVALID_REQUEST', 'Wait for the theme build to finish before saving files', 409);
    if (revision !== '*' && !/^"[a-f0-9]{64}"$/.test(revision)) throw new RenderError('INVALID_REQUEST', 'A file revision is required', 428);
    const target = packagePath(theme.root, path, revision === '*');
    const temp = join(dirname(target), '.facet-save-' + randomUUID());
    try {
      const before = stat(target);
      writeFileSync(temp, bytes, { flag: 'wx', mode: before ? before.mode & 0o777 : 0o644 });
      if (revision === '*') linkSync(temp, target);
      else {
        const current = stat(packagePath(theme.root, path));
        if (!current || current.size > workspaceFileLimit(file) || revisionOf(readFileSync(target)) !== revision) {
          throw new RenderError('INVALID_REQUEST', `${path} changed on disk. Reload the file before saving.`, 412);
        }
        renameSync(temp, target);
      }
      return revisionOf(bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new RenderError('INVALID_REQUEST', `${path} already exists`, 412);
      throw error;
    } finally {
      rmSync(temp, { force: true });
    }
  }

  create(id: string) {
    if (!themeId.test(id) || id === 'facet' || id.length > 80 || !allowedSegment(id)) throw new RenderError('INVALID_REQUEST', 'Use a lowercase theme ID starting with a letter', 400);
    const root = join(this.root, id);
    if (this.list().some(theme => theme.id === id) || stat(root)) throw new RenderError('INVALID_REQUEST', `Theme ${id} already exists`, 409);
    const files = workspaceThemeStarter(id);
    mkdirSync(root);
    const created = [];
    try {
      for (const [path, content] of Object.entries(files)) {
        writeFileSync(join(root, path), content, { flag: 'wx' });
        created.push(path);
      }
    } catch (error) {
      for (const path of created) rmSync(join(root, path), { force: true });
      if (!readdirSync(root).length) rmdirSync(root);
      throw error;
    }
    return this.get(id);
  }

  async published(theme: WorkspaceTheme): Promise<BuiltWorkspaceTheme | undefined> {
    try {
      return publishedTheme(theme, await readPublication(theme.root));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !stat(join(theme.root, '.tmp/package-publications/current.json'))) return undefined;
      throw error;
    }
  }

  async build(id: string) {
    const theme = this.get(id);
    const active = this.builds.get(theme.root);
    if (active) {
      const result = await active;
      return { ...result, theme: publishedTheme(theme, await readPublication(theme.root)) };
    }
    const build = this.buildPackage(theme);
    this.builds.set(theme.root, build);
    try { return await build; }
    finally { this.builds.delete(theme.root); }
  }

  private async buildPackage(theme: WorkspaceTheme) {
    let output = '';
    try {
      const { stdout, stderr } = await run('pnpm', ['run', 'build'], {
        cwd: theme.root, timeout: 100_000, maxBuffer: 2 * 1024 * 1024,
      });
      output = (stdout + stderr).trim();
      const publication = await publishPackage({ libraryDir: theme.root });
      return { theme: publishedTheme(theme, publication), output };
    } catch (error) {
      const failure = error as Error & { stdout?: string; stderr?: string };
      throw new RenderError('RENDER_FAILED', `Build failed for ${theme.id}: ${failure.message.split('\n')[0]}`, 422,
        (output || [failure.stdout, failure.stderr].filter(Boolean).join('\n').trim()).slice(-20_000));
    }
  }
}
