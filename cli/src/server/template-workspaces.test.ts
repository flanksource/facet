import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireTemplateWorkspace } from './template-workspaces.js';

const roots: string[] = [];
function temp(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  roots.push(path);
  return path;
}

afterEach(() => {
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
});
