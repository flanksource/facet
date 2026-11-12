import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { acquireTemplateWorkspace } from './template-workspaces.js';

const roots: string[] = [];
function temp(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  roots.push(path);
  return path;
}

beforeEach(() => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const cache = mkdtempSync(join(resolve('.tmp'), 'workspace-digests-'));
  roots.push(cache);
  vi.stubEnv('FACET_CACHE_DIR', cache);
});

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('template workspaces', () => {
  it('reuses a workspace for the same source revision', async () => {
    const source = temp('facet-source-');
    const cache = temp('facet-workspaces-');
    writeFileSync(join(source, 'Template.tsx'), 'export default () => <div />');
    const [first, second] = await Promise.all([
      acquireTemplateWorkspace(source, 'Template.tsx', cache),
      acquireTemplateWorkspace(source, 'Template.tsx', cache),
    ]);
    expect(second.path).toBe(first.path);
    first.release();
    second.release();
  });

  it('creates a new workspace when source changes', async () => {
    const source = temp('facet-source-');
    const cache = temp('facet-workspaces-');
    writeFileSync(join(source, 'Template.tsx'), 'export default () => <div />');
    const first = await acquireTemplateWorkspace(source, 'Template.tsx', cache);
    writeFileSync(join(source, 'Template.tsx'), 'export default () => <main />');
    const second = await acquireTemplateWorkspace(source, 'Template.tsx', cache);
    expect(second.path).not.toBe(first.path);
    first.release();
    second.release();
  });

  it('does not copy generated .facet state', async () => {
    const source = temp('facet-source-');
    const cache = temp('facet-workspaces-');
    writeFileSync(join(source, 'Template.tsx'), 'export default () => <div />');
    mkdirSync(join(source, '.facet'));
    writeFileSync(join(source, '.facet', 'generated'), 'ignore');
    const workspace = await acquireTemplateWorkspace(source, 'Template.tsx', cache);
    expect(() => mkdirSync(join(workspace.path, '.facet'))).not.toThrow();
    workspace.release();
  });

  it('resolves workspace dependencies before snapshotting without copying project node_modules', async () => {
    const root = temp('facet-workspace-source-');
    const cache = temp('facet-workspace-cache-');
    const source = join(root, 'apps/report');
    const library = join(root, 'packages/library');
    mkdirSync(join(source, 'node_modules'), { recursive: true });
    mkdirSync(library, { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"private":true}');
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, packages/*]\ncatalog:\n  example-kit: workspace:*\n');
    writeFileSync(join(library, 'package.json'), '{"name":"example-kit","version":"1.2.3"}');
    writeFileSync(join(source, 'package.json'), '{"dependencies":{"example-kit":"catalog:"}}');
    writeFileSync(join(source, 'Template.tsx'), 'export default () => <div />');
    const workspace = await acquireTemplateWorkspace(source, 'Template.tsx', cache);
    try {
      const manifest = JSON.parse(readFileSync(join(workspace.path, 'package.json'), 'utf8'));
      expect(manifest.dependencies).toEqual({ 'example-kit': `link:${library}` });
      expect(existsSync(join(workspace.path, 'node_modules'))).toBe(false);
    } finally { workspace.release(); }
  });
});
