#!/usr/bin/env node
// Assembles the publishable @flanksource/facet-cli npm packages from the
// Bun-compiled release binaries: one platform package per target (carrying the
// binary, gated by os/cpu) plus the launcher package with all versions pinned.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCOPE = '@flanksource';

// Single source of truth for supported targets. `artifact` matches the binary
// base name produced by the release matrix; `key` is `${platform}-${arch}` as
// reported by Node at runtime, and forms the platform package name suffix.
const TARGETS = [
  { artifact: 'facet-linux-x64', key: 'linux-x64', os: 'linux', cpu: 'x64', exe: false },
  { artifact: 'facet-linux-arm64', key: 'linux-arm64', os: 'linux', cpu: 'arm64', exe: false },
  { artifact: 'facet-macos-arm64', key: 'darwin-arm64', os: 'darwin', cpu: 'arm64', exe: false },
  { artifact: 'facet-windows-x64', key: 'win32-x64', os: 'win32', cpu: 'x64', exe: true },
];

function platformPackageName(target) {
  return `${SCOPE}/facet-cli-${target.key}`;
}

function binFileName(target) {
  return target.exe ? 'facet.exe' : 'facet';
}

function platformPackageJson(target, version) {
  return {
    name: platformPackageName(target),
    version,
    description: `facet CLI binary for ${target.os}/${target.cpu}`,
    os: [target.os],
    cpu: [target.cpu],
    files: [binFileName(target)],
    license: 'Apache-2.0',
    repository: { type: 'git', url: 'https://github.com/flanksource/facet.git' },
  };
}

// Pin the launcher's own version and every optionalDependency to `version`.
function pinVersions(launcherPkg, version) {
  const out = { ...launcherPkg, version };
  if (out.optionalDependencies) {
    out.optionalDependencies = Object.fromEntries(
      Object.keys(out.optionalDependencies).map((name) => [name, version]),
    );
  }
  return out;
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

function buildPackages({ version, binariesDir, outDir, launcherDir }) {
  const created = [];

  for (const target of TARGETS) {
    const pkgDir = path.join(outDir, `facet-cli-${target.key}`);
    fs.mkdirSync(pkgDir, { recursive: true });

    const sourceName = target.exe ? `${target.artifact}.exe` : target.artifact;
    const srcBinary = path.join(binariesDir, target.artifact, sourceName);
    const destBinary = path.join(pkgDir, binFileName(target));
    fs.copyFileSync(srcBinary, destBinary);
    if (!target.exe) fs.chmodSync(destBinary, 0o755);

    writeJson(path.join(pkgDir, 'package.json'), platformPackageJson(target, version));
    created.push(pkgDir);
  }

  const launcherOut = path.join(outDir, 'facet-cli');
  fs.mkdirSync(path.join(launcherOut, 'bin'), { recursive: true });
  fs.copyFileSync(path.join(launcherDir, 'bin', 'facet.js'), path.join(launcherOut, 'bin', 'facet.js'));
  const readme = path.join(launcherDir, 'README.md');
  if (fs.existsSync(readme)) fs.copyFileSync(readme, path.join(launcherOut, 'README.md'));

  const launcherPkg = JSON.parse(fs.readFileSync(path.join(launcherDir, 'package.json'), 'utf8'));
  writeJson(path.join(launcherOut, 'package.json'), pinVersions(launcherPkg, version));
  created.push(launcherOut);

  return created;
}

function main(argv) {
  const version = argv[0] || process.env.FACET_VERSION;
  const binariesDir = argv[1] || 'binaries';
  const outDir = argv[2] || 'npm-dist';
  if (!version) {
    console.error('usage: pack-npm-cli.cjs <version> [binariesDir] [outDir]');
    process.exit(1);
  }
  const launcherDir = path.join(__dirname, '..', 'npm', 'facet-cli');
  const created = buildPackages({ version, binariesDir, outDir, launcherDir });
  for (const dir of created) console.log(`packed ${dir}`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  TARGETS,
  platformPackageName,
  binFileName,
  platformPackageJson,
  pinVersions,
  buildPackages,
};
