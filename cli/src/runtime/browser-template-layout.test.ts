import { describe, expect, it } from 'vitest';
import { browserTemplateLayout } from './browser-template-layout.js';

describe('browserTemplateLayout', () => {
  it('escapes layout values so they cannot close the generated script', () => {
    const source = browserTemplateLayout({
      page: 'report.mdx',
      themeModule: '@flanksource/facet/Theme',
      pageLayout: { viewport: { width: 800, height: 600 }, css: '</script><script>alert(1)</script>\u2028' },
    });
    expect(source).not.toContain('</script>');
    expect(source).not.toContain('\u2028');
    expect(source).toContain('"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>\\u2028"');
  });
});
