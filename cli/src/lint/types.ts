export type Severity = 'error' | 'warning';

export interface LintIssue {
  file: string;
  line: number;
  column?: number;
  rule: string;
  severity: Severity;
  message: string;
}

export interface LintContext {
  filePath: string;
  lines: string[];
  content: string;
}

export interface LintRule {
  name: string;
  description: string;
  severity: Severity;
  check(ctx: LintContext): LintIssue[];
}
