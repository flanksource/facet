#!/usr/bin/env node
/**
 * Copy runtime assets into cli/dist/assets/ so the published package is
 * self-contained. src/utils/assets.ts resolves them from there at runtime
 * (replacing Bun's `import ... with { type: 'file' }`).
 */
const { copyFileSync, mkdirSync } = require('node:fs');
const { join, dirname } = require('node:path');

const cliRoot = join(__dirname, '..');
const repoRoot = join(cliRoot, '..');
const distAssets = join(cliRoot, 'dist', 'assets');

mkdirSync(distAssets, { recursive: true });

const assets = [
  [join(repoRoot, 'package.json'), join(distAssets, 'package.json')],
  [join(repoRoot, 'openapi.yaml'), join(distAssets, 'openapi.yaml')],
  [join(repoRoot, 'src', 'styles.css'), join(distAssets, 'styles.css')],
  [join(cliRoot, 'vite-ssr-loader.ts'), join(distAssets, 'vite-ssr-loader.ts')],
  [join(cliRoot, 'vite-dev-loader.ts'), join(distAssets, 'vite-dev-loader.ts')],
];

for (const [src, dest] of assets) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`copied ${src} -> ${dest}`);
}
