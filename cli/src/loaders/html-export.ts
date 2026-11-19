import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { build as buildVite } from 'vite';

export async function runHtmlExportLoader(): Promise<void> {
  const root = process.cwd();
  const require = createRequire(join(root, 'package.json'));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const build: typeof buildVite = vite.build ?? vite.default?.build;
  const result = await build({
    root,
    configFile: join(root, 'vite.client.config.ts'),
    configLoader: 'runner',
    logLevel: 'error',
    build: {
      lib: { entry: join(root, 'entry.client.tsx'), name: 'FacetDocument', formats: ['iife'] },
      write: false,
      cssCodeSplit: false,
      rolldownOptions: { output: { codeSplitting: false } },
    },
  });
  const built = Array.isArray(result) && result.length === 1 ? result[0] : result;
  if (!built || !('output' in built)) throw new Error('Expected a single browser document build');
  const chunks = built.output.filter(output => output.type === 'chunk');
  const requirements = chunks.flatMap(chunk => [...chunk.imports, ...chunk.dynamicImports]
    .filter(file => file !== chunk.fileName || chunk.code.includes(file)));
  if (chunks.length !== 1 || !chunks[0]?.isEntry || requirements.length) {
    throw new Error(`Expected one standalone browser script, got ${chunks.length} script(s)${requirements.length ? ` requiring ${[...new Set(requirements)].join(', ')}` : ''}`);
  }
  const assets = built.output.filter(output => output.type === 'asset');
  const styles = assets.filter(output => output.fileName.endsWith('.css'));
  const unsupported = assets.filter(output => !output.fileName.endsWith('.css'));
  if (unsupported.length) throw new Error(`Live HTML template emitted unsupported files: ${unsupported.map(output => output.fileName).join(', ')}`);
  await Promise.all([
    writeFile(join(root, 'document-program.js'), chunks[0].code),
    writeFile(join(root, 'document-styles.css'), styles.map(asset => typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8')).join('\n')),
  ]);
}
