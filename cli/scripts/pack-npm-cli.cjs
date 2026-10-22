#!/usr/bin/env node
// Assemble the publishable @flanksource/facet-cli npm package: the single-file
// CLI bundle (run by the user's Node) plus the runtime assets it reads at render
// time (the @flanksource/facet manifest, styles.css, openapi.yaml, and Mermaid).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { copyRuntimeAssets } = require('./copy-runtime-assets.cjs');

function buildPackage({ version, bundlePath, repoRoot, templateDir, outDir }) {
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  fs.copyFileSync(bundlePath, path.join(outDir, 'facet.cjs'));
  fs.chmodSync(path.join(outDir, 'facet.cjs'), 0o755);

  copyRuntimeAssets({ repoRoot, outDir: path.join(outDir, 'assets') });

  fs.copyFileSync(path.join(templateDir, 'README.md'), path.join(outDir, 'README.md'));
  const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, 'package.json'), 'utf8'));
  pkg.version = version;
  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  return outDir;
}

function main(argv) {
  const version = argv[0] || process.env.FACET_VERSION;
  if (!version) {
    console.error('usage: pack-npm-cli.cjs <version> [outDir]');
    process.exit(1);
  }
  const cliRoot = path.join(__dirname, '..');
  const repoRoot = path.join(cliRoot, '..');
  const outDir = argv[1] || path.join(cliRoot, 'npm-dist');
  buildPackage({
    version,
    bundlePath: path.join(cliRoot, 'dist-sea', 'cli.cjs'),
    repoRoot,
    templateDir: path.join(cliRoot, 'npm', 'facet-cli'),
    outDir,
  });
  console.log(`packed ${outDir}`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { buildPackage };
