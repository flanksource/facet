import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { createServer, type ServerHandle } from '../src/server/preview.js';
import { loadConfig } from '../src/server/config.js';

const REPO_ROOT = join(import.meta.dirname, '../..');
const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');
const TEMP_ROOT = join(REPO_ROOT, '.tmp');

process.env['FACET_PACKAGE_PATH'] = REPO_ROOT;

let cacheDir: string;
let server: ServerHandle;

beforeAll(async () => {
  await mkdir(TEMP_ROOT, { recursive: true });
  cacheDir = await mkdtemp(join(TEMP_ROOT, 'react19-diagram-'));
  server = await createServer({
    ...loadConfig({
      port: '0',
      templatesDir: FIXTURES_DIR,
      timeout: '180000',
      workers: '1',
    }),
    cacheDir,
  });
}, 30_000);

afterAll(async () => {
  await server?.stop();
  await rm(cacheDir, { force: true, recursive: true });
}, 15_000);

test('serializes finite arrow geometry from a React 19 shared diagram module', async () => {
  const response = await fetch(`${server.url}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'html',
      template: 'react19-diagram',
    }),
  });

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('data-facet-ready="true"');
  expect(html).toContain('<path');
  expect(html).not.toContain('NaN');
}, 180_000);
