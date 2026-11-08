// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type Fragment = {
  imports: Record<string, string>;
  scopes: Record<string, Record<string, string>>;
  aliases: Record<string, string>;
  remaps: Record<string, string>;
  inherits: string[];
};

const libraryDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

describe('Facet runtime set', () => {
  it('builds the runtime through the package script', () => {
    const result = spawnSync('pnpm', ['run', 'build:runtime'], { cwd: libraryDir, encoding: 'utf8' });
    expect({ status: result.status, output: result.status === 0 ? '' : result.stdout + result.stderr })
      .toEqual({ status: 0, output: '' });
  }, 120_000);

  it('inherits the installed base without mapping its packages in any table', () => {
    const base = JSON.parse(readFileSync(require.resolve('@flanksource/clicky-ui/runtime/importmap.json'), 'utf8')) as Fragment;
    const fragment = JSON.parse(readFileSync(join(libraryDir, 'dist/runtime/importmap.json'), 'utf8')) as Fragment;
    expect(fragment.inherits).toEqual(expect.arrayContaining(['react', 'react/jsx-runtime', '@flanksource/clicky-ui/data']));
    expect(fragment.inherits.filter((specifier) => !base.imports[specifier])).toEqual([]);
    const basePackages = Object.keys(base.imports);
    const mappings = [fragment.imports, ...Object.values(fragment.scopes), fragment.aliases];
    expect(mappings.flatMap((table) => Object.keys(table)).filter((specifier) =>
      basePackages.some((name) => specifier === name || specifier.startsWith(`${name}/`)),
    )).toEqual([]);
    expect(Object.keys(fragment.remaps).filter((url) =>
      basePackages.some((name) => url.startsWith(`${name}@`)),
    )).toEqual([]);
  });

  it('publishes one development runtime and a barrel index', () => {
    const root = join(libraryDir, 'dist/runtime');
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' });
    expect(files).toEqual(expect.arrayContaining([expect.stringMatching(/\.js$/)]));
    expect(files.filter((path) => /^(development|production)(\/|$)/.test(path))).toEqual([]);
    for (const file of files.filter((path) => path.endsWith('.js'))) {
      expect(readFileSync(join(root, file), 'utf8')).not.toMatch(/react\.production(?:\.min)?\.js|NODE_ENV\s*===?\s*["']production["']/);
    }
    expect(Object.keys(JSON.parse(readFileSync(join(libraryDir, 'dist/runtime/barrels.json'), 'utf8'))))
      .not.toHaveLength(0);
  });

  it('passes check-fragment for the built dist and installed base', () => {
    const result = spawnSync(process.execPath, [
      '--import', require.resolve('tsx'),
      join(libraryDir, 'node_modules/@flanksource/page-runtime/scripts/check-fragment.ts'),
      libraryDir, require.resolve('@flanksource/clicky-ui/runtime/importmap.json'),
    ], { cwd: libraryDir, encoding: 'utf8' });
    expect({ status: result.status, output: result.status === 0 ? '' : result.stdout + result.stderr })
      .toEqual({ status: 0, output: '' });
  }, 120_000);
});
