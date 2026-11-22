---
files: ../*.tsx
cwd: ..
exec: facet
args: [html, "{{.absfile}}", --output, ".tmp/html/{{.filename}}.html"]
timeout: 2m
---

# HTML rendering

| Name | Exit Code |
|------|-----------|
| Render TSX | 0 |
