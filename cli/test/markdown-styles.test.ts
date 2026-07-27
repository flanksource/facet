import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

describe('Markdown styles', () => {
  test('emits decimal markers and indentation for ordered lists', () => {
    const css = readFileSync(fileURLToPath(new URL('../../dist/styles.css', import.meta.url)), 'utf8');
    const orderedListRule = [...css.matchAll(/(?:^|})\s*ol\s*\{([^}]*)\}/g)].at(-1)?.[1];

    expect(orderedListRule).toMatch(
      /margin:\s*3mm 0 4mm 8mm;[\s\S]*padding:\s*0;[\s\S]*list-style-type:\s*decimal/,
    );
  });
});
