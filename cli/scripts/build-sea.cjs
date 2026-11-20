#!/usr/bin/env node
// Build the Node SEA single-file binary from the bundled CLI: write the SEA
// config (embedding the runtime assets), generate the blob, copy the node
// binary, and inject the blob with postject.
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

// postject (LIEF) zeroes the .gnu.hash table when it runs in a Linux arm64
// container (https://github.com/nodejs/node/issues/61483). The binary still
// starts, but native addons can no longer resolve napi_* symbols from it. Check
// that every exported symbol can be looked up through the table, and rebuild
// the table in place from the binary's own .dynsym when it cannot.
function elfSections(buf) {
  if (buf.readUInt32BE(0) !== 0x7f454c46 || buf[4] !== 2 || buf[5] !== 1) return undefined;
  const shoff = Number(buf.readBigUInt64LE(0x28));
  const shentsize = buf.readUInt16LE(0x3a);
  const shstr = shoff + buf.readUInt16LE(0x3e) * shentsize;
  const strOffset = Number(buf.readBigUInt64LE(shstr + 24));
  const sections = new Map();
  for (let i = 0; i < buf.readUInt16LE(0x3c); i++) {
    const header = shoff + i * shentsize;
    const nameStart = strOffset + buf.readUInt32LE(header);
    sections.set(buf.toString('latin1', nameStart, buf.indexOf(0, nameStart)), {
      offset: Number(buf.readBigUInt64LE(header + 24)),
      size: Number(buf.readBigUInt64LE(header + 32)),
    });
  }
  return sections;
}

function gnuHash(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  return h;
}

function gnuHashTable(buf) {
  const sections = elfSections(buf);
  const table = sections?.get('.gnu.hash');
  const dynsym = sections?.get('.dynsym');
  const dynstr = sections?.get('.dynstr');
  if (!table || !dynsym || !dynstr) return undefined;
  const names = [];
  for (let i = 0; i < dynsym.size / 24; i++) {
    const start = dynstr.offset + buf.readUInt32LE(dynsym.offset + i * 24);
    names.push(buf.toString('latin1', start, buf.indexOf(0, start)));
  }
  const o = table.offset;
  return {
    ...table,
    names,
    nbuckets: buf.readUInt32LE(o),
    symoffset: buf.readUInt32LE(o + 4),
    maskwords: buf.readUInt32LE(o + 8),
    shift: buf.readUInt32LE(o + 12),
  };
}

function gnuHashResolvesAll(buf, t) {
  const bloom = t.offset + 16;
  const buckets = bloom + t.maskwords * 8;
  const chains = buckets + t.nbuckets * 4;
  if (!t.nbuckets || !t.maskwords || chains + (t.names.length - t.symoffset) * 4 > t.offset + t.size) return false;
  for (let i = t.symoffset; i < t.names.length; i++) {
    const h = gnuHash(t.names[i]);
    const word = buf.readBigUInt64LE(bloom + (Math.floor(h / 64) % t.maskwords) * 8);
    if (!((word >> BigInt(h % 64)) & 1n) || !((word >> BigInt((h >>> t.shift) % 64)) & 1n)) return false;
    let found = false;
    for (let j = buf.readUInt32LE(buckets + (h % t.nbuckets) * 4); !found && j >= t.symoffset && j < t.names.length; j++) {
      const chain = buf.readUInt32LE(chains + (j - t.symoffset) * 4);
      found = (chain | 1) === (h | 1) && t.names[j] === t.names[i];
      if (chain & 1) break;
    }
    if (!found) return false;
  }
  return true;
}

function repairGnuHash(binary) {
  const buf = readFileSync(binary);
  const t = gnuHashTable(buf);
  if (!t || gnuHashResolvesAll(buf, t)) return;
  // Symbols after symoffset must stay in .dynsym order (relocations and
  // .gnu.version index them), so keep the bucket count only when that order
  // is already grouped by bucket; otherwise one bucket holds every symbol.
  const hashes = t.names.slice(t.symoffset).map(gnuHash);
  let nbuckets = t.nbuckets || 1;
  if (hashes.some((h, i) => i > 0 && h % nbuckets < hashes[i - 1] % nbuckets)) nbuckets = 1;
  const free = t.size - 16 - nbuckets * 4 - hashes.length * 4;
  if (free < 8) throw new Error(`.gnu.hash in ${binary} is too small to rebuild`);
  let maskwords = 1;
  while (maskwords * 2 * 8 <= free) maskwords *= 2;
  const shift = t.shift || 6;
  const o = t.offset;
  buf.fill(0, o, o + t.size);
  buf.writeUInt32LE(nbuckets, o);
  buf.writeUInt32LE(t.symoffset, o + 4);
  buf.writeUInt32LE(maskwords, o + 8);
  buf.writeUInt32LE(shift, o + 12);
  const bloom = o + 16;
  const buckets = bloom + maskwords * 8;
  const chains = buckets + nbuckets * 4;
  hashes.forEach((h, k) => {
    const at = bloom + (Math.floor(h / 64) % maskwords) * 8;
    buf.writeBigUInt64LE(buf.readBigUInt64LE(at) | (1n << BigInt(h % 64)) | (1n << BigInt((h >>> shift) % 64)), at);
    const bucket = h % nbuckets;
    if (!buf.readUInt32LE(buckets + bucket * 4)) buf.writeUInt32LE(t.symoffset + k, buckets + bucket * 4);
    const last = k === hashes.length - 1 || hashes[k + 1] % nbuckets !== bucket;
    buf.writeUInt32LE(((h & ~1) | (last ? 1 : 0)) >>> 0, chains + k * 4);
  });
  if (!gnuHashResolvesAll(buf, { ...t, nbuckets, maskwords, shift })) {
    throw new Error(`Could not rebuild .gnu.hash in ${binary}; native addons would fail to load`);
  }
  writeFileSync(binary, buf);
  console.log(`Rebuilt .gnu.hash damaged by postject (nodejs/node#61483) with ${nbuckets} buckets.`);
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

console.log('Injecting blob with postject...');
const postject = require.resolve('postject/dist/cli.js');
assertSeaCapable(outBinary, fuse);
const args = [postject, outBinary, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', fuse];
if (process.platform === 'darwin') args.push('--macho-segment-name', 'NODE_SEA');
execFileSync(process.execPath, args, { stdio: 'inherit' });
if (process.platform === 'linux') repairGnuHash(outBinary);

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
