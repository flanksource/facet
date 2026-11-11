import type { Logger } from '../utils/logger.js';
import type { Image } from './model.js';

export function logVisual(options: {
  logger?: Pick<Logger, 'debug'>;
  format: 'docx' | 'pptx';
  action: 'generated' | 'inserted';
  block: Pick<Image, 'format' | 'mediaId' | 'source' | 'alt'>;
  elapsedMs: number;
  mediaFormat?: 'PDF-in-EMF';
  location?: string;
}): void {
  const { logger, format, action, block, elapsedMs, location } = options;
  logger?.debug(`${format.toUpperCase()} visual ${action}: ${block.mediaId} (${block.alt || block.source}) | ${options.mediaFormat ?? block.format.toUpperCase()} | ${elapsedMs.toFixed(1)}ms${location ? ` | ${location}` : ''}`);
}
