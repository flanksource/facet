import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import facetFontScale from './postcss/facet-font-scale.mjs';
import { theme } from './src/page-styles/type-scale.mjs';
import { flattenStylesheetLayers } from './src/page-styles/stylesheet.mjs';

export default {
  plugins: [
    {
      postcssPlugin: 'facet-theme',
      Once(root) {
        root.walkAtRules('facet-theme', (rule) => rule.replaceWith(theme));
      },
    },
    tailwindcss(),
    autoprefixer(),
    facetFontScale(),
    {
      postcssPlugin: 'facet-layers',
      OnceExit(root) {
        const flattened = postcss.parse(flattenStylesheetLayers(root.toString()));
        root.removeAll().append(flattened.nodes);
      },
    },
  ],
};
