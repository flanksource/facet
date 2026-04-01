import type { LintRule, LintContext, LintIssue } from '../types.js';

const EXEMPT_FILES = ['Page.tsx', 'PageBreak.tsx'];

const PAGE_BREAK_PROPS = /\b(pageBreakAfter|pageBreakBefore|breakAfter|breakBefore)\s*:/;

export const hardcodedPageBreak: LintRule = {
  name: 'hardcoded-page-break',
  description: 'Inline page-break styles should use <PageBreak /> component or .page-break class',
  severity: 'error',

  check(ctx: LintContext): LintIssue[] {
    if (EXEMPT_FILES.some((f) => ctx.filePath.endsWith(f))) return [];

    const issues: LintIssue[] = [];
    let inStyleBlock = false;

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (line.includes('style={{') || line.includes('style={({')) inStyleBlock = true;

      if (inStyleBlock && PAGE_BREAK_PROPS.test(line)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          rule: this.name,
          severity: this.severity,
          message: 'Use <PageBreak /> component instead of inline page-break style',
        });
      }

      if (inStyleBlock && line.includes('}}')) inStyleBlock = false;
    }

    return issues;
  },
};
