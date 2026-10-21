import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import JSZip from 'jszip';
import { createServer, type ServerHandle } from '../src/server/preview.js';
import { generateDOCX, generatePPTX } from '../src/generators/office.js';
import { renderWithServer } from '../src/utils/server-render.js';
import { renderFormatMetadata } from '../src/server/render-format.js';
import { officeText } from './office-xml.js';

const root = resolve(import.meta.dirname, '../..');
const examples = join(root, 'examples/office');
const originalPackagePath = process.env['FACET_PACKAGE_PATH'];
const originalPriority = process.env['FACET_LOW_PRIORITY'];

async function assertArtifact(bytes: Buffer, format: 'docx' | 'pptx', marker: string): Promise<void> {
  const zip = await JSZip.loadAsync(bytes);
  const content = Object.values(zip.files).filter((file) => format === 'docx' ? file.name === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(file.name));
  expect(content.length).toBeGreaterThan(0);
  const text = (await Promise.all(content.map((file) => file.async('string')))).map(officeText).join('\n');
  expect(text).toContain(marker);
}

describe('Office CLI/library and render API', { timeout: 180000 }, () => {
  let scratch: string;
  let project: string;
  let server: ServerHandle;
  beforeAll(async () => {
    process.env['FACET_PACKAGE_PATH'] = root;
    process.env['FACET_LOW_PRIORITY'] = '0';
    await mkdir(join(root, '.tmp'), { recursive: true });
    scratch = await mkdtemp(join(root, '.tmp/office-test-'));
    project = join(scratch, 'project');
    await mkdir(project);
    for (const file of ['Report.tsx', 'data.json']) await cp(join(examples, file), join(project, file));
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'office-fixture', private: true, type: 'module' }));
    await writeFile(join(project, '.gitignore'), '.facet/\n');
    server = await createServer({ port: 0, templatesDir: project, workers: 1, renderTimeout: 180000,
      maxUploadSize: 52428800, cacheMaxSize: 104857600, cacheDir: join(scratch, 'cache'), verbose: false });
  }, 30000);
  afterAll(async () => {
    await server?.stop();
    if (scratch) await rm(scratch, { recursive: true, force: true });
    if (originalPackagePath === undefined) delete process.env['FACET_PACKAGE_PATH'];
    else process.env['FACET_PACKAGE_PATH'] = originalPackagePath;
    if (originalPriority === undefined) delete process.env['FACET_LOW_PRIORITY'];
    else process.env['FACET_LOW_PRIORITY'] = originalPriority;
  });

  it.each(['docx', 'pptx'] as const)('renders local TSX to editable %s with data-based output naming', async (format) => {
    const outputDir = join(scratch, `local-${format}`);
    await (format === 'docx' ? generateDOCX : generatePPTX)({ template: join(project, 'Report.tsx'), data: join(project, 'data.json'),
      outputDir, outputNameField: 'name', validate: true, verbose: false });
    await assertArtifact(await readFile(join(outputDir, `quarterly-review.${format}`)), format, 'Quarterly review');
  });

  it.each(['docx', 'pptx'] as const)('renders Markdown to %s through the regular API and cache', async (format) => {
    const request = { code: '# API Office report\n\nEditable **content**.\n\n| Name | Value |\n| --- | --- |\n| North | 120 |', ext: 'md', format };
    const submit = () => fetch(`${server.url}/render`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
    const response = await submit();
    expect(response.status, await response.clone().text()).toBe(200);
    const result = await response.json() as { url: string };
    const file = await fetch(`${server.url}${result.url}`);
    expect(file.headers.get('content-type')).toBe(renderFormatMetadata(format).contentType);
    expect(file.headers.get('content-disposition')).toContain(`.${format}`);
    await assertArtifact(Buffer.from(await file.arrayBuffer()), format, 'API Office report');
    const cached = await submit();
    expect(await cached.json()).toEqual(result);
    const cachedFile = await fetch(`${server.url}${result.url}`);
    expect(cachedFile.headers.get('server-timing')).toBe('cache;desc="hit"');
  });

  it.each(['docx', 'pptx'] as const)('streams MDX %s progress and an Office download URL', async (format) => {
    const response = await fetch(`${server.url}/render/stream`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: '# {props.title}\n\nMDX **editable** text.', ext: 'mdx', format, data: { title: 'Stream Office report' } }) });
    expect(response.status).toBe(200);
    const stream = await response.text();
    expect(stream).not.toContain('event: error');
    expect(stream).toContain(`rendering-${format}`);
    const result = stream.split('\n\n').find((frame) => frame.startsWith('event: result'));
    expect(result).toBeDefined();
    const data = JSON.parse(result!.split('\n').find((line) => line.startsWith('data: '))!.slice(6)) as { url: string; contentType: string };
    expect(data.contentType).toBe(renderFormatMetadata(format).contentType);
    const file = await fetch(`${server.url}${data.url}`);
    await assertArtifact(Buffer.from(await file.arrayBuffer()), format, 'Stream Office report');
  });

  it.each(['docx', 'pptx'] as const)('renders uploaded projects to %s through the remote CLI path', async (format) => {
    const outputDir = join(scratch, `remote-${format}`);
    await renderWithServer({ facetURL: server.url, format, options: { template: join(project, 'Report.tsx'), data: join(project, 'data.json'),
      outputDir, outputName: 'remote-office', outputNameField: 'name', validate: true, verbose: false } });
    await assertArtifact(await readFile(join(outputDir, `remote-office.${format}`)), format, 'Quarterly review');
  });
});
