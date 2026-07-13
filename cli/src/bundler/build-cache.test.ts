import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
    expect(computeTemplateBuildKey(root, '1')).toBe(computeTemplateBuildKey(root, '1'));
  });

  it('changes with source or Facet version', () => {
    const root = project();
    const initial = computeTemplateBuildKey(root, '1');
    writeFileSync(join(root, 'src', 'Template.tsx'), 'export default () => <main />');
    expect(computeTemplateBuildKey(root, '1')).not.toBe(initial);
    expect(computeTemplateBuildKey(root, '2')).not.toBe(computeTemplateBuildKey(root, '1'));
  });

  it('distinguishes entry files and content-addressed fragments', () => {
    const root = project();
    writeFileSync(join(root, 'src', 'Other.tsx'), 'export default () => <aside />');
    expect(computeTemplateBuildKey(root, '1', 'src/Template.tsx'))
      .not.toBe(computeTemplateBuildKey(root, '1', 'src/Other.tsx'));

    mkdirSync(join(root, '.facet-fragments'));
    writeFileSync(join(root, '.facet-fragments', 'Header-a.tsx'), 'export default () => <header>A</header>');
    writeFileSync(join(root, '.facet-fragments', 'Header-b.tsx'), 'export default () => <header>B</header>');
    expect(computeTemplateBuildKey(root, '1', '.facet-fragments/Header-a.tsx'))
      .not.toBe(computeTemplateBuildKey(root, '1', '.facet-fragments/Header-b.tsx'));
  });

  it('ignores generated and dependency directories', () => {
    const root = project();
    const initial = computeTemplateBuildKey(root, '1');
    mkdirSync(join(root, '.facet'));
    mkdirSync(join(root, 'node_modules'));
    writeFileSync(join(root, '.facet', 'generated.ts'), 'changed');
    writeFileSync(join(root, 'node_modules', 'dependency.js'), 'changed');
    expect(computeTemplateBuildKey(root, '1')).toBe(initial);
  });
});
