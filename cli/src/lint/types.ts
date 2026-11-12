export type Severity = 'error' | 'warning' | 'info';
export type LintFileType = 'tsx' | 'mdx' | 'md' | 'png' | 'pdf' | 'docx';
export interface PdfLocation { type: 'pdf'; page: number; object?: string; resource?: string }
export interface DocxLocation { type: 'docx'; part: string; elementPath?: string; relationshipId?: string; asset?: string; role?: string; pdf?: PdfLocation }
export type LintLocation = { type: 'source'; line: number; column?: number } | PdfLocation | DocxLocation | {
  type: 'png'; units: 'px'; origin: 'top-left'; image: { width: number; height: number }; x?: number; y?: number; bounds?: { x: number; y: number; width: number; height: number };
};

export interface LintIssue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  severity: Severity;
  message: string;
  locations?: LintLocation[];
  data?: Record<string, unknown>;
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
  severity: Exclude<Severity, 'info'>;
  fileTypes: readonly LintFileType[];
  check(ctx: LintContext): LintIssue[] | Promise<LintIssue[]>;
}
