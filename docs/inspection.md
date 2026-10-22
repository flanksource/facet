# Native document inspection

`facet inspect <files...>` reads PDF, PNG and DOCX files locally and leaves inputs unchanged. It reports pages or sections, native font inventories, and colors. No browser, Office installation, OCR or AI service is used.

```bash
facet inspect report.pdf diagram.png report.docx
facet inspect report.pdf --fonts=true --font-position=false --colors=true --color-positions=false
facet inspect report.docx --font-position=true --color-positions=true --embedded-images --json > inspection.json
facet inspect diagram.png --fonts=false --color-positions=true --json
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--fonts <true\|false>` | `true` | Collect native font metadata; PNG reports `unavailable` with a reason |
| `--font-position <true\|false>` | `false` | Include font references to pages, objects, resources or indexed XML elements |
| `--colors <true\|false>` | `true` | Collect document color declarations or the PNG palette |
| `--color-positions <true\|false>` | `false` | Include native color references or palette bounding boxes |
| `--embedded-images` | Off | Include image metadata, PNG palettes and PDF payloads inside DOCX media and OLE objects |
| `--json` | Off | Emit a native per-file array as two-space-indented JSON, without a banner |

An enabled position option requires its corresponding category. Invalid booleans, unsupported extensions and corrupt inputs fail with context. JSON operational failures write only stderr and exit 2. Disabled categories and empty optional values are omitted; zero and `false` remain. An empty font inventory retains `status: "available"`; PNG fonts retain `status: "unavailable"` and the reason.

PDF colors are converted to sRGB by PDF.js, including painted text, fills, strokes, gradient stops, tiling patterns and nested forms. References identify the page, indirect page object and operator index, rather than inferred text boxes. Fonts use native resource references. Embedded image resource metadata is opt-in.

DOCX colors include text, highlights, shading, borders, backgrounds and DrawingML declarations. Theme names resolve against declared theme colors where available; unresolved symbolic colors, `auto`, and tint/shade modifiers remain explicit. Positions identify the package part and indexed XML element. These are declarations, not a simulation of Word's final formatting cascade. Fonts similarly report declared names and theme mappings, rather than proving which font Word selects.

PNG colors are grouped into up to 32 colors without dithering. RGBA values retain transparency; fully transparent pixels are excluded. Counts and percentages refer to visible pixels. Optional bounds cover each group's pixels at the original resolution, with zero-based coordinates from the top left. The palette is marked approximate.

Inspection JSON is independent of the ESLint-compatible `facet lint --json` format. Line overlap detection remains a lint rule:

```bash
facet lint diagram.png --rule png-line-crossing --json
```

That rule detects horizontal/vertical stroke crossings in standalone PNGs. PDF/DOCX inspection does not perform rendered overlap analysis.
