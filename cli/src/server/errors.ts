export type ErrorCode =
  | 'TEMPLATE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RENDER_TIMEOUT'
  | 'RENDER_FAILED'
  | 'S3_UPLOAD_FAILED'
  | 'QUEUE_FULL'
  | 'AUTH_REQUIRED'
  | 'INVALID_REQUEST'
  | 'ARCHIVE_ERROR';

export class RenderError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RenderError';
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof RenderError) {
    return Response.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.statusCode },
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  return Response.json(
    { error: { code: 'RENDER_FAILED', message } },
    { status: 500 },
  );
}
