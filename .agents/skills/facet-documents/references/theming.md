# Theming, typography, and color

## The type scale is in points

`tailwind.config.js` replaces Tailwind's rem-based scale with a print scale, mirrored by `TEXT_SCALE` in `cli/src/utils/type-scale.ts` (a test asserts the two agree):

| Class | Size / line-height |
| --- | --- |
| `text-xs` | 7pt / 9pt |
| `text-sm` | 9pt / 12pt |
| `text-base`, `text-md` | 10pt / 14pt |
| `text-lg` | 15pt / 19pt |
| `text-xl` | 18pt / 22pt |
| `text-2xl` | 24pt / 28pt |

Body text is 10pt/14pt with `max-width: 210mm`. Fonts are Open Sans (sans) and Fira Code (mono), imported explicitly from Google Fonts in `src/styles.css` — headless Chromium has no system fonts, so a font that isn't imported does not exist.

Sizes outside the scale go in arbitrary values with real print units: `text-[8pt]`, `min-h-[11mm]`, `grid-cols-[28mm_1fr_28mm]`.

## Scaling the whole document

`<Document fontSize={12}>` or `--font-size 12` sets `:root { --facet-font-scale: 1.2 }`. A PostCSS plugin (`postcss/facet-font-scale.mjs`) has already rewritten every size in the stylesheet to `calc(<size> * var(--facet-font-scale, 1))`, so the entire hierarchy — headings, utilities, component internals — moves together.

For sizes that live outside CSS (inline styles, `dangerouslySetInnerHTML`), use the `scaled()` helper from `src/utils/font-scale.ts`.

**Never scale by overriding `body { font-size }`.** That was the original bug: it moved body text and left 19 element rules and every utility class behind.

## Theme tokens

`src/utils/theme.ts` exports semantic tokens plus the type scale as data:

```ts
Theme.Severity   // { Critical:'#DC2626', High:'#EA580C', Medium:'#D97706', Low:'#2563EB' }
Theme.SeverityBg // matching pale backgrounds
Theme.Health     // { Healthy:'#16A34A', Warning:'#D97706', Unhealthy:'#DC2626', Unknown:'#6B7280' }
Theme.Status     // 13 ColorPairs: { Running: { bg:'#DCFCE7', fg:'#166534' }, … }
Theme.Purpose    // { Primary:'#2563EB', Backup:'#D97706', DR:'#DC2626' }
Theme.Brand      // { FlanksourceBlue:'#2563eb', FlanksourceDark:'#1e293b' }
Theme.H1 … H4, P, Body, TextXs … Text2xl   // TypographyStyle, values already wrapped in scaled()
```

Lowercase runtime lookups are exported for dynamic access — `SEVERITY_COLORS`, `SEVERITY_BG`, `HEALTH_COLORS`, `STATUS_COLORS`, `PURPOSE_COLORS`, plus `getColorFromString` for stable arbitrary-string colors. `DynamicTable` uses these internally for `theme.health[value.toLowerCase()]`-style resolution.

Reach for a token before a hex literal. `facet lint`'s `inline-hex-colors` rule flags the alternative.

## Two palettes, deliberately separate

| Palette | Source | Scope |
| --- | --- | --- |
| `Theme` | `src/utils/theme.ts` | Documents: severity, health, status, brand, typography |
| `COLORS` | `src/components/diagram/colors.ts` | Diagrams only — a restricted 5-color set |

```ts
export const COLORS: DiagramColors = {
  primary:      '#2d7de4',  // borders, arrows, active/source headers
  background:   '#f7fbfe',  // node fills, arrow-label backgrounds
  accent:       '#1069dc',  // emphasis text
  muted:        '#62758a',  // secondary text, inactive borders, secondary arrows
  outputBorder: '#10b981',  // output/result node headers
  fk:           '#10b981',  // entity-model alias for outputBorder
  pk:           '#f59e0b',  // entity-model alias
};
```

The restriction is intentional: do not add base colors to `COLORS`. Entity models may use the `fk`/`pk` aliases. Override per-instance with `<Diagram colors={…}>`, which also publishes `--facet-diagram-primary` as a CSS variable.

## The Tailwind interpolation trap

Tailwind's scanner reads **source text**. A class name assembled at runtime is never generated, so the style silently does not exist:

```tsx
// Broken — nothing is emitted for these
<div className={`bg-${tone}-50 border-${tone}-500`} />

// Correct — literal strings the scanner can see
const TONE = {
  info: 'bg-blue-50 border-blue-500',
  warn: 'bg-amber-50 border-amber-500',
} as const;
<div className={TONE[tone]} />
```

This is documented inline in `CalloutBox.tsx` and `typography-data.ts`, and every variant map in the codebase uses literal strings. When a color "doesn't apply", check this first.

If a class genuinely can only be known from data, `--post-process-css` rebuilds the stylesheet after rendering to pick up data-dependent classes. Prefer literal maps; use the flag as a last resort.

## Other layout traps

- Tailwind cannot generate arbitrary values it never sees — `grid-cols-[1fr_36mm]` must appear literally in source.
- A grid or flex item needs `min-w-0` before it will shrink below its content width. Without it, long text forces overflow instead of wrapping.
- `examples/kitchen-sink/TypographyTest.tsx` documents more of these inline; it reads `Theme.H1.fontSize` and prints the value beside a live `<h1>`, measuring the stylesheet rather than asserting against it.
