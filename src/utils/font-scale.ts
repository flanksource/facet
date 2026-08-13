/**
 * A length that tracks `--font-size` and `<Document fontSize>`.
 *
 * Every font size in the stylesheet is rewritten into this shape at build time
 * by `postcss/facet-font-scale.mjs`. A handful of sizes live outside CSS —
 * inline `style` props, and raw HTML strings passed to `dangerouslySetInnerHTML`
 * — where no build step can reach them. Those call this instead, so the whole
 * document rescales together rather than leaving islands at their literal size.
 *
 * The `1` fallback means an unset scale is exactly a no-op.
 */
export function scaled(size: string): string {
  return `calc(${size} * var(--facet-font-scale, 1))`;
}
