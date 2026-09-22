import { readFileSync } from 'node:fs';
import { assetPath } from '../utils/assets.js';
import { cwdRelativePath } from './external-paths.js';
import { readImageBase64, type LlmRequest, type LlmResponse } from './llm.js';
import type { LintIssue, Severity } from './types.js';

export interface VisualReview { issues: LintIssue[]; metadata: VisualMetadata; }
/** Provider-neutral boundary used by diagram lint; implementations never expose provider SDKs. */
export interface VisualReviewer { review(request: LlmRequest): Promise<LlmResponse>; }
export interface VisualMetadata { model: string; provider: string; inputTokens?: number; outputTokens?: number; durationMs: number; }
const CATEGORIES = new Set(['input', 'alignment', 'spacing', 'whitespace', 'line-breaking', 'text-overlap', 'arrow-rendering']);
const SEVERITIES = new Set(['error', 'warning']);
const PROMPT_NAME = 'review-diagram.prompt';

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Visual review returned malformed ${label}`);
  return value as Record<string, unknown>;
}

function parseReview(value: unknown): { issues: Array<Record<string, string>> } {
  const root = object(value, 'JSON');
  if (Object.keys(root).some((key) => !['pass', 'summary', 'issues'].includes(key)) || typeof root.pass !== 'boolean' || typeof root.summary !== 'string' || !root.summary || !Array.isArray(root.issues)) throw new Error('Visual review returned malformed structured output');
  const issues: Array<Record<string, string>> = [];
  for (const raw of root.issues) {
    const issue = object(raw, 'visual issue');
    const keys = Object.keys(issue);
    if (keys.length !== 5 || !['category', 'severity', 'location', 'evidence', 'recommendedFix'].every((key) => keys.includes(key))
      || typeof issue.category !== 'string' || !CATEGORIES.has(issue.category)
      || typeof issue.severity !== 'string' || !SEVERITIES.has(issue.severity)
      || typeof issue.location !== 'string' || !issue.location
      || typeof issue.evidence !== 'string' || !issue.evidence
      || typeof issue.recommendedFix !== 'string' || !issue.recommendedFix) throw new Error('Visual review returned malformed visual issue');
    issues.push(issue as Record<string, string>);
  }
  if (root.pass !== (issues.length === 0)) throw new Error('Visual review returned inconsistent pass value');
  return { issues };
}

/** Accept strict JSON or exactly one markdown JSON fence, never trailing prose. */
export function parseVisualResponse(text: string): { issues: Array<Record<string, string>> } {
  const source = text.trim();
  const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (source.startsWith('```') && !fenced) throw new Error('Visual review returned malformed fenced JSON');
  const json = fenced ? fenced[1] : source;
  if (!json) throw new Error('Visual review returned empty JSON');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error('Visual review returned malformed JSON'); }
  return parseReview(parsed);
}

export async function runVisualReview(file: string, pngPath: string, cwd: string, client: VisualReviewer): Promise<VisualReview> {
  const prompt = readFileSync(assetPath(PROMPT_NAME), 'utf8');
  const started = Date.now();
  const response: LlmResponse = await client.review({ imageBase64: readImageBase64(pngPath), prompt });
  const review = parseVisualResponse(response.text);
  const metadata: VisualMetadata = { model: response.model, provider: response.provider, inputTokens: response.usage?.inputTokens, outputTokens: response.usage?.outputTokens, durationMs: Date.now() - started };
  return { metadata, issues: review.issues.map((issue) => ({ file: cwdRelativePath(cwd, file), line: 1, rule: `visual-review.${issue.category}`, severity: issue.severity as Severity, message: `${issue.location}: ${issue.evidence} Fix: ${issue.recommendedFix}` })) };
}

export function readPromptForPackaging(): string { return readFileSync(assetPath(PROMPT_NAME), 'utf8'); }
