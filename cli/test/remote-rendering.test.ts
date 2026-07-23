import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createServer, type ServerHandle } from '../src/server/preview.js';

const execFileAsync = promisify(execFile);
const cliRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(cliRoot, '..');
const scratchRoot = resolve(cliRoot, '.tmp');

describe('remote CLI rendering', () => {
  let server: ServerHandle;
  let workspace: string;
  let template: string;
  let data: string;
  let outputDirectory: string;

  beforeAll(async () => {
    process.env['FACET_PACKAGE_PATH'] = repositoryRoot;
    process.env['FACET_LOW_PRIORITY'] = '0';
    await mkdir(scratchRoot, { recursive: true });
    workspace = await mkdtemp(join(scratchRoot, 'remote-rendering-'));
    const project = join(workspace, 'project');
    outputDirectory = join(workspace, 'output');
    template = join(project, 'RemoteReport.tsx');
    data = join(project, 'data.json');

    await mkdir(project, { recursive: true });
    await writeFile(join(project, 'package.json'), JSON.stringify({
      name: 'remote-rendering-fixture',
      private: true,
    }));
    await writeFile(template, `
import React from 'react';

export default function RemoteReport({ data }: { data: { title: string } }) {
  return <html><body><h1>{data.title}</h1></body></html>;
}
`);
    await writeFile(data, JSON.stringify({ title: 'Rendered by remote Facet' }));

    server = await createServer({
      port: 0,
      templatesDir: join(cliRoot, 'examples'),
      workers: 1,
      renderTimeout: 180000,
      maxUploadSize: 52428800,
      cacheMaxSize: 104857600,
      cacheDir: join(workspace, 'cache'),
      verbose: false,
    });
  }, 30000);

  afterAll(async () => {
    await server?.stop();
    await rm(workspace, { recursive: true, force: true });
  }, 15000);

  it('renders HTML through the server selected by FACET_URL', async () => {
    const output = join(outputDirectory, 'remote.html');

    await execFileAsync(process.execPath, [
      '--import', 'tsx',
      'src/cli.ts',
      'html', template,
      '--data', data,
      '--output', output,
    ], {
      cwd: cliRoot,
      env: { ...process.env, FACET_URL: server.url },
      timeout: 180000,
    });

    await expect(readFile(output, 'utf-8')).resolves.toContain('Rendered by remote Facet');
  }, 180000);

  it('renders PDF through --facet-url when FACET_URL points elsewhere', async () => {
    const output = join(outputDirectory, 'remote.pdf');

    await execFileAsync(process.execPath, [
      '--import', 'tsx',
      'src/cli.ts',
      '--facet-url', server.url,
      'pdf', template,
      '--data', data,
      '--output', output,
    ], {
      cwd: cliRoot,
      env: { ...process.env, FACET_URL: 'http://127.0.0.1:1' },
      timeout: 180000,
    });

    const pdf = await PDFDocument.load(await readFile(output));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  }, 180000);
});
