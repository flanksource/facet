// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { parseDelimited } from './CsvTable';
import { MdxCodeBlock } from './MdxCodeBlock';

const fence = (language: string, source: string) => (
  <MdxCodeBlock><code className={`language-${language}`}>{`${source}\n`}</code></MdxCodeBlock>
);

const cells = (container: HTMLElement) =>
  [...container.querySelectorAll('tr')].map((row) => [...row.querySelectorAll('th,td')].map((cell) => cell.textContent));

describe('parseDelimited', () => {
  it.each([
    ['quoted fields holding the delimiter, a newline and an escaped quote', 'a,b\n"x, y","line\nbreak"\n"say ""hi""",', ',', [['a', 'b'], ['x, y', 'line\nbreak'], ['say "hi"', '']]],
    ['CRLF line endings', 'a,b\r\n1,2\r\n', ',', [['a', 'b'], ['1', '2']]],
    ['tab-separated values', 'a\tb\n1\t2', '\t', [['a', 'b'], ['1', '2']]],
  ])('parses %s', (_case, text, delimiter, rows) => {
    expect(parseDelimited(text, delimiter)).toEqual(rows);
  });

  it('throws on an unterminated quote instead of swallowing the rest of the text', () => {
    expect(() => parseDelimited('a,"b\nc,d')).toThrow('unterminated');
  });
});

describe('MdxCodeBlock', () => {
  it('renders a csv fence as a table with the first row as its header', () => {
    const { container } = render(fence('csv', 'name,count\nweb,3\napi,12'));
    expect(cells(container)).toEqual([['name', 'count'], ['web', '3'], ['api', '12']]);
    expect(container.querySelector('thead th')?.textContent).toBe('name');
    expect((container.querySelectorAll('tbody td')[1] as HTMLElement).style.textAlign).toBe('right');
  });

  it('pads short rows so every row has the widest row\'s columns', () => {
    const { container } = render(fence('tsv', 'a\tb\tc\n1'));
    expect(cells(container)).toEqual([['a', 'b', 'c'], ['1', '', '']]);
  });

  it('colours a json fence and pretty-prints it when it is minified', () => {
    const { container } = render(fence('json', '{"name":"api"}'));
    expect(container.querySelector('pre')?.textContent).toBe('{\n  "name": "api"\n}');
    expect([...container.querySelectorAll('pre span[style]')].map((span) => span.textContent)).toContain('"name"');
  });

  it('renders a fence without a language as plain code', () => {
    const { container } = render(<MdxCodeBlock><code>{'plain <b>text</b>\n'}</code></MdxCodeBlock>);
    expect(container.querySelector('pre')?.textContent).toBe('plain <b>text</b>');
    expect(container.querySelector('b')).toBeNull();
  });
});
