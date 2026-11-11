import { describe, expect, it } from 'vitest';
import { playgroundHtml } from './playground-html.js';

describe('playgroundHtml', () => {
  it('includes the editor runtime and renders server timing entries', () => {
    const html = playgroundHtml('1.2.3');

    expect({
      hasEditor: html.includes('monaco.editor.create'),
      hasExamples: html.includes('const EXAMPLES ='),
      hasRender: html.includes('async function doRender()'),
      hasPngFormat: html.includes("setFormat('png')"),
      hasDocxFormat: html.includes("setFormat('docx')"),
      hasPptxFormat: html.includes("setFormat('pptx')"),
      hasOfficeDownload: html.includes('Download editable '),
      hasSourcePreviewLabel: html.includes('HTML source preview'),
      hasPngOptions: html.includes('id="pngSelector"'),
      hasPngPreview: html.includes("payload.contentType === 'image/png'"),
      hasTimingRenderer: html.includes('function showTimings(timings)'),
      showsResultTimings: html.includes('showTimings(payload.timings)'),
      injectsVersion: html.includes('"@flanksource/facet": "1.2.3"'),
      hasUnexpandedModulePlaceholder: html.includes('${PLAYGROUND_'),
      hasPreviewBanner: html.includes('id="previewBanner"'),
      blanksPreviewOnStale: html.includes('function markPreviewStale()'),
      blanksPreviewOnEdit: html.includes('editor.onDidChangeModelContent(markPreviewStale)'),
      blanksPreviewOnRender: html.includes("setPreviewState('rendering'"),
      showsTimingsInBanner: html.includes('function formatPreviewTimings(timings)'),
      handlesResultLoadFailure: html.includes('function onPreviewLoadError(url)'),
      // The base64/Blob path was unreachable: emitResult always sends a url.
      hasDeadBlobBranch: html.includes('URL.createObjectURL'),
      hasFacetFavicon: html.includes('<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg'),
    }).toEqual({
      hasEditor: true,
      hasExamples: true,
      hasRender: true,
      hasPngFormat: true,
      hasDocxFormat: true,
      hasPptxFormat: true,
      hasOfficeDownload: true,
      hasSourcePreviewLabel: true,
      hasPngOptions: true,
      hasPngPreview: true,
      hasTimingRenderer: true,
      showsResultTimings: true,
      injectsVersion: true,
      hasUnexpandedModulePlaceholder: false,
      hasPreviewBanner: true,
      blanksPreviewOnStale: true,
      blanksPreviewOnEdit: true,
      blanksPreviewOnRender: true,
      showsTimingsInBanner: true,
      handlesResultLoadFailure: true,
      hasDeadBlobBranch: false,
      hasFacetFavicon: true,
    });
  });
});
