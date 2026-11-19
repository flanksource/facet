# Packaged document themes

Facet defaults to `--theme facet`. Copy the built theme tarball into the template project and install it as a dependency, then select its declared alias:

```sh
pnpm add ./old-mutual-facet-theme-0.1.0.tgz
facet html Report.tsx --theme old-mutual -o output/
facet pdf Report.tsx --theme old-mutual -o output/
facet serve --theme old-mutual
```

The playground's Theme selector lists installed aliases. Its Styles panel shows the actual layer prelude, stylesheets and computed typography for Browser and Node renders. Normal declarations apply in this order: framework theme/base, Clicky UI components, Facet, child themes, utilities, then unlayered document CSS. Inline styles and important declarations retain normal CSS cascade behavior.

Open the **Theme editor** tab beside **CSS** in `facet serve`. The selected document stays visible while you edit its palette and document settings. Edit each margin on the corresponding edge of the page diagram. Choose a font from the picker or enter a custom font name or stack. Set palette colors with the swatch picker or by entering a hex value. Copy **Facet CSS** for the stylesheet and **Facet theme module** for the `FacetTheme` document defaults. The Facet font fields override the shared fonts for documents.

The editor starts from the computed styles of the document in the selected runtime and theme. If there is no current Server preview, it renders an HTML preview to read those styles. **Runtime CSS variables** shows the resolved Facet and typography tokens. Switching runtimes preserves each draft, and later snapshots fill fields you have yet to edit. **Reset** reloads the runtime values for the active draft.

**Apply to Render** writes the stylesheet between theme markers in the CSS tab, copies edited page settings to **Output options**, and refreshes the selected document in its current output format. Keep your own CSS outside the markers so you can reapply the palette freely. Choose PDF to set the page size, margins, layout and typography debugging, and timestamp authority. For either PDF renderer, leave a margin field blank to inherit the resolved Page, Document, or theme value for that side. Enter `0` to remove that inset. Running headers and footers reserve their own space. Select **Refresh preview** to regenerate the output after editing the document source or changing **Output options** directly.

## Edit themes in a local workspace

Point `--themes-dir` at the directory containing your theme package folders. This starts a loopback-only Facet server with access to those packages. Use `--theme` to select the default render theme.

```sh
facet --dev serve --themes-dir ../gtm/shared/themes --theme old-mutual
```

Open **Theme editor** and choose a package. **Settings** saves document defaults and declared palette colors. **Source** opens package files, including CSS, layouts, headers, footers, and inline SVG components, in Monaco. **Assets** previews and uploads or replaces image files. Reference an uploaded image from the package's layout or CSS so the build includes it.

**New theme** scaffolds a theme package. Run `pnpm install` in the new directory before its first build. A development checkout can link its built Facet, Clicky UI, and page-runtime builder packages.

Save your edits, then choose **Build & Preview**. Facet runs the package's `pnpm run build` and applies the successful build to the selected document in the preview. **Use in Render** applies the existing build to that document. To share the build, run `pnpm pack` in the theme directory and install the tarball in the consuming project. Use `facet html` for a self-contained document from the installed theme.

To enable visual Settings for an existing package, add a manifest entry alongside `facet.themes`:

```json
{
  "facet": {
    "themes": { "my-theme": "./theme" },
    "themeEditor": {
      "my-theme": {
        "defaults": "theme.defaults.json",
        "palette": { "file": "theme.css", "selector": "[data-facet-theme=\"my-theme\"]" }
      }
    }
  }
}
```

Import the JSON file as the theme's `defaults` and load the named stylesheet through the theme's CSS entry. The palette controls edit the hex-valued custom properties in the specified rule. These files feed the same build for editor previews and packaged consumers. Workspace endpoints are documented in [the render API](../openapi.yaml).

Under **Codex theme string**, copy the export and paste it into the matching Light or Dark theme's **Import** control in desktop **Settings → Appearance**. Use **Import Codex theme** to load an existing theme string into the editor.

Themes preserve authored Page sizes and boundaries. Markdown and MDX receive Document/Page scaffolding. A theme can supply document defaults, cover/header/footer slots and a Page content wrapper. Slots must not create another Document or wrap an existing Page in a Page. Explicit Document `cover`, `header` and `footer` props replace theme slots; `null` disables a slot. Request header/footer overrides replace theme chrome.

Use `data.theme` for optional theme metadata, or override it with `<Document themeOptions={...}>`. The example theme accepts `subtitle`, `product`, `classification`, `date` and `fields` (label/value pairs). Missing optional metadata is omitted. The title comes from Document. Existing explicit branded report/deck components keep their authored layouts.

A theme package exports a named `theme` implementing `FacetTheme`, a `page-styles` recipe, `styles.css`, and precompiled `runtime/*` assets. Its package.json declares `facet.themes`, for example `{"old-mutual":"./theme"}`. The theme imports `facetTheme` from Facet and sets `extends: facetTheme`; its recipe extends `@flanksource/facet`. React and Facet are peer dependencies. Aliases must be unique; unknown aliases and cyclic inheritance fail.

For local development, build Facet and the theme, link the theme into the consuming project, then run `facet --dev serve`. Browser loading creates a local immutable package snapshot; it does not publish to npm. Rebuild the theme and restart the server after changing packaged assets. Keep registry publication in the owning package's release workflow.
