import type { LintRule, LintContext, LintIssue } from '../types.js';

const PX_IN_ARBITRARY = /\w+-\[\d+px\]/g;
const PX_IN_STYLE = /:\s*['"]?\d+px['"]?/g;

export const mixedUnits: LintRule = {
  name: 'mixed-units',
  description: 'Use mm or pt units instead of px in PDF-targeted components',
  severity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      for (const match of line.matchAll(PX_IN_ARBITRARY)) {
        issues.push({
          file: ctx.filePath,
          line: i + 1,
          column: match.index! + 1,
          rule: this.name,
          severity: this.severity,
          message: `${match[0]} uses px units. Use mm or pt for PDF layouts`,
        });
      }

      const inStyle = line.includes('style={{') || line.includes("style={({")
        || (line.includes(':') && !line.includes('className'));

      if (inStyle) {
        for (const match of line.matchAll(PX_IN_STYLE)) {
          if (line.includes('className')) continue;
          issues.push({
            file: ctx.filePath,
            line: i + 1,
            column: match.index! + 1,
            rule: this.name,
            severity: this.severity,
            message: `px unit in inline style. Use mm or pt for PDF layouts`,
          });
        }
      }
    }

    return issues;
  },
};
