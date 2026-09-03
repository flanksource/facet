/**
 * Apply facet-font-scale to an already-built stylesheet, in place.
 *
 * The Tailwind CLI cannot load the repo's postcss.config.js: it resolves
 * `postcss-load-config` relative to its own package, which pnpm does not place
 * there, so `loadPostCssPlugins` throws and it silently falls back to its
 * built-in plugins. Rather than restructure `build:css` around postcss-cli —
 * which would also start applying autoprefixer for the first time, an unrelated
 * change — this runs the one plugin we need over the CLI's output.
 *
 * Usage: node postcss/apply-font-scale.mjs dist/styles.css
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import facetFontScale from './facet-font-scale.mjs';

const target = resolve(process.argv[2] ?? 'dist/styles.css');
const input = readFileSync(target, 'utf-8');
const { css } = await postcss([facetFontScale()]).process(input, { from: target, to: target });

if (css !== input) writeFileSync(target, css, 'utf-8');

const scaled = (css.match(/--facet-font-scale/g) ?? []).length;
console.log(`facet-font-scale: ${scaled} declaration(s) in ${target}`);
