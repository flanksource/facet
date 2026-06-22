#!/usr/bin/env node
// Launcher for the facet CLI. Resolves the platform-specific, Bun-compiled
// `facet` binary (shipped as an optional dependency) and executes it. The
// launcher is plain Node so it can serve as an npm `bin`; the binary it runs
// embeds the Bun runtime, so end users need neither Bun nor Node compatibility.
'use strict';

const { execFileSync } = require('node:child_process');

const PLATFORM_PACKAGES = {
  'linux-x64': '@flanksource/facet-cli-linux-x64',
  'linux-arm64': '@flanksource/facet-cli-linux-arm64',
  'darwin-arm64': '@flanksource/facet-cli-darwin-arm64',
  'win32-x64': '@flanksource/facet-cli-win32-x64',
};

const RELEASES = 'https://github.com/flanksource/facet/releases';

const key = `${process.platform}-${process.arch}`;
const pkg = PLATFORM_PACKAGES[key];
if (!pkg) {
  console.error(`facet: no prebuilt binary for ${key}.\nDownload a standalone binary from ${RELEASES}`);
  process.exit(1);
}

const binName = process.platform === 'win32' ? 'facet.exe' : 'facet';
let binPath;
try {
  binPath = require.resolve(`${pkg}/${binName}`);
} catch {
  console.error(
    `facet: the ${key} binary package (${pkg}) is not installed.\n` +
    `Reinstall @flanksource/facet-cli, or download a standalone binary from ${RELEASES}`,
  );
  process.exit(1);
}

try {
  execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' });
} catch (err) {
  // execFileSync throws on non-zero exit or signal; forward the child's status.
  if (typeof err.status === 'number') process.exit(err.status);
  if (err.signal) process.exit(1);
  console.error(`facet: failed to launch binary: ${err.message}`);
  process.exit(1);
}
