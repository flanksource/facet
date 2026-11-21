# Colors and typography

## Facet palette and role themes

Use the `COLORS` tokens exported by `@flanksource/facet` for the standard light style. When the figure needs semantic roles or a night theme, define one named palette and reuse it across nodes, edges and legend; see `references/vocabulary.md`.

| Token | Role |
| --- | --- |
| `COLORS.primary` | Borders, arrows, active headers, source node headers |
| `COLORS.background` | Node fills, light backgrounds, arrow-label backgrounds |
| `COLORS.accent` | Emphasis text, catalog/hub background, darker active elements |
| `COLORS.muted` | Secondary text, inactive borders (e.g. an infrastructure source header), secondary arrows |
| `COLORS.outputBorder` | Output/result node headers and borders (green) |
| `COLORS.fk` / `COLORS.pk` | Entity-model aliases only: FK badge green, PK badge amber |

Keep bodies light when using a colored header. Dark hub chips and coherent night-themed figures are intentional alternatives.

### Hex divergence note

Two hex families exist in the wild:

| Role | facet `COLORS` (canonical for facet output, matches mission-control AGENTS.md) | Newer website style guide (`DiagramShowcase.tsx`) |
| --- | --- | --- |
| primary | `#2d7de4` | `#007fdf` |
| background | `#f7fbfe` | `#f7fbfe` |
| accent | `#1069dc` | — (dropped) |
| muted | `#62758a` | `#607689` |
| output green | `#10b981` | `#00ba85` |

Use `COLORS.*` when the intent is the installed Facet standard palette. If brand parity with the newer website set is required, change facet's `src/components/diagram/colors.ts` (the shared seam) rather than scattering replacements across diagrams. (`Diagram`'s `colors` prop currently only feeds a CSS variable; it does not recolor `BoxNode`/`Arrow` presets.)

### Semantic colors

- `COLORS.pk` amber — PK badges in entity models.
- Red `#ef4444` (+ Tailwind `red-100/300/700` for its label) is one existing constraint-arrow convention.
- The **semantic Tailwind stage palette** in the hub-and-spoke example assigns consistent hues to stages. Use literal class names, since Tailwind cannot extract computed strings like `` `bg-${color}-600` ``. Other figures may use a shared role palette when its meanings are clear and consistent.

## Typography & sizing

| Element | Class | Notes |
| --- | --- | --- |
| BoxNode header text | `text-white text-xs font-bold` | Always white on the colored header |
| Port chip text | `text-[10px] font-bold text-white` | On the chip fill; icon at `w-3 h-3` |
| Body / sub-item text | `text-[10px]` | Muted or `text-{color}-700` on light body |
| NodeSection headers | `text-[9px] font-bold uppercase tracking-wide` | Muted color |
| Icon labels (tiny) | `text-[8px]` – `text-[9px]` | Only for captions directly under icons |
| Arrow labels | `text-[9px] font-semibold` | In a colored pill |
| Hub/catalog title | `text-white text-lg font-bold tracking-wide` | Larger for visual weight |

Never go below `text-[8px]` — illegible. Never use `text-[8px]` for primary content.

Contrast: `text-white` on dark headers (`bg-{color}-600`), `text-{color}-700` on light bodies (`bg-{color}-50`).

## Icons

| Library | When | Examples |
| --- | --- | --- |
| `@flanksource/icons/mi` | Vendor/service logos | `AzureAd`, `Aws`, `K8S`, `Postgres`, `Http`, `MissionControlWhite` |
| `react-icons/hi2` | Generic concepts, UI glyphs | `HiUserGroup`, `HiShieldCheck`, `HiKey` |
| `react-icons/fa` | Supplementary generic icons | `FaHistory`, `FaDatabase`, `FaBan` |

Sizes: `w-4 h-4` in headers/pills, `w-5 h-5` medium, `w-6 h-6` default in grids, `w-7 h-7` for hero and IconNode icons. Header icons render white (`text-white`/`fill-white` as needed); body icons take `COLORS.accent`.

**White variants:** brand icons often ship in two variants — colored (`MissionControl`) and white (`MissionControlWhite`). The `*White` variant has hardcoded white fills that a `style={{ color }}` cannot recolor, so it is invisible on light backgrounds. Use it on sufficiently dark backgrounds and the colored variant on light bodies, pills and IconNodes.

Both icon libraries are always resolvable in facet templates (facet installs them into every build workspace) — no package.json required next to the template.
