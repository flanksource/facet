import { RenderError } from './errors.js';

export function checkAuth(request: Request, apiKey?: string): RenderError | null {
  if (!apiKey) return null;

  const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
  const headerKey = request.headers.get('x-api-key');
  const key = bearer ?? headerKey;

  if (key !== apiKey) {
    return new RenderError('AUTH_REQUIRED', 'Invalid or missing API key', 401);
  }
  return null;
}
