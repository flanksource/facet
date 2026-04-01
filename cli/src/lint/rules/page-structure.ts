import type { LintRule, LintContext, LintIssue } from '../types.js';
import { parseJSXTree, type JSXNode } from '../jsx-parser.js';

const EXEMPT_FILES = ['Header.tsx', 'Footer.tsx', 'PageBreak.tsx', 'index.tsx'];
const ALLOWED_SIBLINGS = new Set(['Header', 'Footer', 'PageBreak']);
const IMPORTS_PAGE = /import\b.*\bPage\b.*from\b/;

function isPageComponent(name: string): boolean {
  return name === 'Page' || name.endsWith('Page');
}

function isExempt(filePath: string): boolean {
  if (EXEMPT_FILES.some((f) => filePath.endsWith(f))) return true;
  if (filePath.endsWith('/Page.tsx') || filePath === 'Page.tsx') return true;
  return false;
}

function isTemplateFile(ctx: LintContext): boolean {
  if (IMPORTS_PAGE.test(ctx.content)) return true;
  if (ctx.filePath.includes('/templates/')) return true;
  if (/Template\.tsx$/.test(ctx.filePath)) return true;
  return false;
}

function isCustomPageFile(ctx: LintContext): boolean {
  return /[A-Z]\w*Page\.tsx$/.test(ctx.filePath) && !ctx.filePath.endsWith('/Page.tsx');
}

function findNestedPages(node: JSXNode, issues: LintIssue[], file: string, severity: 'error' | 'warning') {
  for (const child of node.children) {
    if (isPageComponent(child.name)) {
      issues.push({
        file,
        line: child.line,
        rule: 'page-structure',
        severity,
        message: `Nested <${child.name}> inside <${node.name}> is not allowed`,
      });
    }
    findNestedPages(child, issues, file, severity);
  }
}

export const pageStructure: LintRule = {
  name: 'page-structure',
  description: 'All content must be inside a <Page> wrapper; no nested pages or orphaned content',
  severity: 'error',

  check(ctx: LintContext): LintIssue[] {
    if (isExempt(ctx.filePath)) return [];

    const issues: LintIssue[] = [];
    const tree = parseJSXTree(ctx.content);
    if (tree.length === 0) return [];

    if (isCustomPageFile(ctx)) {
      const usesPage = hasPageDescendant(tree);
      if (!usesPage) {
        issues.push({
          file: ctx.filePath,
          line: tree[0].line,
          rule: this.name,
          severity: this.severity,
          message: 'Custom Page component must use the facet <Page> component internally',
        });
      }
      return issues;
    }

    if (!isTemplateFile(ctx)) return [];

    const hasAnyPage = tree.some((n) => isPageComponent(n.name));
    if (!hasAnyPage) {
      issues.push({
        file: ctx.filePath,
        line: tree[0].line,
        rule: this.name,
        severity: this.severity,
        message: 'Template must wrap content in a <Page> component',
      });
      return issues;
    }

    for (const node of tree) {
      if (!isPageComponent(node.name) && !ALLOWED_SIBLINGS.has(node.name)) {
        issues.push({
          file: ctx.filePath,
          line: node.line,
          rule: this.name,
          severity: this.severity,
          message: `Content outside <Page> wrapper. Only Header, Footer, PageBreak, and *Page components are allowed as siblings`,
        });
      }

      if (isPageComponent(node.name)) {
        findNestedPages(node, issues, ctx.filePath, this.severity);
      }
    }

    return issues;
  },
};

function hasPageDescendant(nodes: JSXNode[]): boolean {
  for (const node of nodes) {
    if (node.name === 'Page') return true;
    if (hasPageDescendant(node.children)) return true;
  }
  return false;
}
