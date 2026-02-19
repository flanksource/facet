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
}

export interface PreviewServerOptions {
  template: string;
  data?: string;
  dataLoader?: string;
  dataLoaderArgs?: string[];
  port: number;
  verbose: boolean;
}

export interface LoadedData {
  data: Record<string, unknown>;
  outputName: string;
}

export interface RenderedTemplate {
  html: string;
  css: string;
}
