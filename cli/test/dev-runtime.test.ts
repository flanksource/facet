import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

const run = promisify(execFile);

test('renders with unpublished local libraries and compiler from an independent consumer', async () => {
  const repo = resolve(import.meta.dirname, '../..');
  await mkdir(join(repo, '.tmp'), { recursive: true });
  const scratch = await mkdtemp(join(repo, '.tmp/dev-consumer-'));
  try {
    const project = join(scratch, 'consumer');
    const dependency = join(scratch, 'example-dev-package');
    await mkdir(project);
    await mkdir(dependency);
    await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'example-dev-package', version: '1.0.0', type: 'module', exports: './index.js' }));
    await writeFile(join(dependency, 'index.js'), 'export const message = "consumer dependency";');
    await writeFile(join(project, 'package.json'), JSON.stringify({ private: true, dependencies: { 'example-dev-package': `link:${dependency}` } }));
    await writeFile(join(project, 'Report.tsx'), 'import React, {useState} from "react"; import {cn} from "@flanksource/clicky-ui/utils"; import {message} from "example-dev-package"; export default function Report() { const [text] = useState(message); return <p className={cn("local", "ui")}>{text}</p>; }');
    const env = { ...process.env, FACET_PACKAGE_PATH: repo, FACET_CACHE_DIR: join(scratch, 'cache'), FACET_URL: '', FACET_DEV_ROOT: '' };
    const result = await run(process.execPath, [join(repo, 'cli/src/loaders/source.mjs'), join(repo, 'cli/src/cli.ts'), '--dev', 'html', 'Report.tsx', '--output', 'report.html'], { cwd: project, env, maxBuffer: 4 * 1024 * 1024 });
    expect(result.stderr).toContain('Using local rendering runtime');
    expect(await readFile(join(project, 'report.html'), 'utf8')).toContain('<p class="local ui">consumer dependency</p>');
    const [identity] = await readdir(join(scratch, 'cache/dev'));
    const compilations = join(scratch, 'cache/dev', identity, 'compilations');
    const [compilation] = await readdir(compilations);
    const runtime = JSON.parse(await readFile(join(compilations, compilation, 'runtime.json'), 'utf8'));
    expect(runtime.compiler).toBe(await realpath(join(repo, 'node_modules/@flanksource/page-runtime/dist/build/dependencies.mjs')));
    expect(await realpath(join(runtime.nodeModules, '@flanksource/clicky-ui'))).toBe(await realpath(join(repo, 'node_modules/@flanksource/clicky-ui')));
    expect(runtime.compiled.node.root).toContain('/cache/dev/');
  } finally { await rm(scratch, { recursive: true, force: true }); }
}, 240_000);
