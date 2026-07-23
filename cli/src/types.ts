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
  /** Verbosity: false/0 quiet, 1 (-v) Vite progress, 2 (-vv) Vite debug, 3 (-vvv) plugin debug + profile. */
  verbose: boolean | number;
  refresh?: boolean;
  clearCache?: boolean;
  /** Use the shared Facet-only module install and ignore consumer package metadata. */
  skipModules?: boolean;
  /**
   * Render in a live browser (Vite dev server + Puppeteer) instead of SSR.
   * Required for templates using DOM-measuring components (diagrams/react-xarrows).
   */
  live?: boolean;
  /** Rebuild CSS after rendering so data-dependent class names are included. */
  postProcessCss?: boolean;
  /** Run the SSR loader inside a sandbox-runtime jail (path to settings, or true for the default). */
  sandbox?: string | boolean;
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
  timings?: import('./utils/performance.js').RenderTimings;
}

export interface LoadedData {
  data: Record<string, unknown>;
  outputName: string;
}

export interface RenderedTemplate {
  html: string;
  css: string;
}
