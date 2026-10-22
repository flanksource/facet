# Editable Office exports

From the Facet repository root:

```bash
facet docx examples/office/Report.tsx -d examples/office/data.json -o output/report.docx
facet pptx examples/office/Report.tsx -d examples/office/data.json -o output/report.pptx
facet pptx examples/office/LiveDiagram.tsx -o output/diagram.pptx
facet docx examples/office/LiveDiagram.tsx -o output/diagram.docx
facet docx examples/office/Contents.tsx -o output/contents.docx
```

`Report.tsx` uses the same components for both formats. `data.json` supplies the report title, region and revenue. `-o` selects the output file; without an explicit filename, the data's `name` field provides the basename.

Pass `-v` to log each visual's generation and insertion, including its media ID, caption or source element, format, and elapsed milliseconds. Word logs PDF and PNG captures separately, followed by PDF-in-EMF packaging and insertion with the DOCX media part path. PowerPoint insertions include the slide number. These details are omitted at normal verbosity.

Word retains editable content and flows the ledger over physical pages. PowerPoint converts the report to widescreen slides and continues the ledger with repeated column headers. Use `--font-size 20` to increase presentation type. Page sizes and margins come from template props for Word; PowerPoint always uses 16:9 slides.

`Header` and `Footer` are siblings of `Page`. They repeat on matching pages or slides, and `PageNo` resolves after pagination. DOCX artwork is captured as a PDF and PNG from the same browser layout. The EMF picture stores the original PDF bytes alongside a bitmap display representation, matching Word's PDF insertion format. Figures and diagrams include complete captions and legends. Header/footer pictures are anchored to the page, and repeated artwork shares one media part. `PageNo` remains a native Word field over the artwork, with counter placeholders removed from both captures. PDF export rendering depends on the viewer: local Word for macOS checks rasterized artwork after reopening both generated documents and a Word-created reference, even though the original PDF remained intact in each DOCX. Selectable diagram text in exported PDFs is therefore not guaranteed. Ordinary images and SVG logos remain images; paragraphs and tables remain editable. PowerPoint continues to embed complex visuals as images. Use `--live` or a leading `// @live` for DOM-measured diagrams. Column groups stay together and must fit within a slide.

`LiveDiagram.tsx` demonstrates a diagram that measures its arrows after the target Office layout is applied. Its leading `// @live` enables browser rendering automatically.

`Contents.tsx` demonstrates a solid header, horizontal footer with native page fields, adjacent editable tables, and a long table with repeating headers. Word preserves cell padding, per-side borders, merged cells and vertical alignment. Tables with automatic CSS layout can adjust their columns to the installed font; `table-layout: fixed` preserves fixed widths.

`TableOfContents` becomes a native Word TOC scoped to its automatic entries. Each `target` must identify exactly one `Page` or element inside a Page. Titles and levels are retained through hidden TC fields at the targets, with native bookmarks and page references. Word refreshes the fields after pagination; accept its update prompt or use **References → Update Table**. Explicit labels such as `page: 'A-1'` remain ordinary text outside the generated field and survive updates. The installed fonts affect Word's final wrapping and page numbers.

The commands also accept Markdown and MDX files, `-l` data loaders, `-s` JSON Schema, `--allow` classification policies, remote template references, and `--facet-url`. No Office application or LibreOffice is required to generate files.

To compare Word's exported PDF with Facet's PDF using Microsoft 365 CLI:

```bash
facet docx examples/kitchen-sink/TypographyTest.tsx -o output/TypographyTest.docx
facet pdf examples/kitchen-sink/TypographyTest.tsx -o output/TypographyTest.pdf
m365 file convert pdf --sourceFile "output/TypographyTest.docx" --targetFile "output/TypographyTest-word.pdf"
```

The conversion requires an authenticated Microsoft 365 CLI session. It temporarily uploads the DOCX to your tenant, converts it with Microsoft Graph, and removes the uploaded source. Check the resulting PDF visually: successful conversion alone does not establish that the service rendered embedded PDF artwork.

Inspect an existing Word document without converting it:

```bash
facet inspect output/report.docx
facet inspect output/report.docx --json
```

The tables show section sizes and margins in millimetres; embedded PDFs, images, fonts and other files; their references and displayed dimensions; and Word/PDF font metadata. PDF fonts include embedding and subset status, including fonts inside nested form resources. Assets shared by multiple references are listed once. Missing section properties remain unspecified, and unresolved font themes are identified as theme references. Inspection reads local package contents without extracting assets, installing dependencies, launching a browser, or contacting external services.
