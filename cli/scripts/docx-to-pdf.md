# Capture Word pages as PNG

Run from a logged-in macOS desktop with Microsoft Word installed and set up:

```bash
pnpm --dir cli install
bash cli/scripts/docx-to-pdf.sh Report.docx
```

The only argument is the source DOCX. Pages are saved beside it as `Report.docx.1.png`, `Report.docx.2.png`, and so on. Existing page images are never overwritten; move them before retrying.

The script captures pages from Word's document container and prints each saved PNG path. It never invokes Word's `save as` command.

Allow the terminal Accessibility, Automation access to Word and System Events, and Screen Recording access in macOS System Settings. Apple's Swift command-line tools are required to identify the native Word window. The source must be closed in Word before starting. Word opens it read-only, switches to Print Layout at 55% zoom, and closes the capture document after success. Other open Word documents are preserved. Avoid using Word during capture.

The current capture mode expects white paper and the English `Page … of …` status control. Missing or inconsistent paper dimensions, clipped pages, and unmeasurable page spacing or scroll ranges produce warnings while captures are saved anyway. If a full page cannot be identified, its PNG contains the current viewport, which may include clipped or adjacent pages. Estimated page positions may produce repeated or incomplete captures; review images when warnings appear. Automation, page-count, screenshot, and file-writing failures still stop the run, preserving any PNGs already saved and the open Word document for diagnosis. Intermediate window captures are stored under the repository's `.tmp/word-capture` directory.

Only one capture runs at a time. A repository-local `.tmp/word-capture.lock` directory protects Word automation; after forcibly terminating a run, remove that empty directory only after confirming no capture process is active.
