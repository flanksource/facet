import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { assetPath } from '../utils/assets.js';
import { requestedPathMap, resolveReportedPath } from './external-paths.js';
import type { ExternalToolRunner } from './external-runner.js';
import type { LintIssue, Severity } from './types.js';

export const OXLINT_RULE = 'no-data-driven-diagram';
const OXLINT_CODE = `facet(${OXLINT_RULE})`;
const requireCjs = createRequire(import.meta.url);

/** Entry script of facet's own `oxlint` install (never the PATH one), run through the current Node. */
export function resolveOxlintBinary(): string {
  let manifestPath: string;
  try { manifestPath = requireCjs.resolve('oxlint/package.json'); } catch (cause) {
    throw new Error(`Cannot run ${OXLINT_RULE}: the "oxlint" package that ships with facet is not installed beside this CLI (reinstall facet, or use the npm distribution rather than the standalone binary)`, { cause });
  }
  const bin = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { bin?: Record<string, string> }).bin?.oxlint;
  if (!bin) throw new Error(`Cannot run ${OXLINT_RULE}: ${manifestPath} declares no "oxlint" binary`);
  return resolve(dirname(manifestPath), bin);
}

function severity(value: unknown, file: string): Severity {
  if (value === 'error' || value === 'warning') return value;
  throw new Error(`oxlint returned an unsupported severity ${JSON.stringify(value)} for ${file}`);
}

function issue(raw: unknown, requested: Map<string, string>, cwd: string): LintIssue {
  const d = raw as { message?: unknown; code?: unknown; severity?: unknown; filename?: unknown; labels?: { span?: { line?: unknown; column?: unknown } }[] };
  if (!d || typeof d !== 'object' || typeof d.filename !== 'string' || typeof d.message !== 'string') throw new Error('oxlint returned a malformed diagnostic');
  const file = resolveReportedPath(cwd, d.filename, requested);
  if (!file) throw new Error(`oxlint returned a diagnostic for an unrequested file: ${d.filename}`);
  if (d.code !== OXLINT_CODE) throw new Error(`oxlint could not lint ${file}: ${d.message}`);
  const span = d.labels?.[0]?.span;
  if (!Number.isInteger(span?.line) || !Number.isInteger(span?.column)) throw new Error(`oxlint returned a diagnostic without a source location for ${file}`);
  return { file, line: span!.line as number, column: span!.column as number, rule: OXLINT_RULE, severity: severity(d.severity, file), message: d.message };
}

export interface RunOxlintOptions { files: string[]; cwd: string; runner: ExternalToolRunner; }

/** Runs facet's oxlint plugin over `files` (cwd-relative TSX) and maps every diagnostic to a LintIssue. */
export async function runOxlint({ files, cwd, runner }: RunOxlintOptions): Promise<LintIssue[]> {
  if (!files.length) return [];
  const binary = resolveOxlintBinary();
  const configDir = await mkdtemp(join(tmpdir(), 'facet-oxlint-'));
  try {
    const config = join(configDir, '.oxlintrc.json');
    await writeFile(config, JSON.stringify({
      jsPlugins: [assetPath('facet-diagrams.oxlint.mjs')],
      categories: { correctness: 'off' },
      rules: { [`facet/${OXLINT_RULE}`]: 'warn' },
    }));
    const { stdout } = await runner(process.execPath, [binary, '-c', config, '--format', 'json', '--no-ignore', '--', ...files.map((file) => resolve(cwd, file))], { cwd });
    let output: { diagnostics?: unknown };
    try { output = JSON.parse(stdout); } catch { throw new Error('oxlint returned malformed JSON output'); }
    if (!output || !Array.isArray(output.diagnostics)) throw new Error('oxlint returned malformed JSON output');
    const requested = requestedPathMap(cwd, files);
    return output.diagnostics.map((diagnostic) => issue(diagnostic, requested, cwd));
  } finally { await rm(configDir, { recursive: true, force: true }); }
}
