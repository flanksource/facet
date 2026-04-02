export type RemoteRefType = 'github' | 'https' | 'git+ssh' | 'npm';

export interface RemoteRef {
  type: RemoteRefType;
  repoUrl: string;
  subPath: string;
  ref: string;
}

export interface ResolvedTemplate {
  consumerRoot: string;
  templateFile: string;
  resolvedSha?: string;
}

export interface GenerateOptions {
  template: string;
  data?: string;
  dataLoader?: string;
  dataLoaderArgs?: string[];
  outputDir: string;
  outputName?: string;
  outputNameField: string;
  cssScope?: string;
  schema?: string;
  srcDir?: string;
  validate: boolean;
  verbose: boolean;
  refresh?: boolean;
  clearCache?: boolean;
  debug?: boolean;
  pageSize?: string;
  landscape?: boolean;
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  header?: string;
  footer?: string;
  debugTypography?: boolean;
  fontSize?: number;
  encryption?: import('./utils/pdf-security.js').PDFEncryptionOptions;
  signature?: import('./utils/pdf-security.js').PDFSignatureOptions;
}

export interface LoadedData {
  data: Record<string, unknown>;
  outputName: string;
}

export interface RenderedTemplate {
  html: string;
  css: string;
}
