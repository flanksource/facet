import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { pdfFixture } from '../src/inspection/fixtures.test-utils.js';
import { loadSharp } from '../src/utils/sharp.js';

const { buildPackage } = require('../scripts/pack-npm-cli.cjs');
const run = promisify(execFile);

test('installed CLI inspection and lint use normal dependencies without a rendering runtime', async () => {
  const repo = resolve(import.meta.dirname, '../..');
  mkdirSync(join(repo, '.tmp'), { recursive: true });
  const scratch = mkdtempSync(join(repo, '.tmp/cli-tools-package-'));
  try {
    const out = join(scratch, 'install');
    const project = join(scratch, 'project');
    const cache = join(scratch, 'cache');
    mkdirSync(project);
    const version = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).version;
    buildPackage({ version, repoRoot: repo, outDir: out, templateDir: join(repo, 'cli/npm/facet-cli'), bundlePath: join(repo, 'cli/dist-sea/cli.cjs'), portable: true });
    const manifest = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
    const cliManifest = JSON.parse(readFileSync(join(repo, 'cli/package.json'), 'utf8'));
    for (const name of ['pdfjs-dist', '@napi-rs/canvas', 'sharp', 'rolldown', 'oxlint']) expect(manifest.dependencies[name]).toBe(cliManifest.dependencies[name]);
    delete manifest.optionalDependencies;
    writeFileSync(join(out, 'package.json'), JSON.stringify(manifest));
    await run('pnpm', ['install', '--prod', '--prefer-offline', '--ignore-scripts', '--no-frozen-lockfile'], { cwd: out, maxBuffer: 4 * 1024 * 1024 });
    const sharp = await loadSharp();
    writeFileSync(join(project, 'sample.png'), await sharp({ create: { width: 2, height: 3, channels: 3, background: '#ffffff' } }).png().toBuffer());
    writeFileSync(join(project, 'sample.pdf'), await pdfFixture());
    writeFileSync(join(project, 'Report.tsx'), 'export default () => <Page><p>Normal CLI dependency</p></Page>;');
    const env = { ...process.env, FACET_PACKAGE_PATH: '', FACET_DEV_ROOT: '', FACET_CACHE_DIR: cache };
    for (const file of ['sample.png', 'sample.pdf']) {
      const result = await run(process.execPath, [join(out, 'facet.cjs'), 'inspect', file, '--json'], { cwd: project, env, maxBuffer: 4 * 1024 * 1024 });
      expect(JSON.parse(result.stdout)[0]).toMatchObject({ format: file.split('.').at(-1) });
    }
    for (const rule of ['empty-page', 'no-data-driven-diagram']) await run(process.execPath, [join(out, 'facet.cjs'), 'lint', 'Report.tsx', '--rule', rule], { cwd: project, env, maxBuffer: 4 * 1024 * 1024 });
    expect(existsSync(join(out, 'assets/default-runtime.tgz'))).toBe(false);
    expect(existsSync(cache)).toBe(false);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}, 240_000);
