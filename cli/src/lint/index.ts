import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, relative } from 'path';
import type { Logger } from '../utils/logger.js';
import type { LintIssue, LintContext, Severity } from './types.js';
import { allRules } from './rules/index.js';
import { formatIssues } from './reporter.js';

interface LintOptions {
  paths: string[];
  verbose: boolean;
  rule?: string;
  severity: string;
  logger: Logger;
}

const SKIP_DIRS = new Set(['node_modules', '.facet', 'dist', '.git', 'storybook-static']);
const SKIP_SUFFIXES = ['.test.tsx', '.stories.tsx', '.spec.tsx'];

function discoverFiles(paths: string[]): string[] {
  const files: string[] = [];

  for (const p of paths) {
    const abs = resolve(p);
    const stat = statSync(abs, { throwIfNoEntry: false });
    if (!stat) continue;

    if (stat.isFile() && abs.endsWith('.tsx')) {
      files.push(abs);
    } else if (stat.isDirectory()) {
      collectTsx(abs, files);
    }
  }

  return files;
}

function collectTsx(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        collectTsx(resolve(dir, entry.name), files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      if (!SKIP_SUFFIXES.some((s) => entry.name.endsWith(s))) {
        files.push(resolve(dir, entry.name));
      }
    }
  }
}

function isDisabled(lines: string[], lineIndex: number): boolean {
  const line = lines[lineIndex];
  if (line.includes('// facet-lint-disable')) return true;
  if (lineIndex > 0 && lines[lineIndex - 1].includes('// facet-lint-disable-next-line')) return true;
  return false;
}

export async function runLint(options: LintOptions): Promise<number> {
  const { logger, verbose, severity } = options;
  const minSeverity: Severity = severity === 'error' ? 'error' : 'warning';

  const rules = options.rule
    ? allRules.filter((r) => r.name === options.rule)
    : allRules;

  if (options.rule && rules.length === 0) {
    logger.error(`Unknown rule: ${options.rule}`);
    logger.log(`Available rules: ${allRules.map((r) => r.name).join(', ')}`);
    return 1;
  }

  const files = discoverFiles(options.paths);
  if (files.length === 0) {
    logger.warn('No .tsx files found');
    return 0;
  }

  if (verbose) {
    logger.info(`Scanning ${files.length} file${files.length !== 1 ? 's' : ''}...`);
  }

  const allIssues: LintIssue[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relPath = relative(process.cwd(), filePath);

    const ctx: LintContext = { filePath: relPath, lines, content };

    for (const rule of rules) {
      if (minSeverity === 'error' && rule.severity === 'warning') continue;

      const issues = rule.check(ctx);
      for (const issue of issues) {
        if (!isDisabled(lines, issue.line - 1)) {
          allIssues.push(issue);
        }
      }
    }
  }

  const output = formatIssues(allIssues, verbose);
  if (output) logger.log(output);

  return allIssues.length > 0 ? 1 : 0;
}
