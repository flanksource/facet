import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatVersion } from './version.js';

const repoRoot = resolve(import.meta.dirname, '../..');
const version = '1.2.3';
const buildDate = '2026-07-22 18:00';
const gitCommit = 'abcdef0-dirty';

describe('formatVersion', () => {
  it('keeps regular installed versions unchanged', () => {
    expect(formatVersion({ version, buildDate, gitCommit })).toBe(
      `${version} (${buildDate} ${gitCommit})`,
    );
  });

  it('reports the linked Facet checkout', () => {
    const tempRoot = resolve(repoRoot, '.tmp');
    mkdirSync(tempRoot, { recursive: true });
    const testRoot = mkdtempSync(join(tempRoot, 'version-link-'));
    const binPath = join(testRoot, 'bin', 'facet');
    const globalScope = join(testRoot, 'lib', 'node_modules', '@flanksource');
    const globalCli = join(globalScope, 'facet-cli');
    const globalLibrary = join(globalScope, 'facet');
    const cliTarget = join(testRoot, 'checkout', '.tmp', 'facet-cli');
    const libraryTarget = join(testRoot, 'checkout');

    try {
      mkdirSync(dirname(binPath), { recursive: true });
      mkdirSync(globalScope, { recursive: true });
      mkdirSync(cliTarget, { recursive: true });
      writeFileSync(join(cliTarget, 'facet.cjs'), '');
      symlinkSync(relative(globalScope, cliTarget), globalCli, 'dir');
      symlinkSync(relative(globalScope, libraryTarget), globalLibrary, 'dir');
      symlinkSync(relative(dirname(binPath), join(globalCli, 'facet.cjs')), binPath);

      expect(formatVersion({ version, buildDate, gitCommit, executablePath: binPath })).toBe(
        `${version} (${buildDate} ${gitCommit}) [symlinked to ${libraryTarget}]`,
      );
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });
});
