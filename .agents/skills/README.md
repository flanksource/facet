# Facet agent skills

Claude Code skills for [Facet](https://github.com/flanksource/facet) — building PDF, HTML and PNG output from React and Markdown templates. Published as the `facet-skills` plugin from this repo's marketplace.

## Skills

| Skill | Use it for |
| --- | --- |
| **facet-documents** | Authoring templates: `Document`/`Page`/`Header`/`Footer` structure, page sizes and margins, page numbers, the component library, the pt-based type scale, `Theme` tokens, Markdown/MDX |
| **facet-cli** | Running facet: `html`/`pdf`/`png`/`fill-pdf`/`serve`/`lint`/`doctor`, render flags, data loading and schema validation, remote templates and remote rendering, troubleshooting |
| **diagram-designer** | Node-and-arrow architecture, data-flow and ER diagrams: a workflow from brief to reviewed render, with runnable layout examples |
| **diagram-designer-schema** | Create and update conceptual, logical, security and deployment diagrams from schema-backed architecture descriptions |

Each skill keeps `SKILL.md` focused and uses supporting references where needed. `diagram-designer` also ships runnable examples, reference renders and shared architecture schemas.

## Install

```
/plugin marketplace add flanksource/facet
/plugin install facet-skills@flanksource-facet
```

Or enable it directly in `settings.json`:

```json
{ "enabledPlugins": { "facet-skills@flanksource-facet": true } }
```

Skills are then invocable as `/facet-skills:facet-documents`, `/facet-skills:facet-cli`, `/facet-skills:diagram-designer` and `/facet-skills:diagram-designer-schema`, and Claude will load them automatically when a task matches their description.

## Layout

```
.claude-plugin/marketplace.json     # repo-root marketplace registry
.agents/
├── .claude-plugin/plugin.json      # plugin manifest (plugin root is .agents/)
└── skills/
    ├── facet-documents/SKILL.md + references/
    ├── facet-cli/SKILL.md + references/
    ├── diagram-designer/SKILL.md + references/ + examples/ + schemas/
    └── diagram-designer-schema/SKILL.md
```

`plugin.json` lists the shipped skills explicitly, so unrelated vendored skills in this directory (e.g. `coss`) are not published with the plugin.

`.agents/` is commonly excluded by a global `core.excludesFile`; this repo's `.gitignore` re-includes it so the plugin content is actually tracked.

## Local development

Point Claude Code at the working tree instead of GitHub:

```
/plugin marketplace add /path/to/facet
```

Validate manifests and skill frontmatter before pushing:

```bash
claude plugin validate ./.agents --strict
```

Keep skills accurate against source, not against `README.md` — the README has been stale before. When facet's API changes, the skill and its `references/` change in the same commit.
