import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FitFrame from './FitFrame';

const sizes: { outerWidth: number; naturalHeight: number; contentWidth?: number } = { outerWidth: 640, naturalHeight: 720 };
const maxHeightPx: Record<string, number> = { '128mm': 484, '500mm': 1890 };
const resizeCallbacks = new Set<() => void>();

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe() { resizeCallbacks.add(this.callback); }
  disconnect() { resizeCallbacks.delete(this.callback); }
}

function resize() {
  act(() => resizeCallbacks.forEach((callback) => callback()));
}

beforeEach(() => {
  Object.assign(sizes, { outerWidth: 640, naturalHeight: 720, contentWidth: undefined });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-facet-fit')) return sizes.outerWidth;
    // max-content capped by max-width: wide content reaches layoutWidth, narrow content keeps its own width.
    if (this.hasAttribute('data-facet-fit-inner')) return Math.min(sizes.contentWidth ?? Infinity, parseFloat(this.style.maxWidth));
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-facet-fit-inner')) return sizes.naturalHeight;
    if (this.hasAttribute('data-facet-fit-probe')) return maxHeightPx[this.style.height] ?? 0;
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resizeCallbacks.clear();
});

function frame(container: HTMLElement) {
  const outer = container.querySelector<HTMLElement>('[data-facet-fit]')!;
  return { outer, inner: outer.querySelector<HTMLElement>('[data-facet-fit-inner]')! };
}

describe('FitFrame', () => {
  it('scales the laid-out content to the frame width and sizes the frame to the scaled height', async () => {
    const { container } = render(<FitFrame layoutWidth={1280}><div>content</div></FitFrame>);
    const { outer, inner } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect({
      outerHeight: outer.style.height,
      outerOverflow: outer.style.overflow,
      outerWidth: outer.style.width,
      innerTransform: inner.style.transform,
      innerOrigin: inner.style.transformOrigin,
      innerWidth: inner.style.width,
      innerMaxWidth: inner.style.maxWidth,
    }).toEqual({
      outerHeight: '360px',
      outerOverflow: 'hidden',
      outerWidth: '100%',
      innerTransform: 'scale(0.5)',
      innerOrigin: '0 0',
      innerWidth: 'max-content',
      innerMaxWidth: '1280px',
    });
  });

  it('lays content out at up to 1280px by default', async () => {
    sizes.outerWidth = 1280;
    const { container } = render(<FitFrame><div>content</div></FitFrame>);
    const { outer, inner } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect([inner.style.maxWidth, inner.style.transform]).toEqual(['1280px', 'scale(1)']);
  });

  it('fits content narrower than layoutWidth by its own width, like an autocrop', async () => {
    sizes.contentWidth = 320;
    sizes.naturalHeight = 160;
    const { container } = render(<FitFrame><div>narrow</div></FitFrame>);
    const { outer, inner } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect([inner.style.transform, outer.style.height, inner.style.left]).toEqual(['scale(2)', '320px', '0px']);
  });

  it('lets maxHeight shrink the scale below the width scale and centres the narrower content', async () => {
    sizes.outerWidth = 1280;
    sizes.naturalHeight = 1000;
    const { container } = render(<FitFrame maxHeight="128mm"><div>content</div></FitFrame>);
    const { outer, inner } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect([inner.style.transform, outer.style.height, inner.style.left]).toEqual(['scale(0.484)', '484px', '330.24px']);
  });

  it('keeps the width scale when maxHeight is not the limiting dimension', async () => {
    sizes.naturalHeight = 600;
    const { container } = render(<FitFrame maxHeight="500mm"><div>content</div></FitFrame>);
    const { outer, inner } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect([inner.style.transform, outer.style.height, inner.style.left]).toEqual(['scale(0.5)', '300px', '0px']);
  });

  it('recomputes the scale when the frame is resized', async () => {
    const { container } = render(<FitFrame><div>content</div></FitFrame>);
    const { outer, inner } = frame(container);
    await waitFor(() => expect(inner.style.transform).toBe('scale(0.5)'));

    sizes.outerWidth = 320;
    resize();

    expect([inner.style.transform, outer.style.height]).toEqual(['scale(0.25)', '180px']);
  });

  it('is ready only once every nested data-facet-ready is true, with the scale computed from the final layout', async () => {
    const { container } = render(
      <FitFrame>
        <div data-facet-ready="true" />
        <div data-facet-ready="false" data-testid="slow" />
      </FitFrame>,
    );
    const { outer, inner } = frame(container);
    await waitFor(() => expect(inner.style.transform).toBe('scale(0.5)'));
    expect(outer.getAttribute('data-facet-ready')).toBe('false');

    sizes.naturalHeight = 800;
    container.querySelector('[data-testid="slow"]')!.setAttribute('data-facet-ready', 'true');

    await waitFor(() => expect(outer.getAttribute('data-facet-ready')).toBe('true'));
    expect(outer.style.height).toBe('400px');
  });

  it('reports a maxHeight that does not resolve to a length instead of guessing a scale', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<FitFrame maxHeight="not-a-length"><div>content</div></FitFrame>);
    const { outer } = frame(container);

    await waitFor(() => expect(outer.getAttribute('data-facet-error')).toBe(
      'FitFrame: maxHeight "not-a-length" did not resolve to a positive CSS length',
    ));
    expect(outer.getAttribute('data-facet-ready')).toBe('false');
    expect(error).toHaveBeenCalled();
  });
});
