#!/usr/bin/env node
// Build the Node SEA single-file binary from the bundled CLI: write the SEA
// config (embedding the runtime assets), generate the blob, copy the node
// binary, and inject the blob with postject.
'use strict';

const { execFileSync } = require('node:child_process');
const { writeFileSync, copyFileSync, mkdirSync, chmodSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const cliRoot = join(__dirname, '..');
const repoRoot = join(cliRoot, '..');
const distSea = join(cliRoot, 'dist-sea');
const bundle = join(distSea, 'cli.cjs');
const blob = join(distSea, 'sea-prep.blob');
const ext = process.platform === 'win32' ? '.exe' : '';
const outBinary = join(repoRoot, 'dist', `facet${ext}`);

const seaConfig = {
  main: bundle,
  output: blob,
  disableExperimentalSEAWarning: true,
  assets: {
    'package.json': join(repoRoot, 'package.json'),
    'styles.css': join(repoRoot, 'src', 'styles.css'),
    'openapi.yaml': join(repoRoot, 'openapi.yaml'),
  },
};
const seaConfigPath = join(distSea, 'sea-config.json');
if (!existsSync(bundle)) {
  throw new Error(`Missing CLI bundle at ${bundle}. Run build:bundle before build:sea.`);
}
writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));

console.log('Generating SEA blob...');
execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });

mkdirSync(join(repoRoot, 'dist'), { recursive: true });
copyFileSync(process.execPath, outBinary);

console.log('Injecting blob with postject...');
const postject = require.resolve('postject/dist/cli.js');
const fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const args = [postject, outBinary, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', fuse];
if (process.platform === 'darwin') args.push('--macho-segment-name', 'NODE_SEA');
execFileSync(process.execPath, args, { stdio: 'inherit' });

// macOS invalidates the code signature on injection; re-sign ad-hoc so the
// binary will run (Gatekeeper still requires the user to clear quarantine).
if (process.platform === 'darwin') {
  try {
    execFileSync('codesign', ['--sign', '-', outBinary], { stdio: 'inherit' });
  } catch (err) {
    console.warn(`codesign failed; binary may not run on macOS: ${err.message}`);
  }
}

chmodSync(outBinary, 0o755);
console.log(`SEA binary: ${outBinary}`);
