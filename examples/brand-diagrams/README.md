# Branded diagram nodes

`BoxNode` and `ContainerNode` implement the diagram vocabulary. `BrandBox` and `BrandContainer` apply a `brand.json` definition to those same primitives. Import them from `@flanksource/facet`; include `@flanksource/facet/styles.css` in browser applications.

Run these examples from the Facet checkout:

```bash
facet html examples/brand-diagrams/SingleBrand.tsx --live -o .tmp/brand-diagrams/single.html
facet png examples/brand-diagrams/MixedBrands.tsx --selector '[data-example-diagram]' -o .tmp/brand-diagrams/mixed.png
```

Both examples embed their sample artwork through JSON data URLs, so the exported documents have no artwork-server dependency. For a real brand, copy its GTM `products/<brand>/brand/` directory beside your template, preserving its relative asset paths, and import its JSON:

```tsx
import { BrandBox, BrandContainer, loadBrand } from '@flanksource/facet';
import definition from './brand/brand.json';

const brand = loadBrand({
  definition,
  baseUrl: new URL('./brand/brand.json', import.meta.url).href,
});

export function Service() {
  return <BrandContainer brand={brand} variant="boundary" title="Private network" tag="Trust boundary">
    <BrandBox brand={brand} variant="header" title="Run API" description="Validates requests" />
  </BrandContainer>;
}
```

`loadBrand` validates required brand fields and resolves artwork relative to `baseUrl`. Its optional `resolveAsset(url)` callback receives each resolved artwork URL and must return a non-empty bundled URL or data URL. Use it to embed local SVGs for standalone exports; the loader never silently replaces missing marks or schemes.

## Brand JSON

Each definition declares `id`, `name`, `defaultScheme`, `fonts`, `schemes`, and `marks`. The sample `brand.json` is a complete, runnable definition.

- `fonts.heading`, `fonts.body`, and `fonts.mono` are explicit CSS font stacks. Host any custom font files in the consuming document before measuring or exporting diagrams.
- Each named scheme supplies `accent`, `tint`, `containerTint`, `border`, `surface`, `panel`, `panelBorder`, `text`, `muted`, `onAccent`, `dark`, and `onDark`. Keep node bodies light and grouping fills distinct from node fills; the accent and dark surfaces have their own foreground colours.
- `marks.symbol` supplies `light` and `dark` artwork. Additional named marks use the same shape. Optional `small` artwork supplies a positive `below` breakpoint and its own `light` and `dark` references. Artwork is used as supplied rather than recoloured at runtime.

## Component props

`BrandBox` and `BrandContainer` require `brand`. `scheme` selects a named scheme; omission uses `defaultScheme`. `mark` selects named artwork and accepts `false` to hide it. `title` defaults to the brand name. Both forward `id`, `description`, `children`, `footer`, and sizing options to their primitive. Container `tag` places a label on its border.

`BoxNode.variant` supports outlined, header, tinted, card, dashed, stacked, chip-dark, pill, tile, accent, borderless, and ghost. Its default remains header; `BrandBox` defaults to outlined. Ports remain outside the visual surface, and the outer `id` remains the arrow endpoint.

`ContainerNode.variant` supports zone, boundary, binding, region, header, panel, frame, exception, lane, column, and card-group. Nest container instances explicitly for region/network/subnet compositions. Containers and branded containers default to zone. Arbitrary children remain intact, including white card nodes on a tinted group.

Both primitives accept `palette` and `fonts` for non-brand consumers. The exported `BOX_STYLES` and `CONTAINER_STYLES` catalogs supply typed picker options. `DiagreDiagram` also accepts `BrandBox` as a direct node, including port endpoints.

Brand-page **Diagrams** tabs preview selections in the URL and provide copyable TSX. They never save style defaults back to the brand kit.
