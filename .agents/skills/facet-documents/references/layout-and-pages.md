# Layout, pages, and the PDF pipeline

## The multi-pass pipeline

`facet pdf` does not simply print the page. It runs four phases (`cli/src/utils/pdf-multipass.ts`):

1. **DOM scan** — Puppeteer renders the document, then measures every `Header`/`Footer` element's height, grouped by `type`×`size` (`first:a4`, `default:a4`, `default:a4-landscape`, …). The measured value comes from the `data-header-height` / `data-footer-height` attributes the components emit.
2. **Extract** — each group's header and footer are rendered as isolated PDFs and loaded into pdf-lib.
3. **Content render** — chrome is stripped from the DOM, `@page` margins are set to the measured header/footer heights, and content-only PDFs are printed per group.
4. **Composite** — pdf-lib's `page.drawPage()` overlays the right header and footer onto every physical page, substituting `_PG_`/`_TL_` page-number placeholders, and merges everything into one PDF.

Two consequences worth internalising:

- **Declaration order does not matter.** Headers and footers are extracted by `type`, not by position. Declaring all chrome at the top of `<Document>` is the convention.
- **Chrome renders once per group, not once per page.** Anything page-specific in a header must come through `PageNo`, not through per-page props.

## Page types

`PageType` is `'first' | 'default' | 'last'`. A `<Page>` with no `type` is `'default'`.

```tsx
<Document>
  <Header type="first"   variant="solid"   height={30} />
  <Header type="default" variant="minimal" height={14} />
  <Footer type="first"   variant="default" />
  <Footer type="default" variant="minimal" />

  <Page type="first">…</Page>   {/* tall branded header */}
  <Page>…</Page>                {/* slim running header */}
  <Page type="last">…</Page>    {/* falls back to default chrome if no type="last" declared */}
</Document>
```

If no header is declared for a type, pages of that type render without one. Reference implementation: `examples/kitchen-sink/HeaderSolid.tsx`; the variant matrix is `HeaderDefault.tsx`, `HeaderMinimal.tsx`, `HeaderNone.tsx`, `HeaderSolid.tsx`.

## The children escape hatch

Passing `children` to `Header`/`Footer` disables all built-in styling — `variant`, `logo`, `title`, `subtitle` are ignored. Only `type` and `height` still apply (they drive measurement). You own the full markup:

```tsx
<Footer type="default" height={8}>
  <div className="flex items-center justify-between px-4 h-full border-t text-[7pt]">
    <span>{classification}</span>
    <span>{reportDate}</span>
    <PageNo format="Page ${page} of ${total}" />
  </div>
</Footer>
```

Give the inner element `h-full` — the wrapper is sized to `height`, and content that overflows it is clipped.

Used by `FindingsReport.tsx`, `BleedTest.tsx`, `PageSizeTest.tsx`.

## Page sizes

`cli/src/utils/pdf-multipass.ts` defines, in mm:

| Name | Size | | Name | Size |
| --- | --- | --- | --- | --- |
| `a4` | 210 × 297 | | `fhd` | 508 × 285.75 |
| `a3` | 297 × 420 | | `qhd` | — |
| `letter` | 216 × 279 | | `wqhd` | — |
| `legal` | 216 × 356 | | `4k` / `5k` | — |
| | | | `16k` | 406.4 × 304.8 |

Each paper size has an explicit `-landscape` twin (`a4-landscape`, `letter-landscape`, …). `resolvePageSize` also accepts a literal `WxH` in mm:

```tsx
<Page pageSize="297x210" />   // custom, in mm
```

`PageSize` is typed as `string` rather than a union, precisely so custom sizes type-check. Unknown names silently fall back to `a4`.

A single document may mix sizes freely; each `type`×`size` combination becomes its own extraction group.

The standard regression idiom sweeps every size (`TableExamples.tsx`, `MultiPageTable.tsx`, `PageSizeTest.tsx`):

```tsx
const PAGE_SIZES: PageSize[] = ['a4','a3','letter','legal','fhd','qhd','wqhd','4k','5k','16k'];
{PAGE_SIZES.map(size => (
  <Page key={size} pageSize={size} title={`Tables — ${size.toUpperCase()}`}>…</Page>
))}
```

## Margins and bleed

Margins are plain numbers in **mm**, applied as `padding` on the page's `<main>`. They merge field-by-field from `Document` down to `Page` (`mergeMargins` in `Page.tsx`), so a `<Page>` may override only `top` and inherit the rest.

Full-bleed comes free and needs no special handling:

- `src/styles.css` sets `@page { margin: 0 }`
- headers and footers are composited at the physical page edge by pdf-lib
- content margins are *padding inside* the page, never page margins

So a colored header touches the paper edge with a 0px gap. `examples/kitchen-sink/BleedTest.tsx` asserts exactly this and is the guard against regressions.

CLI overrides: `--margin-top`, `--margin-bottom`, `--margin-left`, `--margin-right`, all in mm.

## Overflow: the clipping rule

`<main>` inside a `<Page>` has `overflow: hidden`. **Content taller than the page is dropped, not reflowed.** This is the single most common cause of "my content vanished".

What works:

- A long `CompactTable`/`DynamicTable`/`ListTable` as a **direct child** of `<Page>` — the table's rows break naturally across physical pages. `MultiPageTable.tsx` renders 30 checks × 40 rows across all 10 page sizes as the regression test.
- Explicit `<PageBreak />` between blocks you want separated.
- Splitting content into several `<Page>` elements yourself.

What does not work:

- Wrapping a long table in a fixed-height or `overflow`-constrained div.
- Relying on a single `<Page>` to paginate arbitrary prose.

If output is missing its tail, check for a clipped `<Page>` before suspecting the renderer.

## Debugging layout

- `facet pdf t.tsx --debug` — colored overlay lines marking the header/footer zones on every page.
- `facet pdf t.tsx --debug-typography` — appends a font-size reference page.
- `facet lint t.tsx` — catches `page-structure`, `empty-page`, `hardcoded-page-break`, `mixed-units` and friends before you render.
- `facet html t.tsx -o dist` then open the HTML — faster than a PDF round-trip when iterating on layout.
