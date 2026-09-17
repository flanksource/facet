# Colors and typography

## The restricted 5-color palette

Diagrams color exclusively through the `COLORS` role tokens exported by `@flanksource/facet` — never hardcoded hexes. Do not introduce additional base colors.

| Token | Role |
| --- | --- |
| `COLORS.primary` | Borders, arrows, active headers, source node headers |
| `COLORS.background` | Node fills, light backgrounds, arrow-label backgrounds |
| `COLORS.accent` | Emphasis text, catalog/hub background, darker active elements |
| `COLORS.muted` | Secondary text, inactive borders (e.g. an infrastructure source header), secondary arrows |
| `COLORS.outputBorder` | Output/result node headers and borders (green) |
| `COLORS.fk` / `COLORS.pk` | Entity-model aliases only: FK badge green, PK badge amber |

Box bodies are always `COLORS.background` (light) — only headers carry color.

### Hex divergence note

Two hex families exist in the wild:

| Role | facet `COLORS` (canonical for facet output, matches mission-control AGENTS.md) | Newer website style guide (`DiagramShowcase.tsx`) |
| --- | --- | --- |
| primary | `#2d7de4` | `#007fdf` |
| background | `#f7fbfe` | `#f7fbfe` |
| accent | `#1069dc` | — (dropped) |
| muted | `#62758a` | `#607689` |
| output green | `#10b981` | `#00ba85` |

Always write `COLORS.*` so diagrams follow whichever hexes the installed facet ships. If brand parity with the newer website set is required, change facet's `src/components/diagram/colors.ts` (the shared seam) — do not hardcode the newer hexes per-diagram. (`Diagram`'s `colors` prop currently only feeds a CSS variable; it does not recolor `BoxNode`/`Arrow` presets.)

### Sanctioned off-palette exceptions

- `COLORS.pk` amber — PK badges in entity models.
- Red `#ef4444` (+ Tailwind `red-100/300/700` for its label) — constraint/forbidden arrows only ("No Direct Access").
- The **semantic Tailwind stage palette** in hub-and-spoke product overviews: each stage/system keeps a consistent hue via `BoxNode className/bodyClassName` pairs — `bg-blue-600`/`bg-blue-50` (discover/ingest), `bg-amber-600`/`bg-amber-50` (analyze), `bg-violet-600`/`bg-violet-50` (act/playbooks), `bg-emerald-500`/`bg-emerald-50` (Git/IaC), `bg-indigo-500`/`bg-indigo-50` (MCP/protocol), `bg-slate-500`/`bg-slate-100` (infrastructure). Use this only for the hub-and-spoke style; flow/pipeline/ER diagrams stay on the 5-color palette. Always pass literal class names — Tailwind cannot extract computed strings like `` `bg-${color}-600` ``.

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

**White variants:** brand icons often ship in two variants — colored (`MissionControl`) and white (`MissionControlWhite`). The `*White` variant has hardcoded white fills that a `style={{ color }}` cannot recolor, so it is invisible on light backgrounds. Use `*White` only inside colored headers; everywhere else (light bodies, pills, IconNodes) use the colored variant.

Both icon libraries are always resolvable in facet templates (facet installs them into every build workspace) — no package.json required next to the template.
