# Packaged document themes

Facet defaults to `--theme facet`. Copy the built theme tarball into the template project and install it as a dependency, then select its declared alias:

```sh
pnpm add ./old-mutual-facet-theme-0.1.0.tgz
facet html Report.tsx --theme old-mutual -o output/
facet pdf Report.tsx --theme old-mutual -o output/
facet serve --theme old-mutual
```

The playground's Theme selector lists installed aliases. Its Styles panel shows the actual layer prelude, stylesheets and computed typography for Browser and Node renders. Normal declarations apply in this order: framework theme/base, Clicky UI components, Facet, child themes, utilities, then unlayered document CSS. Inline styles and important declarations retain normal CSS cascade behavior.

Themes preserve authored Page sizes and boundaries. Markdown and MDX receive Document/Page scaffolding. A theme can supply document defaults, cover/header/footer slots and a Page content wrapper. Slots must not create another Document or wrap an existing Page in a Page. Explicit Document `cover`, `header` and `footer` props replace theme slots; `null` disables a slot. Request header/footer overrides replace theme chrome.

Use `data.theme` for optional theme metadata, or override it with `<Document themeOptions={...}>`. The example theme accepts `subtitle`, `product`, `classification`, `date` and `fields` (label/value pairs). Missing optional metadata is omitted. The title comes from Document. Existing explicit branded report/deck components keep their authored layouts.

A theme package exports a named `theme` implementing `FacetTheme`, a `page-styles` recipe, `styles.css`, and precompiled `runtime/*` assets. Its package.json declares `facet.themes`, for example `{"old-mutual":"./theme"}`. The theme imports `facetTheme` from Facet and sets `extends: facetTheme`; its recipe extends `@flanksource/facet`. React and Facet are peer dependencies. Aliases must be unique; unknown aliases and cyclic inheritance fail.

For local development, build Facet and the theme, link the theme into the consuming project, then run `facet --dev serve`. Browser loading creates a local immutable package snapshot; it does not publish to npm. Rebuild the theme and restart the server after changing packaged assets. Keep registry publication in the owning package's release workflow.

Browser PDF remains a single continuous page. Custom themes do not add browser pagination or bundle proprietary fonts.
