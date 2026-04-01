import type { LintRule, LintContext, LintIssue } from '../types.js';

const AT_PAGE = /@page\b/;
const MEDIA_PRINT = /@media\s+print/;
const BREAK_CLASS = /\bbreak-(before|after)-(page|column|auto|avoid|all|left|right)\b/;
const CSS_SIZE_PROP = /\bsize\s*:\s*['"]?(a[0-5]|letter|legal|b[0-5]|\d+mm)/i;

export const conflictingPrintCss: LintRule = {
  name: 'conflicting-print-css',
  description: 'CSS that conflicts with facet page sizing and print management',
  severity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (AT_PAGE.test(line)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: '@page rules conflict with facet PDF pipeline. Remove from component',
        });
      }

      if (MEDIA_PRINT.test(line)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: '@media print rules conflict with facet. Use facet styles.css for print styles',
        });
      }

      if (BREAK_CLASS.test(line) && line.includes('className')) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: 'Use <PageBreak /> component instead of CSS break-* classes',
        });
      }

      if (CSS_SIZE_PROP.test(line)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: 'CSS size property conflicts with facet data-page-size. Use <Page pageSize="..."> instead',
        });
      }
    }

    return issues;
  },
};
