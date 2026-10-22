import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, relative, extname } from 'path';
import type { Logger } from '../utils/logger.js';
import type { LintIssue, LintContext, Severity } from './types.js';
import { allRules } from './rules/index.js';
import { formatIssues } from './reporter.js';
import { lintPng, pngRules } from './png.js';
import { formatESLint } from './eslint.js';
import { documentRules, lintDocument } from './documents.js';

interface LintOptions {
  paths: string[];
  verbose: boolean;
  rule?: string;
  severity: string;
  logger: Logger;
  json?: boolean;
  embeddedImages?: boolean;
}

const SKIP_DIRS = new Set(['node_modules', '.facet', 'dist', '.git', 'storybook-static']);
const SKIP_SUFFIXES = ['.test.tsx', '.stories.tsx', '.spec.tsx'];
const EXTENSIONS = new Set(['.tsx', '.png', '.pdf', '.docx']);
const SEVERITY: Record<Severity, number> = { info: 0, warning: 1, error: 2 };

function discoverFiles(paths: string[]): string[] {
  const files: string[] = [];

  for (const p of paths) {
    const abs = resolve(p);
    const stat = statSync(abs, { throwIfNoEntry: false });
    if (!stat) throw new Error(`Lint path does not exist: ${p}`);

    if (stat.isFile() && EXTENSIONS.has(extname(abs).toLowerCase())) {
      files.push(abs);
    } else if (stat.isDirectory()) {
      collectFiles(abs, files);
    }
  }

  return [...new Set(files)];
}

function collectFiles(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        collectFiles(resolve(dir, entry.name), files);
      }
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name).toLowerCase())) {
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

async function lintFile(options: { filePath: string; rule?: string; embeddedImages: boolean }): Promise<LintIssue[]> {
  const { filePath, rule, embeddedImages } = options;
  const file = relative(process.cwd(), filePath);
  const extension = extname(filePath).toLowerCase();
  const rules = allRules.filter(candidate => !rule || candidate.name === rule);
  try {
    if (extension === '.png') return !rule || pngRules.some(candidate => candidate.name === rule) ? await lintPng(readFileSync(filePath), file) : [];
    if (extension === '.pdf' || extension === '.docx') {
      return !rule || documentRules.some(candidate => candidate.name === rule)
        ? await lintDocument({ data: readFileSync(filePath), file, format: extension === '.pdf' ? 'pdf' : 'docx', embeddedImages }) : [];
    }
    if (!rules.length) return [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ctx: LintContext = { filePath: file, lines, content };
    return rules.flatMap(candidate => candidate.check(ctx)).filter(issue => {
      if (issue.line === undefined || issue.line < 1 || issue.line > lines.length) throw new Error(`Invalid source location for rule ${issue.rule}`);
      return !isDisabled(lines, issue.line - 1);
    });
  } catch (cause) {
    throw new Error(`Cannot lint ${extension.slice(1).toUpperCase()} ${file}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export async function runLint(options: LintOptions): Promise<number> {
  const { logger, verbose, severity } = options;
  if (severity !== 'info' && severity !== 'warning' && severity !== 'error') throw new Error(`Invalid severity: ${severity}. Expected info, warning, or error.`);
  const catalog = [...allRules, ...pngRules, ...documentRules];
  if (options.rule && !catalog.some(rule => rule.name === options.rule)) throw new Error(`Unknown rule: ${options.rule}. Available rules: ${catalog.map(rule => rule.name).join(', ')}`);

  const files = discoverFiles(options.paths);
  if (files.length === 0) {
    if (options.json) logger.log('[]');
    else logger.warn('No .tsx, .png, .pdf or .docx files found');
    return 0;
  }

  if (verbose && !options.json) {
    logger.info(`Scanning ${files.length} file${files.length !== 1 ? 's' : ''}...`);
  }

  const allIssues: LintIssue[] = [];

  for (const filePath of files) {
    const issues = await lintFile({ filePath, rule: options.rule, embeddedImages: options.embeddedImages ?? false });
    allIssues.push(...issues.filter(issue => (!options.rule || issue.rule === options.rule) && SEVERITY[issue.severity] >= SEVERITY[severity]));
  }

  const output = options.json ? formatESLint({ files, issues: allIssues }) : formatIssues(allIssues, verbose);
  if (output) logger.log(output);

  return allIssues.some(issue => issue.severity !== 'info') ? 1 : 0;
}
