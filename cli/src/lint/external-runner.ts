import { spawn } from 'node:child_process';

export interface ExternalToolResult { stdout: string; stderr: string; }
export interface ExternalToolRunOptions { cwd: string; }
export type ExternalToolRunner = (command: string, args: string[], options: ExternalToolRunOptions) => Promise<ExternalToolResult>;

export const runExternalTool: ExternalToolRunner = (command, args, options) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: options.cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let settled = false;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  child.once('error', (error: NodeJS.ErrnoException) => {
    if (settled) return;
    settled = true;
    reject(new Error(error.code === 'ENOENT' ? `Unable to run "${command}": executable not found on PATH` : `Unable to run "${command}": ${error.message}`));
  });
  child.once('close', (code, signal) => {
    if (settled) return;
    settled = true;
    const detail = stderr.trim() || stdout.trim();
    const suffix = detail ? `: ${detail}` : '';
    if (signal) reject(new Error(`"${command}" terminated by signal ${signal}${suffix}`));
    else if (code !== 0) reject(new Error(`"${command}" exited with code ${code ?? 'unknown'}${suffix}`));
    else resolve({ stdout, stderr });
  });
});
