import { describe, expect, it } from 'vitest';
import { playgroundHtml } from './playground-html.js';

describe('playgroundHtml', () => {
  it('includes the editor runtime and renders server timing entries', () => {
    const html = playgroundHtml('1.2.3');

    expect({
      hasEditor: html.includes('monaco.editor.create'),
      hasExamples: html.includes('const EXAMPLES ='),
      hasRender: html.includes('async function doRender()'),
      hasTimingRenderer: html.includes('function showTimings(timings)'),
      showsResultTimings: html.includes('showTimings(payload.timings)'),
      injectsVersion: html.includes('"@flanksource/facet": "1.2.3"'),
      hasUnexpandedModulePlaceholder: html.includes('${PLAYGROUND_'),
    }).toEqual({
      hasEditor: true,
      hasExamples: true,
      hasRender: true,
      hasTimingRenderer: true,
      showsResultTimings: true,
      injectsVersion: true,
      hasUnexpandedModulePlaceholder: false,
    });
  });
});
