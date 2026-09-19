import { isAbsolute, relative, resolve } from 'node:path';

export function slashNormalize(filePath: string): string { return filePath.replace(/\\/g, '/'); }
export function cwdRelativePath(cwd: string, filePath: string): string { return slashNormalize(relative(cwd, resolve(cwd, filePath))); }
export function requestedPathMap(cwd: string, files: string[]): Map<string, string> {
  return new Map(files.map((file) => { const abs = resolve(cwd, file); return [abs, cwdRelativePath(cwd, abs)]; }));
}
export function resolveReportedPath(cwd: string, filePath: string, requested: Map<string, string>): string | undefined {
  const abs = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
  return requested.get(abs);
}
