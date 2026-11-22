import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { WorkspaceThemes } from './workspace-themes.js';
import { readWorkspaceThemeSettings, saveWorkspaceThemeSettings } from './workspace-theme-settings.js';
import { handleWorkspaceThemes } from './workspace-theme-routes.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const scratch = resolve(import.meta.dirname, '../../../.tmp');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, 'workspace-themes-'));
  roots.push(root);
  return { root, workspace: new WorkspaceThemes(root) };
}

it('creates a package with editable source and refuses an existing theme', () => {
  const { root, workspace } = fixture();
  workspace.create('example');
  expect(workspace.list()).toMatchObject([{ id: 'example', package: 'example-facet-theme' }]);
  expect(workspace.readFile('example', 'theme.tsx').bytes.toString()).toContain('extends: facetTheme');
  expect(JSON.parse(readFileSync(join(root, 'example/package.json'), 'utf8')).facet.themes).toEqual({ example: './theme' });
  expect(() => workspace.create('example')).toThrow(/already exists/);
});

it('saves an exact edit and rejects a stale revision after an external edit', () => {
  const { root, workspace } = fixture();
  workspace.create('example');
  const path = 'theme.css';
  const file = join(root, 'example', path);
  const original = workspace.readFile('example', path);
  const bytes = Buffer.from(':root { --brand-color: #112233; }\n');
  const revision = workspace.saveFile({ id: 'example', path, bytes, revision: original.revision });
  expect(new WorkspaceThemes(root).readFile('example', path)).toMatchObject({ bytes, revision });
  writeFileSync(file, '/* edited on disk */');
  expect(() => workspace.saveFile({ id: 'example', path, bytes, revision })).toThrow(/changed on disk/);
  expect(readFileSync(file, 'utf8')).toBe('/* edited on disk */');
});

it('excludes symlinks, dependencies and generated files from source access', () => {
  const { root, workspace } = fixture();
  workspace.create('example');
  const outside = join(root, 'external.css');
  writeFileSync(outside, '/* outside */');
  symlinkSync(outside, join(root, 'example/link.css'));
  for (const path of ['../external.css', outside, 'link.css', 'node_modules/dep/index.ts', 'dist/theme.js', '.git/config']) {
    expect(() => workspace.readFile('example', path)).toThrow(/path|symlink/i);
    expect(() => workspace.saveFile({ id: 'example', path, bytes: Buffer.from('changed'), revision: '*' })).toThrow(/path|symlink/i);
  }
  expect(readFileSync(outside, 'utf8')).toBe('/* outside */');
});

it('saves visual settings to the actual theme inputs and preserves surrounding CSS', () => {
  const { workspace } = fixture();
  workspace.create('example');
  const settings = readWorkspaceThemeSettings(workspace, 'example')!;
  const css = workspace.readFile('example', 'theme.css').bytes.toString();
  const defaults = { pageSize: '297x210', fontFamily: 'Georgia, serif', margins: { top: 12, left: 0 } };
  const colors = { '--theme-accent': '#456789' };
  for (const [kind, value, revision] of [['defaults', defaults, settings.defaultsRevision], ['colors', colors, settings.colorsRevision]] as const) {
    saveWorkspaceThemeSettings({ workspace, id: 'example', kind, value, revision });
  }
  expect(readWorkspaceThemeSettings(workspace, 'example')).toMatchObject({ defaults, colors });
  expect(workspace.readFile('example', 'theme.css').bytes.toString()).toBe(css.replace('#2563eb', '#456789'));
  expect(() => saveWorkspaceThemeSettings({ workspace, id: 'example', kind: 'colors', value: colors, revision: settings.colorsRevision })).toThrow(/changed on disk/);
});

it('requires the local workspace header and rejects other origins', async () => {
  const { workspace } = fixture();
  const port = 3010;
  const endpoint = `http://127.0.0.1:${port}/workspace/themes`;
  for (const headers of [{}, { 'x-facet-workspace': '1', origin: 'http://example.net' }, { 'x-facet-workspace': '1', 'sec-fetch-site': 'same-site' }]) {
    expect((await handleWorkspaceThemes(new Request(endpoint, { headers: headers as Record<string, string> }), workspace, port)).status).toBe(403);
  }
  expect(await (await handleWorkspaceThemes(new Request(endpoint, {
    headers: { 'x-facet-workspace': '1', 'sec-fetch-site': 'same-origin' },
  }), workspace, port)).json()).toEqual({ themes: [] });
});

it('retains the last immutable package when a new build fails', async () => {
  const { root, workspace } = fixture();
  const directory = join(root, 'example');
  const filename = join(directory, 'dist/theme.js');
  mkdirSync(join(directory, 'dist'), { recursive: true });
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    name: 'example-facet-theme', version: '1.0.0', type: 'module', files: ['dist'],
    facet: { themes: { example: './theme' } }, exports: { './theme': './dist/theme.js' },
    scripts: { build: 'node --check dist/theme.js' },
  }));
  const valid = 'export const theme = { id: "example" };';
  writeFileSync(filename, valid);
  const [first, second] = await Promise.all([workspace.build('example'), workspace.build('example')]);
  expect(second.theme).toEqual(first.theme);
  writeFileSync(filename, 'export const');
  await expect(workspace.build('example')).rejects.toThrow(/Build failed/);
  expect(await workspace.published(workspace.get('example'))).toEqual(first.theme);
  expect(readFileSync(join(first.theme.root, 'dist/theme.js'), 'utf8')).toBe(valid);
}, 15_000);
