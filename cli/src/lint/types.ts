export type Severity = 'error' | 'warning';
export type LintFileType = 'tsx' | 'mdx' | 'md';

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
  fileType: LintFileType;
  lines: string[];
  content: string;
}

export interface LintRule {
  name: string;
  description: string;
  severity: Severity;
  fileTypes: readonly LintFileType[];
  check(ctx: LintContext): LintIssue[];
}
