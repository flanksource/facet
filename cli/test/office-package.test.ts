import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import JSZip from 'jszip';
import { officeText } from './office-xml.js';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');

describe('installed Office library exports', () => {
  it('generates native Office files from the packed package without workspace dependencies', async () => {
    await mkdir(join(root, '.tmp'), { recursive: true });
    const scratch = await mkdtemp(join(root, '.tmp/office-package-'));
    try {
      const tarball = join(scratch, 'facet.tgz');
      await run('pnpm', ['pack', '--out', tarball], { cwd: root, maxBuffer: 5 * 1024 * 1024 });
      const consumer = join(scratch, 'consumer');
      await mkdir(consumer);
      await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'office-consumer', private: true, type: 'module', dependencies: { '@flanksource/facet': `file:${tarball}` } }));
      await cp(join(import.meta.dirname, 'fixtures/office-consumer.mjs'), join(consumer, 'render.mjs'));
      await writeFile(join(consumer, 'report.md'), '# Installed Office report\n\nEditable **native** content.\n');
      await run('pnpm', ['install', '--ignore-scripts', '--prod'], { cwd: consumer, maxBuffer: 5 * 1024 * 1024 });
      const output = join(consumer, 'output');
      await run(process.execPath, ['render.mjs', 'report.md', output], {
        cwd: consumer, env: { ...process.env, FACET_PACKAGE_PATH: tarball, FACET_LOW_PRIORITY: '0' }, maxBuffer: 5 * 1024 * 1024,
      });
      for (const format of ['docx', 'pptx'] as const) {
        const zip = await JSZip.loadAsync(await readFile(join(output, `consumer.${format}`)));
        const xml = await zip.file(format === 'docx' ? 'word/document.xml' : 'ppt/slides/slide1.xml')!.async('string');
        expect(officeText(xml)).toContain('Installed Office report');
      }
    } finally { await rm(scratch, { recursive: true, force: true }); }
  }, 240000);
});
