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
  maxRendersPerWorker: number;
  maxQueueDepth: number;
  maxWorkerAgeMs: number;
  maxWorkerRssMb: number;
  workerAcquireTimeoutMs: number;
  persistentSsr: boolean;
  renderTimeout: number;
  apiKey?: string;
  maxUploadSize: number;
  verbose: boolean;
  cacheMaxSize: number;
  cacheDir?: string;
  s3?: S3Config;
  sandbox?: string | boolean;
}

export interface ServerCLIFlags {
  port?: string;
  templatesDir?: string;
  workers?: string;
  maxRendersPerWorker?: string;
  maxQueueDepth?: string;
  maxWorkerAge?: string;
  maxWorkerRss?: string;
  workerAcquireTimeout?: string;
  persistentSsr?: boolean;
  timeout?: string;
  apiKey?: string;
  maxUpload?: string;
  cacheMaxSize?: string;
  cacheDir?: string;
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
    maxRendersPerWorker: parseInt(flags.maxRendersPerWorker ?? process.env['FACET_MAX_RENDERS_PER_WORKER'] ?? '50', 10),
    maxQueueDepth: parseInt(flags.maxQueueDepth ?? process.env['FACET_MAX_QUEUE_DEPTH'] ?? '20', 10),
    maxWorkerAgeMs: parseInt(flags.maxWorkerAge ?? process.env['FACET_MAX_WORKER_AGE_MS'] ?? '1800000', 10),
    maxWorkerRssMb: parseInt(flags.maxWorkerRss ?? process.env['FACET_MAX_WORKER_RSS_MB'] ?? '0', 10),
    workerAcquireTimeoutMs: parseInt(flags.workerAcquireTimeout ?? process.env['FACET_WORKER_ACQUIRE_TIMEOUT_MS'] ?? '30000', 10),
    persistentSsr: flags.persistentSsr ?? process.env['FACET_PERSISTENT_SSR'] !== 'false',
    renderTimeout: parseInt(flags.timeout ?? process.env['FACET_RENDER_TIMEOUT'] ?? '60000', 10),
    apiKey: flags.apiKey ?? process.env['FACET_API_KEY'],
    maxUploadSize: parseInt(flags.maxUpload ?? process.env['FACET_MAX_UPLOAD'] ?? '52428800', 10),
    cacheMaxSize: parseInt(flags.cacheMaxSize ?? process.env['FACET_CACHE_MAX_SIZE'] ?? '104857600', 10),
    cacheDir: flags.cacheDir ?? process.env['FACET_CACHE_DIR'],
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
