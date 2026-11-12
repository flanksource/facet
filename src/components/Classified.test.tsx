import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Classified, { RedactPolicyProvider, type RedactPolicy } from './Classified';

const SECRET = 'Internal review detail';

function renderWith(policy: RedactPolicy, attributes: Record<string, string>): string {
  return renderToStaticMarkup(
    <RedactPolicyProvider policy={policy}>
      <p>Published</p>
      <Classified {...attributes}><p>{SECRET}</p></Classified>
    </RedactPolicyProvider>,
  );
}

describe('Classified', () => {
  it('renders its children unwrapped when every attribute is permitted', () => {
    expect(renderWith({ allow: { tier: ['Public', 'Internal'] } }, { tier: 'Internal' })).toBe(`<p>Published</p><p>${SECRET}</p>`);
  });

  it('removes its children when a value is not permitted', () => {
    expect(renderWith({ allow: { tier: ['Public'] } }, { tier: 'Internal' })).toBe('<p>Published</p>');
  });

  it('drops the region when any one of several attributes is not permitted', () => {
    expect(renderWith({ allow: { tier: ['Internal'], status: ['published'] } }, { tier: 'Internal', status: 'draft' })).not.toContain(SECRET);
  });

  it('fails closed when an attribute has no policy', () => {
    expect(() => renderWith({ allow: { tier: ['Internal'] } }, { audience: 'presenter' }))
      .toThrow(/declares audience="presenter" but no policy was given for audience/);
  });

  it('fails closed outside a facet build when no policy is provided at all', () => {
    expect(() => renderToStaticMarkup(<Classified tier="Internal">{SECRET}</Classified>)).toThrow(/no policy was given for tier/);
  });
});
