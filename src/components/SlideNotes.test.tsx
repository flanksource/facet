import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SlideNotes from './SlideNotes';
import { RedactPolicyProvider, type RedactPolicy } from './Classified';

const NOTE = 'Ask for D1 first';

function render(policy: RedactPolicy, audience?: string): string {
  return renderToStaticMarkup(<RedactPolicyProvider policy={policy}><SlideNotes audience={audience}><p>{NOTE}</p></SlideNotes></RedactPolicyProvider>);
}

describe('SlideNotes', () => {
  it('renders the notes panel when the presenter audience is allowed', () => {
    const markup = render({ allow: { audience: ['presenter'] } });
    expect(markup).toContain('data-facet-slide-notes');
    expect(markup).toContain(`<div data-facet-slide-notes-body="true" class="facet-slide-notes__body"><p>${NOTE}</p></div>`);
  });

  it('removes the notes entirely for another audience', () => {
    expect(render({ allow: { audience: ['attendee'] } })).toBe('');
  });

  it('fails closed when the build declares no audience policy', () => {
    expect(() => render({ allow: {} })).toThrow(/declares audience="presenter" but no policy was given for audience/);
  });

  it('classifies notes with a custom audience', () => {
    expect(render({ allow: { audience: ['reviewer'] } }, 'reviewer')).toContain(NOTE);
    expect(render({ allow: { audience: ['presenter'] } }, 'reviewer')).toBe('');
  });
});
