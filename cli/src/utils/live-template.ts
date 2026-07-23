import { readFileSync } from 'node:fs';

export interface TemplateDirectives {
  live?: boolean;
  postProcessCss?: boolean;
}

export function parseTemplateDirectives(source: string): TemplateDirectives {
  const directives: TemplateDirectives = {};
  for (const line of source.slice(0, 4096).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\/\/\s*@live\b/.test(trimmed)) {
      directives.live = true;
      continue;
    }
    const postProcess = trimmed.match(/^\/\/\s*@post-process-css=(true|false)\s*$/);
    if (postProcess) {
      directives.postProcessCss = postProcess[1] === 'true';
      continue;
    }
    if (/^\/\/\s*@post-process-css\b/.test(trimmed)) {
      throw new Error('Expected @post-process-css=true or @post-process-css=false');
    }
    break;
  }
  return directives;
}

export function readTemplateDirectives(templatePath: string): TemplateDirectives {
  return parseTemplateDirectives(readFileSync(templatePath, 'utf-8'));
}

export function isLiveTemplate(templatePath: string): boolean {
  return readTemplateDirectives(templatePath).live === true;
}

export function shouldUseLiveRendering(explicitLive: boolean | undefined, templatePath: string): boolean {
  return explicitLive || isLiveTemplate(templatePath);
}

export function shouldPostProcessCSS(explicit: boolean | undefined, source: string): boolean {
  return explicit ?? parseTemplateDirectives(source).postProcessCss ?? true;
}

export function shouldPostProcessTemplateCSS(explicit: boolean | undefined, templatePath: string): boolean {
  return explicit ?? readTemplateDirectives(templatePath).postProcessCss ?? true;
}
