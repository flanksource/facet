import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverThemes, themeEntry } from './themes.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
describe('installed themes', () => {
  it('discovers a package alias through its exported module', () => {
    const root = mkdtempSync(join(tmpdir(), 'facet-themes-'));
    roots.push(root);
    mkdirSync(join(root, 'node_modules/example-theme'), { recursive: true });
    writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { 'example-theme': '1.0.0' } }));
    writeFileSync(join(root, 'node_modules/example-theme/package.json'), JSON.stringify({ version: '1.0.0', exports: { './theme': './dist/theme.js' }, facet: { themes: { example: './theme' } } }));
    expect(themeEntry(root, 'example')).toBe('example-theme/theme');
    expect(discoverThemes(root)[0]).toMatchObject({ id: 'example', version: '1.0.0' });
    expect(() => themeEntry(root, 'missing')).toThrow('Unknown theme');
  });
});
