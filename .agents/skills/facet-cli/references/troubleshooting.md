# Troubleshooting facet renders

Start with `facet doctor` (add `--json` to script it, `--fix` to remediate). It checks node version, architecture, pnpm, native bindings, Chromium, the facet package path and version, npmrc leakage, git, tar, tsx, sharp, tailwindcss and global modules.

## Symptom → fix

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Diagram arrows did not resolve to finite geometry` | `<Arrow>` given `start`/`end` instead of `from`/`to`, so endpoints are undefined | Use `from={id('a')} to={id('b')}`. `ArrowProps` explicitly `Omit`s `start`/`end`. |
| PNG rejected as a flat single-color capture | A `Diagram` rendered without live hydration | Add `// @live` as line 1, or pass `--live` |
| Boxes render but no arrows | Same as above — hydration never ran | `--live` |
| Content missing from the end of a page | `<Page>` clips, it does not reflow | Let a long table be a direct child of `<Page>`, or split into more pages / `<PageBreak />` |
| A color or spacing class has no effect | Interpolated Tailwind class name (`bg-${tone}-50`) | Map variants to literal class strings; `--post-process-css` only as a last resort |
| Text renders in a fallback font | Headless Chromium has no system fonts | Import the font in CSS; Open Sans and Fira Code are already imported by `src/styles.css` |
| Stale output after editing a template | `.facet/` build cache | `--refresh` first; `--clear-cache` only if that fails |
| `facet generate: unknown command` | The command never existed | Use `facet html` / `facet pdf` / `facet png` |
| `--sandbox`/`--skip-modules`/`--clear-cache` rejected | Combined with `--facet-url` | Drop the flag, or render locally |
| Render works locally, fails in CI | Missing Chromium, pnpm, or Node < 20.19 | `facet doctor --json` in CI; or point at a facet server with `FACET_URL` |
| Blank page where a component should be | Component not exported from the barrel (e.g. `Shield`) | Check `src/components/index.tsx` |
| `Could not find the sentinel NODE_SEA_FUSE_…` building the binary | `build:binary` needs a statically linked node; Homebrew ships a launcher against `libnode.dylib` | Use an official Node build (nodejs.org/nvm/`actions/setup-node`). Ordinary `pnpm run build` does not need it. |

## Slow or repeatedly reinstalling modules

Facet keeps a shared module store at `~/.facet/cache/modules/<facetVersion>/<platform-arch-nodeABI>`. The path is keyed by **version only**, but the ready-marker identity hashes the embedded `@flanksource/facet` package.json.

So two binaries reporting the same version with different embedded manifests — typically a globally installed `facet` built before a dependency change, versus source-tree runs via `tsx` reading the current repo-root `package.json` — fight over one directory. Every alternation sees "identity changed" and triggers a full 7–35s pnpm reinstall.

**Diagnose:** compare `~/.facet/cache/modules/<ver>/<plat>/package.json` against the manifest you expect (`hack/store-identity-diff.ts` prints the diff).

**Fix:** reinstall the global CLI after changing the repo-root `package.json` (`task install`), or stick to one invocation path for a work session. The durable fix is to include an identity digest in the store path.

## `ERR_PNPM_ENOENT` during module reconciliation

```
ERR_PNPM_ENOENT [importPackage …] the source path is not an existing regular file, reflink …
```

This is a corrupted pnpm content-addressable store: index files referencing content files that no longer exist on disk. Retrying never self-heals, because facet's generated `.npmrc` sets `verify-store-integrity=false`.

Two traps when repairing:

1. Store index files reference content by **base64 sha512 integrity**, hex-encoded on disk — searching `index/` for a hex hash finds nothing.
2. The ambient `pnpm` on `PATH` may use `store/v3` while facet's corepack-pinned pnpm@10 uses `store/v10`. Repairs must run through the same pnpm: `corepack pnpm@10.33.1 …`.

**Repair:**

```bash
node hack/pnpm-store-verify.mjs           # scan; --fix deletes stale index files
corepack pnpm@10.33.1 store add <pkg>@<version>
```

Then confirm the referenced file reappeared under `store/v10/files/`.

## Getting more detail

| Flag | Gives you |
| --- | --- |
| `-v` | Vite progress |
| `-vv` | Vite debug |
| `-vvv` | Plugin debug plus a profile |
| `--debug` (pdf) | Colored overlays on header/footer zones |
| `--debug-typography` (pdf) | An appended font-size reference page |
| `FACET_DEBUG_STACK=1` | Full stack traces |
| `FACET_KEEP_BUNDLE=1` | Keeps the generated bundle for inspection |

When isolating a layout problem, render `facet html` instead of `pdf` — it is much faster and the DOM is inspectable.

## Verify before reporting

A render is not verified until the output file has been opened and looked at. `facet` exits 0 on some partial outcomes, and a PDF can be produced with clipped or missing content. Read the PNG/PDF, or open the HTML.
