import type { LintRule, LintContext, LintIssue } from '../types.js';
import { parseJSXTree, type JSXNode } from '../jsx-parser.js';

function isPageComponent(name: string): boolean {
  return name === 'Page' || name.endsWith('Page');
}

function findEmptyPages(nodes: JSXNode[], file: string, issues: LintIssue[], severity: 'error' | 'warning') {
  for (const node of nodes) {
    if (isPageComponent(node.name) && !node.hasContent) {
      issues.push({
        file,
        line: node.line,
        rule: 'empty-page',
        severity,
        message: `Empty <${node.name}> has no content and will produce a blank page`,
      });
    }
    findEmptyPages(node.children, file, issues, severity);
  }
}

export const emptyPage: LintRule = {
  name: 'empty-page',
  description: 'Detect <Page> components with no content that produce blank pages',
  severity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const tree = parseJSXTree(ctx.content);
    if (tree.length === 0) return [];

    const issues: LintIssue[] = [];
    findEmptyPages(tree, ctx.filePath, issues, this.severity);
    return issues;
  },
};
