---
name: facet-documents
description: Author Facet templates — React `.tsx`, Markdown `.md`, or MDX `.mdx` — that render to print-quality PDF, HTML and PNG, covering the Document/Page/Header/Footer structure, page sizes and margins, page numbers, the 60+ component library, the pt-based type scale, and Theme tokens. Use whenever writing or reviewing a facet template, report, datasheet or one-pager; picking a facet component; fixing page/header/footer/margin layout; or converting a Markdown document into a printable PDF.
argument-hint: "[what the document should contain]"
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Facet Documents

Facet compiles a **default-exported React component** (or a `.md`/`.mdx` file) into HTML, then prints it through headless Chromium into a PDF. You write layout in Tailwind and content in facet components; there is no config file — everything is props.

The one structural fact that trips up every newcomer: **`Header` and `Footer` are siblings of `Page` inside `Document`, not props of `Page`.** They are declared once per page `type` and composited onto every physical page by a multi-pass pipeline. (`README.md` was wrong about this for a long time; trust `examples/kitchen-sink/HeaderSolid.tsx`.)

## The skeleton

```tsx
import { Document, Header, Footer, Page, PageNo, Section, StatCard } from '@flanksource/facet';

export default function Report({ data }: { data?: Record<string, unknown> }) {
  return (
    <Document title="Quarterly Report" fontSize={10}>
      {/* Chrome: declared once per type, applied to every matching page */}
      <Header type="first" variant="solid" height={30} title="Quarterly Report" />
      <Header type="default" variant="minimal" height={14} />
      <Footer type="default" height={8}>
        <div className="flex items-center justify-between px-4 h-full border-t text-[7pt]">
          <span>Confidential</span>
          <PageNo format="Page ${page} of ${total}" />
        </div>
      </Footer>

      <Page type="first" title="Overview" product="Mission Control" margins={{ top: 10, bottom: 5 }}>
        <Section title="Summary">
          <StatCard variant="hero" size="lg" label="Uptime" value="99.98%" />
        </Section>
      </Page>

      <Page>{/* …more content… */}</Page>
    </Document>
  );
}
```

Render it: `facet pdf Report.tsx -o dist` — see the **facet-cli** skill for flags.

## Structure

| Component | Role | Key props |
| --- | --- | --- |
| `Document` | Root; emits `<html>`, injects CSS, publishes defaults via context | `title`, `pageSize`, `margins`, `fontSize`, `lineHeight`, `fontFamily`, `css` |
| `Page` | One logical page | `title`, `titleClassName`, `product`, `pageSize`, `margins`, `watermark`, `type`, `className` |
| `Header` / `Footer` | Page chrome, matched to pages by `type` | `variant`, `type`, `height` (mm), `logo`, `title`, `subtitle`, `children` |
| `PageNo` | Page-number token | `format="Page ${page} of ${total}"` |
| `PageBreak` | Forces a break | — |

`type` is `'first' | 'default' | 'last'`. **`'cover'` is not a valid value.** Pages without a `type` get `'default'` chrome.

Settings resolve in three layers, later winning: **CLI flags → `<Document>` defaults → `<Page>` props**. Margins merge field-by-field, so `<Page margins={{ top: 20 }}>` keeps the Document's left/right/bottom.

Passing `children` to `Header`/`Footer` is a full escape hatch: all styling props are ignored and you own the markup (only `height`/`type` still matter). This is how `FindingsReport.tsx` builds a custom footer.

## Pages and sizes

Named sizes: `a4`, `a3`, `letter`, `legal` (each with an `-landscape` variant), plus screen sizes `fhd`, `qhd`, `wqhd`, `4k`, `5k`, `16k`. Custom sizes are `WxH` in mm — `pageSize="297x210"`. Source of truth: `cli/src/utils/pdf-multipass.ts`.

Margins are **plain numbers in mm**, applied as padding inside the page. Full-bleed is automatic: `@page { margin: 0 }`, and headers/footers are drawn at the physical edge during compositing. Colored chrome must touch the paper edge — `examples/kitchen-sink/BleedTest.tsx` is the regression guard.

> **`<Page>` clips; it does not reflow.** Content taller than one page inside a single `<Page>` is silently cut off. Long tables must be the direct child that overflows — see `examples/kitchen-sink/MultiPageTable.tsx`. If content is disappearing, this is why.

Deep dive on the 4-phase pipeline and `type`×`size` grouping: **`references/layout-and-pages.md`**.

## Data

`facet pdf Report.tsx -d data.json` passes the loaded object as a single `data` prop. Templates that must work both ways use the idiom from `FindingsReport.tsx`:

```tsx
export default function Report(props: Record<string, unknown>) {
  const data = (props.data ?? props) as Record<string, unknown>;
```

In `.md`/`.mdx`, data arrives as `props.*` instead — `# {props.title}`.

## Components

~60 components, all from `@flanksource/facet` (aliases `@facet` and `@facet/core` resolve identically). The universal idiom is `variant` + `size`.

| Need | Reach for |
| --- | --- |
| Key numbers | `StatCard`, `MetricGrid`, `SeverityStatCard`, `KpiComparison` |
| A gauge or score | `Gauge`, `ScoreGauge`, `ProgressBar` |
| Tabular data | `CompactTable` (workhorse), `DynamicTable` (typed columns), `ListTable` (feeds), `SpecificationTable`, `MatrixTable` |
| Callouts / admonitions | `CalloutBox` |
| Findings / issues | `Finding`, `VulnerabilityBreakdown`, `SecurityChecksTable` |
| Status, labels, people | `Badge`, `Status`, `Age`, `Avatar`, `AvatarGroup` |
| Prose, code, terminals | `Markdown`, `SyntaxHighlighter`, `TerminalOutput`, `BulletList`, `Steps` |
| Formatting values | `Format`, `formatBytes`, `formatDurationMs`, `formatRelative` |
| Section scaffolding | `Section`, `TwoColumnSection`, `FeatureLayout` |
| Diagrams | `Diagram`, `BoxNode`, `Arrow` → use the **diagram-designer** skill |

Full catalog with variants, sizes and source paths: **`references/components.md`**.

## Styling

Tailwind, configured print-first: the whole type scale is in **points**, not rem (`text-base` = 10pt/14pt). Use Tailwind for layout and spacing; use components for content; don't write custom CSS.

- Sizes in `mm`/`pt` go in arbitrary values: `text-[8pt]`, `min-h-[11mm]`, `grid-cols-[28mm_1fr_28mm]`.
- Scale the whole document with `<Document fontSize={12}>` or `--font-size 12`; this sets `--facet-font-scale` and moves every element proportionally. Never override `body` font-size to do this.
- Colors come from `Theme` (`Theme.Severity`, `Theme.Health`, `Theme.Status`) — see **`references/theming.md`**.

**Tailwind's scanner reads source text, so interpolated class names never exist.** `bg-${tone}-50` silently produces nothing. Map variants to literal strings:

```tsx
const TONE = { info: 'bg-blue-50 border-blue-500', warn: 'bg-amber-50 border-amber-500' };
```

Grid children need `min-w-0` to shrink below their content width. `examples/kitchen-sink/TypographyTest.tsx` documents more of these traps inline.

## Markdown and MDX

`facet pdf report.md` works with zero React — the file is auto-wrapped in a `<Page>` with `prose` styling. GitHub alerts (`> [!NOTE]`, `> [!WARNING]`, …) render as callouts, and GFM tables/footnotes are on by default.

Frontmatter configures **plugins only** (`remarkPlugins:` / `rehypePlugins:`) — there is no frontmatter for page size, margins or title. For components and JSX, use `.mdx`. Classified content uses `<Classified tier="Internal">` plus `--allow`, and fails closed.

Details: **`references/markdown-mdx.md`**.

## Before shipping

1. `facet lint <template>` — nine rules encode the house authoring style (page structure, hardcoded page breaks, inline hex, mixed units, conflicting Tailwind/print CSS). The skeleton above lints clean.
2. Render it and **look at the output**: `facet pdf t.tsx -o dist` or `facet png t.tsx -o dist`, then Read the file. Never ship a document you haven't viewed.
3. Check the last page isn't clipped and headers/footers land on every page (`facet pdf --debug` overlays the chrome zones).

## Never

- Pass `header`, `headerHeight`, `footer`, `footerHeight` or `debug` to `<Page>` — none exist. Chrome is a sibling of `Page`; `--debug` is a CLI flag.
- Use `size=` on `<Page>` — the prop is `pageSize`.
- Use `type="cover"` — the values are `first`, `default`, `last`.
- Interpolate Tailwind class names.
- Hardcode a hex color where a `Theme` token exists.
- Assume overflow inside one `<Page>` will flow onto the next — it is clipped.
- Write custom CSS for layout that Tailwind utilities already cover.
- Ship a render you haven't looked at.

## See also

- **`references/components.md`**, **`references/layout-and-pages.md`**, **`references/markdown-mdx.md`**, **`references/theming.md`**
- **facet-cli** skill — rendering, flags, data loading, troubleshooting
- **diagram-designer** skill — node-and-arrow architecture diagrams
- Working examples: `examples/kitchen-sink/` (`HeaderSolid.tsx` for chrome, `FindingsReport.tsx` for data-driven reports, `UberKitchenSink.tsx` for everything)
- Component source: `src/components/index.tsx`
