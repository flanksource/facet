import { resolve } from 'path';
import { Logger } from '../utils/logger.js';
import { loadConfig, type ServerCLIFlags } from './config.js';
import { checkAuth } from './auth.js';
import { errorResponse } from './errors.js';
import { WorkerPool } from './worker-pool.js';
import { discoverTemplates } from './templates.js';
import { S3Uploader } from './s3.js';
import { handleHealthz, handleTemplates, handleRender } from './routes.js';

export async function startServer(flags: ServerCLIFlags): Promise<void> {
  const config = loadConfig(flags);
  const logger = new Logger(config.verbose);

  const templatesDir = resolve(process.cwd(), config.templatesDir);
  logger.info(`Templates directory: ${templatesDir}`);

  const templates = await discoverTemplates(templatesDir);
  logger.info(`Discovered ${templates.length} templates: ${templates.map((t) => t.name).join(', ') || '(none)'}`);

  const pool = new WorkerPool(config.workers, config.verbose);
  await pool.start();

  const s3 = config.s3 ? new S3Uploader(config.s3) : undefined;
  if (s3) logger.info(`S3 upload enabled: ${config.s3!.bucket}`);

  const server = Bun.serve({
    port: config.port,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === '/healthz' && request.method === 'GET') {
        return handleHealthz(pool);
      }

      const authErr = checkAuth(request, config.apiKey);
      if (authErr) return errorResponse(authErr);

      if (url.pathname === '/templates' && request.method === 'GET') {
        return handleTemplates(templates);
      }

      if (url.pathname === '/render' && request.method === 'POST') {
        return handleRender(request, config, pool, templates, s3);
      }

      return Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });
    },
  });

  logger.success(`Server listening on http://localhost:${server.port}`);

  const shutdown = async () => {
    logger.info('Shutting down...');
    server.stop();
    await pool.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
