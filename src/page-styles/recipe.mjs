import postcss from 'postcss';
import facetFontScale from './font-scale.mjs';
import { theme } from './type-scale.mjs';


export function wrapFacetStylesInLayer(css) {
  const imports = [];
  let remaining = css;
  const importStatement = /^@import\s+(?:"[^"\r\n]*"|'[^'\r\n]*'|url\([^\r\n)]*\))[^;\r\n]*;/;
  while (remaining.length > 0) {
    let importStart = 0;
    while (importStart < remaining.length) {
      if (/\s/.test(remaining[importStart])) {
        importStart++;
        continue;
      }
      if (!remaining.startsWith('/*', importStart)) break;
      const commentEnd = remaining.indexOf('*/', importStart + 2);
      if (commentEnd < 0) break;
      importStart = commentEnd + 2;
    }
    const match = remaining.slice(importStart).match(importStatement);
    if (!match) break;
    imports.push(remaining.slice(0, importStart + match[0].length).trim());
    remaining = remaining.slice(importStart + match[0].length).trimStart();
  }
  if (/@import\s/.test(remaining)) {
    throw new Error('Facet styles contain an @import after style rules; CSS imports must precede all layered rules');
  }
  return [...imports, '@layer facet {', remaining.trim(), '}', ''].join('\n');
}

export function transform(css) {
  return postcss([facetFontScale()]).process(css, { from: undefined }).css;
}

export function createPageStyles() {
  return {
    name: '@flanksource/facet',
    layer: 'facet',
    base: ['@flanksource/facet/styles.css'],
    extends: ['@flanksource/clicky-ui'],
    runtimeDependencies: [
      'tailwindcss/theme.css',
      'tailwindcss/preflight.css',
      'tailwindcss/utilities.css',
      '@tailwindcss/typography',
      '@flanksource/clicky-ui/tailwind-preset',
    ],
    entry: [
      '@import "tailwindcss/theme.css" layer(theme);',
      '@import "tailwindcss/utilities.css" layer(utilities) source(none);',
      theme,
      '@config "@flanksource/facet/tailwind-preset";',
      '@plugin "@tailwindcss/typography";',
      '',
    ].join('\n'),
    theme,
    transform,
  };
}
