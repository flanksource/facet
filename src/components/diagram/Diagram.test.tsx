import { renderToStaticMarkup } from 'react-dom/server';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Diagram from './Diagram';

describe('Diagram', () => {
  it('adds the diagram class alongside a caller class', () => {
    const markup = renderToStaticMarkup(
      <Diagram className="custom-layout">{() => null}</Diagram>,
    );

    expect(markup).toContain('class="diagram custom-layout"');
  });

  it('marks a diagram ready and exposes layout warnings for small text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container, unmount } = render(
      <Diagram>{() => <span style={{ fontSize: '7.5px' }}>small label</span>}</Diagram>,
    );
    try {
      const diagram = container.querySelector('[data-facet-diagram]')!;
      await waitFor(() => expect(diagram.getAttribute('data-facet-ready')).toBe('true'), { timeout: 3000 });
      expect(diagram.getAttribute('data-facet-warning')).toBe('text "small label" is 7.5px; diagram text must be at least 8px');
      expect(diagram.hasAttribute('data-facet-error')).toBe(false);
      expect(warn).toHaveBeenCalledWith('Diagram layout warnings:\ntext "small label" is 7.5px; diagram text must be at least 8px');
    } finally {
      unmount();
      warn.mockRestore();
    }
  });
});
