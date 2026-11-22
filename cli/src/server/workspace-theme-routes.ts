import { errorResponse, RenderError } from './errors.js';
import { readWorkspaceThemeSettings, saveWorkspaceThemeSettings } from './workspace-theme-settings.js';
import { workspaceFileLimit, workspaceThemeFile, type WorkspaceThemes } from './workspace-themes.js';

function workspaceJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}

function requireLocalEditor(request: Request, port: number) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || (url.port || '80') !== String(port) ||
      request.headers.get('x-facet-workspace') !== '1' ||
      (site && site !== 'same-origin') || (origin && origin !== url.origin)) {
    throw new RenderError('AUTH_REQUIRED', 'Workspace editing requires a same-origin local request', 403);
  }
}

async function workspaceBody(request: Request, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  const body = request.body?.getReader();
  if (!body) throw new RenderError('INVALID_REQUEST', 'Request body is required', 400);
  try {
    for (;;) {
      const { value, done } = await body.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > limit) {
        await body.cancel();
        throw new RenderError('INVALID_REQUEST', 'Workspace upload exceeds the file size limit', 413);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    body.releaseLock();
  }
}

async function workspaceInput(request: Request): Promise<Record<string, unknown>> {
  const body = await workspaceBody(request, 64 * 1024);
  try {
    const value = JSON.parse(body.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
    return value;
  } catch {
    throw new RenderError('INVALID_REQUEST', 'Expected a JSON object', 400);
  }
}

export async function handleWorkspaceThemes(request: Request, workspace: WorkspaceThemes, port: number): Promise<Response> {
  try {
    requireLocalEditor(request, port);
    const { pathname, searchParams } = new URL(request.url);
    const method = request.method;
    if (pathname === '/workspace/themes' && method === 'GET') {
      return workspaceJson({ themes: await Promise.all(workspace.list().map(async theme => ({
        id: theme.id, directory: theme.directory, package: theme.package, settings: !!theme.editor,
        build: (await workspace.published(theme))?.build,
      }))) });
    }
    if (pathname === '/workspace/themes' && method === 'POST') {
      const { id } = await workspaceInput(request);
      if (typeof id !== 'string') throw new RenderError('INVALID_REQUEST', 'Theme ID is required', 400);
      const theme = workspace.create(id);
      return workspaceJson({ id, directory: theme.directory, package: theme.package, settings: true }, 201);
    }
    const match = /^\/workspace\/themes\/([a-z][a-z0-9-]*)\/(files|file|settings|build)$/.exec(pathname);
    if (!match) throw new RenderError('INVALID_REQUEST', 'Unknown workspace theme route', 404);
    const id = match[1]!;
    const action = match[2]!;
    if (action === 'files' && method === 'GET') return workspaceJson({ files: workspace.files(id) });
    if (action === 'settings' && method === 'GET') return workspaceJson(readWorkspaceThemeSettings(workspace, id));
    if (action === 'settings' && method === 'PUT') {
      const { kind, value } = await workspaceInput(request);
      if (typeof kind !== 'string') throw new RenderError('INVALID_REQUEST', 'Settings kind is required', 400);
      const revision = saveWorkspaceThemeSettings({ workspace, id, kind, value, revision: request.headers.get('if-match') ?? '' });
      return workspaceJson({ revision });
    }
    if (action === 'build' && method === 'POST') {
      const { theme, output } = await workspace.build(id);
      return workspaceJson({ id, build: theme.build, output });
    }
    if (action === 'file' && method === 'GET') {
      const { bytes, revision, file } = workspace.readFile(id, searchParams.get('path') ?? '');
      return new Response(new Uint8Array(bytes), { headers: {
        etag: revision, 'content-type': file.mime, 'cache-control': 'no-store',
        'content-disposition': 'attachment', 'content-security-policy': "default-src 'none'; sandbox",
        'x-content-type-options': 'nosniff',
      } });
    }
    if (action === 'file' && method === 'PUT') {
      const path = searchParams.get('path') ?? '';
      const bytes = await workspaceBody(request, workspaceFileLimit(workspaceThemeFile(path)));
      const revision = request.headers.get('if-none-match') === '*' ? '*' : request.headers.get('if-match') ?? '';
      if (revision === '*' && request.headers.get('if-none-match') !== '*') throw new RenderError('INVALID_REQUEST', 'An exact file revision is required', 428);
      return workspaceJson({ revision: workspace.saveFile({ id, path, bytes, revision }) });
    }
    throw new RenderError('INVALID_REQUEST', 'Method not allowed for this workspace theme route', 405);
  } catch (error) {
    return errorResponse(error);
  }
}
