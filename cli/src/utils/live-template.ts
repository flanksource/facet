import { readFileSync } from 'node:fs';

export function isLiveTemplate(templatePath: string): boolean {
  const firstLine = readFileSync(templatePath, 'utf-8')
    .slice(0, 4096)
    .split(/\r?\n/)
    .find((line) => line.trim() !== '');
  return /^\s*\/\/\s*@live\b/.test(firstLine ?? '');
}

export function shouldUseLiveRendering(explicitLive: boolean | undefined, templatePath: string): boolean {
  return explicitLive || isLiveTemplate(templatePath);
}
