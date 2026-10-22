'use strict';

const fs = require('node:fs');
const path = require('node:path');

function copyRuntimeAssets({ repoRoot, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const sources = {
    'package.json': 'package.json',
    'styles.css': 'dist/styles.css',
    'page-sizes.json': 'src/types/page-sizes.json',
    'openapi.yaml': 'openapi.yaml',
    'mermaid.min.js': 'node_modules/mermaid/dist/mermaid.min.js',
    'facet-font-scale.mjs': 'postcss/facet-font-scale.mjs',
    'facet-redact.mjs': 'remark/facet-redact.mjs',
  };
  for (const [name, source] of Object.entries(sources)) {
    fs.copyFileSync(path.join(repoRoot, source), path.join(outDir, name));
  }
}

if (require.main === module) {
  if (!process.argv[2]) throw new Error('usage: copy-runtime-assets.cjs <output-directory>');
  copyRuntimeAssets({ repoRoot: path.join(__dirname, '../..'), outDir: path.resolve(process.argv[2]) });
}

module.exports = { copyRuntimeAssets };
