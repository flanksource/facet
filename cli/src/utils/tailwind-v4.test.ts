import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FacetDirectory } from '../builders/facet-directory.js';
import { Logger } from './logger.js';
import { runTailwindCached } from './tailwind.js';

const testRequire = createRequire(import.meta.url);

function linkDependency(facetRoot: string, name: string, target: string): void {
  const link = join(facetRoot, 'node_modules', ...name.split('/'));
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(target, link, 'junction');
}

describe('Tailwind v4 CSS post-processing', () => {
  it('generates source and rendered-only utilities without Preflight', async () => {
    const scratchRoot = resolve('.tmp');
    mkdirSync(scratchRoot, { recursive: true });
    const facetRoot = mkdtempSync(join(scratchRoot, 'tailwind-v4-test-'));
    try {
      const vitePluginEntry = testRequire.resolve('@tailwindcss/vite');
      const vitePluginRequire = createRequire(vitePluginEntry);
      linkDependency(facetRoot, 'vite', dirname(testRequire.resolve('vite/package.json')));
      linkDependency(facetRoot, '@tailwindcss/vite', resolve(dirname(vitePluginEntry), '..'));
      linkDependency(facetRoot, 'tailwindcss', dirname(vitePluginRequire.resolve('tailwindcss/package.json')));

      writeFileSync(join(facetRoot, 'package.json'), JSON.stringify({ type: 'module' }));
      writeFileSync(join(facetRoot, 'facet.css'), '');
      mkdirSync(join(facetRoot, 'src/source'), { recursive: true });
      writeFileSync(join(facetRoot, 'src/source/template.tsx'), '<div className="text-white" />');
      mkdirSync(join(facetRoot, 'src/.tmp'), { recursive: true });
      writeFileSync(join(facetRoot, 'src/.tmp/ignored.tsx'), '<div className="bg-red-500" />');
      writeFileSync(join(facetRoot, 'post-process-v4.css'), [
        "@import './facet.css';",
        '@import "tailwindcss/theme.css" layer(theme);',
        '@import "tailwindcss/utilities.css" layer(utilities) source(none);',
        '@source "./src/source";',
        '@source "./rendered-content.html";',
      ].join('\n'));
      writeFileSync(join(facetRoot, 'post-process-v4.entry.ts'), "import './post-process-v4.css';\n");

      const sourceCSS = await runTailwindCached({
        facetRoot,
        html: '',
        buildCacheKey: 'tailwind-v4-source',
      });
      const renderedCSS = await runTailwindCached({
        facetRoot,
        html: '<div class="bg-[#1e293b]"></div>',
        buildCacheKey: 'tailwind-v4-rendered',
      });

      expect(sourceCSS).toContain('.text-white{color:var(--color-white)}');
      expect(sourceCSS).not.toContain('background-color:#1e293b');
      expect(sourceCSS).not.toContain('.bg-red-500');
      expect(renderedCSS).toContain('background-color:#1e293b');
      expect(renderedCSS).not.toContain('box-sizing:border-box');
    } finally {
      rmSync(facetRoot, { recursive: true, force: true });
    }
  });

  it('compiles the generated post-process entry through the facet preset extending clicky-ui', async () => {
    const scratchRoot = resolve('.tmp');
    mkdirSync(scratchRoot, { recursive: true });
    const consumerRoot = mkdtempSync(join(scratchRoot, 'tailwind-v4-generated-'));
    try {
      const facetPackageRoot = resolve(import.meta.dirname, '../../..');
      const facetPackageRequire = createRequire(join(facetPackageRoot, 'package.json'));
      const clickyPresetEntry = facetPackageRequire.resolve('@flanksource/clicky-ui/tailwind-preset');
      writeFileSync(join(consumerRoot, 'template.tsx'), 'export default function Template() { return null; }\n');

      const facetDir = new FacetDirectory({ consumerRoot, templateFile: 'template.tsx', logger: new Logger(false) });
      facetDir.create();
      const facetRoot = join(consumerRoot, '.facet');
      const vitePluginEntry = testRequire.resolve('@tailwindcss/vite');
      const vitePluginRequire = createRequire(vitePluginEntry);
      linkDependency(facetRoot, 'vite', dirname(testRequire.resolve('vite/package.json')));
      linkDependency(facetRoot, '@tailwindcss/vite', resolve(dirname(vitePluginEntry), '..'));
      linkDependency(facetRoot, 'tailwindcss', dirname(vitePluginRequire.resolve('tailwindcss/package.json')));
      linkDependency(facetRoot, '@flanksource/facet', facetPackageRoot);
      linkDependency(facetRoot, '@flanksource/clicky-ui', resolve(dirname(clickyPresetEntry), '..'));
      writeFileSync(join(facetRoot, 'package.json'), JSON.stringify({ type: 'module' }));
      facetDir.copyStylesCss();

      const css = await runTailwindCached({
        facetRoot,
        html: '<div class="font-sans bg-primary text-flanksource-blue max-w-a4 rounded-md"></div>',
        buildCacheKey: 'tailwind-v4-generated-entry',
      });

      expect(css).toMatch(/\.font-sans\s*\{\s*font-family:\s*var\(--facet-font-sans\)/);
      expect(css).toMatch(/\.bg-primary\s*\{\s*background-color:\s*var\(--primary\)/);
      expect(css).toMatch(/\.text-flanksource-blue\s*\{\s*color:\s*var\(--facet-brand-blue\)/);
      expect(css).toMatch(/\.max-w-a4\s*\{\s*max-width:\s*var\(--facet-page-a4\)/);
      expect(css).toMatch(/\.rounded-md\s*\{\s*border-radius:\s*var\(--facet-radius-md\)/);
    } finally {
      rmSync(consumerRoot, { recursive: true, force: true });
    }
  });
});
