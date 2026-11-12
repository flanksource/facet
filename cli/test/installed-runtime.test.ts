import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, delimiter } from 'node:path';
import { expect, test } from 'vitest';

const { buildPackage } = require('../scripts/pack-npm-cli.cjs');
const run = promisify(execFile);

test('packed default runtime renders with a fresh cache and disabled package managers', async () => {
  const repoRoot = resolve(import.meta.dirname, '../..');
  const parent = process.env.FACET_RUNTIME_TEST_ROOT ?? join(repoRoot, '.tmp');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'installed-runtime-'));
  const project = join(root, 'project');
  const outDir = join(root, 'install');
  const cache = join(root, 'cache');
  const bin = join(root, 'bin');
  const version = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version;
  try {
    buildPackage({ version, repoRoot, outDir, templateDir: join(repoRoot, 'cli/npm/facet-cli'), bundlePath: join(repoRoot, 'cli/dist-sea/cli.cjs') });
    mkdirSync(project);
    writeFileSync(join(project, 'pnpm-workspace.yaml'), 'packages: [.]\n');
    writeFileSync(join(project, 'package.json'), '{"name":"report-project","dependencies":{"react":"^18.3.1"}}');
    mkdirSync(bin);
    for (const name of ['pnpm', 'npm', 'corepack']) writeFileSync(join(bin, name), '#!/bin/sh\nexit 73\n', { mode: 0o755 });
    writeFileSync(join(project, 'Report.tsx'), 'import React from "react"; import { Page } from "@flanksource/facet"; export default ({data}) => <Page><h1>{data.message}</h1></Page>;');
    writeFileSync(join(project, 'data.json'), '{"message":"Installed runtime works"}');
    const env = { ...process.env, FACET_PACKAGE_PATH: '', FACET_CACHE_DIR: cache, PATH: `${bin}${delimiter}${process.env.PATH}`, npm_config_registry: 'http://127.0.0.1:9' };
    for (const format of ['html', 'pdf', 'png', 'docx', 'pptx']) {
      const output = join(project, `report.${format}`);
      await run(process.execPath, [join(outDir, 'facet.cjs'), format, 'Report.tsx', '--data', 'data.json', '--skip-modules', '--output', output], { cwd: project, env, maxBuffer: 8 * 1024 * 1024 });
      const bytes = readFileSync(output);
      expect(bytes.length, format).toBeGreaterThan(100);
      if (format === 'html') expect(bytes.toString()).toContain('Installed runtime works');
      if (format === 'pdf') expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      if (format === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      if (['docx', 'pptx'].includes(format)) expect(bytes.subarray(0, 2).toString()).toBe('PK');
    }
    expect(readdirSync(join(cache, 'runtimes'))).toHaveLength(1);
    await run(process.execPath, [join(outDir, 'facet.cjs'), 'png', 'Report.tsx', '--data', 'data.json', '--skip-modules', '--autocrop', '--output', join(project, 'cropped.png')], { cwd: project, env, maxBuffer: 8 * 1024 * 1024 });
    expect(readFileSync(join(project, 'cropped.png')).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    await run(process.execPath, [join(outDir, 'facet.cjs'), 'html', 'Report.tsx', '--data', 'data.json', '--output', join(project, 'automatic.html')], { cwd: project, env, maxBuffer: 8 * 1024 * 1024 });
    expect(readFileSync(join(project, 'automatic.html'), 'utf8')).toContain('Installed runtime works');
    writeFileSync(join(project, 'helper.ts'), 'type Node = { value?: string; children?: Node[] }; export default function plugin() { return (tree: Node) => { for (const paragraph of tree.children ?? []) for (const child of paragraph.children ?? []) if (child.value) child.value = "Runtime plugin"; }; }');
    writeFileSync(join(project, 'plugin.ts'), 'export { default } from "./helper";');
    writeFileSync(join(project, 'Report.mdx'), '---\nremarkPlugins: [./plugin.ts]\n---\nOriginal text\n');
    await run(process.execPath, [join(outDir, 'facet.cjs'), 'html', 'Report.mdx', '--skip-modules', '--output', join(project, 'plugin.html')], { cwd: project, env, maxBuffer: 8 * 1024 * 1024 });
    expect(readFileSync(join(project, 'plugin.html'), 'utf8')).toContain('Runtime plugin');
    writeFileSync(join(project, 'data-loader.ts'), 'const message: string = "Runtime data loader"; console.log(JSON.stringify({message}));');
    await run(process.execPath, [join(outDir, 'facet.cjs'), 'html', 'Report.tsx', '--data-loader', 'data-loader.ts', '--skip-modules', '--output', join(project, 'loaded.html')], { cwd: project, env, maxBuffer: 8 * 1024 * 1024 });
    expect(readFileSync(join(project, 'loaded.html'), 'utf8')).toContain('Runtime data loader');
    expect(existsSync(join(cache, 'environments'))).toBe(false);
    expect(existsSync(join(project, '.facet'))).toBe(false);
    expect(existsSync(join(project, 'node_modules'))).toBe(false);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 240_000);
