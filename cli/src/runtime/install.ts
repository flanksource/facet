import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Logger } from '../utils/logger.js';
import { resolvePackageManager } from '../utils/package-manager.js';
import { spawnLowPriority } from '../utils/subprocess-priority.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function isStoreCorruptionError(output: string): boolean {
  return /ERR_PNPM_ENOENT/.test(output) && /(importPackage|reflink)/.test(output);
}

export async function installModules(root: string, options: { logger?: Logger; progress?: NodeJS.WritableStream; nodeLinker?: 'hoisted' | 'isolated' } = {}): Promise<string> {
  const { logger, progress } = options;
  const nodeLinker = options.nodeLinker ?? 'hoisted';
  const manager = await resolvePackageManager(root);
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  writeFileSync(join(root, 'pnpm-workspace.yaml'), JSON.stringify({
    ...manifest.pnpm,
    packages: ['.'],
    nodeLinker,
    autoInstallPeers: true,
    strictPeerDependencies: false,
    overrides: { ...manifest.resolutions, ...manifest.overrides, ...manifest.pnpm?.overrides },
  }));
  const baseArgs = [
    'install',
    '--prefer-offline',
    '--ignore-scripts',
    '--config.confirmModulesPurge=false',
    `--config.nodeLinker=${nodeLinker}`,
    // The staging lockfile is seeded from the shared module store, so it is
    // legitimately out of date with the project manifest being installed and
    // has to be re-resolved. `.npmrc` already asks for this, but the install
    // runs with CI=true — which makes pnpm default frozen-lockfile to true —
    // and pnpm 11 no longer lets the .npmrc entry win against it. A CLI flag
    // does, on every version.
    '--no-frozen-lockfile',
    ...(progress ? ['--reporter=append-only'] : []),
  ];
  try {
    await runProcess({ command: manager.cmd, args: baseArgs, cwd: root, progress });
  } catch (error) {
    if (!(error instanceof PackageInstallError) || !isStoreCorruptionError(error.output)) throw error;
    const corruptLine = error.output.split('\n').find((line) => line.includes('ERR_PNPM_ENOENT'))?.trim() ?? 'ERR_PNPM_ENOENT';
    const warning = `pnpm content store looks corrupted (${corruptLine}); retrying with store integrity verification`;
    if (progress) progress.write(`${warning}\n`);
    else logger?.warn(warning);
    try {
      await runProcess({ command: manager.cmd, args: [...baseArgs, '--config.verifyStoreIntegrity=true'], cwd: root, progress });
    } catch (retryError) {
      throw new Error(
        `pnpm install failed even with store integrity verification — the pnpm content store is corrupted. ` +
        `Inspect it with \`corepack pnpm@${manager.version} store status\` and re-add the affected packages, ` +
        `or remove the store directory to force a clean re-download.\n${errorMessage(retryError)}`,
      );
    }
  }
  return manager.version;
}

class PackageInstallError extends Error {
  constructor(message: string, readonly output: string) {
    super(message);
  }
}

function runProcess(options: { command: string; args: string[]; cwd: string; progress?: NodeJS.WritableStream }): Promise<void> {
  const { command, args, cwd, progress } = options;
  return new Promise((resolvePromise, reject) => {
    const child = spawnLowPriority<ChildProcessWithoutNullStreams>({
      command,
      args,
      options: { cwd, env: { ...process.env, CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    if (progress) {
      child.stdout.pipe(progress, { end: false });
      child.stderr.pipe(progress, { end: false });
    }
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      const output = Buffer.concat([...stdout, ...stderr]).toString().trim();
      const failure = signal ? `signal ${signal}` : `exit ${code}`;
      reject(new PackageInstallError(`${command} ${args.join(' ')} failed with ${failure}${progress ? '' : `: ${output}`}`, output));
    });
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
