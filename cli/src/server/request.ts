import { RenderError } from './errors.js';
import { MAX_TIMEOUT_MS } from './config.js';
import { parseRemoteRef } from '../utils/remote-resolver.js';
import type { BufferPDFOptions, PDFMargins } from '../utils/pdf-generator.js';
import type { PDFEncryptionOptions, PDFSignatureOptions } from '../utils/pdf-security.js';
import type { PNGOptions, PNGViewport, RenderFormat } from '../types.js';
import {
  normalizePNGOptions,
  parsePNGViewport,
  type NormalizedPNGOptions,
} from '../utils/png-generator.js';

export type TemplateSource =
  | { kind: 'local'; name: string }
  | { kind: 'remote'; template: string }
  | { kind: 'archive'; data: Buffer; entryFile?: string }
  | { kind: 'inline'; code: string; ext?: string };

export interface ParsedRenderRequest {
  source: TemplateSource;
  data: Record<string, unknown>;
  format: RenderFormat;
  output: 'direct' | 's3';
  s3Key?: string;
  filename?: string;
  pdfOptions?: BufferPDFOptions;
  dependencies?: Record<string, string>;
  headerCode?: string;
  footerCode?: string;
  encryption?: PDFEncryptionOptions;
  signature?: PDFSignatureOptions;
  /** Render deadline in milliseconds, overriding the server default. */
  timeoutMs?: number;
  pngOptions?: NormalizedPNGOptions;
  live?: boolean;
  postProcessCss?: boolean;
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

export function validateRequestModuleMode(parsed: ParsedRenderRequest, skipModules: boolean): void {
  if (skipModules && parsed.dependencies) {
    throw new RenderError(
      'INVALID_REQUEST',
      'Request dependencies are unavailable while the server runs with --skip-modules; restart without the flag to install custom modules',
      400,
    );
  }
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
  const format = parseRenderFormat(body.format);
  const output = (body.output as string) === 's3' ? 's3' as const : 'direct' as const;
  const pdfOptions = parsePDFOptions(body.pdfOptions as Record<string, unknown> | undefined);
  const encryption = parseEncryptionOptions(body.encryption);
  const signature = parseSignatureOptions(body.signature);
  const pngOptions = parsePNGOptions(body.pngOptions, format);
  validateFormatOptions(format, {
    hasPDFOptions: body.pdfOptions !== undefined,
    encryption,
    signature,
  });

  const source: TemplateSource = typeof code === 'string'
    ? { kind: 'inline', code, ext: parseInlineExt(body.ext) }
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
    pdfOptions,
    dependencies: parseDependencies(body.dependencies),
    headerCode: typeof body.headerCode === 'string' ? body.headerCode : undefined,
    footerCode: typeof body.footerCode === 'string' ? body.footerCode : undefined,
    encryption,
    signature,
    timeoutMs: parseTimeout(body.timeout),
    pngOptions,
    live: parseBoolean(body.live, 'live'),
    postProcessCss: parseBoolean(body.postProcessCss, 'postProcessCss'),
  };
}

function parseTimeout(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const ms = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isSafeInteger(ms) || ms < 1 || ms > MAX_TIMEOUT_MS) {
    throw new RenderError(
      'INVALID_REQUEST',
      `Invalid timeout: ${String(raw)} (expected 1-${MAX_TIMEOUT_MS} milliseconds)`,
      400,
    );
  }
  return ms;
}

// File extension for inline code. Whitelisted so the value is safe to use in a
// `Template.<ext>` filename, and limited to what the build pipeline can compile.
const INLINE_EXTENSIONS = new Set(['tsx', 'jsx', 'ts', 'js', 'md', 'mdx']);

function parseInlineExt(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const ext = raw.replace(/^\./, '').toLowerCase();
  return INLINE_EXTENSIONS.has(ext) ? ext : undefined;
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

  const format = parseRenderFormat(options.format);
  const output = (options.output as string) === 's3' ? 's3' as const : 'direct' as const;
  const pdfOptions = parsePDFOptions(options.pdfOptions as Record<string, unknown> | undefined);
  const pngOptions = parsePNGOptions(options.pngOptions, format);
  validateFormatOptions(format, {
    hasPDFOptions: options.pdfOptions !== undefined,
  });

  return {
    source: { kind: 'archive', data: archiveBuffer, entryFile: options.entryFile as string | undefined },
    data,
    format,
    output,
    s3Key: options.s3Key as string | undefined,
    filename: options.filename as string | undefined,
    pdfOptions,
    timeoutMs: parseTimeout(options.timeout),
    headerCode: typeof options.headerCode === 'string' ? options.headerCode : undefined,
    footerCode: typeof options.footerCode === 'string' ? options.footerCode : undefined,
    pngOptions,
    live: parseBoolean(options.live, 'live'),
    postProcessCss: parseBoolean(options.postProcessCss, 'postProcessCss'),
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
  const format = parseRenderFormat(url.searchParams.get('format') ?? undefined);
  const output = url.searchParams.get('output') === 's3' ? 's3' as const : 'direct' as const;
  const pngOptions = parsePNGQueryOptions(url.searchParams, format);

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
    timeoutMs: parseTimeout(url.searchParams.get('timeout')),
    pngOptions,
    postProcessCss: parseBooleanQuery(url.searchParams.get('postProcessCss'), 'postProcessCss'),
  };
}

function parseRenderFormat(raw: unknown): RenderFormat {
  if (raw === undefined) return 'pdf';
  if (raw === 'html' || raw === 'pdf' || raw === 'png') return raw;
  throw new RenderError('INVALID_REQUEST', 'format must be one of: html, pdf, png', 400);
}

function parsePNGOptions(raw: unknown, format: RenderFormat): NormalizedPNGOptions | undefined {
  if (format !== 'png') {
    if (raw !== undefined) {
      throw new RenderError('INVALID_REQUEST', 'pngOptions can only be used with PNG renders', 400);
    }
    return undefined;
  }
  if (raw !== undefined && (raw === null || typeof raw !== 'object' || Array.isArray(raw))) {
    throw new RenderError('INVALID_REQUEST', 'pngOptions must be an object', 400);
  }
  const options = (raw ?? {}) as Record<string, unknown>;
  const pngOptions: PNGOptions = {};
  if (options.width !== undefined) {
    if (typeof options.width !== 'number') {
      throw new RenderError('INVALID_REQUEST', 'pngOptions.width must be a positive integer', 400);
    }
    pngOptions.width = options.width;
  }
  if (options.height !== undefined) {
    if (typeof options.height !== 'number') {
      throw new RenderError('INVALID_REQUEST', 'pngOptions.height must be a positive integer', 400);
    }
    pngOptions.height = options.height;
  }
  if (options.selector !== undefined) {
    if (typeof options.selector !== 'string') {
      throw new RenderError('INVALID_REQUEST', 'pngOptions.selector must be a non-empty CSS selector', 400);
    }
    pngOptions.selector = options.selector;
  }
  if (options.viewport !== undefined) {
    const viewport = options.viewport as Record<string, unknown>;
    if (viewport === null || typeof viewport !== 'object' || Array.isArray(viewport)
      || typeof viewport.width !== 'number' || typeof viewport.height !== 'number') {
      throw new RenderError(
        'INVALID_REQUEST',
        'pngOptions.viewport must be an object with positive integer width and height',
        400,
      );
    }
    pngOptions.viewport = { width: viewport.width, height: viewport.height };
  }
  if (options.autocrop !== undefined) {
    if (typeof options.autocrop !== 'boolean') {
      throw new RenderError('INVALID_REQUEST', 'pngOptions.autocrop must be a boolean', 400);
    }
    pngOptions.autocrop = options.autocrop;
  }
  if (options.autocropPadding !== undefined) {
    if (typeof options.autocropPadding !== 'number') {
      throw new RenderError('INVALID_REQUEST', 'pngOptions.autocropPadding must be a non-negative integer', 400);
    }
    pngOptions.autocropPadding = options.autocropPadding;
  }
  try {
    return normalizePNGOptions(pngOptions, 'pngOptions');
  } catch (error) {
    throw new RenderError(
      'INVALID_REQUEST',
      error instanceof Error ? error.message : String(error),
      400,
    );
  }
}

function parsePNGQueryOptions(
  params: URLSearchParams,
  format: RenderFormat,
): NormalizedPNGOptions | undefined {
  const rawWidth = params.get('pngWidth');
  const rawHeight = params.get('pngHeight');
  const rawSelector = params.get('pngSelector');
  const rawViewport = params.get('pngViewport');
  const rawAutocrop = params.get('pngAutocrop');
  const rawAutocropPadding = params.get('pngAutocropPadding');
  if (format !== 'png') {
    if (rawWidth !== null || rawHeight !== null || rawSelector !== null || rawViewport !== null
      || rawAutocrop !== null || rawAutocropPadding !== null) {
      throw new RenderError('INVALID_REQUEST', 'PNG query options require format=png', 400);
    }
    return undefined;
  }
  const parseDimension = (raw: string | null, field: string): number | undefined => {
    if (raw === null) return undefined;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RenderError('INVALID_REQUEST', `${field} must be a positive integer`, 400);
    }
    return value;
  };
  let viewport: PNGViewport | undefined;
  if (rawViewport !== null) {
    try {
      viewport = parsePNGViewport(rawViewport, 'pngViewport');
    } catch (error) {
      throw new RenderError(
        'INVALID_REQUEST',
        error instanceof Error ? error.message : String(error),
        400,
      );
    }
  }
  let autocropPadding: number | undefined;
  if (rawAutocropPadding !== null) {
    autocropPadding = Number(rawAutocropPadding);
    if (!Number.isSafeInteger(autocropPadding) || autocropPadding < 0) {
      throw new RenderError('INVALID_REQUEST', 'pngAutocropPadding must be a non-negative integer', 400);
    }
  }
  return parsePNGOptions({
    width: parseDimension(rawWidth, 'pngWidth'),
    height: parseDimension(rawHeight, 'pngHeight'),
    selector: rawSelector ?? undefined,
    viewport,
    autocrop: parseBooleanQuery(rawAutocrop, 'pngAutocrop'),
    autocropPadding,
  }, format);
}

function validateFormatOptions(
  format: RenderFormat,
  options: {
    hasPDFOptions: boolean;
    encryption?: PDFEncryptionOptions;
    signature?: PDFSignatureOptions;
  },
): void {
  if (format !== 'png') return;
  if (options.hasPDFOptions) {
    throw new RenderError('INVALID_REQUEST', 'pdfOptions cannot be used with PNG renders', 400);
  }
  if (options.encryption || options.signature) {
    throw new RenderError('INVALID_REQUEST', 'PDF security options cannot be used with PNG renders', 400);
  }
}

function parseBoolean(raw: unknown, field: string): boolean | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'boolean') {
    throw new RenderError('INVALID_REQUEST', `${field} must be a boolean`, 400);
  }
  return raw;
}

function parseBooleanQuery(raw: string | null, field: string): boolean | undefined {
  if (raw === null) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new RenderError('INVALID_REQUEST', `${field} must be true or false`, 400);
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
    debugTypography: raw.debugTypography as boolean | undefined,
    fontSize: raw.fontSize as number | undefined,
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
