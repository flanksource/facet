import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeTemplateBuildKey } from './build-cache.js';

const roots: string[] = [];

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'facet-build-key-'));
  roots.push(root);
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'package.json'), '{"name":"test"}');
  writeFileSync(join(root, 'src', 'Template.tsx'), 'export default () => <div />');
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('computeTemplateBuildKey', () => {
  it('is stable for unchanged sources', () => {
    const root = project();
    const options = { consumerRoot: root, facetVersion: '1' };
    expect(computeTemplateBuildKey(options)).toBe(computeTemplateBuildKey(options));
  });

  it('changes with source or Facet version', () => {
    const root = project();
    const initial = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' });
    writeFileSync(join(root, 'src', 'Template.tsx'), 'export default () => <main />');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' })).not.toBe(initial);
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '2' }))
      .not.toBe(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' }));
  });

  it('distinguishes entry files and content-addressed fragments', () => {
    const root = project();
    writeFileSync(join(root, 'src', 'Other.tsx'), 'export default () => <aside />');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: 'src/Template.tsx' }))
      .not.toBe(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: 'src/Other.tsx' }));

    mkdirSync(join(root, '.facet-fragments'));
    writeFileSync(join(root, '.facet-fragments', 'Header-a.tsx'), 'export default () => <header>A</header>');
    writeFileSync(join(root, '.facet-fragments', 'Header-b.tsx'), 'export default () => <header>B</header>');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: '.facet-fragments/Header-a.tsx' }))
      .not.toBe(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: '.facet-fragments/Header-b.tsx' }));
  });

  it('ignores generated and dependency directories', () => {
    const root = project();
    const initial = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' });
    mkdirSync(join(root, '.facet'));
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, '.facet', 'generated.ts'), 'changed');
    writeFileSync(join(root, 'node_modules', 'dependency.js'), 'changed');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' })).toBe(initial);
  });

  it('ignores dot-directories, build outputs, and tool state', () => {
    const root = project();
    const initial = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' });
    for (const dir of ['.tmp', '.gavel', '.vitest', 'npm-dist', 'dist-sea', 'dist-playground', 'out']) {
      mkdirSync(join(root, dir));
      writeFileSync(join(root, dir, 'artifact.json'), `{"dir":"${dir}"}`);
    }
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' })).toBe(initial);
  });

  it('still distinguishes entry files that live inside excluded dot-directories', () => {
    const root = project();
    mkdirSync(join(root, '.facet-fragments'));
    writeFileSync(join(root, '.facet-fragments', 'Header-a.tsx'), 'export default () => <header>A</header>');
    const first = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: '.facet-fragments/Header-a.tsx' });
    writeFileSync(join(root, '.facet-fragments', 'Header-a.tsx'), 'export default () => <header>changed</header>');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', templatePath: '.facet-fragments/Header-a.tsx' }))
      .not.toBe(first);
  });

  it('reuses the content digest from disk across process restarts', async () => {
    const root = project();
    mkdirSync(join(root, '.facet'));
    const stats: import('./build-cache.js').BuildKeyStats[] = [];
    const options = { consumerRoot: root, facetVersion: '1', onStats: (s: import('./build-cache.js').BuildKeyStats) => stats.push(s) };

    const first = computeTemplateBuildKey(options);
    expect(existsSync(join(root, '.facet', 'build-key-cache.json'))).toBe(true);

    vi.resetModules();
    const fresh = await import('./build-cache.js');
    const second = fresh.computeTemplateBuildKey(options);

    expect(second).toBe(first);
    expect(stats[1]).toMatchObject({ contentReused: true, contentBytes: 0 });

    writeFileSync(join(root, 'src', 'Template.tsx'), 'export default () => <main />');
    vi.resetModules();
    const third = await import('./build-cache.js');
    expect(third.computeTemplateBuildKey(options)).not.toBe(first);
    expect(stats[2]).toMatchObject({ contentReused: false });
  });

  it('does not create .facet in a pristine consumer root', () => {
    const root = project();
    computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' });
    expect(existsSync(join(root, '.facet'))).toBe(false);
  });

  it('reports digest stats and reuses the content digest on metadata match', () => {
    const root = project();
    const stats: import('./build-cache.js').BuildKeyStats[] = [];
    const options = { consumerRoot: root, facetVersion: '1', onStats: (s: import('./build-cache.js').BuildKeyStats) => stats.push(s) };

    computeTemplateBuildKey(options);
    computeTemplateBuildKey(options);
    writeFileSync(join(root, 'src', 'Template.tsx'), 'export default () => <main />');
    computeTemplateBuildKey(options);

    expect(stats).toHaveLength(3);
    expect(stats[0]).toMatchObject({ fileCount: 2, contentReused: false });
    expect(stats[1]).toMatchObject({ fileCount: 2, contentReused: true });
    expect(stats[2]).toMatchObject({ fileCount: 2, contentReused: false });
    expect(stats[0].contentBytes).toBeGreaterThan(0);
    expect(stats[1].contentBytes).toBe(0);
    for (const s of stats) {
      expect(s.walkMs).toBeGreaterThanOrEqual(0);
      expect(s.totalMs).toBeGreaterThanOrEqual(s.walkMs);
    }
  });

  it('changes when the generated build configuration digest changes', () => {
    const root = project();
    const base = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', extraDigest: 'config-a' });
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', extraDigest: 'config-a' })).toBe(base);
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', extraDigest: 'config-b' })).not.toBe(base);
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' })).not.toBe(base);
  });

  it('separates module modes and ignores consumer package metadata in skip mode', () => {
    const root = project();
    const projectMode = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1' });
    const skipMode = computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', skipModules: true });
    expect(skipMode).not.toBe(projectMode);

    writeFileSync(join(root, 'package.json'), '{"name":"changed","dependencies":{"custom":"2.0.0"}}');
    expect(computeTemplateBuildKey({ consumerRoot: root, facetVersion: '1', skipModules: true })).toBe(skipMode);
  });
});
