# @flanksource/facet-cli

The `facet` command-line tool — generate print-ready PDFs and HTML from React
templates.

```bash
npm install -g @flanksource/facet-cli
```

This installs the `facet` command, which runs on your Node.js (>=20.19). Facet
uses `pnpm` to populate its shared module cache and install template-specific
dependencies; PDF output also needs a system Chrome/Chromium. Run `facet doctor`
to check your environment.

Pass the global `--skip-modules` option before or after a subcommand to ignore all
consumer `package.json` files and reuse the Facet-only module set pinned to this
CLI version. The first use installs the shared set; subsequent renders do not
reinstall or mark it stale. Templates with additional package imports must run
without the flag.

Set `FACET_URL` or pass `--facet-url <url>` to upload local template projects for remote `html` and `pdf` rendering. The server result is downloaded to the normal local output path, so local Chromium and pnpm are not required in remote mode. The explicit flag overrides `FACET_URL`.

For an environment without Node.js, download a standalone binary from
[GitHub Releases](https://github.com/flanksource/facet/releases).

See the [project README](https://github.com/flanksource/facet#readme) for usage.
