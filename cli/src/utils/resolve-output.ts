import { basename, dirname, extname } from 'path';

export function resolveOutput(outputPath: string): { outputDir: string; outputName?: string } {
  if (outputPath.endsWith('/') || outputPath.endsWith('\\')) {
    return { outputDir: outputPath };
  }

  const ext = extname(outputPath);
  if (ext) {
    return { outputDir: dirname(outputPath), outputName: basename(outputPath, ext) };
  }

  return { outputDir: outputPath };
}
