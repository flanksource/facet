import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { VERSION } from '../version-generated.js';

export function runtimeCacheRoot(): string {
  return process.env.FACET_CACHE_DIR ?? join(homedir(), '.facet', 'cache');
}

export function compilationWorkspace(options: { consumerRoot: string; templatePath: string; skipModules?: boolean; redact?: unknown; invalidate?: boolean }): string {
  const identity = createHash('sha256').update(JSON.stringify({ consumerRoot: resolve(options.consumerRoot), templatePath: options.templatePath, skipModules: !!options.skipModules, redact: options.redact, version: VERSION })).digest('hex');
  const parent = join(runtimeCacheRoot(), 'compilations');
  mkdirSync(parent, { recursive: true });
  const pointer = join(parent, `${identity}.current.json`);
  if (options.invalidate) {
    const generation = `${identity}-${randomUUID()}`;
    const pending = `${pointer}.tmp-${randomUUID()}`;
    writeFileSync(pending, JSON.stringify({ generation }));
    renameSync(pending, pointer);
    return join(parent, generation);
  }
  const generation = existsSync(pointer) ? JSON.parse(readFileSync(pointer, 'utf8')).generation as string : identity;
  if (!new RegExp(`^${identity}(?:-[a-f0-9-]+)?$`).test(generation)) throw new Error(`Invalid compilation generation at ${pointer}`);
  return join(parent, generation);
}

export function serverCacheDirectory(config: { cacheDir?: string; templatesDir: string }): string {
  return config.cacheDir ? resolve(config.cacheDir) : join(runtimeCacheRoot(), 'servers', createHash('sha256').update(resolve(config.templatesDir)).digest('hex'));
}
