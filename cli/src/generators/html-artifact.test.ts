import { expect, it } from 'vitest';
import { liveHTMLArtifact } from './html-artifact.js';

it('links the runtime and embeds template files and data in inert JSON', () => {
  const { html, script } = liveHTMLArtifact({
    source: { page: 'report.tsx', layout: 'layout.tsx', dependencies: {}, files: {
      'report.tsx': { text: 'export default () => <p>{"</script>"}</p>' },
      'layout.tsx': { text: 'export default ({ children }) => children' },
    }, managed: {} }, css: 'p { color: navy }',
    data: { title: '</script><script>alert(1)</script>' },
    runtimeUrl: 'https://cdn.example/runtime.js', outputName: 'report',
  });
  expect(html).toContain('<script defer src="https://cdn.example/runtime.js"></script>');
  expect(html).toContain('p { color: navy }');
  expect(html).toContain('\\u003c/script>');
  expect(html).toContain('facet-document-source');
  expect(html).toContain('export default () => \\u003cp>');
  expect(html).not.toContain('facet-document-program');
  expect(html).not.toContain('<script>alert(1)');
  expect(script).toBeUndefined();
});

it('places the runtime and compiled template together next to bundled HTML', () => {
  const artifact = liveHTMLArtifact({
    program: 'window.render()', css: '', data: { title: 'Report' },
    runtimeScript: 'window.runtime = {}', outputName: 'quarter #1',
  });
  expect(artifact.html).toContain('./quarter%20%231.js');
  expect(artifact.html).not.toContain('window.render()');
  expect(artifact.script).toContain('window.runtime = {}');
  expect(artifact.script).toContain('window.render()');
});
