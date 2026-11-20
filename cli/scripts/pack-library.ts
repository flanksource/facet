import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { packLibrary } from './build-default-runtime.js';

const repo = resolve(import.meta.dirname, '../..');
mkdirSync(join(repo, '.tmp'), { recursive: true });
const scratch = mkdtempSync(join(repo, '.tmp/pack-library-'));
try {
  const archive = await packLibrary({ directory: repo, scratch, name: '@flanksource/facet', includeRuntimePackages: true });
  const output = resolve(process.argv[2] ?? join(repo, '.tmp/facet-library.tgz'));
  mkdirSync(dirname(output), { recursive: true });
  cpSync(archive, output);
  console.log(output);
} finally { rmSync(scratch, { recursive: true, force: true }); }
