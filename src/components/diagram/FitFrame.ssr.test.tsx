// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FitFrame from './FitFrame';

describe('FitFrame on the server', () => {
  it('renders children unscaled and not ready', () => {
    const markup = renderToStaticMarkup(
      <FitFrame className="slide-diagram"><span>content</span></FitFrame>,
    );

    expect(markup).toBe('<div class="slide-diagram" data-facet-fit="true" data-facet-ready="false"><span>content</span></div>');
  });
});
