import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { inheritCompiledLayers, unpackLayerManifest } from './layers.js';

test('drops project dependencies and override rules owned by the base layer', () => {
  const versions = { '@example/shared': '1.1.0', react: '18.3.1' };
  const manifest = { dependencies: { '@example/shared': '2.0.0', react: '^19', extra: '3.0.0' }, pnpm: { overrides: { 'extra>@example/shared@^2': '2.0.0', 'extra>helper': '4.0.0' } } };
  const lines: string[] = [];
  expect(unpackLayerManifest(manifest, versions, line => lines.push(line))).toEqual({ dependencies: { extra: '3.0.0' }, pnpm: { overrides: { 'extra>helper': '4.0.0' } } });
  expect(lines).toEqual([
    'Using @example/shared@1.1.0 from the runtime (project requested 2.0.0)',
    'Using react@18.3.1 from the runtime (project requested ^19)',
  ]);
});

test('keeps inherited runtime indexes and chunks readable after the base is deleted', () => {
  const scratch = resolve(import.meta.dirname, '../../../.tmp');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, 'runtime-link-'));
  try {
    const base = join(root, 'base');
    const derived = join(root, 'derived');
    const entries = { 'runtime.json': '{"imports":{"example":"layers/clicky-ui/entry.mjs"}}', 'layers/clicky-ui/entry.mjs': "export const example = 'base';" };
    const directory = join(base, 'page-runtime/node');
    mkdirSync(join(directory, 'layers/clicky-ui'), { recursive: true });
    for (const [file, value] of Object.entries(entries)) writeFileSync(join(directory, file), value);
    inheritCompiledLayers(base, derived);
    rmSync(base, { recursive: true });
    expect(Object.fromEntries(Object.keys(entries).map(file => [file, readFileSync(join(derived, 'page-runtime/node', file), 'utf8')]))).toEqual(entries);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
