import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveTailwindMajor } from '../utils/tailwind.js';

function parseArgs(): { facetRoot: string; outputFile: string; contentFile?: string } {
  let facetRoot = '';
  let outputFile = '';
  let contentFile: string | undefined;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--facet-root=')) facetRoot = arg.slice('--facet-root='.length);
    if (arg.startsWith('--output-file=')) outputFile = arg.slice('--output-file='.length);
    if (arg.startsWith('--content-file=')) contentFile = arg.slice('--content-file='.length);
  }
  if (!facetRoot) throw new Error('Missing required argument: --facet-root');
  if (!outputFile) throw new Error('Missing required argument: --output-file');
  return { facetRoot, outputFile, contentFile };
}

/**
 * Run the post-process CSS build with Vite resolved from .facet/. Every scratch
 * artifact (rendered-content file, v4 entry, outDir) is unique per build so
 * concurrent builds inside one .facet/ never collide. Returns the built CSS.
 */
export async function buildPostProcessCss(
  facetRoot: string,
  options: { content?: string } = {},
): Promise<string> {
  const facetRequire = createRequire(join(facetRoot, 'package.json'));
  const viteModule = await import(pathToFileURL(facetRequire.resolve('vite')).href);
  const build = (viteModule.build ?? viteModule.default?.build) as typeof import('vite').build;
  const tailwindMajor = resolveTailwindMajor(facetRoot);

  const plugins = [];
  const uid = randomUUID();
  const outDir = join(facetRoot, `post-process-dist-${uid}`);
  const scratch: string[] = [];
  let entry = join(facetRoot, 'post-process.entry.ts');
  if (tailwindMajor === 4) {
    let pluginPath: string;
    try {
      pluginPath = facetRequire.resolve('@tailwindcss/vite');
    } catch {
      throw new Error('Tailwind CSS v4 requires @tailwindcss/vite in the consumer project or Facet build dependencies');
    }
    const tailwindModule = await import(pathToFileURL(pluginPath).href);
    plugins.push(tailwindModule.default());
    // Point the generated v4 sheet at this build's own rendered-content file so
    // concurrent builds with different class sets don't overwrite each other.
    const contentName = `rendered-content-${uid}.html`;
    const cssName = `post-process-v4-${uid}.css`;
    writeFileSync(join(facetRoot, contentName), options.content ?? '<div></div>', 'utf-8');
    writeFileSync(
      join(facetRoot, cssName),
      readFileSync(join(facetRoot, 'post-process-v4.css'), 'utf-8')
        .replace('@source "./rendered-content.html";', `@source "./${contentName}";`),
      'utf-8',
    );
    entry = join(facetRoot, `post-process-v4-${uid}.entry.ts`);
    writeFileSync(entry, `import './${cssName}';\n`, 'utf-8');
    scratch.push(join(facetRoot, contentName), join(facetRoot, cssName), entry);
  }

  try {
    await build({
      configFile: false,
      root: facetRoot,
      logLevel: 'error',
      plugins,
      css: { postcss: facetRoot },
      build: {
        outDir,
        emptyOutDir: true,
        cssCodeSplit: false,
        lib: {
          entry,
          formats: ['es'],
          fileName: 'post-process',
        },
      },
    });
    const cssFile = readdirSync(outDir).find((file) => file.endsWith('.css'));
    if (!cssFile || !existsSync(join(outDir, cssFile))) {
      throw new Error('Vite CSS post-processing produced no stylesheet');
    }
    return readFileSync(join(outDir, cssFile), 'utf-8');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
    for (const file of scratch) rmSync(file, { force: true });
  }
}

export async function runCssLoader(): Promise<void> {
  const { facetRoot, outputFile, contentFile } = parseArgs();
  const content = contentFile ? readFileSync(contentFile, 'utf-8') : undefined;
  const css = await buildPostProcessCss(facetRoot, { content });
  writeFileSync(outputFile, css);
}
