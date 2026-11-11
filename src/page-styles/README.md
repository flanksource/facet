# Facet page styles

`@flanksource/facet/page-styles` exports the built `pageStyles` recipe (also the default export). The recipe separates the immutable base stylesheet from the compiler inputs, so hosts load the base once and compile only the utilities a page uses.

- `base`: `['@flanksource/facet/styles.css']`, the precompiled stylesheet (leading font imports outside the `facet` layer). Hosts link it ahead of any compiled output.
- `extends`: `['@flanksource/clicky-ui']`. Facet's Tailwind preset extends clicky-ui's, so one compiler input replaces both recipes.
- `entry`: compiler inputs only. It imports the Tailwind v4 theme and utilities (`source(none)`), declares the point type scale `@theme`, `@config`s `@flanksource/facet/tailwind-preset` and loads the typography plugin. It never embeds or imports facet's precompiled CSS.
- `runtimeDependencies`: the modules `entry` needs at compile time, including `@flanksource/clicky-ui/tailwind-preset`.
- `transform(css)`: synchronously scales absolute font sizes and line heights with `--facet-font-scale`, preserving the root rem anchor and already transformed values.
- `layer` and `name`: placement and identity. Compose recipes in library order under `@layer theme, base, facet, components, utilities;`.

```ts
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { compile } from 'tailwindcss';
import pageStyles from '@flanksource/facet/page-styles';

const require = createRequire(import.meta.url);
const compiler = await compile(pageStyles.entry, {
  loadStylesheet: async (id, base) => ({ path: id, base, content: await readFile(require.resolve(id), 'utf8') }),
  loadModule: async (id, base) => {
    const module = await import(id);
    return { path: id, base, module: module.default ?? module };
  },
});
const css = pageStyles.transform(compiler.build(['prose', 'text-xs']));
```

This Node example needs Tailwind v4 and `@flanksource/clicky-ui` installed alongside Facet. Browser hosts provide equivalent package-origin loaders, link `base` first and insert the resulting `css` before mounting the page.

## Preset and theme variables

`@flanksource/facet/tailwind-preset` declares `presets: [clickyPreset]`, so clicky-ui colors and radii resolve as `var(--…)`. Facet's own literals are CSS variables defined in `src/styles.css` (`:root`), which keeps the utility class names unchanged and lets a host retheme at runtime:

| Utility | Variable |
| --- | --- |
| `font-sans` / `font-mono` | `--facet-font-sans` / `--facet-font-mono` |
| `*-flanksource-blue` / `*-flanksource-dark` | `--facet-brand-blue` / `--facet-brand-dark` |
| `max-w-a4` | `--facet-page-a4` |
| `rounded-sm` / `rounded-md` / `rounded-lg` | `--facet-radius-sm` / `--facet-radius-md` / `--facet-radius-lg` |

The radius variables keep print documents correct without clicky-ui's `--radius` token. The `--facet-*` variables declared in `src/styles.css` are the source of truth for these values, and the recipe tests assert the built stylesheet declares them.

The CLI consumes this same built module. Facet supports Tailwind CSS v4 only: consumers receive the facet and consumer stylesheet imports followed by `pageStyles.entry`. Facet's stylesheet and recipe are built together with `pnpm run build:css`, which compiles `src/styles.css` against the same preset (`@config "./page-styles/preset.mjs"`). Run the focused recipe tests with `pnpm test page-styles`.
