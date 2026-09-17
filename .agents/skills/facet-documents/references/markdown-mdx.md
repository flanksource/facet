# Markdown and MDX templates

`.md` and `.mdx` are first-class facet templates. `facet pdf report.md -o dist` works with no React at all.

## Auto-wrapping

A markdown template is compiled into an entry that wraps it in a printable page (`cli/src/builders/facet-directory.ts`):

```tsx
<Page pageSize="a4" margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
  <article className="prose">
    <Content components={{ Icon }} {...data} />
  </article>
</Page>
```

Three things follow from this:

1. **Data arrives as `props.*`, not `data.*`** — write `# {props.title}` in MDX, not `{data.title}`.
2. `@iconify/react`'s `Icon` is injected into MDX scope automatically.
3. Page size and margins are fixed by the wrapper. Override them from the CLI (`--page-size`, `--margin-*`), or switch to a `.tsx` template when you need real control over `Document`/`Page`/chrome.

## The always-on plugin chain

Configured in `cli/src/builders/remark-config.ts`, applied to every markdown template:

- **remark:** `remarkFrontmatter` → `remarkGfm` → `remarkAlert` (as `blockquote`) → `facetRedact` → *your plugins*
- **rehype:** `rehypeRaw` (passing through MDX expression/JSX nodes) → *your plugins*

So GFM tables, task lists, strikethrough and footnotes are always available, and raw HTML passes through.

## GitHub alerts

```markdown
> [!NOTE]
> Renders as a CalloutBox.

> [!WARNING]
> So does this.
```

`NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` all map to `CalloutBox` variants. In a plain `.md` file this blockquote syntax is the **only** way to get a callout — `.md` compiles with `format: 'md'`, so JSX is not parsed. Rename to `.mdx` if you need components.

## Frontmatter is for plugins only

There is **no** frontmatter for page size, margins, title, or any document setting. The only recognised keys are plugin lists (`cli/src/utils/frontmatter.ts`):

```yaml
---
remarkPlugins:
  - remark-emoji
  - ["./plugins/my-plugin.mjs", { option: true }]
rehypePlugins:
  - rehype-slug
---
```

Entries are either `"name"` or `[name, options]`. Paths starting with `./` resolve against the project root.

Do not add `title:` or `pageSize:` frontmatter expecting it to be honoured — it is passed through as data at best, ignored at worst.

## Classified regions

Wrap sensitive content and gate it at render time:

```markdown
<Classified tier="Internal">
Internal-only detail.
</Classified>
```

```bash
facet pdf policy.md --allow tier=Public,Internal -o dist
```

Redaction (`remark/facet-redact.mjs`) runs on the Markdown AST **before bundling**, so redacted text never reaches the output *or* the build cache, and the policy is part of the cache key. The plugin is deliberately unconditional: forget `--allow` and the build fails closed rather than leaking. `--allow` is repeatable for multiple attributes.

## Rendering a markdown string inside TSX

Different mechanism, don't confuse them. `<Markdown>` (`src/components/Markdown.tsx`) renders a runtime string via `marked` plus a hand-written allowlist sanitizer:

```tsx
<Markdown>{row.description}</Markdown>
<Markdown inline>{cell.note}</Markdown>   {/* strips block wrappers, for table cells */}
```

The sanitizer handles entity-decoded `java\nscript:` URLs and avoids quadratic backtracking — read it before changing it. Helpers `renderMarkdown`, `markdownToPlainText` and `sanitizeHTML` are exported for non-component use.

Template-level markdown (`.md` files) goes through remark/MDX; component-level markdown (`<Markdown>`) goes through marked. They have different plugin chains and different capabilities.

## When to use which

| Situation | Use |
| --- | --- |
| Prose document, default A4 layout | `.md` |
| Prose plus a few facet components | `.mdx` |
| Custom chrome, mixed page sizes, data-driven layout | `.tsx` |
| Markdown held in a data field, rendered into a cell or card | `<Markdown>` inside `.tsx` |
