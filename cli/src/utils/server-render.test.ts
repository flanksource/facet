import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { GenerateOptions } from '../types.js';
import { renderWithServer, resolveFacetURL } from './server-render.js';

const scratchRoot = resolve(process.cwd(), '.tmp');
const roots: string[] = [];
const servers: ReturnType<typeof createServer>[] = [];

async function fixture(): Promise<{ root: string; options: GenerateOptions }> {
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(join(scratchRoot, 'server-render-'));
  roots.push(root);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'server-render-fixture' }));
  await writeFile(join(root, 'Template.tsx'), 'export default () => <html><body>fixture</body></html>');
  await writeFile(join(root, 'data.json'), JSON.stringify({ title: 'Remote report' }));
  return {
    root,
    options: {
      template: join(root, 'Template.tsx'),
      data: join(root, 'data.json'),
      outputDir: join(root, 'output'),
      outputName: 'report',
      outputNameField: 'name',
      validate: true,
      verbose: false,
    },
  };
}

async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function listen(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP server address');
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolveClose) => server.close(() => resolveClose()))));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('resolveFacetURL', () => {
  it('uses the explicit flag before FACET_URL', () => {
    expect(resolveFacetURL('https://flag.example', 'https://env.example')).toBe('https://flag.example');
  });

  it('uses FACET_URL when the flag is absent', () => {
    expect(resolveFacetURL(undefined, 'https://env.example')).toBe('https://env.example');
  });
});

describe('renderWithServer', () => {
  it('uploads the project and writes returned HTML to the requested output', async () => {
    const received: { method?: string; contentType?: string; body?: string } = {};
    const facetURL = await listen(async (request, response) => {
      received.method = request.method;
      received.contentType = request.headers['content-type'];
      received.body = (await body(request)).toString('latin1');
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<html><body>remote html</body></html>');
    });
    const { options } = await fixture();

    await renderWithServer({ facetURL, format: 'html', options });

    expect(received).toMatchObject({
      method: 'POST',
      contentType: expect.stringContaining('multipart/form-data'),
      body: expect.stringContaining('"entryFile":"Template.tsx"'),
    });
    expect(received.body).toContain('"title":"Remote report"');
    await expect(readFile(join(options.outputDir, 'report.html'), 'utf-8'))
      .resolves.toBe('<html><body>remote html</body></html>');
  });

  it('downloads the PDF result URL and writes the PDF locally', async () => {
    const pdf = Buffer.from('%PDF-remote-result');
    const facetURL = await listen(async (request, response) => {
      await body(request);
      if (request.url === '/render') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ url: '/results/render-id' }));
        return;
      }
      response.writeHead(200, { 'content-type': 'application/pdf' });
      response.end(pdf);
    });
    const { options } = await fixture();

    await renderWithServer({ facetURL, format: 'pdf', options });

    await expect(readFile(join(options.outputDir, 'report.pdf'))).resolves.toEqual(pdf);
  });

  it('surfaces the server status and error message without a local fallback', async () => {
    const facetURL = await listen(async (request, response) => {
      await body(request);
      response.writeHead(422, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Template rejected' } }));
    });
    const { options } = await fixture();

    await expect(renderWithServer({ facetURL, format: 'html', options }))
      .rejects.toThrow('Facet server returned 422: Template rejected');
  });
});
