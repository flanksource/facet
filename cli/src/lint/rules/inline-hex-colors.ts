import type { LintRule, LintContext, LintIssue } from '../types.js';

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const SVG_ATTR = /\b(stroke|fill)\s*=\s*"/;
const CLASSNAME_ARBITRARY = /className\s*=\s*["'`{]/;

export const inlineHexColors: LintRule = {
  name: 'inline-hex-colors',
  description: 'Hardcoded hex colors in inline styles should use Tailwind classes',
  severity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];
    let inStyleBlock = false;
    let braceDepth = 0;

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (SVG_ATTR.test(line)) continue;

      if (line.includes('style={{')) {
        inStyleBlock = true;
        braceDepth = 0;
      }

      if (inStyleBlock) {
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        if (braceDepth <= 0) inStyleBlock = false;

        const matches = line.matchAll(HEX_COLOR);
        for (const match of matches) {
          if (CLASSNAME_ARBITRARY.test(line)) continue;

          issues.push({
            file: ctx.filePath,
            line: i + 1,
            column: match.index! + 1,
            rule: this.name,
            severity: this.severity,
            message: `Hardcoded hex color ${match[0]} in inline style. Use a Tailwind class instead`,
          });
        }
      }
    }

    return issues;
  },
};
