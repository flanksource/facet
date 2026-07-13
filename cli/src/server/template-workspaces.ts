import { cp, mkdir, readdir, rename, rm, stat, utimes } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { computeTemplateBuildKey } from '../bundler/build-cache.js';
import { VERSION } from '../version-generated.js';

interface WorkspaceHandle {
  path: string;
  release: () => void;
}

const creationLocks = new Map<string, Promise<void>>();
const references = new Map<string, number>();

function workspaceKey(sourceDir: string, entryFile: string): string {
  const sourceKey = computeTemplateBuildKey(sourceDir, VERSION);
  return createHash('sha256')
    .update(sourceKey).update('\0').update(entryFile)
    .digest('hex').slice(0, 24);
}

async function ensureWorkspace(sourceDir: string, path: string): Promise<void> {
  if (existsSync(path)) {
    const now = new Date();
    await utimes(path, now, now).catch(() => undefined);
    return;
  }

  const existing = creationLocks.get(path);
  if (existing) return existing;
  const operation = (async () => {
    if (existsSync(path)) return;
    await mkdir(join(path, '..'), { recursive: true });
    const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
    try {
      await cp(sourceDir, temporary, {
        recursive: true,
        filter: (source) => basename(source) !== '.facet',
      });
      try {
        await rename(temporary, path);
      } catch (error) {
        if (!existsSync(path)) throw error;
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  })();
  creationLocks.set(path, operation);
  try {
    await operation;
  } finally {
    if (creationLocks.get(path) === operation) creationLocks.delete(path);
  }
}

async function pruneWorkspaces(root: string): Promise<void> {
  const maxEntries = Math.max(1, parseInt(process.env['FACET_WORKSPACE_CACHE_ENTRIES'] ?? '20', 10));
  let entries;
  try {
    entries = await Promise.all((await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.includes('.tmp-'))
      .map(async (entry) => {
        const path = join(root, entry.name);
        return { path, mtimeMs: (await stat(path)).mtimeMs };
      }));
  } catch { return; }
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const entry of entries.slice(maxEntries)) {
    if ((references.get(entry.path) ?? 0) === 0) {
      await rm(entry.path, { recursive: true, force: true });
    }
  }
}

/** Acquire a persistent, immutable-source workspace for a template revision. */
export async function acquireTemplateWorkspace(
  sourceDir: string,
  entryFile: string,
  cacheDir: string,
): Promise<WorkspaceHandle> {
  const root = join(cacheDir, 'template-workspaces');
  const path = join(root, workspaceKey(sourceDir, entryFile));
  await ensureWorkspace(sourceDir, path);
  references.set(path, (references.get(path) ?? 0) + 1);
  await pruneWorkspaces(root);
  let released = false;
  return {
    path,
    release: () => {
      if (released) return;
      released = true;
      const remaining = (references.get(path) ?? 1) - 1;
      if (remaining <= 0) references.delete(path);
      else references.set(path, remaining);
    },
  };
}
