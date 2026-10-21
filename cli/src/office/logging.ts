import { performance } from 'node:perf_hooks';
import type { Logger } from '../utils/logger.js';
import type { Image } from './model.js';

export function logVisual(options: {
  logger?: Pick<Logger, 'debug'>;
  format: 'docx' | 'pptx';
  action: 'generated' | 'inserted';
  block: Image;
  startedAt: number;
  location?: string;
}): void {
  const { logger, format, action, block, startedAt, location } = options;
  logger?.debug(`${format.toUpperCase()} visual ${action}: ${block.mediaId} (${block.alt || block.source}) | ${block.format.toUpperCase()} | ${(performance.now() - startedAt).toFixed(1)}ms${location ? ` | ${location}` : ''}`);
}
