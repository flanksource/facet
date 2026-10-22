import type { RenderFormat } from '../types.js';

export interface RenderFormatMetadata {
  format: RenderFormat;
  contentType: 'text/html' | 'application/pdf' | 'image/png'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  extension: RenderFormat;
  binary: boolean;
}

const formats: Record<RenderFormat, RenderFormatMetadata> = {
  html: {
    format: 'html',
    contentType: 'text/html',
    extension: 'html',
    binary: false,
  },
  pdf: {
    format: 'pdf',
    contentType: 'application/pdf',
    extension: 'pdf',
    binary: true,
  },
  png: {
    format: 'png',
    contentType: 'image/png',
    extension: 'png',
    binary: true,
  },
  docx: {
    format: 'docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    binary: true,
  },
  pptx: {
    format: 'pptx',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: 'pptx',
    binary: true,
  },
};

export function isRenderFormat(value: unknown): value is RenderFormat {
  return typeof value === 'string' && Object.hasOwn(formats, value);
}

export function renderFormatMetadata(format: RenderFormat): RenderFormatMetadata {
  return formats[format];
}

export function renderContentTypeMetadata(contentType: string): RenderFormatMetadata {
  const metadata = Object.values(formats).find((candidate) => candidate.contentType === contentType);
  if (!metadata) throw new Error(`Unsupported render content type: ${contentType}`);
  return metadata;
}
