import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RuntimeBuildGit } from './named.js';

const run = promisify(execFile);

export async function readBuildGit(project: string): Promise<RuntimeBuildGit | undefined> {
  let status: string;
  try {
    ({ stdout: status } = await run('git', ['--no-optional-locks', 'status', '--porcelain=v2', '--branch', '--untracked-files=normal'], {
      cwd: project, env: { ...process.env, LC_ALL: 'C' },
    }));
  } catch (cause) {
    const error = cause as NodeJS.ErrnoException & { stderr?: string };
    if (error.code === 'ENOENT' || error.stderr?.startsWith('fatal: not a git repository')) return undefined;
    throw new Error(`Could not read Git state for ${project}`, { cause });
  }
  const lines = status.trimEnd().split('\n');
  const commit = lines.find(line => line.startsWith('# branch.oid '))?.slice('# branch.oid '.length);
  if (!commit) throw new Error(`Missing Git commit state for ${project}`);
  return { ...(commit === '(initial)' ? {} : { commit }), dirty: lines.some(line => !line.startsWith('# ')) };
}
