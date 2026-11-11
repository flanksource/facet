---
cwd: ../../..
timeout: 20m
codeBlocks: [bash]
---

# Page-size preset acceptance

The commands run sequentially because build and lint regenerate shared runtime assets. The final build gate also verifies binary packaging.

### command: Build, typecheck, and verify native canvas and presentation dimensions

```yaml
timeout: 1200
```

```bash
set -e
make lint
pnpm exec vitest run src/components/Page.test.tsx src/components/Document.test.tsx
pnpm --dir cli exec vitest run src/builders/page-size-build.test.ts src/builders/facet-directory.test.ts src/utils/page-sizes.test.ts src/utils/page-canvas.test.ts src/utils/pdf-multipass.test.ts src/utils/area-scale.test.ts src/office/paginate.test.ts src/office/layout.test.ts src/office/export.test.ts
pnpm --dir cli exec vitest run test/office.test.ts -t 'PowerPoint presets'
make build
```

- cel: exitCode == 0
