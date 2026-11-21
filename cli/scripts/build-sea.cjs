#!/usr/bin/env node
// Build the Node SEA single-file binary from the bundled CLI: write the SEA
// config (embedding the runtime assets), generate the blob, copy the node
// binary, and inject the blob (postject on macOS and Windows, injectElf on Linux).
'use strict';

const { execFileSync } = require('node:child_process');
const { writeFileSync, copyFileSync, mkdirSync, chmodSync, existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

// Node SEA injects the blob by overwriting a sentinel string compiled into the
// node executable. Shared-library builds (Homebrew's `node` is a ~68KB launcher
// against libnode.dylib) keep that sentinel in the dylib, so postject fails with
// an opaque "Could not find the sentinel" error. Check before injecting.
function assertSeaCapable(binary, fuse) {
  if (readFileSync(binary).includes(fuse)) return;
  throw new Error(
    `${binary} does not contain the Node SEA sentinel, so the blob cannot be injected.\n` +
      `This node (${process.execPath}, v${process.versions.node}) is almost certainly a\n` +
      `shared-library build — Homebrew's node links against libnode and ships a small launcher.\n` +
      `Node SEA requires a statically linked node.\n\n` +
      `Fixes:\n` +
      `  - Build the binary with an official Node distribution (nodejs.org, nvm, or\n` +
      `    actions/setup-node in CI, which is what the release workflow uses).\n` +
      `  - For ordinary development you do not need this binary: 'pnpm run build'\n` +
      `    builds the library and CLI; run 'pnpm run build:binary' only for releases.`,
  );
}

// postject (LIEF) rebuilds the dynamic symbol tables when it injects into an
// ELF, and corrupts them for arm64 node builds (nodejs/node#61483): .gnu.hash is
// zeroed and .dynstr offsets shift, so native addons cannot resolve napi_*
// symbols. Node only finds the blob through a PT_NOTE named NODE_SEA_BLOB
// (postject_find_resource), so on Linux append the note with a copy of the
// program headers that adds a PT_LOAD mapping both, and move nothing else. The
// new segment keeps the first PT_LOAD's address - offset, as older kernels
// assume when they derive AT_PHDR from e_phoff.
function injectElf(binary, blobPath, fuse) {
  const elf = readFileSync(binary);
  if (elf.readUInt32BE(0) !== 0x7f454c46 || elf[4] !== 2 || elf[5] !== 1) {
    throw new Error(`${binary} is not a 64-bit little-endian ELF`);
  }
  const PT_LOAD = 1;
  const PT_NOTE = 4;
  const PT_PHDR = 6;
  const PF_R = 4;
  const align = 0x10000; // the largest page size arm64 kernels use
  const phoff = Number(elf.readBigUInt64LE(0x20));
  const phentsize = elf.readUInt16LE(0x36);
  const phdrs = [];
  for (let i = 0; i < elf.readUInt16LE(0x38); i++) {
    phdrs.push(Buffer.from(elf.subarray(phoff + i * phentsize, phoff + (i + 1) * phentsize)));
  }
  const loads = phdrs.filter((ph) => ph.readUInt32LE(0) === PT_LOAD);
  // vaddr - offset of the first PT_LOAD: 0 for PIE, 0x400000 for x64 node.
  const base = Number(loads[0].readBigUInt64LE(16) - loads[0].readBigUInt64LE(8));
  const end = Math.max(elf.length, ...loads.map((ph) => Number(ph.readBigUInt64LE(16) + ph.readBigUInt64LE(40)) - base));
  const start = Math.ceil(end / align) * align;
  if (base % align) throw new Error(`${binary} has an unaligned first PT_LOAD`);

  const blob = readFileSync(blobPath);
  const name = Buffer.from('NODE_SEA_BLOB\0');
  const note = Buffer.alloc(12 + Math.ceil(name.length / 4) * 4 + Math.ceil(blob.length / 4) * 4);
  note.writeUInt32LE(name.length, 0);
  note.writeUInt32LE(blob.length, 4);
  name.copy(note, 12);
  blob.copy(note, 12 + Math.ceil(name.length / 4) * 4);

  const tableSize = (phdrs.length + 2) * phentsize;
  const noteOffset = start + Math.ceil(tableSize / 8) * 8;
  const header = (type, offset, size, segmentAlign) => {
    const ph = Buffer.alloc(phentsize);
    ph.writeUInt32LE(type, 0);
    ph.writeUInt32LE(PF_R, 4);
    ph.writeBigUInt64LE(BigInt(offset), 8);
    for (const field of [16, 24]) ph.writeBigUInt64LE(BigInt(offset + base), field);
    for (const field of [32, 40]) ph.writeBigUInt64LE(BigInt(size), field);
    ph.writeBigUInt64LE(BigInt(segmentAlign), 48);
    return ph;
  };
  for (const ph of phdrs) {
    if (ph.readUInt32LE(0) !== PT_PHDR) continue;
    ph.writeBigUInt64LE(BigInt(start), 8);
    for (const field of [16, 24]) ph.writeBigUInt64LE(BigInt(start + base), field);
    for (const field of [32, 40]) ph.writeBigUInt64LE(BigInt(tableSize), field);
  }
  // Loaders size the mapping from the first and last PT_LOAD, so the new one
  // goes after the existing ones.
  const lastLoad = phdrs.lastIndexOf(loads[loads.length - 1]);
  phdrs.splice(lastLoad + 1, 0, header(PT_LOAD, start, noteOffset + note.length - start, align));
  phdrs.push(header(PT_NOTE, noteOffset, note.length, 4));

  const sentinel = Buffer.from(`${fuse}:0`);
  const at = elf.indexOf(sentinel);
  if (at === -1 || elf.indexOf(sentinel, at + 1) !== -1) {
    throw new Error(`${binary} must contain exactly one ${fuse}:0 (already injected?)`);
  }
  elf[at + sentinel.length - 1] = '1'.charCodeAt(0);
  elf.writeBigUInt64LE(BigInt(start), 0x20);
  elf.writeUInt16LE(phdrs.length, 0x38);

  const table = Buffer.concat(phdrs);
  const padding = Buffer.alloc(noteOffset - start - table.length);
  writeFileSync(binary, Buffer.concat([elf, Buffer.alloc(start - elf.length), table, padding, note]));
}

const cliRoot = join(__dirname, '..');
const repoRoot = join(cliRoot, '..');
const distSea = join(cliRoot, 'dist-sea');
const bundle = join(distSea, 'cli.cjs');
const blob = join(distSea, 'sea-prep.blob');
const ext = process.platform === 'win32' ? '.exe' : '';
const outBinary = join(repoRoot, 'dist', `facet${ext}`);
const target = [process.platform, process.arch, process.platform === 'linux' ? (process.report.getReport().header.glibcVersionRuntime ? 'glibc' : 'musl') : undefined].filter(Boolean).join('-');
const runtime = join(cliRoot, 'assets', 'runtimes', target);
const fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
assertSeaCapable(process.execPath, fuse);

const seaConfig = {
  main: bundle,
  output: blob,
  disableExperimentalSEAWarning: true,
  assets: {
    'default-runtime.json': join(runtime, 'default-runtime.json'),
    'default-runtime.tgz': join(runtime, 'default-runtime.tgz'),
    'package.json': join(repoRoot, 'package.json'),
    'styles.css': join(repoRoot, 'dist', 'styles.css'),
    'page-sizes.json': join(repoRoot, 'src', 'types', 'page-sizes.json'),
    'openapi.yaml': join(repoRoot, 'openapi.yaml'),
    'mermaid.min.js': join(repoRoot, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    'facet-font-scale.mjs': join(repoRoot, 'postcss', 'facet-font-scale.mjs'),
    'facet-redact.mjs': join(repoRoot, 'remark', 'facet-redact.mjs'),
    'facet-runtime.mjs': join(cliRoot, 'assets', 'plugins', 'facet-runtime.mjs'),
    'facet-diagrams.oxlint.mjs': join(repoRoot, 'oxlint-plugins', 'facet-diagrams.js'),
    'review-diagram.prompt': join(cliRoot, 'assets', 'review-diagram.prompt'),
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
chmodSync(outBinary, 0o755);
assertSeaCapable(outBinary, fuse);

if (process.platform === 'linux') {
  console.log('Injecting blob into the ELF program headers...');
  injectElf(outBinary, blob, fuse);
} else {
  console.log('Injecting blob with postject...');
  const postject = require.resolve('postject/dist/cli.js');
  const args = [postject, outBinary, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', fuse];
  if (process.platform === 'darwin') args.push('--macho-segment-name', 'NODE_SEA');
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}

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
