# Architecture description schemas

Each architecture view has its own schema, independent of a diagram renderer or lint prompt. The view schemas share fields from [common.schema.json](common.schema.json), which references [styles.json.schema](styles.json.schema) for presentation definitions. Keep these files together so their relative references resolve. All use JSON Schema Draft 2020-12 and work with Facet's `--schema` data validation.

| Schema | `view` value | Focus |
| --- | --- | --- |
| [Conceptual](conceptual.schema.json) | `conceptual` | Actors, capabilities, the system and external dependencies |
| [Logical](logical.schema.json) | `logical` | Components, interfaces, stores and interactions |
| [Security](security.schema.json) | `security` | Identities, assets, trust boundaries, flows and controls |
| [Deployment](deployment.schema.json) | `deployment` | Infrastructure, ownership, workload placement and connectivity |

## Examples

Each scenario has four views of the same architecture. Choose the view that answers the reader's question; the descriptions are inputs to a diagram.

| Scenario | Conceptual | Logical | Security | Deployment | What it illustrates |
| --- | --- | --- | --- | --- | --- |
| Agentic incident copilot | [Conceptual](examples/conceptual.yaml) | [Logical](examples/logical.yaml) | [Security](examples/security.yaml) | [Deployment](examples/deployment.yaml) | Model and telemetry access, scoped tools, human approval and recorded remediation |
| Cloud order processing | [Conceptual](examples/cloud/conceptual.yaml) | [Logical](examples/cloud/logical.yaml) | [Security](examples/cloud/security.yaml) | [Deployment](examples/cloud/deployment.yaml) | Internet ingress, a transactional outbox, queued fulfillment and managed data |
| DevOps delivery | [Conceptual](examples/devops/conceptual.yaml) | [Logical](examples/devops/logical.yaml) | [Security](examples/devops/security.yaml) | [Deployment](examples/devops/deployment.yaml) | Reviewed source, signed artifacts, promotion approval and deployment admission |
| Hosted SaaS | [Conceptual](examples/saas-hosted/conceptual.yaml) | [Logical](examples/saas-hosted/logical.yaml) | [Security](examples/saas-hosted/security.yaml) | [Deployment](examples/saas-hosted/deployment.yaml) | Nested services, presentation preferences, federated identity, tenant policy enforcement and approved support |
| Self-hosted SaaS | [Conceptual](examples/saas-self-hosted/conceptual.yaml) | [Logical](examples/saas-self-hosted/logical.yaml) | [Security](examples/saas-self-hosted/security.yaml) | [Deployment](examples/saas-self-hosted/deployment.yaml) | Customer-managed data, signed updates, local approval and outbound license checks |
| Mission Control for OIPA | [Conceptual](examples/mission-control-oipa/conceptual.yaml) | [Logical](examples/mission-control-oipa/logical.yaml) | [Security](examples/mission-control-oipa/security.yaml) | [Deployment](examples/mission-control-oipa/deployment.yaml) | A generalized Phase 1 proposal with separate identity, platform authorization and target permissions |

The SaaS examples describe the same type of service health product in two deployment models. In the hosted example, the provider operates shared services and partitions customer data by tenant. In the self-hosted example, the customer operates the installation and retains health data locally; the pictured vendor interactions are outbound update and license requests. These are illustrative design choices, not guarantees about any real product.

The Mission Control for OIPA views generalize an architecture-review proposal. They omit customer and environment identifiers and do not claim to describe a live deployment. The [Facet examples](../examples/README.md#mission-control-for-oipa) were built from these structured descriptions and are edited directly as TSX; the other scenario descriptions are illustrative inputs rather than rendered diagrams.

The focused [delegated authorization security example](examples/delegated-authorization/security.yaml) adds a fictional agent acting for an analyst, role and attribute checks, independent policy authorities, and decisions local to two services. It is a security-only example.

Each YAML example starts with a `# yaml-language-server: $schema=...` modeline pointing to its view schema. Editors using the [YAML Language Server](https://github.com/redhat-developer/yaml-language-server#associating-schemas) use it for completion, hover and validation. The path is relative to the YAML file: for example, use `../security.schema.json` from `examples/` and `../../security.schema.json` from a scenario subdirectory. The modeline is a comment, so it does not become architecture data. Each schema requires its own `view` value, so selecting the wrong view schema produces a validation error.

[styles-example.yaml](styles-example.yaml) is a standalone style document with `diagram`, `element` and `relationship` preferences. Its modeline points directly to `styles.json.schema`; the view schemas resolve those same definitions through `common.schema.json`. The style document is an example of the shared shapes, not an automatically applied theme file.

Protocol names, relationship kinds and security models describe architecture meaning and remain in the architecture schemas; visual treatments and catalog presentation choices live in the styles schema.

## Document fields

| Field | Meaning |
| --- | --- |
| `view` | Required view discriminator: `conceptual`, `logical`, `security`, or `deployment`. |
| `name` | Required human-readable architecture or system name. |
| `purpose` | Required outcome or question the view addresses. |
| `scope` | Required description of the view's scope and boundary. |
| `elements` | Required array of elements, such as actors, systems, components, trust zones, or controls. |
| `relationships` | Required array of relationships between elements; use an empty array when none are described. |
| `presentation` | Optional layout, direction, palette and default box/container styles for the diagram. |
| `extensions` | Optional object for domain-specific properties outside the schema's named fields. |

An element requires an `id`, `name`, and `kind`. Optional `description` explains its role and `extensions` holds domain-specific detail. A relationship requires its own `id`, `kind`, `source`, and `target`; the latter two name element IDs. Optional `name`, `description`, and `direction` explain the interaction. `direction` may be `one_way`, `two_way`, `undirected`, or `other`; omission means the direction was not specified.

The permitted element and relationship kinds differ by view and are listed in each view schema. Select `other` for an unlisted kind and provide `kindDetail`; an `other` direction requires `directionDetail`. These details describe the specific category, rather than replacing the element or relationship name.

Logical, security and deployment relationships may use `protocol` to name a relevant protocol, interface, interaction pattern or security mechanism. Editors suggest common values including `HTTPS`, `gRPC`, `GraphQL`, `WebSocket`, `SSE`, `Webhook`, `AMQP`, `OpenID Connect` and `mTLS`; the list is open, so values such as `Kubernetes API` or a custom transport remain valid. Record additional layers in the relationship's `description`, such as a webhook delivered over HTTPS, and state security controls separately rather than inferring them from a protocol label.

## Deployment placement

The deployment view may specify `deploymentModel` as `provider_hosted`, `customer_hosted`, `hybrid`, or `other`; `other` requires `deploymentModelDetail`. Deployment elements can describe environments, cloud accounts, regions, networks, clusters, namespaces, workloads and managed services. Nest them to show placement and boundaries, and use relationships to describe routing, deployment, storage or other connections.

Optional element fields record `ownership` (`provider`, `customer`, `shared`, `third_party`, or `other`), infrastructure `provider`, `environment`, `runtime`, `replicas` and deployed `version`. Here `provider` ownership refers to the product operator, while the separate infrastructure `provider` identifies the cloud or location. For each enum that supports `other`, provide its corresponding detail field. These fields describe the depicted deployment and do not imply inherited values for nested elements.

## Nesting

Nest an element inline in its containing element's `children` array, or list it in `elements` with a `parent` ID. Both forms can be used in one document and can span multiple levels. An inline child must omit `parent`: its enclosing element already establishes the parent. Relationships and control references use the same IDs for nested and top-level elements. The hosted SaaS examples show nested capabilities, services and controls alongside elements using `parent`.

IDs must be unique across every element at every nesting level and every relationship in one architecture. Parents must exist and form an acyclic hierarchy; relationship endpoints and control IDs must refer to existing elements, and control IDs must identify security controls. JSON Schema checks their shapes but cannot enforce these cross-reference rules.

## Presentation preferences

Diagram-level `presentation` can set `layout`, `direction`, `defaultBoxStyle`, `defaultContainerStyle`, `canvasStyle`, `frameStyle`, `railStyle`, callout styles, `theme`, `background`, a partial `palette` and `fonts`. Layout describes the composition, while diagram `direction` describes the preferred reading direction; relationship `direction` still describes that relationship. Select `other` with `layoutDetail` for an unlisted layout.

An element's `presentation` uses a required `kind` discriminator: `box`, `container` or `actor`. Its `style` and `density` are selected from the vocabulary for that kind; boxes may also set `tagPlacement`, and actors may set a visual `role`. All three can specify `visualRole`, corners, `icon`, `palette`, `fonts` and `minWidth`. The presentation kind is separate from the element's architectural `kind`, so an actor can be drawn as a box. For example:

```yaml
presentation:
  kind: box
  style: header
  density: label-detail
```

Box and container `style` values match the current `BoxNode` and `ContainerNode` variants. Actor styles and the density, role, corner and tag options are composition hints, not component props. `style` is optional; when omitted, use diagram defaults and then Facet component defaults. Children do not require a particular presentation kind.

A relationship's `presentation` uses `kind: arrow` and may set `style` to a Facet `Arrow` variant, along with color, path, stroke width, dashness and label position, as well as catalog line, head, flow-role and label composition hints. These are visual preferences; the relationship's architectural kind, direction and label define its meaning. When a catalog hint and an explicit Arrow property both specify the same detail, the explicit property takes precedence.

To update an existing description, replace presentation `shape` with `kind`, the kind-specific style field with `style`, and the kind-specific density field with `density`. For an actor, rename `actorRole` to `role`. Replace an arrow's `variant` with `kind: arrow` and `style`.

Colors are objects with exactly one of `token` (a `COLORS` member such as `primary`), `themeToken` (a named catalog color such as `night/rail`) or `css` (a CSS color such as `#ffffff` or `var(--diagram-accent)`). Theme tokens are defined in `references/vocabulary.md`, not exported Facet `COLORS` members. Palette properties match `NodePalette`, and font properties match `NodeFonts`. Resolve color tokens and merge component defaults, diagram overrides and element overrides in that order before passing complete palette and font objects to Facet. The schema records preferences; a template must interpret them to render a diagram. Catalog canvas, frame, rail and callout names are likewise composition hints rather than Facet props.

An icon specifies `source` and `name`, with an optional `color` override. `clicky_ui` names a `Ui*` export from `@flanksource/clicky-ui/icons`; `flanksource_icons` names a product icon from `@flanksource/icons/mi`; `iconify` also requires a `collection` and maps to an offline `@iconify-icons/<collection>/<name>` import. `custom` uses a local component registry, while `other` requires `sourceDetail`. Resolve these declarations to offline component or icon-data imports; do not pass a runtime Iconify name string as a React icon prop.

## Security implementation

In the security view, a `security_control` element requires a `controlType` such as `authentication`, `authorization`, or `encryption`. Select `other` and provide `controlTypeDetail` for an unlisted control. `controlIds` on a security element or relationship name the controls applying there. A security relationship may include `protocol`, `credential` and `dataClassification`; an `other` classification requires `classificationDetail`. Logical relationships may also name a `protocol`.

A security control may include an `implementation` object to map how it works. It requires `mechanisms` and `enforcedBy`; optional `implementedBy`, `identityProvider`, `decisionPoint`, `principalIds` and `resourceIds` refer to elements anywhere in the architecture. `implementedBy` identifies where the implementation or configuration lives, `enforcedBy` identifies the enforcement points, and `decisionPoint` identifies a separate policy evaluator when present. `claims`, `actions` and `policy` record the inputs, operations and decision rule. Use an `other` mechanism with `detail` for an unlisted mechanism.

Use `identityProviders` instead of `identityProvider` when multiple authorities authenticate principals represented by a control. Identify the issuer of any resulting credential and the actual trust and validation relationships separately; listing identity providers does not imply that each service directly trusts each provider.

For RBAC, `roleBindings` can record a role, its principal IDs, resource IDs and allowed actions. For ABAC, `attributes` records each input's `category` (`subject`, `resource`, `action`, `environment` or `other`), `name`, and optional `sourceIds` and description. `other` requires `categoryDetail`. A control may list both `rbac` and `abac` mechanisms when both contribute to its policy; the schema does not assume one grants access without the other.

`decisionPoints` names multiple PDP elements and is an alternative to the singular `decisionPoint`. `decisionTopology` describes centralized, distributed, mixed or other decision placement. Separately, `policyAdministration` describes centralized, federated, decentralized, mixed or other policy authority, and `policyAuthorityIds` names the authorities. An `other` value requires the corresponding detail field. Use the plain-language `policy` to explain policy distribution, conflicts, freshness and fail behavior where relevant; distributed decisions do not imply decentralized administration.

`delegations` records one or more described on-behalf-of grants. Each entry identifies the original `subjectId` and distinct `actorId`, with optional `grantorId`, `issuerId`, `resourceIds`, `actions`, `audiences`, `scopes`, `expiresIn` and `revocation`. These are architecture descriptions, not credentials or grants. Describe each known hop explicitly; the list alone does not prove that entries form a chain or that restrictions and revocation propagate. Impersonation and a workload acting under its own identity have different semantics and should not be encoded as delegation without evidence.

Credentials on controls or flows describe their `type` and optional `format`; `other` requires `detail`. They describe credentials without storing token, key or certificate values. The hosted SaaS security example maps OIDC and JWT validation separately from tenant authorization and row-level enforcement, and shows the access token and collector certificate on their respective flows. The agentic security example also distinguishes engineer and workload authentication from tool authorization.

Schema validation does not prove that element references, role bindings, attributes, delegation restrictions, named controls, policy, icons or colors exist, or that an architecture is complete, secure, implemented, or visually correct.

## Validate and use

To validate the included agentic security example with Facet, run this from the repository root:

```bash
facet html examples/page-sizes/Canvas.tsx --data .agents/skills/diagram-designer/schemas/examples/security.yaml --schema .agents/skills/diagram-designer/schemas/security.schema.json -o .tmp/architecture-schema-smoke
```

Facet validates the input before rendering. Its CLI needs the explicit `--schema` argument; the YAML modeline is for editors. The validator resolves local schema references relative to the referring schema file; remote schema references are not loaded. Use a CLI built with local schema reference support: older installed builds that compile only one schema file cannot validate the split architecture schema. During development, invoke the checkout's source CLI with `cli/node_modules/.bin/tsx cli/src/cli.ts` in place of `facet`. This canvas template demonstrates validation only. Architecture descriptions can seed an initial diagram; the resulting TSX can then be edited and rendered independently.
