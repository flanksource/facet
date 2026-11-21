# Diagram vocabulary

Pick a small, consistent vocabulary for each figure and explain non-obvious meanings in a legend. Catalog names describe visual patterns; only the Facet APIs identified here are component props. The machine-readable presentation options are in `schemas/styles.json.schema`, with a standalone example in `schemas/styles-example.yaml`. Element presentations use `kind: box`, `container` or `actor` to select the appropriate `style`; relationship presentations use `kind: arrow`. Templates must interpret these hints when drawing a diagram.

Runnable examples live in `examples/vocabulary.tsx` and `examples/vocabulary/`: `boxes-and-lines.tsx` contains box and line styles; `canvas-containers-actors.tsx` contains canvases, frames, containers and actors; `protocols-and-elements.tsx` contains architecture interfaces, communication patterns, elements and boundaries; `authorization.tsx` illustrates policy models, decentralized decisions and delegation; `rails-and-callouts.tsx` contains rails, callouts and night-themed elements. Copy the relevant component and its imports and shared helpers. Render the complete catalog or a named swatch page with the commands in `examples/README.md`.

## Boxes

`BoxNode` takes `variant`, `title`, optional `icon`, `description`, `footer`, `children`, `palette`, `fonts`, `id` and `ports`. Its default variant is `header`. The supported variants are:

| Variant | Meaning or use |
| --- | --- |
| `outlined` | Default outlined component. |
| `header` | Component with a role-coloured header and light body. |
| `tinted` | Light fill without a header. |
| `card` | White card inside a tinted zone. |
| `dashed` | Planned, optional or later work. |
| `stacked` | An outside party. |
| `chip-dark` | A visually prominent hub. |
| `pill` | Small node, member or tag. |
| `tile` | Icon-first square. |
| `accent` | Left stripe marking a role. |
| `borderless` | Icon and label row inside a zone. |
| `ghost` | Out-of-scope or removed item. |

Round and square are corner treatments, not `variant` values: use soft corners for product figures or square corners for blueprints and dense grids, consistently. Color components by role: `new`, `existing`, `external`, `security`, `store`, `action`, `cloud`, or `muted`. Use at most four roles in a figure where practical; maintain readable contrast. A dark hub is intentional; avoid saturated bodies beneath colored headers.

Choose only the information density needed: `glyph` (icon), `label`, `label-detail` (one fact), `tagged`, `listed` (members), or `detailed` (field table). Move excess detail into a caption or another diagram. Tag-placement alternatives are `chips`, `inline`, `corner`, `logo`, `footer`, `header`, `edge`, and `icons` with a legend; choose one placement style per diagram. These are composed content, not BoxNode variant props.

## Lines

Line styles can communicate `solid` synchronous calls or data, `dashed` async/optional/revoke paths, `dotted` batch/derived paths, `thick` primary paths, `both` request/response, and `plain` associations. Route aligned nodes straight, dense layouts orthogonally, obstacles with curves, and many converging sources via a bus. `open` arrowheads, `dot` attachments and `diamond` ownership are visual choices; verify the actual arrow API before using a head shape. The Facet `primary`, `secondary`, `er`, and `bidirectional` presets have their own styling; explicit props override them. Do not assume their defaults encode every catalog meaning.

Flow color roles are `data`, `control`, `policy`, `async`, `context`, and `error`. A diagram's legend must match its strokes: the catalog's example combines policy with dashes and async with dots, so dashes are not universally equivalent to async. Choose one label style: `plain`, `pill`, `box` for boundary crossings, numbered `step`, or uppercase `verb`. Label density ranges from `bare` through `verb`, `protocol`, `step`, `condition`, and `payload`; add only information the endpoints do not already convey.

## Interfaces and communication

Label a relationship with the interface or transport only when it is known and relevant: `HTTPS`, `gRPC`, `GraphQL`, `WebSocket`, `SSE`, `Webhook`, `MQTT`, `AMQP`, `Kafka protocol`, `NATS`, `SQL`, `OTLP`, `DNS`, `SSH` or `SFTP` are useful starting points, not a closed taxonomy. Place the label on the `Arrow` for a particular flow; use a `BoxNode` port when the exposed endpoint itself matters, and a separate node for a gateway, broker or other independently operated component. Add payload, operation, port or security detail only where it answers the diagram's question. Generic arrow and port recipes are in `references/arrows-and-flows.md` and `references/box-styles-and-content.md`.

| Communication | How to depict it |
| --- | --- |
| HTTP or HTTPS request | Client → server with method, API or payload when useful; show the response separately only when its direction matters. HTTPS identifies a protected transport, not the caller's authorization. |
| gRPC | Caller → service for a unary request; show stream direction explicitly for server, client or bidirectional streaming. gRPC is not always a synchronous call. |
| GraphQL | Label queries or mutations on the client → API relationship. A subscription is a stream and may use WebSocket or SSE; GraphQL does not prescribe one transport. |
| WebSocket | Use arrowheads in both directions when both peers send messages. Name a particular message direction if the figure only shows one part of the exchange. |
| Server-sent events | The client initiates an HTTP event-stream request; events travel server → client. Show the request separately if setup matters. |
| Webhook | Producer → receiver for an event notification, typically an HTTP POST; label the receiver and retries or verification where relevant. It is not an SSE stream. |
| Queue, topic or stream | Draw the broker, queue or topic as a node when ownership, persistence or fan-out matters; separate publish and subscribe arrows and name the event. MQTT and AMQP are protocols; Kafka and NATS also name products. |
| Data, telemetry or control | Label a database exchange `SQL`, telemetry `OTLP`, and management calls with their actual interface when known. Distinguish data-plane flows from control-plane configuration if both are shown. |

OpenID Connect, OAuth 2.0 and SAML describe identity or delegated access interactions; `mTLS` describes mutual TLS authentication and transport protection. A protocol label does not establish where an identity is validated or which policy authorizes an operation. Show the identity provider, credential, enforcement point, decision point, protected resource and relevant trust boundary explicitly when known. Never infer authentication, authorization, encryption, network reachability or protocol from a box, icon or color alone.

Use arrowheads for the direction of the illustrated message, not an assumption that an entire connection is one-way. A request and response, bidirectional channel and asynchronous event are different interaction patterns. Dashes, colors and thickness have only the meaning defined by that figure's legend; do not assign fixed security or protocol semantics to them.

## Authorization models and delegation

Separate the identity being authenticated, the action being authorized, the policy decision point (PDP), the policy enforcement point (PEP), and the protected resource. A service can combine these responsibilities or call a separate PDP; depict their actual placement. A policy administration point or authority defines policy, and an attribute source or policy information point supplies inputs. A single box labelled “auth” obscures these distinctions when the view is about access decisions.

| Pattern | What the diagram should show |
| --- | --- |
| Federated authentication | Show each relevant identity provider and trust boundary, which principal it authenticates, the credential issuer and where issuer, audience and identity claims are checked. An intermediary may validate upstream identities and issue a different credential; do not assume every service directly trusts every upstream issuer. |
| RBAC | Principal → role assignment → role permissions → resource/action. Show the relevant role and scope, such as `investigator` may `telemetry.read` for one tenant. Roles can inherit permissions or have constraints; do not imply a group and a role are necessarily the same. |
| ABAC | The policy uses subject, resource, action and, where relevant, environment inputs. Show their sources and an example predicate, such as matching the subject's tenant to the resource tenant for a read. Indicate the PDP and the PEP that applies the result. |
| RBAC + ABAC | Show the role-derived permission and the additional attribute condition as separate inputs to the same decision. A role alone does not establish that all attribute conditions pass. |
| Distributed or decentralized decisions | Show the separate local PDPs and PEPs, their protected services, where policy comes from and how it reaches them. Centralized policy administration can coexist with distributed decisions; independent policy authorities, federation and local evaluation are distinct choices. If policy freshness or conflict resolution matters, annotate the stated behavior rather than assuming it. |
| Delegated access | Identify the subject on whose behalf access is requested, the distinct acting principal, grantor, credential issuer, target audience, permitted actions/scopes and enforcement point when known. Draw each described delegation hop and its trust boundary; show expiration, revocation and audit where relevant. |

Delegation is not the same as impersonation: in delegation the actor remains distinguishable from the subject; impersonation presents the other identity within the stated context. A workload using its own service identity is not automatically acting on a user's behalf. OAuth token exchange can implement either pattern depending on the issued credential and policy; do not infer delegation from OAuth, a token or an arrow alone. For delegated chains, label the grantor and recipient at each documented hop and avoid assuming that a downstream scope or revocation automatically propagates.

Use separate arrows for an access request, policy/attribute distribution, a decision, token issuance and resource access when their direction matters. Document whether the decision and policy management are centralized, distributed, federated or independently administered; do not encode these distinctions solely with color or a dashed line. The [NIST RBAC definition](https://csrc.nist.gov/glossary/term/role_based_access_control), [NIST ABAC guide](https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-162.pdf), [OAuth token exchange specification](https://www.rfc-editor.org/rfc/rfc8693.html), and [OPA deployment patterns](https://www.openpolicyagent.org/docs/deploy/k8s) provide terminology; the diagram still needs evidence for its particular implementation.

## Common architecture elements

| Element family | Useful presentation |
| --- | --- |
| People, groups and external systems | Distinct actor or group icon and label; use a separate outside-party box for an independently operated system. |
| Agentic systems | Separate the agent or orchestrator, model provider, tool gateway and approval point when their responsibilities differ; show tool calls and external model requests as named flows. |
| API, gateway and service | Box for the service or gateway, port for a relevant endpoint, and labelled arrows for calls; distinguish the public interface from internal workloads. |
| Queue, database, cache and object storage | Give each store or broker its own named box and technology icon when useful; label publish, read or write flows rather than treating every store as a database. |
| Deployment and ownership | Nest service boxes in the cluster, region, account or deployment container that owns them. Use separate labelled provider and customer boundaries for hosted and self-hosted SaaS. |
| Identity and security | Draw the identity provider, authentication control and authorization decision/enforcement as separate elements when the implementation matters. Show protected resources and credential or policy flows across labelled trust boundaries. |
| DevOps and operations | Separate source, pipeline/runner, artifact registry and deployment controller; add observability or audit services and their telemetry paths when in scope. |

Choose a small set of recognizable box styles, named role colors and offline icon components; explain non-obvious choices in the legend. Use `@flanksource/clicky-ui/icons` for generic concepts and `@flanksource/icons/mi` for available product logos. A nested box denotes containment or ownership only as labelled; a trust boundary and a deployment boundary are not interchangeable. Avoid implying that a particular hosted or self-hosted layout is universal.

## Canvas and frames

Canvas backgrounds: `plain` white for print, `paper`, `dots`, `grid`, `tint`, `wash`, `night`, and `transparent` for inherited page backgrounds. PNG exports need an opaque background. Frames: `none` for inline figures, `card`, `figure` with numbered caption, `titled`, `crop` for reference drawings, and `footer` for a bottom title. These are composition patterns, not Facet canvas variant props. Avoid duplicating a surrounding document heading.

## Containers

`ContainerNode` takes `variant`, `id`, `title`, `icon`, `description`, `tag`, `footer`, `children`, `palette`, `fonts`, `minWidth`, and `className`. Its default is `zone`. Available variants are `zone` (tinted group), `boundary` (trust or network edge), `binding` (solid ownership), `region`, `header`, `panel`, `frame` (deployment), `exception`, `lane`, `column`, and `card-group`. `nested` is composed by placing containers inside one another, not a variant. Lines should connect to the owning boundary or node, and nesting should add meaning rather than repeat identical frames.

Containers reuse the box roles at lower intensity, via a light tint or colored edge. Container density can be `unlabelled`, `tag`, `titled`, `members`, or `footer`; label a boundary people cross and add member/footer detail when the container itself is the subject.

## Actors, rails and callouts

Actors start or approve work and should be visually distinct from components. Styles: `figure`, `avatar`, `stacked`, `pill`, `cursor`, `agent`, `group`, and `identity`. Roles: `human`, `approver`, `agent`, `service`, `external`, and `untrusted`; use color to communicate authority. Density: `icon`, `name`, `role`, `identity`, or `permissions`, with the last two reserved for relevant access/security detail. These are visual patterns, not `BoxNode` variants; `FlowLane.kind` supports `person` and `system`.

Rails mark ordered sequences: `vertical`, `gradient`, `progress`, `dashed`, `horizontal`, `chevron`, `timeline`, and `lettered` for parallel paths. Use a rail only when order or timing matters. Diagram callouts include `marker`, `leader`, `exploded`, `edge-tag`, and `bubble`; step callouts include `badge`, `banner`, and `note`. Number callouts referenced by the surrounding text and use one style per figure.

For numbered-rail scenes, the kit is `step`, `frame`, `band`, `tile`, `tile-brand`, `card`, `chevrons`, and `window`. The night theme uses these named colors in one shared theme map:

| Token | Value | Use |
| --- | --- | --- |
| `night/canvas` | `#0b1023` | Background with a subtle slate grid. |
| `night/card` | `#151b33` | Card and window fill. |
| `night/edge` | `#2a3354` | Borders and separators. |
| `night/text` | `#f8fafc` | Titles and brand-tile fill. |
| `night/muted` | `#94a3b8` | Body copy and labels. |
| `night/rail` | `#6366f1` | Rail start and step rings. |
| `night/rail-end` | `#a855f7` | Rail gradient end. |
| `night/green` | `#4ade80` | Base layer, environment or success. |
| `night/purple` | `#a78bfa` | Shared engines and platform. |
| `night/orange` | `#fb923c` | Domain layer or warning. |

The rail gradient runs from `night/rail` to `night/rail-end`. Repeat each band's role color on its label and tiles; use at most three role colors in the figure and green for the base layer. Night-theme values are catalog colors, not exported `COLORS` members: define a named map once if implementing this composition.
