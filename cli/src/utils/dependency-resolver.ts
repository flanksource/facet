import { readFile } from 'fs/promises';
import { resolve, dirname, extname } from 'path';

export interface DependencyGraph {
  mainFile: string;
  dependencies: Set<string>;
}

export class DependencyResolver {
  private visited = new Set<string>();

  async resolve(entryPoint: string): Promise<DependencyGraph> {
    const absolutePath = resolve(entryPoint);
    const dependencies = new Set<string>();

    await this.walkDependencies(absolutePath, dependencies);

    return {
      mainFile: absolutePath,
      dependencies,
    };
  }

  private async walkDependencies(filePath: string, dependencies: Set<string>): Promise<void> {
    if (this.visited.has(filePath)) {
      return;
    }

    this.visited.add(filePath);
    const ext = extname(filePath);

    // Only parse .ts, .js, .tsx, .jsx files for imports
    if (!['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const imports = this.extractImports(content);
      const fileDir = dirname(filePath);

      for (const importPath of imports) {
        // Only handle relative imports
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolveImport(importPath, fileDir);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
            await this.walkDependencies(resolvedPath, dependencies);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // Match ES6 imports: import ... from '...'
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Match dynamic imports: import('...')
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Match require: require('...')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private resolveImport(importPath: string, fromDir: string): string | null {
    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];

    for (const ext of extensions) {
      const candidate = resolve(fromDir, importPath + ext);
      try {
        // Check if file exists by trying to resolve it
        return candidate;
      } catch {
        continue;
      }
    }

    return null;
  }
}
