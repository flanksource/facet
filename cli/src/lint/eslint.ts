import type { LintIssue } from './types.js';
import { resolve } from 'node:path';
import { compactReportValue, issueLocations } from './locations.js';

export function formatESLint({ files, issues }: { files: string[]; issues: LintIssue[] }): string {
  const byFile = new Map<string, LintIssue[]>();
  for (const issue of issues) {
    const path = resolve(issue.file);
    const existing = byFile.get(path);
    if (existing) existing.push(issue);
    else byFile.set(path, [issue]);
  }
  return JSON.stringify(files.filter(file => byFile.has(resolve(file))).map(file => {
    const messages = (byFile.get(resolve(file)) ?? []).map(issue => ({
      ruleId: issue.rule,
      severity: issue.severity === 'error' ? 2 : 1,
      level: issue.severity,
      message: issue.message,
      line: issue.line,
      column: issue.line === undefined ? undefined : (issue.column ?? 1),
      locations: issueLocations(issue),
      data: issue.data,
    })).sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0));
    return compactReportValue({
      filePath: resolve(file), messages,
      errorCount: messages.filter(message => message.severity === 2).length,
      fatalErrorCount: 0,
      warningCount: messages.filter(message => message.severity === 1).length,
      infoCount: messages.some(message => message.level === 'info') ? messages.filter(message => message.level === 'info').length : undefined,
      fixableErrorCount: 0, fixableWarningCount: 0,
    });
  }), null, 2);
}
