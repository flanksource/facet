import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { theme } from '../src/page-styles/type-scale.mjs';
import { transform } from '../src/page-styles/recipe.mjs';
import { flattenStylesheetLayers } from '../src/page-styles/stylesheet.mjs';

const root = resolve(import.meta.dirname, '..');
const compilerRequire = createRequire(import.meta.resolve('@tailwindcss/postcss'));
const source = resolve(root, 'src/styles.css');
const input = readFileSync(source, 'utf8')
  .replace('@facet-theme;', theme)
  .replace(/"tailwindcss\/(theme|preflight|utilities)\.css"/g,
    (_, name) => JSON.stringify(compilerRequire.resolve(`tailwindcss/${name}.css`)));
const result = await postcss([tailwind({ base: root, optimize: false })])
  .process(input, { from: source });
const css = transform(flattenStylesheetLayers(result.css));
mkdirSync(resolve(root, 'dist/page-styles'), { recursive: true });
writeFileSync(resolve(root, 'dist/styles.css'), css);
for (const name of readdirSync(resolve(root, 'src/page-styles'))) {
  if (!name.endsWith('.mjs') && !name.endsWith('.d.mts')) continue;
  cpSync(resolve(root, 'src/page-styles', name), resolve(root, 'dist/page-styles', name));
}
writeFileSync(resolve(root, 'dist/page-styles/index.mjs'), [
  "import { createPageStyles } from './recipe.mjs';",
  "export * from './recipe.mjs';",
  "export * from './type-scale.mjs';",
  "export { default as facetFontScale, scaleValue } from './font-scale.mjs';",
  'export const pageStyles = createPageStyles();',
  'export default pageStyles;',
  '',
].join('\n'));
