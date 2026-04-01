import type { LintRule, LintContext, LintIssue } from '../types.js';

const LAYOUT_PROPS: Record<string, string> = {
  padding: 'p-[value]',
  paddingTop: 'pt-[value]',
  paddingBottom: 'pb-[value]',
  paddingLeft: 'pl-[value]',
  paddingRight: 'pr-[value]',
  margin: 'm-[value]',
  marginTop: 'mt-[value]',
  marginBottom: 'mb-[value]',
  marginLeft: 'ml-[value]',
  marginRight: 'mr-[value]',
  gap: 'gap-[value]',
  width: 'w-[value]',
  height: 'h-[value]',
  fontSize: 'text-[value]',
  lineHeight: 'leading-[value]',
  borderRadius: 'rounded-[value]',
};

const DYNAMIC_VALUE = /\$\{|`|\bvar\b|\bprops\b/;

export const inlineStyleLayout: LintRule = {
  name: 'inline-style-layout',
  description: 'Layout properties in inline styles should use Tailwind arbitrary values',
  severity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];
    let inStyleBlock = false;
    let braceDepth = 0;

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

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

        if (DYNAMIC_VALUE.test(line)) continue;

        for (const [prop, suggestion] of Object.entries(LAYOUT_PROPS)) {
          const regex = new RegExp(`\\b${prop}\\s*:`);
          if (regex.test(line)) {
            const valueMatch = line.match(new RegExp(`${prop}\\s*:\\s*['"]([^'"]+)['"]`));
            const value = valueMatch?.[1];
            const tw = value ? suggestion.replace('value', value) : suggestion;

            issues.push({
              file: ctx.filePath,
              line: i + 1,
              rule: this.name,
              severity: this.severity,
              message: `Inline style '${prop}' can use Tailwind: ${tw}`,
            });
          }
        }
      }
    }

    return issues;
  },
};
