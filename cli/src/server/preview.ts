import { resolve } from 'path';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
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
import { assetPath } from '../utils/assets.js';

const facetVersion: string = JSON.parse(readFileSync(assetPath('package.json'), 'utf-8')).version;
const openapiSpec: string = readFileSync(assetPath('openapi.yaml'), 'utf-8');

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

  const cacheDir = config.cacheDir ? resolve(config.cacheDir) : resolve(process.cwd(), '.facet');
  const cache = new RenderCache(cacheDir, config.cacheMaxSize);
  logger.info(`Render cache: ${cacheDir}/render-cache (max ${(config.cacheMaxSize / 1048576).toFixed(0)}MB)`);

  async function handleRequest(request: Request): Promise<Response> {
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
  }

  const httpServer = createHttpServer((req, res) => {
    handleRequest(nodeToWebRequest(req))
      .then((response) => writeWebResponse(res, response))
      .catch((err) => {
        logger.error(`Request handler error: ${err instanceof Error ? err.message : String(err)}`);
        if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INTERNAL', message: 'Internal server error' } }));
      });
  });
  httpServer.requestTimeout = 120_000;

  const port = await new Promise<number>((resolveListen, rejectListen) => {
    httpServer.once('error', rejectListen);
    httpServer.listen(config.port, () => {
      const addr = httpServer.address();
      resolveListen(typeof addr === 'object' && addr ? addr.port : config.port);
    });
  });

  logger.success(`Server listening on http://localhost:${port}`);

  return {
    port,
    url: `http://localhost:${port}`,
    stop: async () => {
      await new Promise<void>((resolveClose) => httpServer.close(() => resolveClose()));
      await pool.shutdown();
    },
  };
}

/** Adapt a node:http request into a Web Fetch Request the route handlers expect. */
function nodeToWebRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? 'localhost';
  const url = `http://${host}${req.url ?? '/'}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else headers.set(key, value);
  }

  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';

  return new Request(url, {
    method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined,
    // Required by undici when a streaming body is provided.
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);
}

/** Write a Web Fetch Response (including a streaming body) to a node:http response. */
async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);

  if (!response.body) {
    res.end();
    return;
  }

  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    if (!res.write(chunk)) {
      await new Promise<void>(resolve => res.once('drain', resolve));
    }
  }
  res.end();
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
