/**
 * Rewrite every absolute length in a font-size / line-height declaration into
 * `calc(<len> * var(--facet-font-scale, 1))`, so one custom property rescales
 * the whole document proportionally.
 *
 * This replaces a renderer-injected override that restated twenty selectors by
 * name. Everything it did not name — every `table`, every `.datasheet-footer p`,
 * and all 143 arbitrary `text-[Npt]` utilities the components use — kept its
 * literal size, so `--font-size 14` grew the body text past headings that had
 * not moved. Rewriting the generated CSS reaches every rule that exists,
 * including the ones a consumer's own build generates.
 *
 * No dependency on `postcss` itself: this file is copied into `.facet/`, where
 * hoisting is not guaranteed.
 */

const SCALED_PROPS = /^(font-size|line-height)$/;

// Tailwind v4 emits the type scale as custom properties and its utilities read
// them through var(), so `text-xs` only scales if the definition does.
const SCALED_CUSTOM_PROPS = /^--(text|leading)-[\w-]+$/;

/**
 * Absolute lengths, plus `rem` — safe because `html { font-size: 16px }` is
 * pinned and deliberately left unscaled below.
 *
 * `em`, `ex`, `ch`, `%` and viewport units are excluded on purpose: they are
 * resolved against something that has already been scaled, so multiplying them
 * again compounds. The lookbehind keeps us out of hex colours and identifiers.
 */
const ABSOLUTE_LENGTH = /(?<![\w.#-])(\d*\.?\d+)(px|pt|pc|in|cm|mm|q|rem)\b/gi;

const VAR = '--facet-font-scale';

/** Exported for unit tests; the plugin is a thin wrapper over this. */
export function scaleValue(value) {
  // Idempotency, and it is load-bearing rather than defensive: Vite unshifts
  // postcss-import ahead of every configured plugin, so a consumer build always
  // re-processes the already-transformed dist/styles.css. It also stops
  // PostCSS 8 from re-visiting the declaration this just mutated, forever.
  if (value.includes(VAR)) return value;
  return value.replace(ABSOLUTE_LENGTH, (len) => `calc(${len} * var(${VAR}, 1))`);
}

/** `html` and `:root` anchor `rem`; see the skip below. */
function isRootRule(decl) {
  const selector = decl.parent?.selector;
  return typeof selector === 'string'
    && selector.split(',').some((part) => /^\s*(html|:root)\s*$/.test(part));
}

export default function facetFontScale() {
  return {
    postcssPlugin: 'facet-font-scale',
    Declaration(decl) {
      const prop = decl.prop.toLowerCase();
      const scalable = prop.startsWith('--')
        ? SCALED_CUSTOM_PROPS.test(prop)
        : SCALED_PROPS.test(prop);
      if (!scalable) return;

      // `html { font-size: 16px }` is the rem anchor, not document text. Since
      // rem tokens are themselves rewritten above, scaling the anchor too would
      // apply the ratio twice to every rem length.
      if (prop === 'font-size' && isRootRule(decl)) return;

      const scaled = scaleValue(decl.value);
      if (scaled !== decl.value) decl.value = scaled;
    },
  };
}

facetFontScale.postcss = true;
