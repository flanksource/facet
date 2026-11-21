import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Document from './Document';
import Page from './Page';

describe('Page canvas presets', () => {
  it.each([
    ['facebook-square', 1080, 1080],
    ['linkedin-portrait', 720, 900],
    ['reddit-banner', 1072, 128],
    ['google-ads-300x250', 300, 250],
    ['powerpoint-standard', 960, 720],
  ])('renders %s at its native canvas size', (pageSize, width, height) => {
    const markup = renderToStaticMarkup(<Page pageSize={pageSize}>Canvas</Page>);
    expect(markup).toContain('data-facet-canvas="true"');
    expect(markup).toContain(`width:${width}px`);
    expect(markup).toContain(`height:${height}px`);
  });

  it('inherits the document canvas and preserves page size and margin overrides', () => {
    const markup = renderToStaticMarkup(<Document pageSize="facebook-square" margins={{ left: 5 }}>
      <Page>Inherited</Page>
      <Page pageSize="reddit-banner" margins={{ top: 2 }}>Override</Page>
    </Document>);
    expect(markup).toContain('width:1080px');
    expect(markup).toContain('width:1072px');
    expect(markup).toContain('padding-left:5mm');
    expect(markup).toContain('padding-top:2mm');
  });
});
