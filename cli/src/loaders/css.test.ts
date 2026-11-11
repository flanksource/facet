import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPostProcessCss } from './css.js';

const testRequire = createRequire(import.meta.url);

// Each fixture owns its node_modules so the Tailwind major under test is fixed,
// not whatever the repository root happens to install.
async function facetRootWith(dependencies: Record<string, string>): Promise<string> {
  const scratch = resolve('.tmp');
  await mkdir(scratch, { recursive: true });
  const facetRoot = await mkdtemp(join(scratch, 'css-rendered-'));
  for (const [name, target] of Object.entries(dependencies)) {
    const link = join(facetRoot, 'node_modules', ...name.split('/'));
    await mkdir(dirname(link), { recursive: true });
    await symlink(await realpath(target), link, 'junction');
  }
  await writeFile(join(facetRoot, 'package.json'), '{"type":"module"}');
  return facetRoot;
}

const packageDir = (name: string, from = testRequire) => dirname(from.resolve(`${name}/package.json`));

describe('rendered content post-processing', () => {
  it('rejects a non-v4 tailwindcss before building, naming the found version', async () => {
    await mkdir(resolve('.tmp'), { recursive: true });
    const fakeTailwind = await mkdtemp(join(resolve('.tmp'), 'css-fake-tailwind-'));
    await writeFile(join(fakeTailwind, 'package.json'), '{"name":"tailwindcss","version":"3.4.19"}');
    const facetRoot = await facetRootWith({ vite: packageDir('vite'), tailwindcss: fakeTailwind });
    try {
      await expect(buildPostProcessCss(facetRoot, { content: '<div class="px-4"></div>' }))
        .rejects.toThrow(/tailwindcss 3\.4\.19.*requires Tailwind CSS v4.*@tailwindcss\/vite/);
    } finally {
      await rm(facetRoot, { recursive: true, force: true });
      await rm(fakeTailwind, { recursive: true, force: true });
    }
  });

  it('Tailwind v4 generates each render’s spacing utilities independently and preserves the consumer theme', async () => {
    // @tailwindcss/vite exports no ./package.json; locate it from its entry.
    const vitePluginEntry = testRequire.resolve('@tailwindcss/vite');
    const facetRoot = await facetRootWith({
      vite: packageDir('vite'),
      '@tailwindcss/vite': resolve(dirname(vitePluginEntry), '..'),
      tailwindcss: packageDir('tailwindcss', createRequire(vitePluginEntry)),
    });
    try {
      const sheet = [
        '@import "tailwindcss/theme.css" layer(theme);',
        '@import "tailwindcss/utilities.css" layer(utilities) source(none);',
        '@theme { --color-brand: #123456; }',
        '@source "./rendered-content.html";',
      ].join('\n');
      await writeFile(join(facetRoot, 'post-process-v4.css'), sheet);
      const [padding, gap] = await Promise.all([
        buildPostProcessCss(facetRoot, { content: '<div class="px-[12mm] bg-brand"></div>' }),
        buildPostProcessCss(facetRoot, { content: '<div class="gap-[5mm]"></div>' }),
      ]);
      expect(padding).toContain('padding-inline:12mm');
      expect(padding).toContain('--color-brand:#123456');
      expect(padding).not.toContain('gap:5mm');
      expect(gap).toContain('gap:5mm');
      expect(gap).not.toContain('padding-inline:12mm');
      expect(await readFile(join(facetRoot, 'post-process-v4.css'), 'utf8')).toBe(sheet);
    } finally {
      await rm(facetRoot, { recursive: true, force: true });
    }
  });
});
