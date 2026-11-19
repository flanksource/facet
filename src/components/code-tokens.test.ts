import { describe, expect, it } from 'vitest';
import { formatJson, tokenizeCode, type CodeToken } from './code-tokens';

const kinds = (tokens: CodeToken[]) => tokens.filter((token) => token.kind !== 'text').map((token) => [token.kind, token.text]);

describe('tokenizeCode', () => {
  it.each([
    ['json', '{\n  "name": "api", // note\n  "replicas": 3,\n  "tls": [true, null]\n}'],
    ['yaml', 'apiVersion: v1 # comment\nspec:\n  - name: "web"\n    url: http://x:80\n'],
    ['xml', '<?xml version="1.0"?>\n<!-- c -->\n<a b="1" c=\'2\'><![CDATA[x]]>text</a>'],
  ])('reproduces the %s source exactly when its tokens are joined', (language, source) => {
    expect(tokenizeCode(source, language).map((token) => token.text).join('')).toBe(source);
  });

  it('tells JSON keys from string values', () => {
    expect(kinds(tokenizeCode('{"name": "api", "replicas": 3, "tls": true, "x": null}', 'json'))).toEqual([
      ['punctuation', '{'], ['key', '"name"'], ['punctuation', ':'], ['string', '"api"'], ['punctuation', ','],
      ['key', '"replicas"'], ['punctuation', ':'], ['number', '3'], ['punctuation', ','],
      ['key', '"tls"'], ['punctuation', ':'], ['keyword', 'true'], ['punctuation', ','],
      ['key', '"x"'], ['punctuation', ':'], ['keyword', 'null'], ['punctuation', '}'],
    ]);
  });

  it.each([
    ['a key, a plain value and a trailing comment', 'image: nginx:1.25 # pinned', [['key', 'image'], ['punctuation', ':'], ['string', 'nginx:1.25'], ['comment', '# pinned']]],
    ['a sequence item holding a key', '  - port: 8080', [['punctuation', '- '], ['key', 'port'], ['punctuation', ':'], ['number', '8080']]],
    ['a URL list item, which has no key', '- http://example.com', [['punctuation', '- '], ['string', 'http://example.com']]],
    ['a # inside quotes, which is not a comment', 'tag: "a # b"', [['key', 'tag'], ['punctuation', ':'], ['string', '"a # b"']]],
    ['an anchor before its value', 'base: &base yes', [['key', 'base'], ['punctuation', ':'], ['meta', '&base '], ['keyword', 'yes']]],
    ['a block scalar indicator', 'script: |-', [['key', 'script'], ['punctuation', ':'], ['meta', '|-']]],
    ['a document marker', '---', [['meta', '---']]],
  ])('colours YAML %s', (_case, line, expected) => {
    expect(kinds(tokenizeCode(line, 'yaml'))).toEqual(expected);
  });

  it('colours XML tags, attributes, values, comments and declarations', () => {
    expect(kinds(tokenizeCode('<?xml version="1.0"?><!-- c --><item id="1" enabled/>', 'xml'))).toEqual([
      ['meta', '<?xml version="1.0"?>'], ['comment', '<!-- c -->'],
      ['punctuation', '<'], ['tag', 'item'], ['attribute', 'id'], ['punctuation', '='], ['string', '"1"'],
      ['attribute', 'enabled'], ['punctuation', '/>'],
    ]);
  });

  it('leaves languages it does not know as one plain token', () => {
    expect(tokenizeCode('fn main() {}', 'rust')).toEqual([{ kind: 'text', text: 'fn main() {}' }]);
  });
});

describe('formatJson', () => {
  it.each([
    ['pretty-prints single-line JSON', '{"a":1,"b":[1,2]}', '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}'],
    ['keeps JSON already laid out over lines', '{\n"a": 1}', '{\n"a": 1}'],
    ['keeps invalid JSON as authored', '{"a":', '{"a":'],
    ['keeps a bare scalar as authored', '42', '42'],
  ])('%s', (_case, source, expected) => {
    expect(formatJson(source)).toBe(expected);
  });
});
