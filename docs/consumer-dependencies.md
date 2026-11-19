# Consumer dependencies

Facet uses the shipped runtime for Facet, Clicky UI, and their browser-compatible exports. It keeps the runtime's version when a consumer declares the same package. Facet installs new packages in an isolated environment using the consumer's dependencies and development dependencies, including declarations beside nested templates.

For pnpm projects, Facet finds the nearest `pnpm-workspace.yaml` above the declaring package and resolves `catalog:` and `catalog:default` using its `catalog` map. Named references such as `catalog:tools` use `catalogs.tools`. Missing or invalid entries stop generation with the dependency name and workspace path.

```yaml
packages:
  - apps/*
  - packages/*
catalog:
  '@acme/data': ^1.0.0
catalogs:
  tools:
    typescript: ~5.7.0
```

```json
{
  "dependencies": {
    "@acme/data": "catalog:",
    "@acme/components": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:tools"
  }
}
```

Facet discovers workspace packages through `pnpm --recursive list --depth -1 --json` and emits absolute `link:` references. Workspace packages keep their existing workspace install; run `pnpm install` at the workspace root before rendering templates that use them. Explicit workspace version ranges must match a local package. Aliases and relative workspace paths are supported.

Relative `file:`, `link:`, and `portal:` dependencies resolve from the declaring package directory. Paths declared inside a catalog resolve from the workspace root.

From a consumer package, render a template with:

```sh
facet html templates/example.tsx --live -o .tmp/example.html
```

`--skip-modules` ignores consumer dependencies and workspace catalogs entirely.
