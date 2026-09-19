import type { ExternalToolRunner } from './external-runner.js';
import { requestedPathMap, resolveReportedPath } from './external-paths.js';
import type { LintIssue, Severity } from './types.js';

const ROOT_KEYS = ['schema_version', 'files_analyzed', 'diagrams_analyzed', 'diagnostics'];
const DIAGNOSTIC_KEYS = ['file', 'line', 'column', 'severity', 'code', 'message'];
const DOCUMENTED_CODES = new Set(['duplicate-box-id', 'missing-arrow-from', 'missing-arrow-to', 'duplicate-arrow']);
const onlyKeys = (value: Record<string, unknown>, allowed: string[], required: string[]) => {
  const keys = Object.keys(value);
  return required.every((k) => keys.includes(k)) && keys.every((k) => allowed.includes(k));
};
const nonNegativeInt = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
function malformed(message = 'Captain returned output that does not match schema version 1'): never { throw new Error(message); }
function parseSeverity(value: unknown): Severity { if (value === 'error' || value === 'warning') return value; malformed(`Captain returned an invalid diagnostic severity: ${JSON.stringify(value)}`); }

export async function runCaptain(files: string[], cwd: string, runner: ExternalToolRunner): Promise<LintIssue[]> {
  if (!files.length) return [];
  const requested = requestedPathMap(cwd, files);
  const { stdout } = await runner('captain', ['diagrams', 'analyze', '--schema-version=1', '--', ...files], { cwd });
  let parsed: unknown;
  try { parsed = JSON.parse(stdout); } catch { malformed('Captain returned malformed JSON output'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) malformed();
  const root = parsed as Record<string, unknown>;
  if (!onlyKeys(root, ROOT_KEYS, ROOT_KEYS) || root.schema_version !== 1
    || !nonNegativeInt(root.files_analyzed) || root.files_analyzed !== files.length
    || !nonNegativeInt(root.diagrams_analyzed) || !Array.isArray(root.diagnostics)) malformed();
  const issues: LintIssue[] = [];
  for (const raw of root.diagnostics) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) malformed();
    const diagnostic = raw as Record<string, unknown>;
    if (!onlyKeys(diagnostic, DIAGNOSTIC_KEYS, ['file', 'line', 'severity', 'code', 'message'])
      || typeof diagnostic.file !== 'string' || !diagnostic.file
      || !Number.isInteger(diagnostic.line) || (diagnostic.line as number) < 1
      || (diagnostic.column !== undefined && (!Number.isInteger(diagnostic.column) || (diagnostic.column as number) < 1))
      || typeof diagnostic.code !== 'string' || !DOCUMENTED_CODES.has(diagnostic.code)
      || typeof diagnostic.message !== 'string' || !diagnostic.message) malformed();
    const file = resolveReportedPath(cwd, diagnostic.file, requested);
    if (!file) malformed(`Captain returned a diagnostic for an unrequested file: ${diagnostic.file}`);
    issues.push({ file, line: diagnostic.line as number, ...(diagnostic.column === undefined ? {} : { column: diagnostic.column as number }), severity: parseSeverity(diagnostic.severity), rule: `captain.${diagnostic.code}`, message: diagnostic.message });
  }
  return issues;
}
