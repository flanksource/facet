---
cwd: ../../..
timeout: 20m
codeBlocks: [bash]
---

# Multi-size PNG/PDF rendering

### command: Verify glob selection, layout, API parity and build gates

```bash
set -e
make lint
make build
pnpm --dir cli exec vitest run src/utils/render-sizes.test.ts src/utils/page-size-layout.test.ts src/commands/render-sizes.test.ts src/server/request.test.ts src/server/render-cache-key.test.ts src/utils/server-render.test.ts src/utils/page-canvas.test.ts src/utils/browser-html.test.ts src/office/layout.test.ts test/multi-size.test.ts
```

- cel: exitCode == 0
