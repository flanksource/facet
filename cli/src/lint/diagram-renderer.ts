import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateHTML } from '../generators/html.js';
import { launchBrowser } from '../utils/pdf-generator.js';
import { generatePNGBuffer } from '../utils/png-generator.js';

export interface DiagramRenderer { render(file: string, cwd: string, outputDir: string): Promise<string>; }
export const defaultDiagramRenderer: DiagramRenderer = {
  async render(file, _cwd, outputDir) {
    const outputName = `facet-lint-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await generateHTML({ template: file, outputDir, outputName, outputNameField: '', validate: false, verbose: false, live: true });
    const html = await readFile(join(outputDir, `${outputName}.html`), 'utf8');
    const browser = await launchBrowser();
    try {
      const png = await generatePNGBuffer(browser, html, { selector: 'body' });
      const path = join(outputDir, `${outputName}.png`);
      await writeFile(path, png);
      return path;
    } finally { await browser.close(); }
  },
};
export async function createDiagramTempDir(): Promise<string> { return mkdtemp(join(tmpdir(), 'facet-lint-diagrams-')); }
