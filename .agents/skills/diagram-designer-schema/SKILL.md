---
name: diagram-designer-schema
description: Create or update Facet architecture diagrams using schema-validated YAML or JSON as structured reference data. Use for conceptual, logical, security, or deployment views with nesting, relationships, and presentation preferences. For database entity schemas or diagrams without architecture descriptions, use diagram-designer instead.
---

# Schema-backed architecture diagrams

Use the architecture description as structured reference data for a diagram. It can seed an initial Facet `.tsx` template; after that, edit the template directly. The diagram does not need the YAML or JSON at render time, and regenerating it must not overwrite hand edits. Use this skill for a new reference description, a diagram informed by one, or an update to either artifact. Honor the requested deliverables: a data-only request does not require a render.

The canonical schemas, field guide, presentation rules and scenario examples are in [diagram-designer/schemas/README.md](../diagram-designer/schemas/README.md). Use [diagram-designer](../diagram-designer/SKILL.md) for Facet primitives, layout choices and the render-and-review workflow, and [facet-cli](../facet-cli/SKILL.md) for render options and troubleshooting. Resolve these paths relative to this skill, including when the skills are installed as a plugin.

## Choose the view

Read the supplied source, context and any existing YAML/JSON, template and render before editing. Determine the intended audience, scope and view from the request and existing artifacts. Keep separate documents for different views; only ask when a material decision cannot be inferred.

| `view` | Schema | Show |
| --- | --- | --- |
| `conceptual` | [conceptual.schema.json](../diagram-designer/schemas/conceptual.schema.json) | Actors, capabilities, systems and external dependencies |
| `logical` | [logical.schema.json](../diagram-designer/schemas/logical.schema.json) | Components, interfaces, stores and interactions |
| `security` | [security.schema.json](../diagram-designer/schemas/security.schema.json) | Identities, trust boundaries, assets, access flows and controls |
| `deployment` | [deployment.schema.json](../diagram-designer/schemas/deployment.schema.json) | Infrastructure placement, ownership, runtimes and connections |

Each view schema resolves the sibling `common.schema.json` and `styles.json.schema`; keep those dependencies accessible. Set `view` to the value required by the chosen schema. For YAML, add a `# yaml-language-server: $schema=...` modeline with a path relative to the YAML file for editor completion. JSON may be associated with its schema through editor configuration.

## Describe or update the architecture

Create or edit the YAML/JSON using the requested view's schema. Give the document `name`, `purpose`, `scope`, `elements` and `relationships`. Give each element a stable `id`, `name` and architectural `kind`; each relationship has its own `id`, `kind`, `source` and `target`. Use known facts and mark meaningful unknowns as such rather than inventing infrastructure, protocols or controls. For an unlisted enum value, use `other` and its detail field where the schema supports them; otherwise report the unsupported value. Protocol suggestions are open to custom strings.

On updates, preserve unchanged IDs, nesting, relationships, presentation, extensions and unknown details. Change the requested part of the description and repair references when an ID or element must change. Preserve the existing file format and editor association unless the user requests a migration. Keep `children` nesting and `parent` references consistent: an inline child cannot also declare `parent`.

For security views, model only the controls and flows supported by the source. Map where authentication and authorization are implemented, evaluated and enforced; distinguish identities, resources, actions and trust boundaries. Where relevant, record RBAC role bindings, ABAC attribute sources, multiple identity providers, local decision points and their policy authorities. A delegated flow identifies the original subject and distinct actor and records known restrictions; do not infer delegation from a workload identity or decentralized administration from distributed decisions. Describe credential types, never secret values.

For deployment views, use the supplied evidence to distinguish provider, customer, shared and third-party ownership; represent placement with nested environments, accounts, clusters, workloads and managed services. Record a hosting model, runtime or replica count only when known.

## Build and update the diagram

Use the structured description to select the initial elements, relationships, nesting and presentation. Author or generate readable Facet `.tsx` with explicit components and editable layout. Once the template exists, make requested diagram changes in the TSX; consult the reference description as needed, and update it separately when the request includes changing the architecture data. Do not silently regenerate or replace a hand-edited template. A data-driven runtime template is appropriate only when it is explicitly requested.

Use both inline `children` and `parent` IDs to understand containment. Preserve element IDs as diagram endpoints, using the same `Diagram` ID helper for nodes and arrows, and preserve relationship sources, targets and labels. Explicitly render `one_way` from source to target and `two_way` with arrowheads at both ends; render an absent or `undirected` direction without directional heads, and describe an `other` direction from its detail. Override the Arrow preset's markers as needed: the `bidirectional` preset uses circles, not directional arrowheads. `DiagreDiagram` accepts direct `BoxNode`/`BrandBox` and `Arrow` children only, so use `Diagram` with composed containers when nested groups need to be visible.

Interpret `presentation` through the shared styles schema: element `kind: box`, `container` or `actor` selects a presentation, separately from the element's architectural `kind`; relationship presentation uses `kind: arrow`. Map supported styles, colors, icons and layout preferences to Facet primitives or compose them as documented in the styles guide. Use offline icon imports or an explicit local registry, and resolve theme and color tokens before passing palette values to Facet. Do not silently omit a supplied preference or security-relevant detail; report any that the template cannot represent and adjust the design where practical.

When no direction is specified, prefer a top-to-bottom composition. Draw the relationships the description actually contains; elements can also be grouped by containment or alignment without an arrow. Choose a mix of actor figures, boxes and containers appropriate to their roles, while preserving any explicit presentation preferences.

## Validate and render

Validate the reference data against its view schema using a Draft 2020-12 validator that resolves local references. Render the hand-editable template separately; select the actual paths for the data, schema, template and output:

```bash
check-jsonschema --schemafile path/to/security.schema.json architecture.yaml
facet png diagram.tsx --live -o diagram.png
```

For a data-only request, use an available JSON Schema validator without rendering. A successful schema check covers shapes and enums, not semantic references: also verify unique element and relationship IDs, existing parents and an acyclic hierarchy, existing relationship endpoints, and the appropriate security control and implementation references. Check that the description agrees with the supplied source and that no relationships or authorization details were invented.

For a diagram request, render with `// @live` on the template's first line or `--live`, inspect the actual image, and compare its elements, nesting, labels, arrow directions and boundaries with the available reference and requested changes. Iterate until the relevant view and the rendering are readable and faithful. Use the matching conceptual, logical or security architecture lint prompt and the visual review in diagram-designer when available; deployment has no dedicated architecture prompt. Report unavailable checks and unresolved rendering limitations instead of claiming a successful visual review. Produce the requested final format after the reviewed PNG, and give the user the paths to the reference data, template and output.
