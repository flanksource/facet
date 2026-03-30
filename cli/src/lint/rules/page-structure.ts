import type { LintRule, LintContext, LintIssue } from '../types.js';

const EXEMPT_FILES = [
  'Header.tsx', 'Footer.tsx', 'PageBreak.tsx', 'Page.tsx',
  'index.tsx', 'DatasheetTemplate.tsx',
];
const ALLOWED_SIBLINGS = /^\s*<(Header|Footer|PageBreak|React\.Fragment|>|\/?>|\{\/\*)/;
const PAGE_OPEN = /<Page[\s>]/;
const PAGE_CLOSE = /<\/Page>/;
const IMPORTS_PAGE = /import\b.*\bPage\b.*from\b/;
const JSX_ELEMENT = /^\s*<[A-Z]/;

function isTemplateFile(ctx: LintContext): boolean {
  if (IMPORTS_PAGE.test(ctx.content)) return true;
  if (ctx.filePath.includes('/templates/')) return true;
  if (/Template\.tsx$/.test(ctx.filePath)) return true;
  return false;
}

export const pageStructure: LintRule = {
  name: 'page-structure',
  description: 'All content must be inside a <Page> wrapper; no nested pages or orphaned content',
  severity: 'error',

  check(ctx: LintContext): LintIssue[] {
    if (EXEMPT_FILES.some((f) => ctx.filePath.endsWith(f))) return [];
    if (!isTemplateFile(ctx)) return [];

    const issues: LintIssue[] = [];
    const hasPage = PAGE_OPEN.test(ctx.content);

    if (!hasPage) {
      const returnLine = ctx.lines.findIndex((l) => /^\s*return\s*[(<]/.test(l));
      if (returnLine >= 0) {
        issues.push({
          file: ctx.filePath,
          line: returnLine + 1,
          rule: this.name,
          severity: this.severity,
          message: 'Template must wrap content in a <Page> component',
        });
      }
      return issues;
    }

    let pageDepth = 0;
    let inReturn = false;
    let parenDepth = 0;

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (/^\s*return\s*[(<]/.test(line)) {
        inReturn = true;
        parenDepth = 0;
      }

      if (!inReturn) continue;

      for (const ch of line) {
        if (ch === '(') parenDepth++;
        if (ch === ')') parenDepth--;
      }

      if (PAGE_OPEN.test(line)) {
        if (pageDepth > 0) {
          issues.push({
            file: ctx.filePath,
            line: i + 1,
            rule: this.name,
            severity: this.severity,
            message: 'Nested <Page> components are not allowed',
          });
        }
        pageDepth++;
      }

      if (PAGE_CLOSE.test(line)) {
        pageDepth = Math.max(0, pageDepth - 1);
      }

      if (pageDepth === 0 && JSX_ELEMENT.test(line) && !ALLOWED_SIBLINGS.test(line)
          && !PAGE_OPEN.test(line)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: 'Content outside <Page> wrapper. Only Header, Footer, and PageBreak are allowed as siblings',
        });
      }

      if (parenDepth <= 0 && inReturn && i > 0) {
        inReturn = false;
      }
    }

    return issues;
  },
};
