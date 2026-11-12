import { readFileSync, readdirSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { lintPng, pngRules } from './png.js';
import { lintDocument, documentRules } from './documents.js';
import { formatESLint } from './eslint.js';
import { cwdRelativePath } from './external-paths.js';
import { defaultDiagramRenderer, createDiagramTempDir, type DiagramRenderer } from './diagram-renderer.js';
import { hasDirectDiagramCandidate } from './diagram-candidates.js';
import { runExternalTool, type ExternalToolRunner } from './external-runner.js';
import { OXLINT_RULE, runOxlint } from './oxlint.js';
import { allRules } from './rules/index.js';
import { formatIssues } from './reporter.js';
import type { LintContext, LintFileType, LintIssue, Severity } from './types.js';
import { runVale } from './vale.js';
import { runVisualReview, type VisualMetadata } from './visual.js';

export interface LintLogger { error(message: string): void; info(message: string): void; log(message: string): void; warn(message: string): void; }
export interface LintOptions {
  json?: boolean;
  embeddedImages?: boolean;
  paths: string[]; verbose: boolean; rule?: string; severity: string; vale?: boolean; diagrams?: boolean; diagramsAi?: boolean;
  llmModel?: string;
  /** Lowest severity that makes runLint return 1; reported issues below it are printed but pass. Default "warning". */
  failOnSeverity?: Severity;
  logger: LintLogger; cwd?: string; runner?: ExternalToolRunner; diagramRenderer?: DiagramRenderer;
}
const SKIP_DIRS = new Set(['node_modules', '.facet', 'dist', '.git', 'storybook-static']);
const SKIP_TSX_SUFFIXES = ['.test.tsx', '.stories.tsx', '.spec.tsx'];
function fileType(path: string): LintFileType | undefined {
  const extension = extname(path).slice(1).toLowerCase();
  return ['tsx', 'mdx', 'md', 'png', 'pdf', 'docx'].includes(extension) ? extension as LintFileType : undefined;
}
function lexical(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }

export function discoverFiles(paths: string[], cwd = process.cwd()): string[] {
  const files = new Set<string>();
  for (const input of paths) {
    const absolute = resolve(cwd, input);
    const stat = statSync(absolute, { throwIfNoEntry: false });
    if (!stat) throw new Error(`Path does not exist: ${input}`);
    if (stat.isFile()) { if (fileType(absolute)) files.add(absolute); }
    else if (stat.isDirectory()) collectFiles(absolute, files);
  }
  return [...files].sort(lexical);
}
function collectFiles(directory: string, files: Set<string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) collectFiles(path, files); continue; }
    if (!entry.isFile()) continue;
    const type = fileType(entry.name);
    if (type && !(type === 'tsx' && SKIP_TSX_SUFFIXES.some((suffix) => entry.name.endsWith(suffix)))) files.add(path);
  }
}
export async function findDiagramCandidates(files: string[], cwd = process.cwd()): Promise<string[]> {
  const candidates: string[] = [];
  for (const file of files) {
    const type = fileType(file);
    if (type !== 'tsx' && type !== 'mdx') continue;
    if (await hasDirectDiagramCandidate(readFileSync(resolve(cwd, file), 'utf8'), type)) candidates.push(file);
  }
  return candidates;
}
function disabled(lines: string[], index: number): boolean { return lines[index]?.includes('// facet-lint-disable') === true || (index > 0 && lines[index - 1].includes('// facet-lint-disable-next-line')); }
function compare(left: LintIssue, right: LintIssue): number { return lexical(left.file, right.file) || (left.line ?? 0) - (right.line ?? 0) || (left.column ?? 0) - (right.column ?? 0); }
function parseSeverity(value: string): Severity { if (value === 'warning' || value === 'error' || value === 'info') return value; throw new Error(`Invalid severity "${value}". Expected "info", "warning" or "error"`); }
const severityRank = { info: 0, warning: 1, error: 2 };
function logMetadata(logger: LintLogger, file: string, metadata: VisualMetadata): void {
  logger.info(`Diagram AI review: file=${file} provider=${metadata.provider} model=${metadata.model} inputTokens=${metadata.inputTokens ?? 0} outputTokens=${metadata.outputTokens ?? 0} duration=${metadata.duration ?? 'unknown'} costUSD=${metadata.costUSD ?? 0}`);
}

async function lintFile(options: { filePath: string; cwd: string; rule?: string; embeddedImages: boolean }): Promise<LintIssue[]> {
  const { filePath, rule, embeddedImages } = options;
  const file = relative(options.cwd, filePath);
  const extension = extname(filePath).toLowerCase();
  const rules = allRules.filter(candidate => (!rule || candidate.name === rule) && candidate.fileTypes.includes(fileType(filePath)!));
  try {
    if (extension === '.png') return !rule || pngRules.some(candidate => candidate.name === rule) ? (await lintPng(readFileSync(filePath), file)).filter(issue => !rule || issue.rule === rule) : [];
    if (extension === '.pdf' || extension === '.docx') {
      return !rule || documentRules.some(candidate => candidate.name === rule)
        ? (await lintDocument({ data: readFileSync(filePath), file, format: extension === '.pdf' ? 'pdf' : 'docx', embeddedImages })).filter(issue => !rule || issue.rule === rule) : [];
    }
    if (!rules.length) return [];
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ctx: LintContext = { filePath: file, fileType: fileType(filePath)!, lines, content };
    return (await Promise.all(rules.map(candidate => candidate.check(ctx)))).flat().filter(issue => {
      if (issue.line === undefined || issue.line < 1 || issue.line > lines.length) throw new Error(`Invalid source location for rule ${issue.rule}`);
      return !disabled(lines, issue.line - 1);
    });
  } catch (cause) {
    throw new Error(`Cannot lint ${extension.slice(1).toUpperCase()} ${file}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export async function runLint(options: LintOptions): Promise<number> {
  const { logger } = options;
  const cwd = resolve(options.cwd ?? process.cwd());
  const minimum = parseSeverity(options.severity);
  if (options.diagramsAi && !options.diagrams) { logger.error('--diagrams-ai requires --diagrams'); return 1; }
  const rules = options.rule ? allRules.filter((rule) => rule.name === options.rule) : allRules;
  if (options.rule && !rules.length && options.rule !== OXLINT_RULE && ![...pngRules, ...documentRules].some(rule => rule.name === options.rule)) {
    logger.error(`Unknown rule: ${options.rule}. Available rules: ${[...allRules, ...pngRules, ...documentRules].map(rule => rule.name).concat(OXLINT_RULE).join(', ')}`);
    return 2;
  }
  const files = discoverFiles(options.paths, cwd);
  if (!files.length) { if (options.json) logger.log('[]'); else logger.warn('No supported files found (.tsx, .mdx, .md, .png, .pdf, .docx)'); return 0; }
  if (options.verbose && !options.json) logger.info(`Scanning ${files.length} file${files.length === 1 ? '' : 's'}...`);
  const issues: LintIssue[] = [];
  for (const absolute of files) {
    issues.push(...await lintFile({ filePath: absolute, cwd, rule: options.rule, embeddedImages: !!options.embeddedImages }));
  }
  const relativeFiles = files.map((file) => cwdRelativePath(cwd, file));
  const runner = options.runner ?? runExternalTool;
  if (!options.rule || options.rule === OXLINT_RULE) {
    const oxlintIssues = await runOxlint({ files: relativeFiles.filter((file) => file.endsWith('.tsx')), cwd, runner });
    const sources = new Map<string, string[]>();
    for (const found of oxlintIssues) {
      if (!sources.has(found.file)) sources.set(found.file, readFileSync(resolve(cwd, found.file), 'utf8').split('\n'));
      if (!disabled(sources.get(found.file)!, found.line! - 1)) issues.push(found);
    }
  }
  if (options.vale) issues.push(...await runVale(relativeFiles.filter((file) => file.endsWith('.md') || file.endsWith('.mdx')), cwd, runner));
  const visible = (items: LintIssue[]) => items.filter(issue => severityRank[issue.severity] >= severityRank[minimum]).sort(compare);
  const report = (items: LintIssue[]) => {
    if (options.json) return;
    const output = formatIssues({ issues: visible(items), verbose: false, summary: false });
    if (output) logger.log(output);
  };
  report(issues);
  const sourceCount = issues.length;
  let completed = false;
  try {
    if (options.diagrams) {
      const candidates = await findDiagramCandidates(files, cwd);
      const renderer = options.diagramRenderer ?? defaultDiagramRenderer;
      const llmModel = options.llmModel ?? process.env.FACET_LLM_MODEL;
      if (candidates.length > 0) {
        const temp = await createDiagramTempDir();
        try {
          for (const candidate of candidates) {
            const pngPath = await renderer.render(candidate, cwd, temp);
            if (options.diagramsAi) {
              const review = await runVisualReview(candidate, pngPath, cwd, runner, llmModel);
              issues.push(...review.issues);
              logMetadata(logger, cwdRelativePath(cwd, candidate), review.metadata);
            }
          }
        } finally { await rm(temp, { recursive: true, force: true }); }
      }
    }
    completed = true;
  } finally {
    report(issues.slice(sourceCount));
    const output = options.json ? (completed ? formatESLint({ files, issues: visible(issues) }) : '') : formatIssues({ issues: visible(issues), verbose: options.verbose && completed, details: false });
    if (output) logger.log(output);
  }
  const filtered = visible(issues);
  return filtered.some(issue => severityRank[issue.severity] >= severityRank[options.failOnSeverity ?? 'warning']) ? 1 : 0;
}
