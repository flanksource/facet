import type { RenderFormat } from '../types.js';

export interface RenderFormatMetadata {
  format: RenderFormat;
  contentType: 'text/html' | 'application/pdf' | 'image/png';
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
};

export function renderFormatMetadata(format: RenderFormat): RenderFormatMetadata {
  return formats[format];
}

export function renderContentTypeMetadata(contentType: string): RenderFormatMetadata {
  const metadata = Object.values(formats).find((candidate) => candidate.contentType === contentType);
  if (!metadata) throw new Error(`Unsupported render content type: ${contentType}`);
  return metadata;
}
