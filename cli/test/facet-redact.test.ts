import { describe, expect, test } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
// @ts-expect-error - plain .mjs shipped into .facet/, no type declarations
import facetRedact from '../../remark/facet-redact.mjs';

// Parsed through a real pipeline rather than a hand-built tree: the plugin's
// whole premise is that a `<Classified>` line in plain Markdown arrives as a
// raw `html` node, and only an actual parse proves that.
function render(markdown: string, options?: Record<string, unknown>): string {
  return String(unified()
    .use(remarkParse)
    .use(facetRedact, options)
    .use(remarkStringify)
    .processSync(markdown));
}

const document = `# Policy

Published body.

<Classified tier="Internal">

## Review notes

- [ ] Confirm the control owner

</Classified>

Closing body.
`;

describe('facetRedact', () => {
  test('removes a region whose value is not permitted', () => {
    const output = render(document, { allow: { tier: ['Public'] } });

    expect(output).toContain('Published body.');
    expect(output).toContain('Closing body.');
    // The heading and the checklist go with the region, not just its wrapper.
    expect(output).not.toContain('Review notes');
    expect(output).not.toContain('Confirm the control owner');
  });

  test('removes a region when content immediately follows its opening tag', () => {
    const markdown = `Published body.

<Classified tier="Internal">
  **Internal review notes.**

  <CalloutBox title="Internal gap">
    Private detail.
  </CalloutBox>
</Classified>

Closing body.
`;
    const output = render(markdown, { allow: { tier: ['Public'] } });

    expect(output).toContain('Published body.');
    expect(output).toContain('Closing body.');
    expect(output).not.toContain('Internal review notes.');
    expect(output).not.toContain('Internal gap');
    expect(output).not.toContain('Private detail.');
  });

  test('keeps and unwraps an allowed region when its boundary shares an HTML block with content', () => {
    const markdown = `<Classified tier="Internal">
  **Internal review notes.**

  Private detail.
</Classified>
`;
    const output = render(markdown, { allow: { tier: ['Internal'] } });

    expect(output).toContain('Internal review notes.');
    expect(output).toContain('Private detail.');
    expect(output).not.toContain('<Classified');
    expect(output).not.toContain('</Classified>');
  });

  test('keeps a region whose value is permitted, and unwraps it', () => {
    const output = render(document, { allow: { tier: ['Public', 'Internal'] } });

    expect(output).toContain('Review notes');
    expect(output).toContain('Confirm the control owner');
    expect(output).not.toContain('<Classified');
  });

  test('leaves a document with no regions untouched', () => {
    expect(render('# Policy\n\nBody.\n', { allow: { tier: ['Public'] } })).toContain('Body.');
  });

  test('applies every declared attribute, dropping on any one', () => {
    const markdown = '<Classified tier="Public" status="draft">\n\nBody.\n\n</Classified>\n';

    expect(render(markdown, { allow: { tier: ['Public'], status: ['published'] } })).not.toContain('Body.');
    expect(render(markdown, { allow: { tier: ['Public'], status: ['draft'] } })).toContain('Body.');
  });

  // Forgetting to declare a policy must break the build, never publish the
  // content the policy was meant to govern.
  test('fails closed when an attribute has no declared policy', () => {
    expect(() => render(document, { allow: { status: ['published'] } }))
      .toThrow(/declares tier="Internal" but no policy was given/);
    expect(() => render(document)).toThrow(/no policy was given/);
  });

  test.each([
    ['an unclosed region', '<Classified tier="Internal">\n\nBody.\n', /Unclosed/],
    ['an unmatched close', 'Body.\n\n</Classified>\n', /Unmatched/],
    ['a nested region', '<Classified tier="Internal">\n\n<Classified tier="Public">\n\nBody.\n\n</Classified>\n\n</Classified>\n', /Nested/],
  ])('rejects %s', (_description, markdown, message) => {
    expect(() => render(markdown, { allow: { tier: ['Public'] } })).toThrow(message);
  });

  test('honours a custom element name', () => {
    const markdown = '<Restricted tier="Internal">\n\nBody.\n\n</Restricted>\n';

    expect(render(markdown, { element: 'Restricted', allow: { tier: ['Public'] } })).not.toContain('Body.');
  });
});
