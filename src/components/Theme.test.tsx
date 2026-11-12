import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Document from './Document';
import Page from './Page';
import { facetTheme, resolveTheme, ThemeProvider } from './Theme';

describe('document themes', () => {
  it('inherits defaults and slots without changing authored page boundaries', () => {
    const theme = { id: 'example', extends: facetTheme, defaults: { fontFamily: 'Example Sans', pageSize: 'a4' }, slots: { cover: () => <section>Cover</section> } };
    const html = renderToStaticMarkup(<ThemeProvider theme={theme}><Document title="Report"><Page pageSize="a3">First</Page><Page>Second</Page></Document></ThemeProvider>);
    expect(html.match(/data-page-size=/g)).toHaveLength(2);
    expect(html).toContain('data-page-size="a3"');
    expect(html).toContain('Example Sans');
    expect(html.match(/Cover/g)).toHaveLength(1);
  });
  it('rejects cyclic inheritance', () => {
    const theme = { id: 'cycle', extends: facetTheme };
    theme.extends = theme;
    expect(() => resolveTheme(theme)).toThrow(/cycle/);
  });
});
