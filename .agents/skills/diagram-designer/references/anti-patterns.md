# Anti-patterns

The full list, adapted for facet from the mission-control diagram conventions. Each item names the failure it prevents.

1. **Missing `// @live` as the first line** (or `--live` on the command) — the SSR pass skips `<Diagram>` children entirely, so the output has boxes' placeholder but no arrows. The facet bake fails loudly on hydration problems; a diagram silently missing arrows means the live directive was forgotten.
2. **Missing `id` on arrow endpoints** — Xarrow silently anchors a missing endpoint at (0,0), producing arrows into the page corner. Always use the `id()` factory from `<Diagram>` and pass ids via `from`/`to`.
3. **Using `start`/`end` props on `Arrow`** — the facet API is `from`/`to`; `start`/`end` bypass the endpoint mapping and are drift from older examples.
4. **Using `className` without a `bg-{color}-{shade}` literal on BoxNode** — the border is auto-derived by regex from the header class; a computed class string (`` `bg-${c}-600` ``) breaks both the regex and Tailwind extraction. Prefer inline `headerColor`/`bodyColor`/`borderColor` with COLORS; raw `<div>` nodes can freely mix Tailwind and inline styles.
5. **Mixing vertical and horizontal flow** in one diagram — create two separate diagrams instead.
6. **Colors outside the palette** — stick to the `COLORS.*` tokens (entity models may use `fk`/`pk`; hub-and-spoke may use the semantic Tailwind stage palette; constraint arrows may use red `#ef4444`). Nothing else.
7. **Text smaller than `text-[8px]`** — illegible on most screens, worse in PDF.
8. **More than 4 arrow crossings** — simplify or rearrange the layout instead.
9. **Targeting inner sections with arrows** — point arrows at the outer BoxNode `id`, not inner `NodeSection` ids (inner ids are for secondary arrows only). **Ports are the exception**: a port is an interaction point on the box boundary, so an arrow terminating on a port `id` is correct and is the reason ports may carry one. The rule is about reaching *inside* a node, not about docking on its edge.
10. **Margin/padding for arrow-gap control** — insert a spacer `<div style={{ minWidth: '60px' }} />` between nodes instead of adding margin to the nodes themselves.
11. **Bordered intermediary icons** — intermediary services (Log Analytics, Event Hub) use the borderless IconNode, never the bordered icon+label pattern; the border weight signals "major node".
12. **Arrows cutting through intermediate elements** — use offset anchors or rearrange columns so arrows route around, not through.
13. **Overlapping arrow bundles** — when many arrows converge on one anchor (e.g. 5+ FKs on `top` of one entity), spread them with offset anchors (`offset: { x: ±40 }`) or different anchor positions (`top` vs `left`). Still crowded? Reduce visible arrows or split the diagram.
14. **Stub arrows** — nodes so close the line is shorter than its arrowhead. Keep `gap-8` minimum between connected nodes or add spacers; if nodes must be close, reduce `headSize` to 3 or `showHead={false}` and let the dash animation carry direction.
15. **Unnecessary curves on aligned nodes** — react-xarrows defaults to smooth curves; use `path="straight"` (or `curveness={0}`) when the endpoints are in the same row/column or the diagonal is unobstructed. Reserve `curveness: 0.4` for dense ER diagrams.
16. **Arrows routing over or behind other boxes** — an arc above/behind an intermediate node confuses what connects to what. Rearrange the layout or switch anchor sides (`startAnchor="top"` → `"right"`) so the route clears the obstruction.
17. **More than 7–8 boxes in one diagram** — split into multiple diagrams/Sections (the pipeline example demonstrates this); for fan-in/fan-out, cap at 3–4 sources/outputs per column.
18. **Dark box bodies** — bodies are always light (`COLORS.background` / `bg-{color}-50`); only headers carry saturated color.
19. **`*White` icon variants on light backgrounds** — white-variant brand icons (`MissionControlWhite`, `ConfigDbWhite`, …) have hardcoded white fills that `style={{ color }}` cannot recolor, so they vanish on a light body or pill. White variants belong inside colored headers only; use the colored variant (`MissionControl`) everywhere else.
