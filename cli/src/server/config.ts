export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix?: string;
  presignExpiry: number;
}

export interface ServerConfig {
  port: number;
  templatesDir: string;
  workers: number;
  renderTimeout: number;
  apiKey?: string;
  maxUploadSize: number;
  verbose: boolean;
  cacheMaxSize: number;
  s3?: S3Config;
  sandbox?: string | boolean;
}

export interface ServerCLIFlags {
  port?: string;
  templatesDir?: string;
  workers?: string;
  timeout?: string;
  apiKey?: string;
  maxUpload?: string;
  cacheMaxSize?: string;
  verbose?: boolean;
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Prefix?: string;
  sandbox?: string | boolean;
}

export function loadConfig(flags: ServerCLIFlags): ServerConfig {
  const config: ServerConfig = {
    port: parseInt(flags.port ?? process.env['FACET_PORT'] ?? '3010', 10),
    templatesDir: flags.templatesDir ?? process.env['FACET_TEMPLATES_DIR'] ?? '.',
    workers: parseInt(flags.workers ?? process.env['FACET_WORKERS'] ?? '2', 10),
    renderTimeout: parseInt(flags.timeout ?? process.env['FACET_RENDER_TIMEOUT'] ?? '60000', 10),
    apiKey: flags.apiKey ?? process.env['FACET_API_KEY'],
    maxUploadSize: parseInt(flags.maxUpload ?? process.env['FACET_MAX_UPLOAD'] ?? '52428800', 10),
    cacheMaxSize: parseInt(flags.cacheMaxSize ?? process.env['FACET_CACHE_MAX_SIZE'] ?? '104857600', 10),
    verbose: flags.verbose ?? false,
    sandbox: flags.sandbox,
  };

  const s3Endpoint = flags.s3Endpoint ?? process.env['FACET_S3_ENDPOINT'];
  const s3Bucket = flags.s3Bucket ?? process.env['FACET_S3_BUCKET'];
  if (s3Endpoint && s3Bucket) {
    config.s3 = {
      endpoint: s3Endpoint,
      bucket: s3Bucket,
      region: flags.s3Region ?? process.env['FACET_S3_REGION'] ?? 'us-east-1',
      accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? '',
      prefix: flags.s3Prefix ?? process.env['FACET_S3_PREFIX'],
      presignExpiry: parseInt(process.env['FACET_S3_PRESIGN_EXPIRY'] ?? '3600', 10),
    };
  }

  return config;
}
