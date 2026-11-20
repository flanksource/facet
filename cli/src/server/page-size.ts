import type { RenderFormat } from '../types.js';
import { canonicalPageSize } from '../utils/page-size-presets.js';
import { RenderError } from './errors.js';

export function parsePageSizeOverride(raw: unknown, format: RenderFormat, viewport?: unknown): string | undefined {
  if (raw === undefined) return undefined;
  if (format !== 'png' && format !== 'pdf') throw new RenderError('INVALID_REQUEST', 'pageSizeOverride requires PNG or PDF format', 400);
  if (viewport !== undefined) throw new RenderError('INVALID_REQUEST', 'pageSizeOverride cannot be combined with pngOptions.viewport', 400);
  try {
    return canonicalPageSize(raw);
  } catch (error) {
    throw new RenderError('INVALID_REQUEST', `pageSizeOverride: ${error instanceof Error ? error.message : String(error)}`, 400);
  }
}
