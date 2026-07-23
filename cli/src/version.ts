import { lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface VersionDetails {
  version: string;
  buildDate: string;
  gitCommit: string;
  executablePath?: string;
}

function lstatIfExists(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export function resolveSymlinkedFacetPath(executablePath: string): string | undefined {
  if (!lstatIfExists(executablePath)?.isSymbolicLink()) return undefined;

  const executableTarget = resolve(dirname(executablePath), readlinkSync(executablePath));
  const cliPackagePath = dirname(executableTarget);
  if (!lstatIfExists(cliPackagePath)?.isSymbolicLink()) return undefined;

  const libraryPackagePath = resolve(cliPackagePath, '../facet');
  if (lstatIfExists(libraryPackagePath)?.isSymbolicLink()) {
    return realpathSync(libraryPackagePath);
  }
  return realpathSync(cliPackagePath);
}

export function formatVersion(details: VersionDetails): string {
  const base = details.buildDate === 'dev'
    ? `${details.version} (dev)`
    : `${details.version} (${details.buildDate}${details.gitCommit ? ` ${details.gitCommit}` : ''})`;
  const linkedPath = details.executablePath
    ? resolveSymlinkedFacetPath(details.executablePath)
    : undefined;
  return linkedPath ? `${base} [symlinked to ${linkedPath}]` : base;
}
