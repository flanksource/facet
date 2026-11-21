/** How diagrams and figures are inserted into pdf, docx and pptx exports. */
export type EmbedFormat = 'pdf' | 'png';
export type EmbedSize = 1 | 2 | 3 | 4;
export type EmbedTarget = 'pdf' | 'docx' | 'pptx';

export interface EmbedOptions {
  format: EmbedFormat;
  size: EmbedSize;
}

/** Elements captured as one visual: figures, diagrams and fit frames. */
export const EMBED_SELECTOR = 'figure,[data-facet-fit],[data-facet-ready],[data-facet-diagram],[data-facet-flow-diagram]';

export const DEFAULT_EMBED_SIZE: EmbedSize = 2;

const DEFAULT_EMBED_FORMAT: Record<EmbedTarget, EmbedFormat> = { pdf: 'pdf', docx: 'pdf', pptx: 'png' };

export function parseEmbedFormat(value: unknown): EmbedFormat | undefined {
  if (value == null) return undefined;
  if (value === 'pdf' || value === 'png') return value;
  throw new Error(`Invalid embed format ${JSON.stringify(value)}: expected pdf or png`);
}

export function parseEmbedSize(value: unknown): EmbedSize | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'string' ? Number(value.trim().replace(/x$/i, '')) : value;
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) return parsed;
  throw new Error(`Invalid embed size ${JSON.stringify(value)}: expected 1x, 2x, 3x or 4x`);
}

/** Applies the per-target defaults; a size on a vector-only PDF export has no effect, so it is rejected. */
export function resolveEmbed(options: { target: EmbedTarget; format?: EmbedFormat; size?: EmbedSize }): EmbedOptions {
  const format = options.format ?? DEFAULT_EMBED_FORMAT[options.target];
  if (options.target === 'pdf' && format === 'pdf' && options.size !== undefined) {
    throw new Error(`--embed-size ${options.size}x has no effect on a PDF export with --embed-format pdf; use --embed-format png`);
  }
  return { format, size: options.size ?? DEFAULT_EMBED_SIZE };
}
