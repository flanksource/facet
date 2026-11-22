/** What a highlighted span of source is; `text` is everything left uncoloured. */
export type CodeTokenKind =
  | 'text'
  | 'key'
  | 'string'
  | 'number'
  | 'keyword'
  | 'comment'
  | 'punctuation'
  | 'tag'
  | 'attribute'
  | 'meta';

export type CodeToken = { kind: CodeTokenKind; text: string };

/** The languages `tokenizeCode` understands; anything else is one `text` token. */
export const TOKENIZED_LANGUAGES = ['json', 'yaml', 'yml', 'xml', 'html', 'svg'] as const;

export function isTokenizedLanguage(language: string): boolean {
  return (TOKENIZED_LANGUAGES as readonly string[]).includes(language.toLowerCase());
}

/**
 * Splits `code` into coloured spans for JSON, YAML and XML/HTML. Joining the
 * tokens' text always reproduces `code` exactly, so a renderer only has to
 * escape and wrap each one.
 */
export function tokenizeCode(code: string, language: string): CodeToken[] {
  const lang = language.toLowerCase();
  const tokens =
    lang === 'json' ? tokenizeJson(code)
    : lang === 'yaml' || lang === 'yml' ? tokenizeYaml(code)
    : lang === 'xml' || lang === 'html' || lang === 'svg' ? tokenizeXml(code)
    : [{ kind: 'text' as const, text: code }];
  return merge(tokens);
}

/** Pretty-prints minified (single-line) JSON; anything else, or invalid JSON, is returned unchanged. */
export function formatJson(code: string): string {
  const trimmed = code.trim();
  if (trimmed.includes('\n') || !/^[[{]/.test(trimmed)) return code;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return code;
  }
}

function merge(tokens: CodeToken[]): CodeToken[] {
  const out: CodeToken[] = [];
  for (const token of tokens) {
    if (!token.text) continue;
    const last = out[out.length - 1];
    if (last && last.kind === token.kind) last.text += token.text;
    else out.push({ ...token });
  }
  return out;
}

const JSON_TOKEN = /("(?:[^"\\\n]|\\.)*"?)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])|(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))/g;
function tokenizeJson(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let at = 0;
  for (const match of code.matchAll(JSON_TOKEN)) {
    tokens.push({ kind: 'text', text: code.slice(at, match.index) });
    const [text, string, number, keyword, punctuation] = match;
    // A string is a key when the next non-space character is a colon.
    let next = match.index + text.length;
    while (string !== undefined && /\s/.test(code[next] ?? '')) next++;
    const isKey = string !== undefined && code[next] === ':';
    tokens.push({
      kind: string !== undefined ? (isKey ? 'key' : 'string')
        : number !== undefined ? 'number'
        : keyword !== undefined ? 'keyword'
        : punctuation !== undefined ? 'punctuation'
        : 'comment',
      text,
    });
    at = match.index + text.length;
  }
  tokens.push({ kind: 'text', text: code.slice(at) });
  return tokens;
}

const YAML_SCALAR_KEYWORD = /^(?:true|false|yes|no|on|off|null|~)$/i;
const YAML_NUMBER = /^[-+]?(?:\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+|0x[\da-fA-F]+|0o[0-7]+|\.inf|\.nan)$/i;

function tokenizeYaml(code: string): CodeToken[] {
  return code.split(/(\r?\n)/).flatMap((line, index): CodeToken[] =>
    index % 2 === 1 ? [{ kind: 'text', text: line }] : tokenizeYamlLine(line),
  );
}

// One line of YAML: indentation, any `- ` sequence markers, an optional
// `key:`, then a value and a trailing comment. Block-scalar bodies are not
// tracked across lines; their lines colour as plain values, which reads fine.
function tokenizeYamlLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  if (/^(---|\.\.\.)(\s|$)/.test(line)) {
    tokens.push({ kind: 'meta', text: line.slice(0, 3) });
    return [...tokens, ...yamlValue(line.slice(3))];
  }
  const head = /^(\s*)((?:-\s+)*)/.exec(line)!;
  tokens.push({ kind: 'text', text: head[1]! }, { kind: 'punctuation', text: head[2]! });
  let rest = line.slice(head[0].length);
  if (rest.startsWith('#')) return [...tokens, { kind: 'comment', text: rest }];
  // A plain key runs to the colon and sheds its trailing spaces afterwards, so
  // no two quantifiers compete for the same whitespace.
  const key = /^(?:("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')(\s*)|([^\s#'"{[][^:#]*))(:)(?=\s|$)/.exec(rest);
  if (key) {
    const name = key[1] ?? key[3]!.trimEnd();
    const space = key[2] ?? key[3]!.slice(name.length);
    tokens.push({ kind: 'key', text: name }, { kind: 'text', text: space }, { kind: 'punctuation', text: key[4]! });
    rest = rest.slice(key[0].length);
  }
  return [...tokens, ...yamlValue(rest)];
}

function yamlValue(value: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  // A comment starts at a `#` that follows whitespace and sits outside quotes.
  let comment = -1;
  let quote = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(value[i - 1]!))) {
      comment = i;
      break;
    }
  }
  const body = comment === -1 ? value : value.slice(0, comment);
  const scalar = body.trim();
  const lead = body.slice(0, body.length - body.trimStart().length);
  const trail = body.slice(lead.length + scalar.length);
  tokens.push({ kind: 'text', text: lead });
  // Anchors, aliases and tags prefix the scalar: `&base`, `*base`, `!!str`.
  const prefix = /^((?:[&*!][^\s]*\s*)*)/.exec(scalar)![0];
  tokens.push({ kind: 'meta', text: prefix });
  const rest = scalar.slice(prefix.length);
  tokens.push({ kind: yamlScalarKind(rest), text: rest });
  tokens.push({ kind: 'text', text: trail });
  if (comment !== -1) tokens.push({ kind: 'comment', text: value.slice(comment) });
  return tokens;
}

function yamlScalarKind(scalar: string): CodeTokenKind {
  if (!scalar) return 'text';
  if (/^[|>][-+]?\d*$/.test(scalar)) return 'meta';
  if (/^[[{]/.test(scalar)) return 'text';
  if (YAML_SCALAR_KEYWORD.test(scalar)) return 'keyword';
  if (YAML_NUMBER.test(scalar)) return 'number';
  return 'string';
}

const XML_MARKUP = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<[?!][\s\S]*?(?:>|$)|<\/?[\w:.-]+(?:"[^"]*"|'[^']*'|[^'">])*>?/g;
const XML_ATTRIBUTE = /([\w:.-]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s>"']+)?/g;

function tokenizeXml(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let at = 0;
  for (const match of code.matchAll(XML_MARKUP)) {
    tokens.push({ kind: 'text', text: code.slice(at, match.index) });
    const markup = match[0];
    if (markup.startsWith('<!--')) tokens.push({ kind: 'comment', text: markup });
    else if (markup.startsWith('<![CDATA[')) tokens.push({ kind: 'string', text: markup });
    else if (markup.startsWith('<?') || markup.startsWith('<!')) tokens.push({ kind: 'meta', text: markup });
    else tokens.push(...xmlTag(markup));
    at = match.index + markup.length;
  }
  tokens.push({ kind: 'text', text: code.slice(at) });
  return tokens;
}

function xmlTag(markup: string): CodeToken[] {
  const open = /^<\/?/.exec(markup)![0];
  const name = /^[\w:.-]+/.exec(markup.slice(open.length))![0];
  const close = /\/?>$/.exec(markup)?.[0] ?? '';
  const body = markup.slice(open.length + name.length, markup.length - close.length);
  const tokens: CodeToken[] = [
    { kind: 'punctuation', text: open },
    { kind: 'tag', text: name },
  ];
  let at = 0;
  for (const match of body.matchAll(XML_ATTRIBUTE)) {
    tokens.push({ kind: 'text', text: body.slice(at, match.index) });
    const [text, attribute, equals = '', value = ''] = match;
    tokens.push(
      { kind: 'attribute', text: attribute! },
      { kind: 'punctuation', text: equals },
      { kind: 'string', text: value },
    );
    at = match.index + text.length;
  }
  tokens.push({ kind: 'text', text: body.slice(at) }, { kind: 'punctuation', text: close });
  return tokens;
}
