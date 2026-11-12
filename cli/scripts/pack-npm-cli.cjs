#!/usr/bin/env node
// Assemble the publishable @flanksource/facet-cli npm package: the single-file
// CLI bundle (run by the user's Node) plus the runtime assets it reads at render
// time (the @flanksource/facet manifest, styles.css, openapi.yaml, and Mermaid).
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { copyRuntimeAssets } = require('./copy-runtime-assets.cjs');
const { runtimePackages } = require('./runtime-packages.cjs');

function buildPackage({ version, bundlePath, repoRoot, templateDir, outDir, portable = false }) {
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  fs.copyFileSync(bundlePath, path.join(outDir, 'facet.cjs'));
  fs.chmodSync(path.join(outDir, 'facet.cjs'), 0o755);

  // Runtime assets resolved by assetPath() at render time.
  copyRuntimeAssets({ repoRoot, outDir: path.join(outDir, 'assets') });
  fs.copyFileSync(path.join(__dirname, '..', 'assets', 'review-diagram.prompt'), path.join(outDir, 'assets', 'review-diagram.prompt'));

  fs.copyFileSync(path.join(templateDir, 'README.md'), path.join(outDir, 'README.md'));
  const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, 'package.json'), 'utf8'));
  pkg.version = version;
  if (portable) {
    pkg.optionalDependencies = runtimePackages(version);
  } else {
    const { report, platform, arch } = process;
    const libc = platform === 'linux' ? (report.getReport().header.glibcVersionRuntime ? 'glibc' : 'musl') : undefined;
    const target = [platform, arch, libc].filter(Boolean).join('-');
    const runtime = path.join(repoRoot, 'cli/assets/runtimes', target);
    const metadata = JSON.parse(fs.readFileSync(path.join(runtime, 'default-runtime.json'), 'utf8'));
    if (metadata.facetVersion !== version) throw new Error(`Runtime ${metadata.facetVersion} does not match CLI ${version}`);
    for (const name of ['default-runtime.json', 'default-runtime.tgz']) fs.copyFileSync(path.join(runtime, name), path.join(outDir, 'assets', name));
    pkg.os = [platform];
    pkg.cpu = [arch];
    if (libc) pkg.libc = [libc];
  }
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
    portable: argv.includes('--portable'),
  });
  console.log(`packed ${outDir}`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { buildPackage };
