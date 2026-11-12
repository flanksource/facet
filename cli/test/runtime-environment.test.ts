import { mkdir, mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, vi } from 'vitest';
import { buildTemplate } from '../src/bundler/vite-builder.js';
import { Logger } from '../src/utils/logger.js';
import { startViteServer, type ViteServer } from '../src/bundler/vite-server.js';

test('renders independent projects through one shared install without creating project dependency trees', async () => {
  const repo = resolve(import.meta.dirname, '../..');
  await mkdir(join(repo, '.tmp'), { recursive: true });
  const scratch = await mkdtemp(join(repo, '.tmp/runtime-render-'));
  const cache = join(scratch, 'cache');
  vi.stubEnv('FACET_CACHE_DIR', cache);
  vi.stubEnv('FACET_PACKAGE_PATH', repo);
  try {
    const compiledRoots: string[] = [];
    for (const name of ['project-a', 'project-b']) {
      const project = join(scratch, name);
      await mkdir(project);
      await writeFile(join(project, 'package.json'), JSON.stringify({ name, private: true }));
      await writeFile(join(project, 'Report.tsx'), 'import React, {useState} from "react"; import {Classified} from "@flanksource/facet"; export default function Report({data}) { const [message] = useState(data.message); return <Classified tier="Internal"><p>{message}</p></Classified>; }');
      const result = await buildTemplate({ consumerRoot: project, templatePath: 'Report.tsx', data: { message: name }, logger: new Logger(false), redact: { allow: { tier: ['Internal'] } } });
      try {
        expect(result.html).toBe(`<p>${name}</p>`);
        const runtime = JSON.parse(await readFile(join(result.facetRoot, 'runtime.json'), 'utf8'));
        compiledRoots.push(runtime.compiled.node.root);
        const bundle = await readFile(join(result.facetRoot, 'build-cache', result.buildCacheKey, 'bundle.mjs'), 'utf8');
        expect(bundle.length).toBeLessThan(5000);
        expect(bundle).not.toContain('function Classified');
      } finally { await result.cleanup(); }
      expect(existsSync(join(project, '.facet'))).toBe(false);
      expect(existsSync(join(project, 'node_modules'))).toBe(false);
    }
    expect(new Set(compiledRoots).size).toBe(1);
    const entries = (await readdir(join(cache, 'environments'))).filter(name => !name.endsWith('.lock'));
    expect(entries).toHaveLength(1);
    const environment = join(cache, 'environments', entries[0]);
    expect(await readFile(join(environment, 'pnpm-lock.yaml'), 'utf8')).toContain('lockfileVersion');
    expect(existsSync(join(environment, '.npmrc'))).toBe(false);
    const servers: ViteServer[] = [];
    try {
      for (const message of ['first request', 'second request']) {
        servers.push(await startViteServer({ consumerRoot: join(scratch, 'project-a'), templatePath: 'Report.tsx', data: { message }, logger: new Logger(false) }));
      }
      expect(await Promise.all(servers.map(async server => (await (await fetch(new URL('facet-data.js', server.url))).text()).split('\n')[0])))
        .toEqual(['window.__FACET_DATA__ = {"message":"first request"};', 'window.__FACET_DATA__ = {"message":"second request"};']);
    } finally { await Promise.all(servers.map(server => server.close())); }
    expect(existsSync(join(environment, 'node_modules/.vite'))).toBe(false);
    expect(existsSync(join(environment, 'node_modules/.vite-temp'))).toBe(false);
  } finally {
    vi.unstubAllEnvs();
    await rm(scratch, { recursive: true, force: true });
  }
}, 240_000);
