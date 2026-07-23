import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';

interface TaskDefinition {
  dir?: string;
  sources?: string[];
  deps?: string[];
  internal?: boolean;
  cmds?: Array<string | { task: string }>;
}

interface Taskfile {
  tasks: Record<string, TaskDefinition>;
}

const repoRoot = resolve(import.meta.dirname, '../..');
const taskfile = load(readFileSync(resolve(repoRoot, 'Taskfile.yml'), 'utf8')) as Taskfile;

describe('task install', () => {
  it('installs the locally built npm package globally and replaces an existing binary', () => {
    expect(taskfile.tasks.install.cmds).toContain(
      'npm install --global --force --install-links "{{.CLI_NPM_PACKAGE_DIR}}"',
    );
    expect(taskfile.tasks.install.cmds).toContain(
      'ln -sf "$(npm root --global)/@flanksource/facet-cli/facet.cjs" "$(which facet)"',
    );
    expect(taskfile.tasks.install.cmds?.join('\n')).not.toContain('/usr/local/bin');
  });

  it('links the CLI package and component library to this checkout', () => {
    expect(taskfile.tasks['install:symlink']).toEqual(expect.objectContaining({
      deps: ['build:npm-cli'],
      cmds: [
        { task: 'install:symlink:library' },
        { task: 'install:symlink:cli' },
        'ln -sf "$(npm root --global)/@flanksource/facet-cli/facet.cjs" "$(which facet)"',
      ],
    }));
    expect(taskfile.tasks['install:symlink:library']).toEqual({
      internal: true,
      dir: '{{.ROOT_DIR}}',
      cmds: ['npm link'],
    });
    expect(taskfile.tasks['install:symlink:cli']).toEqual({
      internal: true,
      dir: '{{.CLI_NPM_PACKAGE_DIR}}',
      cmds: ['npm link'],
    });
  });

  it('rebuilds when CLI packaging inputs change', () => {
    expect(taskfile.tasks['build:npm-cli'].sources).toBeUndefined();
    expect(taskfile.tasks.build.sources).toEqual(expect.arrayContaining([
      'package.json',
      'pnpm-lock.yaml',
      'openapi.yaml',
      'tailwind.config.js',
      'vite.lib.config.ts',
      'vite.playground.config.ts',
      'cli/package.json',
      'cli/pnpm-lock.yaml',
      'cli/scripts/**/*',
      'cli/tsdown.config.ts',
      'cli/tsdown.sea.config.ts',
    ]));
  });

  it('requires the same Node version as the bundled facet package', () => {
    const rootPackage = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    const cliPackage = JSON.parse(readFileSync(resolve(repoRoot, 'cli/npm/facet-cli/package.json'), 'utf8'));

    expect(cliPackage.engines).toEqual(rootPackage.engines);
  });

  it.each([
    {
      name: 'installs the packed CLI over the existing facet executable',
      task: 'install',
      linked: false,
    },
    {
      name: 'links the CLI and component library to the checkout',
      task: 'install:symlink',
      linked: true,
    },
  ])('$name', ({ task, linked }) => {
    const expectedVersion = JSON.parse(
      readFileSync(resolve(repoRoot, 'cli/package.json'), 'utf8'),
    ).version as string;
    const tempRoot = resolve(repoRoot, '.tmp');
    mkdirSync(tempRoot, { recursive: true });
    const testRoot = mkdtempSync(join(tempRoot, 'task-install-'));
    const prefix = join(testRoot, 'prefix');
    const packageDir = join(testRoot, 'package');
    const shadowBin = join(testRoot, 'shadow-bin');
    const shadowBinPath = join(shadowBin, process.platform === 'win32' ? 'facet.cmd' : 'facet');
    const binPath = process.platform === 'win32'
      ? join(prefix, 'facet.cmd')
      : join(prefix, 'bin', 'facet');
    const installedPackage = process.platform === 'win32'
      ? join(prefix, 'node_modules', '@flanksource', 'facet-cli')
      : join(prefix, 'lib', 'node_modules', '@flanksource', 'facet-cli');
    const installedLibrary = process.platform === 'win32'
      ? join(prefix, 'node_modules', '@flanksource', 'facet')
      : join(prefix, 'lib', 'node_modules', '@flanksource', 'facet');

    try {
      mkdirSync(shadowBin, { recursive: true });
      writeFileSync(shadowBinPath, process.platform === 'win32' ? '@echo old\r\n' : '#!/bin/sh\necho old\n');
      chmodSync(shadowBinPath, 0o755);
      const env = {
        ...process.env,
        NPM_CONFIG_PREFIX: prefix,
        PATH: [shadowBin, dirname(binPath), process.env.PATH].filter(Boolean).join(delimiter),
      };

      execFileSync('task', [task, `CLI_NPM_PACKAGE_DIR=${packageDir}`], {
        cwd: repoRoot,
        env,
        stdio: 'pipe',
      });

      const versionOutput = execFileSync('facet', ['--version'], { encoding: 'utf8', env });
      expect(versionOutput).toContain(expectedVersion);
      expect(lstatSync(installedPackage).isSymbolicLink()).toBe(linked);
      if (linked) {
        expect(realpathSync(installedPackage)).toBe(realpathSync(packageDir));
        expect(realpathSync(installedLibrary)).toBe(realpathSync(repoRoot));
        expect(versionOutput).toContain(`symlinked to ${repoRoot}`);
      } else {
        expect(versionOutput).not.toContain('symlinked to');
      }
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
    }
  }, 120_000);
});
