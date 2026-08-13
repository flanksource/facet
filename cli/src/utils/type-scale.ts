/**
 * The document type scale, in points, and the single place it is defined.
 *
 * It used to live in four unsynchronised copies — the `@media print` block in
 * src/styles.css, TYPOGRAPHY in src/utils/theme.ts, FONT_SAMPLES on the
 * `--debug-typography` page, and the EXPECTED map used by `--debug`. Three of
 * them described a scale the compiled CSS could not actually produce, because
 * the stylesheet's overrides were outranked by Tailwind's own `text-*`
 * utilities. Feeding the Tailwind theme from here instead means the utilities
 * *are* the scale rather than something the stylesheet has to fight.
 *
 * Points, not rem: the output is a fixed-size page, and no root font size is
 * set anywhere, so a rem-based scale would be measured against whatever the
 * browser's default happens to be.
 */

export interface TypeStep {
  /** Font size in points. */
  pt: number;
  /** Line height in points, where the scale sets one. */
  leading?: number;
}

/**
 * Tailwind `text-*` sizes. Keys are the utility suffix.
 *
 * Every step carries its leading. Emitting size alone leaves the utility
 * inheriting whatever line-height the element had, so `text-2xl` on a paragraph
 * drew 24pt glyphs on the `p` rule's 12pt leading and wrapped text overlapped.
 * Where a step's size matches an element's, the leading matches too — `sm` with
 * `p`, `base`/`md` with `body`, `lg` with `h2`.
 */
export const TEXT_SCALE = {
  xs: { pt: 7, leading: 9 },
  sm: { pt: 9, leading: 12 },
  base: { pt: 10, leading: 14 },
  md: { pt: 10, leading: 14 },
  lg: { pt: 15, leading: 19 },
  xl: { pt: 18, leading: 22 },
  '2xl': { pt: 24, leading: 28 },
} as const satisfies Record<string, TypeStep>;

/** Element defaults. These beat Tailwind preflight but lose to any `text-*`. */
export const ELEMENT_SCALE = {
  body: { pt: 10, leading: 14 },
  h1: { pt: 22, leading: 26 },
  h2: { pt: 15, leading: 19 },
  h3: { pt: 12, leading: 15 },
  h4: { pt: 10, leading: 12 },
  p: { pt: 9, leading: 12 },
} as const satisfies Record<string, TypeStep>;

/**
 * `fontSize` theme entries for a Tailwind v3 config.
 *
 * The tuple form is what carries the leading; a bare size string leaves the
 * utility with whatever line-height it inherits.
 */
export function tailwindFontSizeTheme(): Record<string, [string, { lineHeight: string }]> {
  return Object.fromEntries(Object.entries(TEXT_SCALE).map(([name, step]) => [
    name,
    [`${step.pt}pt`, { lineHeight: `${step.leading}pt` }],
  ]));
}

/** `--text-*` custom properties for a Tailwind v4 `@theme` block. */
export function tailwindThemeBlock(): string {
  const lines = Object.entries(TEXT_SCALE).flatMap(([name, step]) => [
    `  --text-${name}: ${step.pt}pt;`,
    `  --text-${name}--line-height: ${step.leading}pt;`,
  ]);
  return ['@theme {', ...lines, '}'].join('\n');
}
