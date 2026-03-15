/**
 * Integration tests for the /render API endpoint.
 *
 * Starts a real server with a browser worker pool, sends templates
 * via JSON (local) and multipart (archive) requests, and validates
 * the returned PDFs with pdf-lib and ImageMagick.
 */

import { join } from 'path';
import { execSync } from 'child_process';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { PDFDocument } from 'pdf-lib';
import { createServer, type ServerHandle } from '../src/server/preview.js';

const EXAMPLES_DIR = join(__dirname, '../examples');
const REPO_ROOT = join(__dirname, '../..');

// Point to the local repo so npm install doesn't need a published package
process.env['FACET_PACKAGE_PATH'] = REPO_ROOT;

function hasMagick(): boolean {
  try { execSync('magick -version', { stdio: 'pipe' }); return true; } catch {}
  try { execSync('convert -version', { stdio: 'pipe' }); return true; } catch {}
  return false;
}

describe('Render API', () => {
  let server: ServerHandle;

  beforeAll(async () => {
    server = await createServer({
      port: 0,
      templatesDir: EXAMPLES_DIR,
      workers: 1,
      renderTimeout: 60000,
      maxUploadSize: 52428800,
      verbose: false,
    });
  }, 30000);

  afterAll(async () => {
    await server?.stop();
  }, 15000);

  test('GET /healthz returns ok', async () => {
    const res = await fetch(`${server.url}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.workers.total).toBe(1);
  });

  test('GET /templates lists discovered templates', async () => {
    const res = await fetch(`${server.url}/templates`);
    expect(res.status).toBe(200);
    const templates = await res.json();
    const names = templates.map((t: any) => t.name);
    expect(names).toContain('SimpleReport');
  });

  test('POST /render with local template returns valid HTML', async () => {
    // First render is slow due to vite build + npm install in .facet dir
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'SimpleReport',
        format: 'html',
        data: {
          title: 'Test Report',
          sections: [{ title: 'Section 1', content: 'Hello world' }],
        },
      }),
    });
    if (res.status !== 200) {
      console.error('Render error:', await res.text());
    }
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain('Test Report');
  }, 120000);

  test('POST /render with local template returns valid PDF', async () => {
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'SimpleReport',
        format: 'pdf',
        data: {
          title: 'PDF Test Report',
          sections: [
            { title: 'Overview', content: 'This is a PDF integration test.' },
            { title: 'Details', content: 'Validating end-to-end render pipeline.' },
          ],
        },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');

    const pdfBytes = Buffer.from(await res.arrayBuffer());
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const { width, height } = doc.getPage(0).getSize();
    // A4 at 72dpi: ~595 x 842 pt
    expect(width).toBeGreaterThan(500);
    expect(height).toBeGreaterThan(700);
  }, 60000);

  test('POST /render with archive upload returns valid PDF', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'facet-test-'));
    const templateContent = `
import React from 'react';
export default function InlineTemplate({ data }: { data: any }) {
  return (
    <html>
      <body>
        <h1 style={{ color: '#e11d48', fontFamily: 'sans-serif' }}>
          {data.heading || 'Archive Template'}
        </h1>
        <p>Rendered from an uploaded archive.</p>
      </body>
    </html>
  );
}`;
    await writeFile(join(tmpDir, 'Template.tsx'), templateContent);
    execSync(`tar -czf "${join(tmpDir, 'template.tar.gz')}" -C "${tmpDir}" Template.tsx`);
    const tarball = Bun.file(join(tmpDir, 'template.tar.gz'));

    const formData = new FormData();
    formData.append('archive', tarball);
    formData.append('data', JSON.stringify({ heading: 'Inline PDF Test' }));
    formData.append('options', JSON.stringify({ format: 'pdf' }));

    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');

    const pdfBytes = Buffer.from(await res.arrayBuffer());
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  }, 60000);

  (hasMagick() ? test : test.skip)('PDF renders visible content (ImageMagick)', async () => {
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'SimpleReport',
        format: 'pdf',
        data: {
          title: 'Pixel Check',
          sections: [{ title: 'Content', content: 'Visible text for pixel validation.' }],
        },
      }),
    });
    expect(res.status).toBe(200);
    const pdfBytes = Buffer.from(await res.arrayBuffer());

    const tmpDir = await mkdtemp(join(tmpdir(), 'facet-magick-'));
    const pdfPath = join(tmpDir, 'output.pdf');
    const pngPath = join(tmpDir, 'page.png');
    await writeFile(pdfPath, pdfBytes);

    execSync(`magick -density 72 "${pdfPath}[0]" "${pngPath}"`, { timeout: 15000 });

    // Verify the PNG was created and has reasonable size (not blank)
    const pngSize = Bun.file(pngPath).size;
    expect(pngSize).toBeGreaterThan(1000);

    // Convert to raw PPM and verify not all-white
    const ppmPath = join(tmpDir, 'page.ppm');
    execSync(`magick "${pngPath}" -depth 8 "${ppmPath}"`, { timeout: 10000 });
    const ppmData = await Bun.file(ppmPath).arrayBuffer();
    const pixels = Buffer.from(ppmData);

    // Skip PPM header (3 lines), then check we have non-white pixels
    let headerEnd = 0;
    let newlines = 0;
    for (let i = 0; i < pixels.length && newlines < 3; i++) {
      if (pixels[i] === 0x0a) newlines++;
      headerEnd = i + 1;
    }
    const raw = pixels.subarray(headerEnd);
    let nonWhiteCount = 0;
    for (let i = 0; i < raw.length; i += 3) {
      if (raw[i] < 250 || raw[i + 1] < 250 || raw[i + 2] < 250) {
        nonWhiteCount++;
      }
    }
    // At least 0.1% of pixels should be non-white (text, borders, etc.)
    const totalPixels = raw.length / 3;
    expect(nonWhiteCount / totalPixels).toBeGreaterThan(0.001);
  }, 60000);

  test('GET / returns playground HTML', async () => {
    const res = await fetch(`${server.url}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('monaco');
    expect(html).toContain('Facet Playground');
  });

  test('POST /render with inline code returns valid HTML', async () => {
    const code = `
import React from 'react';
export default function Template({ data }: { data: any }) {
  return (
    <html>
      <body>
        <h1>{data.title || 'Inline Test'}</h1>
      </body>
    </html>
  );
}`;
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, format: 'html', data: { title: 'Hello Inline' } }),
    });
    if (res.status !== 200) console.error('Inline render error:', await res.text());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Hello Inline');
  }, 120000);

  test('POST /render with inline code returns valid PDF', async () => {
    const code = `
import React from 'react';
export default function Template({ data }: { data: any }) {
  return (
    <html>
      <body>
        <h1>{data.title || 'PDF Inline'}</h1>
      </body>
    </html>
  );
}`;
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, format: 'pdf', data: { title: 'Inline PDF' } }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const pdfBytes = Buffer.from(await res.arrayBuffer());
    expect(pdfBytes.length).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  }, 60000);

  test('POST /render/stream returns SSE with progress and result', async () => {
    const code = `
import React from 'react';
export default function Template({ data }: { data: any }) {
  return <html><body><h1>{data.msg}</h1></body></html>;
}`;
    const res = await fetch(`${server.url}/render/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, format: 'html', data: { msg: 'Stream Test' } }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');

    const text = await res.text();
    // Should contain progress events
    expect(text).toContain('"stage"');
    expect(text).toContain('"building"');
    // Should contain the final result event
    expect(text).toContain('event: result');
    expect(text).toContain('Stream Test');
  }, 120000);

  test('POST /render with unknown template returns 404', async () => {
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'NonExistent', format: 'html', data: {} }),
    });
    expect(res.status).toBe(404);
  });

  test('POST /render with missing template field returns 400', async () => {
    const res = await fetch(`${server.url}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'html', data: {} }),
    });
    expect(res.status).toBe(400);
  });
});
