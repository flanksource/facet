import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetPath } from '../utils/assets.js';
import type { ExternalToolRunner } from './external-runner.js';
import { cwdRelativePath } from './external-paths.js';
import type { LintIssue, Severity } from './types.js';

export interface VisualReview { issues: LintIssue[]; metadata: VisualMetadata; }
export interface VisualMetadata { model?: string; provider?: string; inputTokens?: number; outputTokens?: number; duration?: string; costUSD?: number; }
const CATEGORIES = new Set(['input', 'alignment', 'spacing', 'whitespace', 'line-breaking', 'text-overlap', 'arrow-rendering']);
const SEVERITIES = new Set(['error', 'warning']);
const PROMPT_NAME = 'review-diagram.prompt';

function promptPath(): string {
  try { return assetPath(PROMPT_NAME); } catch {
    const candidates = [resolve(dirname(fileURLToPath(import.meta.url)), '../assets', PROMPT_NAME), resolve(process.cwd(), '.agents/skills/diagram-designer/prompts', PROMPT_NAME), resolve(dirname(fileURLToPath(import.meta.url)), '../../../.agents/skills/diagram-designer/prompts', PROMPT_NAME)];
    const found = candidates.find((path) => existsSync(path));
    if (!found) throw new Error(`Could not locate ${PROMPT_NAME}`);
    return found;
  }
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Captain visual review returned malformed ${label}`);
  return value as Record<string, unknown>;
}
function metadataValue(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`Captain visual review returned invalid ${label}`);
  return value;
}
function parseReview(value: unknown): { pass: boolean; summary: string; issues: Array<Record<string, string>> } {
  const root = object(value, 'structured output');
  if (Object.keys(root).some((key) => !['pass', 'summary', 'issues'].includes(key)) || typeof root.pass !== 'boolean' || typeof root.summary !== 'string' || !root.summary || !Array.isArray(root.issues)) throw new Error('Captain visual review returned malformed structured output');
  const issues: Array<Record<string, string>> = [];
  for (const raw of root.issues) {
    const issue = object(raw, 'visual issue');
    const keys = Object.keys(issue);
    if (keys.length !== 5 || !['category', 'severity', 'location', 'evidence', 'recommendedFix'].every((key) => keys.includes(key))
      || typeof issue.category !== 'string' || !CATEGORIES.has(issue.category)
      || typeof issue.severity !== 'string' || !SEVERITIES.has(issue.severity)
      || typeof issue.location !== 'string' || !issue.location
      || typeof issue.evidence !== 'string' || !issue.evidence
      || typeof issue.recommendedFix !== 'string' || !issue.recommendedFix) throw new Error('Captain visual review returned malformed visual issue');
    issues.push(issue as Record<string, string>);
  }
  if (root.pass !== (issues.length === 0)) throw new Error('Captain visual review returned inconsistent pass value');
  return { pass: root.pass, summary: root.summary, issues };
}

export async function runVisualReview(file: string, pngPath: string, cwd: string, runner: ExternalToolRunner): Promise<VisualReview> {
  const { stdout } = await runner('captain', ['--json', 'prompt', 'run', promptPath(), '--attach', pngPath, '--no-stream'], { cwd });
  let parsed: unknown;
  try { parsed = JSON.parse(stdout); } catch { throw new Error('Captain visual review returned malformed JSON output'); }
  const root = object(parsed, 'machine result');
  const machineKeys = ['runId', 'batchId', 'status', 'model', 'provider', 'mode', 'chat', 'capabilities', 'text', 'structuredOutput', 'sessionId', 'dir', 'historyFile', 'inputTokens', 'outputTokens', 'costUSD', 'duration', 'total', 'succeeded', 'failed', 'runs'];
  if (Object.keys(root).some((key) => !machineKeys.includes(key)) || !('structuredOutput' in root)) throw new Error('Captain visual review returned malformed machine result');
  if (typeof root.model !== 'string' || !root.model || typeof root.provider !== 'string' || !root.provider) throw new Error('Captain visual review returned no model/provider metadata');
  if (root.status !== undefined && root.status !== 'completed') throw new Error(`Captain visual review did not complete: ${String(root.status)}`);
  const review = parseReview(root.structuredOutput);
  const metadata: VisualMetadata = {
    model: root.model,
    provider: root.provider,
    inputTokens: metadataValue(root.inputTokens, 'input token count'),
    outputTokens: metadataValue(root.outputTokens, 'output token count'),
    duration: typeof root.duration === 'string' ? root.duration : undefined,
    costUSD: metadataValue(root.costUSD, 'costUSD'),
  };
  return { metadata, issues: review.issues.map((issue) => ({ file: cwdRelativePath(cwd, file), line: 1, rule: `captain.visual-review.${issue.category}`, severity: issue.severity as Severity, message: `${issue.location}: ${issue.evidence} Fix: ${issue.recommendedFix}` })) };
}

export function readPromptForPackaging(): string { return readFileSync(promptPath(), 'utf8'); }
