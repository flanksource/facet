# Component catalog

Everything below is exported from `@flanksource/facet` (barrel: `src/components/index.tsx`). The aliases `@facet` and `@facet/core` resolve to the same package inside a facet build.

The house idiom is `variant` + `size`. When a component offers a variant, pick one rather than restyling with `className`.

## Document structure

| Component | Source | Notes |
| --- | --- | --- |
| `Document` | `Document.tsx` | Root. `title`, `pageSize`, `margins`, `fontSize`, `lineHeight`, `fontFamily`, `css`. Publishes defaults through context. |
| `useDocumentDefaults` | `Document.tsx` | Hook returning the inherited `DocumentDefaults`. |
| `Page` | `Page.tsx` | `children`, `title`, `titleClassName`, `product`, `className`, `pageSize`, `margins`, `watermark`, `type`. |
| `Header` | `Header.tsx` | `variant: default \| solid \| minimal`, `type`, `height` (mm), `logo`, `title`, `subtitle`. `children` overrides all styling. |
| `Footer` | `Footer.tsx` | Same variant/type/height model. Auto-builds a contact row from `company`/`web`/`docs`/`email`/`phone`/`github`/`linkedin` and an `© {year} {company}` line. |
| `PageNo` | `PageNo.tsx` | `format="Page ${page} of ${total}"`. Emits `_PG_`/`_TL_` placeholders substituted during compositing. |
| `PageBreak` | `PageBreak.tsx` | `<div className="page-break" />`. |
| `Section` | `Section.tsx` | `variant: hero \| card-grid \| two-column \| two-column-reverse \| metric-grid \| summary-grid \| dashboard`, `layout: 9-3 \| 10-2 \| 8-4 \| 6-6`. |
| `TwoColumnSection`, `FeatureLayout`, `CapabilitySection` | — | Layout scaffolding. |
| `DatasheetTemplate` | `DatasheetTemplate.tsx` | **Deprecated** — pure alias for `Document`. Use `Document`. |

## Tables

| Component | Source | Use for |
| --- | --- | --- |
| `CompactTable` | `CompactTable.tsx` | The workhorse. `variant: compact` (title/value card), `inline` (one-line strip), `reference` (`columns` + row arrays). `size: xs \| sm \| base \| md`. |
| `DynamicTable` | `DynamicTable.tsx` | Schema-driven. `ColumnType` = `string \| number \| boolean \| datetime \| duration \| health \| status \| gauge \| bytes \| decimal \| millicore \| labels` — renders health dots, status badges and inline gauges automatically. Helper: `formatCellValue`. |
| `ListTable` | `ListTable.tsx` | Feeds and lists. Map columns by key: `subject`, `subtitle`, `body`, `date` + `dateFormat: age \| short \| long`, `icon` + `iconMap`, `primaryTags`, `secondaryTags`, `count`, `keys`, `groups`, `density: compact \| normal \| comfortable`, `maxRows` + `overflowNote`. |
| `SpecificationTable` | `SpecificationTable.tsx` | Category/value spec sheets; values may be arrays. |
| `MatrixTable` + `Dot` | `MatrixTable.tsx` | Rotated-header cross-reference grid (`columnWidth`, `headerHeight`, `cornerContent`). |
| `ComparisonTable` | `ComparisonTable.tsx` | Two-column pros/cons with check/cross glyphs. |
| `SecurityChecksTable` | `SecurityChecksTable.tsx` | OpenSSF-Scorecard shape: `{name, score, reason, details[], documentation}`. |
| `AlertsTable` | `AlertsTable.tsx` | Alert lists. |
| `Glossary` | `Glossary.tsx` | Term/definition table. |

Tables are the correct overflow path across pages — a long table as a direct child of `<Page>` flows onto following physical pages. Nesting it inside a fixed-height wrapper clips it instead.

## Metrics, stat cards, gauges

| Component | Notes |
| --- | --- |
| `StatCard` | `variant: card \| badge \| hero \| bordered \| icon-heavy \| left-aligned \| metric \| summary` × `size: xs \| sm \| md \| lg`. Ships a unit algebra (`TimeUnitValue`, `DataUnitValue`, `NumberUnitValue`), `compareFrom` + `compareVariant: trendline \| up-down \| before-after \| before-after-progress`, and `conditionalStyles: 'red-green' \| 'green-red' \| fn`. |
| `SeverityStatCard` | Severity-colored variant. |
| `MetricGrid` | `columns={2\|3\|4}` + `metrics[]`. |
| `MetricHeader` | Discriminated union: `variant="gauge"` with `score`, or `variant="comparison"` with `before`/`after`. |
| `MetricsCallout`, `KpiComparison`, `KPITargetActual` | Comparison blocks. |
| `Gauge` | Arc gauge (the only d3 consumer). |
| `ScoreGauge` | 0–10 circular, auto red/yellow/green. |
| `ProgressBar` | 6 variants, `displayValue` override. |
| `Heatmap` + `buildHeatmapValues` | `variant: calendar \| compact`. |
| `StarRating`, `RatingCategoryInput` | Ratings. |
| `VulnerabilityBreakdown`, `ProjectSummaryCard`, `TaskSummarySection` | Domain summaries. |

There is **no chart library** — no bar/line/pie components. `Gauge`, `ScoreGauge`, `ProgressBar`, `Heatmap` and `MatrixTable` are the whole visualization surface. `@xyflow/react`, `dagre` and `mermaid` appear in dependencies but back no exported component.

## Badges and status atoms

`Badge` (`variant: status \| metric \| custom \| outlined \| label`, `shape: pill \| rounded \| square`; `size` accepts a named preset **or a raw pt number**, with padding/icon/gap interpolated), `CountBadge`, `Status` (health dot + label), `Age` (relative time), `Avatar`, `AvatarGroup`.

`Shield` exists at `src/components/Shield/Shield.tsx` and has a Storybook story but is **not exported from the barrel** — it is unreachable via `import { Shield } from '@flanksource/facet'`.

## Content

| Component | Notes |
| --- | --- |
| `Markdown` | Renders a markdown **string** at runtime (`marked` + allowlist sanitizer). `inline` mode strips block wrappers for table cells. Helpers: `renderMarkdown`, `markdownToPlainText`, `sanitizeHTML`. |
| `CalloutBox` | Admonitions. `AlertIcon`, `ALERT_ICON_PATHS`, `AlertTone` exported alongside. Matches GitHub alert rendering in markdown. |
| `SyntaxHighlighter` | Shiki-backed code blocks. |
| `TerminalOutput` | Terminal transcript block. |
| `BulletList` | 6 variants. |
| `Steps` | Numbered procedure. |
| `Finding` | Security/audit finding (`FindingProps`, `FindingBadge`, `Entity`, `Sample`). |
| `Format` | Value formatting component; standalone helpers `formatDate`, `formatDateTime`, `formatRelative`, `formatBytes`, `formatMillicores`, `formatDurationMs`, `formatDisplayValue`, `formatPropertyValue`, `getGaugeColor`. |
| `QueryResponseChat` / `QueryResponseTerminal` / `QueryResponseExample` | Prompt/response blocks. |

## Marketing and datasheet blocks

`AIModelCard`, `CallToAction`, `LogoGrid`, `PlatformGrid`, `SocialProof`, `IntegrationGrid` (**deprecated** → `LogoGrid`), `ValueProposition` (**deprecated** → `Section variant="hero"`).

## Diagrams

`Diagram`, `BoxNode`, `Arrow`, `variantProps`, `NodePill`, `NodeSection`, `SectionDivider`, `COLORS` (aliased `DIAGRAM_COLORS`). Source: `src/components/diagram/`.

Diagram templates require live hydration — `// @live` as line 1, or the `--live` flag. Use the **diagram-designer** skill rather than assembling these by hand.

## Icons

Icons are passed as **components, not name strings**:

```tsx
import { IoCloudDone } from 'react-icons/io5';
<StatCard icon={IoCloudDone} … />
```

`react-icons/*` for generic concepts and `@flanksource/icons` for vendor/product logos are both available to facet templates without a `package.json`. In `.mdx`, `@iconify/react`'s `Icon` is injected into scope automatically.

Sizes: `w-4 h-4` in headers, `w-6 h-6` in grids, `w-7 h-7` for hero icons. Use `*White` icon variants only on colored backgrounds.
