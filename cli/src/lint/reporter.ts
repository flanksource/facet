import chalk from 'chalk';
import type { LintIssue } from './types.js';
import { compactReportValue, formatLocation, issueLocations } from './locations.js';

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

    const sorted = fileIssues.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
    for (const issue of sorted) {
      const pos = issueLocations(issue).map(formatLocation).join('\n           ');
      const sev = issue.severity === 'error'
        ? chalk.red(issue.severity)
        : issue.severity === 'warning' ? chalk.yellow(issue.severity) : chalk.blue(issue.severity);
      const rule = chalk.gray(issue.rule);
      lines.push(`  ${chalk.gray(pos.padEnd(8))} ${sev.padEnd(18)}  ${issue.message}  ${rule}`);
      const data = compactReportValue(issue.data);
      if (data !== undefined) lines.push(`    ${JSON.stringify(data)}`);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;
  lines.push('');
  lines.push(`${chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`)}, ${chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`)}${infos ? `, ${chalk.blue(`${infos} info`)}` : ''}`);

  return lines.join('\n');
}
