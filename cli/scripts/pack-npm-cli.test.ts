// Tests for the facet-cli npm package assembly logic: platform package
// metadata, version pinning, and that the launcher's optionalDependencies stay
// in sync with the supported target list.
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const {
  TARGETS,
  platformPackageName,
  binFileName,
  platformPackageJson,
  pinVersions,
} = require('./pack-npm-cli.cjs');

describe('platformPackageJson', () => {
  it('encodes os/cpu/version and ships the unix binary', () => {
    const linux = TARGETS.find((t: any) => t.key === 'linux-x64');
    const pkg = platformPackageJson(linux, '1.2.3');
    expect(pkg.name).toBe('@flanksource/facet-cli-linux-x64');
    expect(pkg.version).toBe('1.2.3');
    expect(pkg.os).toEqual(['linux']);
    expect(pkg.cpu).toEqual(['x64']);
    expect(pkg.files).toEqual(['facet']);
  });

  it('ships facet.exe for windows', () => {
    const win = TARGETS.find((t: any) => t.key === 'win32-x64');
    expect(binFileName(win)).toBe('facet.exe');
    expect(platformPackageJson(win, '1.2.3').files).toEqual(['facet.exe']);
    expect(platformPackageJson(win, '1.2.3').os).toEqual(['win32']);
  });
});

describe('pinVersions', () => {
  it('pins the launcher version and every optional dependency', () => {
    const launcher = {
      name: '@flanksource/facet-cli',
      version: '0.0.0',
      optionalDependencies: {
        '@flanksource/facet-cli-linux-x64': '0.0.0',
        '@flanksource/facet-cli-win32-x64': '0.0.0',
      },
    };
    const pinned = pinVersions(launcher, '9.9.9');
    expect(pinned.version).toBe('9.9.9');
    expect(Object.values(pinned.optionalDependencies)).toEqual(['9.9.9', '9.9.9']);
  });
});

describe('launcher package.json', () => {
  it('lists exactly one optional dependency per supported target', () => {
    const launcher = JSON.parse(
      readFileSync(join(import.meta.dir, '..', 'npm', 'facet-cli', 'package.json'), 'utf8'),
    );
    const expected = TARGETS.map(platformPackageName).sort();
    expect(Object.keys(launcher.optionalDependencies).sort()).toEqual(expected);
  });
});
