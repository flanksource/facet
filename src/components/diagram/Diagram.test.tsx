import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Diagram from './Diagram';

describe('Diagram', () => {
  it('adds the diagram class alongside a caller class', () => {
    const markup = renderToStaticMarkup(
      <Diagram className="custom-layout">{() => null}</Diagram>,
    );

    expect(markup).toContain('class="diagram custom-layout"');
  });
});
