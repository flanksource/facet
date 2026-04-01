import type { LintRule, LintContext, LintIssue } from '../types.js';

const CONFLICT_GROUPS: [string, RegExp][] = [
  ['flex-direction', /^flex-(row|col)(-(reverse))?$/],
  ['justify', /^justify-/],
  ['items', /^items-/],
  ['self', /^self-/],
  ['gap', /^gap-(?!x-|y-)/],
  ['gap-x', /^gap-x-/],
  ['gap-y', /^gap-y-/],
  ['text-size', /^text-(\[|xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl)/],
  ['font-weight', /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/],
  ['p', /^p-/],
  ['px', /^px-/],
  ['py', /^py-/],
  ['pt', /^pt-/],
  ['pb', /^pb-/],
  ['pl', /^pl-/],
  ['pr', /^pr-/],
  ['m', /^m-/],
  ['mx', /^mx-/],
  ['my', /^my-/],
  ['mt', /^mt-/],
  ['mb', /^mb-/],
  ['ml', /^ml-/],
  ['mr', /^mr-/],
  ['w', /^w-/],
  ['h', /^h-/],
  ['rounded', /^rounded(-|$)/],
  ['bg', /^bg-/],
  ['border-color', /^border-(gray|red|green|blue|yellow|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-/],
];

const CLASSNAME_REGEX = /className\s*=\s*["'`]([^"'`]+)["'`]/g;

export const conflictingTailwind: LintRule = {
  name: 'conflicting-tailwind',
  description: 'Contradictory Tailwind utilities in the same className',
  severity: 'error',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      for (const match of line.matchAll(CLASSNAME_REGEX)) {
        const classes = match[1].split(/\s+/).filter(Boolean);
        const groups = new Map<string, string[]>();

        for (const cls of classes) {
          for (const [groupName, pattern] of CONFLICT_GROUPS) {
            if (pattern.test(cls)) {
              const existing = groups.get(groupName) || [];
              existing.push(cls);
              groups.set(groupName, existing);
            }
          }
        }

        for (const [groupName, members] of groups) {
          if (members.length > 1) {
            issues.push({
              file: ctx.filePath,
              line: i + 1,
              column: match.index! + 1,
              rule: this.name,
              severity: this.severity,
              message: `Conflicting ${groupName} classes: ${members.join(', ')}`,
            });
          }
        }
      }
    }

    return issues;
  },
};
