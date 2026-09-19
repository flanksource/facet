import type { ExternalToolRunner } from './external-runner.js';
import { requestedPathMap, resolveReportedPath } from './external-paths.js';
import type { LintIssue, Severity } from './types.js';

const ALERT_KEYS = new Set(['Check', 'Description', 'Link', 'Match', 'Severity', 'Span', 'Message', 'Line', 'Column', 'Action']);
function severity(value: unknown): Severity {
  if (value === 'error') return 'error';
  if (value === 'warning' || value === 'suggestion') return 'warning';
  throw new Error(`Vale returned an invalid severity: ${JSON.stringify(value)}`);
}
function alert(raw: unknown, file: string): LintIssue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Vale returned a malformed alert for ${file}`);
  const a = raw as Record<string, unknown>;
  if ([...Object.keys(a)].some((key) => !ALERT_KEYS.has(key))
    || typeof a.Check !== 'string' || !a.Check
    || typeof a.Message !== 'string' || !a.Message
    || !Number.isInteger(a.Line) || (a.Line as number) < 1
    || !Array.isArray(a.Span) || a.Span.length !== 2
    || !a.Span.every((n) => Number.isInteger(n) && (n as number) >= 1)) throw new Error(`Vale returned a malformed alert for ${file}`);
  return { file, line: a.Line as number, column: a.Span[0] as number, rule: `vale.${a.Check}`, severity: severity(a.Severity), message: a.Message };
}

export async function runVale(files: string[], cwd: string, runner: ExternalToolRunner): Promise<LintIssue[]> {
  if (!files.length) return [];
  const requested = requestedPathMap(cwd, files);
  const { stdout } = await runner('vale', ['--output=JSON', '--no-exit', '--', ...files], { cwd });
  let output: unknown;
  try { output = JSON.parse(stdout); } catch { throw new Error('Vale returned malformed JSON output'); }
  if (!output || typeof output !== 'object' || Array.isArray(output)) throw new Error('Vale returned malformed JSON output');
  const issues: LintIssue[] = [];
  for (const [reported, values] of Object.entries(output)) {
    const file = resolveReportedPath(cwd, reported, requested);
    if (!file) throw new Error(`Vale returned a diagnostic for an unrequested file: ${reported}`);
    if (!Array.isArray(values)) throw new Error(`Vale returned malformed alerts for ${reported}`);
    for (const value of values) issues.push(alert(value, file));
  }
  return issues;
}
