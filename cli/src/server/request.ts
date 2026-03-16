import { RenderError } from './errors.js';
import { parseRemoteRef } from '../utils/remote-resolver.js';
import type { BufferPDFOptions, PDFMargins } from '../utils/pdf-generator.js';
import type { PDFEncryptionOptions, PDFSignatureOptions } from '../utils/pdf-security.js';

export type TemplateSource =
  | { kind: 'local'; name: string }
  | { kind: 'remote'; template: string }
  | { kind: 'archive'; data: Buffer; entryFile?: string }
  | { kind: 'inline'; code: string };

export interface ParsedRenderRequest {
  source: TemplateSource;
  data: Record<string, unknown>;
  format: 'pdf' | 'html';
  output: 'direct' | 's3';
  s3Key?: string;
  filename?: string;
  pdfOptions?: BufferPDFOptions;
  dependencies?: Record<string, string>;
  headerCode?: string;
  footerCode?: string;
  encryption?: PDFEncryptionOptions;
  signature?: PDFSignatureOptions;
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

  const code = body.code;
  const template = body.template;

  if (typeof code !== 'string' && (typeof template !== 'string' || !template)) {
    throw new RenderError('INVALID_REQUEST', 'Missing required field: template or code', 400);
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const format = (body.format as string) === 'html' ? 'html' as const : 'pdf' as const;
  const output = (body.output as string) === 's3' ? 's3' as const : 'direct' as const;

  const source: TemplateSource = typeof code === 'string'
    ? { kind: 'inline', code }
    : parseRemoteRef(template as string)
      ? { kind: 'remote', template: template as string }
      : { kind: 'local', name: template as string };

  return {
    source,
    data,
    format,
    output,
    s3Key: body.s3Key as string | undefined,
    filename: body.filename as string | undefined,
    pdfOptions: parsePDFOptions(body.pdfOptions as Record<string, unknown> | undefined),
    dependencies: parseDependencies(body.dependencies),
    headerCode: typeof body.headerCode === 'string' ? body.headerCode : undefined,
    footerCode: typeof body.footerCode === 'string' ? body.footerCode : undefined,
    encryption: parseEncryptionOptions(body.encryption),
    signature: parseSignatureOptions(body.signature),
  };
}

function parseDependencies(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const deps: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') deps[k] = v;
  }
  return Object.keys(deps).length > 0 ? deps : undefined;
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

function parseMargins(raw: unknown): PDFMargins | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const m = raw as Record<string, unknown>;
  const margins: PDFMargins = {};
  if (typeof m.top === 'number') margins.top = m.top;
  if (typeof m.bottom === 'number') margins.bottom = m.bottom;
  if (typeof m.left === 'number') margins.left = m.left;
  if (typeof m.right === 'number') margins.right = m.right;
  return Object.keys(margins).length > 0 ? margins : undefined;
}

function parsePDFOptions(raw?: Record<string, unknown>): BufferPDFOptions | undefined {
  if (!raw) return undefined;
  return {
    landscape: raw.landscape as boolean | undefined,
    debug: raw.debug as boolean | undefined,
    defaultPageSize: raw.defaultPageSize as string | undefined,
    margins: parseMargins(raw.margins),
  };
}

function parseEncryptionOptions(raw: unknown): PDFEncryptionOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.ownerPassword !== 'string') return undefined;
  const perms = r.permissions as Record<string, unknown> | undefined;
  return {
    ownerPassword: r.ownerPassword,
    userPassword: typeof r.userPassword === 'string' ? r.userPassword : undefined,
    permissions: perms ? {
      print: typeof perms.print === 'boolean' ? perms.print : undefined,
      modify: typeof perms.modify === 'boolean' ? perms.modify : undefined,
      copy: typeof perms.copy === 'boolean' ? perms.copy : undefined,
      annotate: typeof perms.annotate === 'boolean' ? perms.annotate : undefined,
    } : undefined,
  };
}

function parseSignatureOptions(raw: unknown): PDFSignatureOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const selfSigned = r.selfSigned === true;
  const hasTimestamp = typeof r.timestampUrl === 'string';
  if (!selfSigned && !hasTimestamp && (typeof r.certPath !== 'string' || typeof r.certPassword !== 'string')) return undefined;
  return {
    certPath: typeof r.certPath === 'string' ? r.certPath : undefined,
    certPassword: typeof r.certPassword === 'string' ? r.certPassword : undefined,
    selfSigned,
    reason: typeof r.reason === 'string' ? r.reason : undefined,
    name: typeof r.name === 'string' ? r.name : undefined,
    location: typeof r.location === 'string' ? r.location : undefined,
    timestampUrl: typeof r.timestampUrl === 'string' ? r.timestampUrl : undefined,
  };
}
