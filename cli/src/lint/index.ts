import { readFileSync, readdirSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cwdRelativePath } from './external-paths.js';
import { defaultDiagramRenderer, createDiagramTempDir, type DiagramRenderer } from './diagram-renderer.js';
import { hasDirectDiagramCandidate } from './diagram-candidates.js';
import { runExternalTool, type ExternalToolRunner } from './external-runner.js';
import { allRules } from './rules/index.js';
import { formatIssues } from './reporter.js';
import type { LintContext, LintFileType, LintIssue, Severity } from './types.js';
import { runVale } from './vale.js';
import { createLlmClient, resolveLlmConfig, type LlmClient } from './llm.js';
import { runVisualReview, type VisualReviewer } from './visual.js';

export interface LintLogger { error(message: string): void; info(message: string): void; log(message: string): void; warn(message: string): void; }
export interface LintOptions {
  paths: string[]; verbose: boolean; rule?: string; severity: string; vale?: boolean; diagrams?: boolean; diagramsAi?: boolean;
  llmProvider?: string; llmModel?: string; llmBaseUrl?: string; llm?: LlmClient; visualReviewer?: VisualReviewer;
  logger: LintLogger; cwd?: string; runner?: ExternalToolRunner; diagramRenderer?: DiagramRenderer;
}
const SKIP_DIRS = new Set(['node_modules', '.facet', 'dist', '.git', 'storybook-static']);
const SKIP_TSX_SUFFIXES = ['.test.tsx', '.stories.tsx', '.spec.tsx'];
function fileType(path: string): LintFileType | undefined { if (path.endsWith('.tsx')) return 'tsx'; if (path.endsWith('.mdx')) return 'mdx'; if (path.endsWith('.md')) return 'md'; return undefined; }
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
export function findDiagramCandidates(files: string[], cwd = process.cwd()): string[] {
  return files.filter((file) => {
    const type = fileType(file);
    if (type !== 'tsx' && type !== 'mdx') return false;
    return hasDirectDiagramCandidate(readFileSync(resolve(cwd, file), 'utf8'), type);
  });
}
function disabled(lines: string[], index: number): boolean { return lines[index]?.includes('// facet-lint-disable') === true || (index > 0 && lines[index - 1].includes('// facet-lint-disable-next-line')); }
function compare(left: LintIssue, right: LintIssue): number { return lexical(left.file, right.file) || left.line - right.line || (left.column ?? 0) - (right.column ?? 0) || lexical(left.rule, right.rule) || lexical(left.severity, right.severity) || lexical(left.message, right.message); }
function parseSeverity(value: string): Severity { if (value === 'warning' || value === 'error') return value; throw new Error(`Invalid severity "${value}". Expected "warning" or "error"`); }
function logMetadata(logger: LintLogger, file: string, metadata: { model: string; provider: string; inputTokens?: number; outputTokens?: number; durationMs: number }): void {
  logger.info(`Diagram AI review: file=${file} provider=${metadata.provider} model=${metadata.model} inputTokens=${metadata.inputTokens ?? 0} outputTokens=${metadata.outputTokens ?? 0} durationMs=${metadata.durationMs}`);
}

export async function runLint(options: LintOptions): Promise<number> {
  const { logger } = options;
  const cwd = resolve(options.cwd ?? process.cwd());
  const minimum = parseSeverity(options.severity);
  if (options.diagramsAi && !options.diagrams) { logger.error('--diagrams-ai requires --diagrams'); return 1; }
  const rules = options.rule ? allRules.filter((rule) => rule.name === options.rule) : allRules;
  if (options.rule && !rules.length) { logger.error(`Unknown rule: ${options.rule}`); logger.log(`Available rules: ${allRules.map((rule) => rule.name).join(', ')}`); return 1; }
  const files = discoverFiles(options.paths, cwd);
  if (!files.length) { logger.warn('No supported files found (.tsx, .mdx, .md)'); return 0; }
  if (options.verbose) logger.info(`Scanning ${files.length} file${files.length === 1 ? '' : 's'}...`);
  const issues: LintIssue[] = [];
  for (const absolute of files) {
    const type = fileType(absolute)!;
    const applicable = rules.filter((rule) => rule.fileTypes.includes(type));
    if (!applicable.length) continue;
    const content = readFileSync(absolute, 'utf8');
    const context: LintContext = { filePath: cwdRelativePath(cwd, absolute), fileType: type, lines: content.split('\n'), content };
    for (const rule of applicable) for (const issue of rule.check(context)) if (!disabled(context.lines, issue.line - 1)) issues.push(issue);
  }
  const relativeFiles = files.map((file) => cwdRelativePath(cwd, file));
  const runner = options.runner ?? runExternalTool;
  if (options.vale) issues.push(...await runVale(relativeFiles.filter((file) => file.endsWith('.md') || file.endsWith('.mdx')), cwd, runner));
  if (options.diagrams) {
    const candidates = findDiagramCandidates(files, cwd);
    const renderer = options.diagramRenderer ?? defaultDiagramRenderer;
    let llm: VisualReviewer | undefined = options.visualReviewer ?? options.llm;
    if (options.diagramsAi && !llm) llm = createLlmClient(resolveLlmConfig(process.env, { provider: options.llmProvider, model: options.llmModel, baseUrl: options.llmBaseUrl }));
    if (candidates.length > 0) {
      const temp = await createDiagramTempDir();
      try {
        for (const candidate of candidates) {
          const pngPath = await renderer.render(candidate, cwd, temp);
          if (options.diagramsAi && llm) {
            const review = await runVisualReview(candidate, pngPath, cwd, llm);
            issues.push(...review.issues);
            logMetadata(logger, cwdRelativePath(cwd, candidate), review.metadata);
          }
        }
      } finally { await rm(temp, { recursive: true, force: true }); }
    }
  }
  const filtered = issues.filter((issue) => minimum === 'warning' || issue.severity === 'error').sort(compare);
  const output = formatIssues(filtered, options.verbose);
  if (output) logger.log(output);
  return filtered.length ? 1 : 0;
}
