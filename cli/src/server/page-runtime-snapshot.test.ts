// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { preparePDFSnapshot } from './page-runtime-snapshot.js';

it('removes executable snapshot markup while preserving styles and PDF targets', () => {
  const html = `<!doctype html><html onload="alert(0)"><head><meta http-equiv="refresh" content="0;url=https://example.test">
  <style>p { color: navy; }</style></head><body><iframe srcdoc="<script>fetch('/frame')</script>"></iframe>
  <svg><script>alert(1)</script><rect onLoad="alert(4)" /></svg><img src="data:image/png;base64,AA==" onerror="alert(2)">
  <a href="java&#9;script:alert(3)">Unsafe</a><a href="#section">Details</a><p id="section">Report</p></body></html>`;
  const snapshot = preparePDFSnapshot(html);
  expect(snapshot).toContain('Content-Security-Policy');
  expect(snapshot).toContain('p { color: navy; }');
  expect(snapshot).toContain('<a href="#section">Details</a>');
  expect(snapshot).toContain('<p id="section">Report</p>');
  expect(snapshot).not.toMatch(/<script|<iframe|onerror|http-equiv="refresh"|alert\(/);
});
