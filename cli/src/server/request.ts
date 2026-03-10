import { RenderError } from './errors.js';
import { parseRemoteRef } from '../utils/remote-resolver.js';
import type { BufferPDFOptions } from '../utils/pdf-generator.js';

export type TemplateSource =
  | { kind: 'local'; name: string }
  | { kind: 'remote'; template: string }
  | { kind: 'archive'; data: Buffer; entryFile?: string };

export interface ParsedRenderRequest {
  source: TemplateSource;
  data: Record<string, unknown>;
  format: 'pdf' | 'html';
  output: 'direct' | 's3';
  s3Key?: string;
  filename?: string;
  pdfOptions?: BufferPDFOptions;
}

export async function parseRenderRequest(
  request: Request,
  maxUploadSize: number,
): Promise<ParsedRenderRequest> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return parseJsonRequest(request);
  }
  if (contentType.includes('multipart/form-data')) {
    return parseMultipartRequest(request, maxUploadSize);
  }
  if (contentType.includes('application/gzip') || contentType.includes('application/x-gzip')) {
    return parseGzipRequest(request, maxUploadSize);
  }

  throw new RenderError('INVALID_REQUEST', `Unsupported content type: ${contentType}`, 400);
}

async function parseJsonRequest(request: Request): Promise<ParsedRenderRequest> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    throw new RenderError('INVALID_REQUEST', 'Invalid JSON body', 400);
  }

  const template = body.template;
  if (typeof template !== 'string' || !template) {
    throw new RenderError('INVALID_REQUEST', 'Missing required field: template', 400);
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const format = (body.format as string) === 'html' ? 'html' as const : 'pdf' as const;
  const output = (body.output as string) === 's3' ? 's3' as const : 'direct' as const;

  const source: TemplateSource = parseRemoteRef(template)
    ? { kind: 'remote', template }
    : { kind: 'local', name: template };

  return {
    source,
    data,
    format,
    output,
    s3Key: body.s3Key as string | undefined,
    filename: body.filename as string | undefined,
    pdfOptions: parsePDFOptions(body.pdfOptions as Record<string, unknown> | undefined),
  };
}

async function parseMultipartRequest(
  request: Request,
  maxUploadSize: number,
): Promise<ParsedRenderRequest> {
  const formData = await request.formData();
  const archive = formData.get('archive');

  if (!archive || !(archive instanceof File)) {
    throw new RenderError('INVALID_REQUEST', 'Missing archive file in multipart upload', 400);
  }
  if (archive.size > maxUploadSize) {
    throw new RenderError('INVALID_REQUEST', `Archive exceeds max upload size (${maxUploadSize} bytes)`, 400);
  }

  const archiveBuffer = Buffer.from(await archive.arrayBuffer());

  let data: Record<string, unknown> = {};
  const dataStr = formData.get('data');
  if (typeof dataStr === 'string') {
    try {
      data = JSON.parse(dataStr);
    } catch {
      throw new RenderError('INVALID_REQUEST', 'Invalid JSON in data field', 400);
    }
  }

  let options: Record<string, unknown> = {};
  const optionsStr = formData.get('options');
  if (typeof optionsStr === 'string') {
    try {
      options = JSON.parse(optionsStr);
    } catch {
      throw new RenderError('INVALID_REQUEST', 'Invalid JSON in options field', 400);
    }
  }

  const format = (options.format as string) === 'html' ? 'html' as const : 'pdf' as const;
  const output = (options.output as string) === 's3' ? 's3' as const : 'direct' as const;

  return {
    source: { kind: 'archive', data: archiveBuffer, entryFile: options.entryFile as string | undefined },
    data,
    format,
    output,
    s3Key: options.s3Key as string | undefined,
    filename: options.filename as string | undefined,
    pdfOptions: parsePDFOptions(options.pdfOptions as Record<string, unknown> | undefined),
  };
}

async function parseGzipRequest(
  request: Request,
  maxUploadSize: number,
): Promise<ParsedRenderRequest> {
  const body = await request.arrayBuffer();
  if (body.byteLength > maxUploadSize) {
    throw new RenderError('INVALID_REQUEST', `Body exceeds max upload size (${maxUploadSize} bytes)`, 400);
  }

  let data: Record<string, unknown> = {};
  const dataHeader = request.headers.get('x-facet-data');
  if (dataHeader) {
    try {
      data = JSON.parse(Buffer.from(dataHeader, 'base64').toString('utf-8'));
    } catch {
      throw new RenderError('INVALID_REQUEST', 'Invalid base64 JSON in X-Facet-Data header', 400);
    }
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') === 'html' ? 'html' as const : 'pdf' as const;
  const output = url.searchParams.get('output') === 's3' ? 's3' as const : 'direct' as const;

  return {
    source: {
      kind: 'archive',
      data: Buffer.from(body),
      entryFile: url.searchParams.get('entryFile') ?? undefined,
    },
    data,
    format,
    output,
    s3Key: url.searchParams.get('s3Key') ?? undefined,
    filename: url.searchParams.get('filename') ?? undefined,
  };
}

function parsePDFOptions(raw?: Record<string, unknown>): BufferPDFOptions | undefined {
  if (!raw) return undefined;
  return {
    format: raw.format as BufferPDFOptions['format'],
    landscape: raw.landscape as boolean | undefined,
  };
}
