import { copyFile, mkdir } from 'fs/promises';
import { dirname, relative, join, basename } from 'path';

export interface CopyOptions {
  sourceRoot: string;
  destRoot: string;
  files: string[];
}

export class FileCopier {
  async copy(options: CopyOptions): Promise<Map<string, string>> {
    const { sourceRoot, destRoot, files } = options;
    const copiedFiles = new Map<string, string>();

    // Ensure dest root exists
    await mkdir(destRoot, { recursive: true });

    for (const sourceFile of files) {
      const relativePath = relative(sourceRoot, sourceFile);
      const destFile = join(destRoot, relativePath);

      // Create parent directory
      const destDir = dirname(destFile);
      await mkdir(destDir, { recursive: true });

      // Copy file
      await copyFile(sourceFile, destFile);
      copiedFiles.set(sourceFile, destFile);
    }

    return copiedFiles;
  }

  async copyWithDependencies(mainFile: string, dependencies: Set<string>, destRoot: string): Promise<string> {
    const mainDir = dirname(mainFile);
    const allFiles = [mainFile, ...Array.from(dependencies)];

    await this.copy({
      sourceRoot: mainDir,
      destRoot,
      files: allFiles,
    });

    // Return the path to the copied main file
    const mainFileName = basename(mainFile);
    return join(destRoot, mainFileName);
  }
}
