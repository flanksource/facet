import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { parseRemoteRef, resolveRemoteRef } from './remote-resolver.js';

export interface TemplateSourceLocation {
  consumerRoot?: string;
  templatePath: string;
  resolvedSha?: string;
}

function findGitRoot(from: string): string | undefined {
  let dir = from;
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function findProjectRoot(templatePath: string): string | undefined {
  const absoluteTemplate = resolve(templatePath);
  const gitRoot = findGitRoot(dirname(absoluteTemplate));
  const stopAt = gitRoot ?? process.cwd();
  let dir = dirname(absoluteTemplate);
  while (dir.length >= stopAt.length) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export async function resolveTemplateSource(
  template: string,
  options: { refresh?: boolean; verbose?: boolean } = {},
): Promise<TemplateSourceLocation> {
  const remoteRef = parseRemoteRef(template);
  if (remoteRef) {
    const resolved = await resolveRemoteRef(remoteRef, options);
    return {
      consumerRoot: resolved.consumerRoot,
      templatePath: resolved.templateFile,
      resolvedSha: resolved.resolvedSha,
    };
  }

  const projectRoot = findProjectRoot(template);
  if (!projectRoot) return { templatePath: template };
  return {
    consumerRoot: projectRoot,
    templatePath: relative(projectRoot, resolve(template)),
  };
}
