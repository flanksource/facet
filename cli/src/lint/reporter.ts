import chalk from 'chalk';
import type { LintIssue } from './types.js';

export function formatIssues(issues: LintIssue[], verbose: boolean): string {
  if (issues.length === 0) {
    return verbose ? chalk.green('No issues found') : '';
  }

  const byFile = new Map<string, LintIssue[]>();
  for (const issue of issues) {
    const existing = byFile.get(issue.file) || [];
    existing.push(issue);
    byFile.set(issue.file, existing);
  }

  const lines: string[] = [];

  for (const [file, fileIssues] of byFile) {
    lines.push('');
    lines.push(chalk.white.bold(file));

    const sorted = fileIssues.sort((a, b) => a.line - b.line);
    for (const issue of sorted) {
      const pos = `${issue.line}:${issue.column ?? 0}`;
      const sev = issue.severity === 'error'
        ? chalk.red(issue.severity)
        : chalk.yellow(issue.severity);
      const rule = chalk.gray(issue.rule);
      lines.push(`  ${chalk.gray(pos.padEnd(8))} ${sev.padEnd(18)}  ${issue.message}  ${rule}`);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  lines.push('');
  lines.push(`${chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`)}, ${chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`)}`);

  return lines.join('\n');
}
