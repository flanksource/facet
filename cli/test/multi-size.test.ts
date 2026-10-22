import { copyFile, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePNG } from '../src/generators/png.js';
import { generatePDF } from '../src/generators/pdf.js';
import { renderTemplateHTML } from '../src/generators/html.js';
import { createServer, type ServerHandle } from '../src/server/preview.js';
import { DEFAULT_RENDER_TIMEOUT_MS } from '../src/server/config.js';
import { expandRenderSizes, renderSizes } from '../src/utils/render-sizes.js';
import { renderWithServer } from '../src/utils/server-render.js';
import type { GenerateOptions } from '../src/types.js';

const root = resolve(import.meta.dirname, '../..');
const fixtures = join(root, 'cli/test/fixtures/multi-size');
const targets = [
  { size: 'google-ads-300x250', width: 300, height: 250 },
  { size: 'linkedin-portrait', width: 720, height: 900 },
];

async function expectDimensions(bytes: Buffer, format: 'png' | 'pdf', target: typeof targets[number]): Promise<void> {
  if (format === 'png') {
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([target.width, target.height]);
  } else {
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(target.width * 0.75, 0);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(target.height * 0.75, 0);
  }
}

describe('multi-size rendering', () => {
  let workspace: string;
  let project: string;
  let server: ServerHandle;
  const base: GenerateOptions = {
    template: join(fixtures, 'Canvas.tsx'),
    outputDir: '', outputName: 'campaign', outputNameField: 'name', validate: true, verbose: false,
  };

  beforeAll(async () => {
    process.env['FACET_PACKAGE_PATH'] ??= root;
    await mkdir(join(root, '.tmp'), { recursive: true });
    workspace = await mkdtemp(join(root, '.tmp/multi-size-'));
    project = join(workspace, 'project');
    await mkdir(project);
    await Promise.all(['Canvas.tsx', 'ResponsiveCanvas.tsx', 'package.json'].map(file => copyFile(join(fixtures, file), join(project, file))));
    base.template = join(project, 'Canvas.tsx');
    server = await createServer({ port: 0, templatesDir: project, workers: 1,
      renderTimeout: DEFAULT_RENDER_TIMEOUT_MS, maxUploadSize: 52428800, cacheMaxSize: 104857600,
      cacheDir: join(workspace, 'cache'), verbose: false });
  });
  afterAll(async () => {
    await server?.stop();
    if (workspace) await rm(workspace, { recursive: true, force: true });
  });

  it.each([
    ['png', 'local'], ['png', 'server'], ['pdf', 'local'], ['pdf', 'server'],
  ] as const)('writes suffixed %s files through %s rendering', async (format, mode) => {
    const sizes = expandRenderSizes(['google-ads-300x2?0', 'linkedin-portrait']);
    const outputDir = join(workspace, `${mode}-${format}`);
    await renderSizes({ sizes, options: { ...base, outputDir }, render: async (options) => {
      if (mode === 'server') await renderWithServer({ facetURL: server.url, format, options });
      else await (format === 'png' ? generatePNG : generatePDF)(options);
    } });
    expect((await readdir(outputDir)).sort()).toEqual(targets.map(target => `campaign-${target.size}.${format}`).sort());
    for (const target of targets) await expectDimensions(await readFile(join(outputDir, `campaign-${target.size}.${format}`)), format, target);
  }, DEFAULT_RENDER_TIMEOUT_MS * targets.length);

  it.each(['png', 'pdf'] as const)('keeps direct and streamed %s results isolated by size', async (format) => {
    const urls = [];
    for (const [index, target] of targets.entries()) {
      const response = await fetch(`${server.url}/render${index ? '/stream' : ''}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ template: 'Canvas', format, pageSizeOverride: target.size }),
      });
      expect(response.status).toBe(200);
      let url: string;
      if (index) {
        const stream = await response.text();
        expect(stream).not.toContain('event: error');
        const result = stream.match(/event: result\ndata: (.+)/);
        expect(result).not.toBeNull();
        url = (JSON.parse(result![1]) as { url: string }).url;
      } else url = ((await response.json()) as { url: string }).url;
      urls.push(url);
      const artifact = await fetch(new URL(url, server.url));
      expect(artifact.status).toBe(200);
      await expectDimensions(Buffer.from(await artifact.arrayBuffer()), format, target);
    }
    expect(urls[0]).not.toBe(urls[1]);
  }, DEFAULT_RENDER_TIMEOUT_MS * targets.length);

  it('keeps debug HTML suffixed with the selected size', async () => {
    const outputDir = join(workspace, 'debug');
    await renderSizes({ sizes: ['google-ads-300x250'], options: { ...base, outputDir, debug: true }, render: generatePDF });
    expect(await readdir(outputDir)).toContain('campaign-google-ads-300x250.html');
    expect(await readFile(join(outputDir, 'campaign-google-ads-300x250.html'), 'utf8')).toContain('data-page-size="google-ads-300x250"');
  });

  it.each(targets)('sets the $size viewport before live diagrams mount', async (target) => {
    const { html } = await renderTemplateHTML({ options: {
      ...base, template: join(project, 'ResponsiveCanvas.tsx'),
      pageSizeOverride: target.size, live: true,
    } });
    expect(html).toContain(`data-mounted-width="${target.width}"`);
    expect(html).toContain(`data-page-size="${target.size}"`);
    expect(html).toContain('data-facet-ready="true"');
    expect(html).toContain('<svg');
  }, DEFAULT_RENDER_TIMEOUT_MS);
});
