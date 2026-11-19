import { expect, it } from 'vitest';
import { redactMarkdownSource } from './page-runtime-source.js';

it('removes restricted Markdown before a runtime compiler can see it', async () => {
  const source = '---\ntitle: Example\n---\n\n<Classified tier="Internal">\n\nRestricted passage\n\n</Classified>\n\nPublic passage\n';
  const filtered = await redactMarkdownSource(source, { allow: { tier: ['Public'] } });
  expect(filtered).toBe('---\ntitle: Example\n---\n\nPublic passage\n');
  await expect(redactMarkdownSource(source)).rejects.toThrow('no policy was given for tier');
});
