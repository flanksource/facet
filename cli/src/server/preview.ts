import { resolve } from 'path';
import { Logger } from '../utils/logger.js';
import { loadConfig, type ServerCLIFlags, type ServerConfig } from './config.js';
import { checkAuth } from './auth.js';
import { errorResponse } from './errors.js';
import { WorkerPool } from './worker-pool.js';
import { discoverTemplates, type TemplateInfo } from './templates.js';
import { S3Uploader } from './s3.js';
import { handleHealthz, handleTemplates, handleRender, handleRenderStream, handleResultsRoute } from './routes.js';
import { playgroundHtml } from './playground-html.js';
import { RenderCache } from './render-cache.js';
import { facetTypes } from './facet-types.js';
import { readFileSync } from 'fs';
import rootPackageJson from '../../../package.json' with { type: 'file' };
import openapiPath from '../../../openapi.yaml' with { type: 'file' };

const facetVersion: string = JSON.parse(readFileSync(rootPackageJson, 'utf-8')).version;
const openapiSpec: string = readFileSync(openapiPath, 'utf-8');

export interface ServerHandle {
  port: number;
  url: string;
  stop: () => Promise<void>;
}

export async function createServer(config: ServerConfig): Promise<ServerHandle> {
  const logger = new Logger(config.verbose);

  const templatesDir = resolve(process.cwd(), config.templatesDir);
  logger.info(`Templates directory: ${templatesDir}`);

  const templates = await discoverTemplates(templatesDir);
  logger.info(`Discovered ${templates.length} templates: ${templates.map((t: TemplateInfo) => t.name).join(', ') || '(none)'}`);

  const pool = new WorkerPool(config.workers, config.verbose);
  await pool.start();

  const s3 = config.s3 ? new S3Uploader(config.s3) : undefined;
  if (s3) logger.info(`S3 upload enabled: ${config.s3!.bucket}`);

  const cacheDir = resolve(process.cwd(), '.facet');
  const cache = new RenderCache(cacheDir, config.cacheMaxSize);
  logger.info(`Render cache: ${cacheDir}/render-cache (max ${(config.cacheMaxSize / 1048576).toFixed(0)}MB)`);

  const server = Bun.serve({
    port: config.port,
    idleTimeout: 120,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(playgroundHtml(facetVersion), { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }

      if (url.pathname === '/types' && request.method === 'GET') {
        return new Response(facetTypes, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      }

      if (url.pathname === '/openapi.yaml' && request.method === 'GET') {
        return new Response(openapiSpec, { headers: { 'content-type': 'text/yaml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      }

      if (url.pathname === '/healthz' && request.method === 'GET') {
        return handleHealthz(pool);
      }

      const authErr = checkAuth(request, config.apiKey);
      if (authErr) return errorResponse(authErr);

      if (url.pathname === '/templates' && request.method === 'GET') {
        return handleTemplates(templates);
      }

      const resultsMatch = url.pathname.match(/^\/results\/([a-f0-9]{16})$/);
      if (resultsMatch && request.method === 'GET') {
        return handleResultsRoute(resultsMatch[1], cache);
      }

      if (url.pathname === '/render/stream' && request.method === 'POST') {
        return handleRenderStream(request, config, pool, templates, cache, s3);
      }

      if (url.pathname === '/render' && request.method === 'POST') {
        return handleRender(request, config, pool, templates, cache, s3);
      }

      return Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });
    },
  });

  logger.success(`Server listening on http://localhost:${server.port}`);

  return {
    port: server.port,
    url: `http://localhost:${server.port}`,
    stop: async () => {
      server.stop();
      await pool.shutdown();
    },
  };
}

export async function startServer(flags: ServerCLIFlags): Promise<void> {
  const config = loadConfig(flags);
  const handle = await createServer(config);

  const shutdown = async () => {
    await handle.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
