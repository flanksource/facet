import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { stageRenderingRuntime } from './runtime-files.js';

let root: string;
const write = (file: string, content: string) => { mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, content); };
beforeEach(() => { mkdirSync(resolve('../.tmp'), { recursive: true }); root = mkdtempSync(resolve('../.tmp/render-projection-')); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('ships tool dependencies and precompiled libraries without build, editor or inspection payloads', async () => {
  const source = join(root, 'source');
  const out = join(root, 'out');
  write(join(source, 'package.json'), '{"dependencies":{"example-tool":"1.0.0","@flanksource/facet":"1.0.0"}}');
  write(join(source, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
  write(join(source, 'node_modules/example-tool/package.json'), '{"name":"example-tool","version":"1.0.0","dependencies":{"example-native":"1.0.0"},"peerDependencies":{"example-editor":"*"}}');
  write(join(source, 'node_modules/example-tool/index.js'), 'export const tool = true; export const text = "//# sourceMappingURL=keep.map";\n//# sourceMappingURL=removed.map\n');
  write(join(source, 'node_modules/example-tool/index.js.map'), '{}');
  write(join(source, 'node_modules/example-tool/index.d.ts'), 'export const tool: boolean;');
  write(join(source, 'node_modules/example-tool/test/test.js'), 'test fixture');
  write(join(source, 'node_modules/example-native/package.json'), '{"name":"example-native","version":"1.0.0"}');
  write(join(source, 'node_modules/example-native/addon.node'), 'native binding');
  write(join(source, 'node_modules/example-editor/package.json'), '{"name":"example-editor","version":"1.0.0"}');
  write(join(source, 'node_modules/example-editor/index.js'), 'editor');
  write(join(source, 'node_modules/@flanksource/facet/package.json'), '{"name":"@flanksource/facet","version":"1.0.0","exports":{".":"./dist/components/index.js","./cli":"./cli/dist/index.mjs"}}');
  write(join(source, 'node_modules/@flanksource/facet/dist/components/index.js'), 'export const component = true;');
  write(join(source, 'node_modules/@flanksource/facet/dist/runtime/importmap.json'), '{"imports":{}}');
  write(join(source, 'node_modules/@flanksource/facet/dist/runtime/barrels.json'), '{}');
  write(join(source, 'node_modules/@flanksource/facet/dist/runtime/duplicated.js'), 'duplicate fragment');
  write(join(source, 'node_modules/@flanksource/facet/cli/dist/index.mjs'), 'duplicate CLI');
  write(join(source, 'node_modules/@flanksource/facet/dist/styles.css'), '.facet {}');
  write(join(source, 'node_modules/@flanksource/facet/LICENSE'), 'required license');
  write(join(source, 'packages/facet.tgz'), 'cached archive');
  for (const target of ['node', 'browser']) {
    write(join(source, 'page-runtime', target, 'runtime.json'), '{"imports":{"@flanksource/facet":"entry.mjs"}}');
    write(join(source, 'page-runtime', target, 'entry.mjs'), 'export const component = true; export default component;');
  }
  await stageRenderingRuntime({ root: source, out, packages: ['example-tool', '@flanksource/facet'] });
  expect(readFileSync(join(out, 'node_modules/example-tool/index.js'), 'utf8')).toContain('tool');
  expect(readFileSync(join(out, 'node_modules/example-tool/index.js'), 'utf8')).not.toContain('sourceMappingURL=removed.map');
  expect(readFileSync(join(out, 'node_modules/example-tool/index.js'), 'utf8')).toContain('sourceMappingURL=keep.map');
  expect(readFileSync(join(out, 'node_modules/example-native/addon.node'), 'utf8')).toBe('native binding');
  expect(readFileSync(join(out, 'node_modules/@flanksource/facet/dist/styles.css'), 'utf8')).toBe('.facet {}');
  expect(readFileSync(join(out, 'node_modules/@flanksource/facet/LICENSE'), 'utf8')).toBe('required license');
  expect(JSON.parse(readFileSync(join(out, 'node_modules/@flanksource/facet/package.json'), 'utf8')).exports).not.toHaveProperty('./cli');
  expect(['page-runtime/node/runtime.json', 'page-runtime/browser/runtime.json', 'pnpm-lock.yaml'].every(file => existsSync(join(out, file)))).toBe(true);
  expect(['packages', 'node_modules/example-editor', 'node_modules/example-tool/index.js.map', 'node_modules/example-tool/index.d.ts', 'node_modules/example-tool/test', 'node_modules/@flanksource/facet/cli', 'node_modules/@flanksource/facet/dist/runtime/duplicated.js'].filter(file => existsSync(join(out, file)))).toEqual([]);
  const exported = JSON.parse(readFileSync(join(out, 'node_modules/@flanksource/facet/package.json'), 'utf8')).exports['.'];
  rmSync(source, { recursive: true, force: true });
  expect(await import(pathToFileURL(join(out, 'node_modules/@flanksource/facet', exported)).href)).toMatchObject({ component: true, default: true });
});

it('rejects competing native tool versions instead of silently choosing one', async () => {
  const source = join(root, 'source');
  write(join(source, 'node_modules/example-tool/package.json'), '{"name":"example-tool","version":"1.0.0","dependencies":{"rolldown":"1.0.0","another-tool":"1.0.0"}}');
  write(join(source, 'node_modules/rolldown/package.json'), '{"name":"rolldown","version":"1.0.0"}');
  write(join(source, 'node_modules/another-tool/package.json'), '{"name":"another-tool","version":"1.0.0","dependencies":{"rolldown":"2.0.0"}}');
  write(join(source, 'node_modules/another-tool/node_modules/rolldown/package.json'), '{"name":"rolldown","version":"2.0.0"}');
  await expect(stageRenderingRuntime({ root: source, out: join(root, 'out'), packages: ['example-tool'] })).rejects.toThrow(/duplicated at 1.0.0 and 2.0.0/);
});

it('fails on an unresolved required tool dependency', async () => {
  write(join(root, 'source/node_modules/example-tool/package.json'), '{"name":"example-tool","version":"1.0.0","dependencies":{"missing-native":"1.0.0"}}');
  await expect(stageRenderingRuntime({ root: join(root, 'source'), out: join(root, 'out'), packages: ['example-tool'] })).rejects.toThrow(/missing-native/);
});

it('keeps the owning library license when a bundled module has a nested package.json', async () => {
  const source = join(root, 'source');
  const out = join(root, 'out');
  const module = join(source, 'node_modules/@example/icons/lib/index.js');
  write(join(source, 'package.json'), '{"name":"render-fixture"}');
  write(join(source, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
  write(join(source, 'node_modules/@example/icons/package.json'), '{"name":"@example/icons","version":"1.0.0","license":"MIT"}');
  write(join(source, 'node_modules/@example/icons/LICENSE'), 'bundled library license');
  write(join(source, 'node_modules/@example/icons/lib/package.json'), '{"type":"module"}');
  write(module, 'export const icon = true;');
  for (const target of ['node', 'browser']) write(join(source, 'page-runtime', target, 'runtime.json'), JSON.stringify({ inputs: { [module]: 'input-hash' } }));
  await stageRenderingRuntime({ root: source, out, packages: [] });
  expect(readFileSync(join(out, 'licenses/@example/icons@1.0.0/LICENSE'), 'utf8')).toBe('bundled library license');
  expect(existsSync(join(out, 'licenses/undefined@undefined'))).toBe(false);
  expect(existsSync(join(out, 'node_modules/@example/icons'))).toBe(false);
});
