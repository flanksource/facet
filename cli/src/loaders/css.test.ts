import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPostProcessCss } from './css.js';

describe('Tailwind v3 rendered content', () => {
  it('generates each render’s spacing utilities independently and preserves the consumer theme', async () => {
    const scratch = resolve('.tmp');
    await mkdir(scratch, { recursive: true });
    const facetRoot = await mkdtemp(join(scratch, 'css-rendered-'));
    try {
      await symlink(fileURLToPath(new URL('../../../node_modules', import.meta.url)), join(facetRoot, 'node_modules'), 'junction');
      await writeFile(join(facetRoot, 'package.json'), '{"type":"module"}');
      await writeFile(join(facetRoot, 'tailwind.postprocess.config.js'), 'export default { content: [], theme: { extend: { colors: { brand: "#123456" } } } };');
      await writeFile(join(facetRoot, 'postcss.config.js'), 'import tailwindcss from "tailwindcss"; import { fileURLToPath } from "node:url"; export default { plugins: [tailwindcss(fileURLToPath(new URL("./tailwind.postprocess.config.js", import.meta.url)))] };');
      await writeFile(join(facetRoot, 'post-process.css'), '@tailwind utilities;');
      await writeFile(join(facetRoot, 'post-process.entry.ts'), 'import "./post-process.css";');
      const original = await readFile(join(facetRoot, 'tailwind.postprocess.config.js'), 'utf8');
      const [padding, gap] = await Promise.all([
        buildPostProcessCss(facetRoot, { content: '<div class="px-[12mm] bg-brand"></div>' }),
        buildPostProcessCss(facetRoot, { content: '<div class="gap-[5mm]"></div>' }),
      ]);
      expect(padding).toContain('padding-left:12mm');
      expect(padding).toContain('padding-right:12mm');
      expect(padding).toContain('18 52 86');
      expect(padding).not.toContain('gap:5mm');
      expect(gap).toContain('gap:5mm');
      expect(gap).not.toContain('padding-left:12mm');
      expect(await readFile(join(facetRoot, 'tailwind.postprocess.config.js'), 'utf8')).toBe(original);
    } finally {
      await rm(facetRoot, { recursive: true, force: true });
    }
  });
});
