import { scaled } from '../utils/font-scale';
import { formatJson, isTokenizedLanguage, tokenizeCode, type CodeTokenKind } from './code-tokens';

/**
 * The one monospace surface. Inline `<code>` is styled in styles.css as 9pt
 * Fira Code; this component used to hardcode 0.875rem against an unset root
 * and its own ui-monospace stack, so the two kinds of code in a single
 * document disagreed on both size and typeface. Points, not rem, for the same
 * reason the rest of the scale is in points: the output is a fixed-size page.
 */
const MONO_FAMILY = "'Fira Code', Monaco, 'Courier New', monospace";
// Wrapped so the code block tracks --font-size like the rest of the document.
// These end up in a raw style= attribute inside dangerouslySetInnerHTML, which
// no stylesheet transform can reach.
const MONO_SIZE = scaled('9pt');
const MONO_LEADING = scaled('12pt');
/** Titles sit one step down, matching the text-xs step. */
const MONO_TITLE_SIZE = scaled('7pt');

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// Cache for highlighter instances to avoid re-initializing
const htmlCache = new Map<string, string>();

/**
 * SyntaxHighlighter component using Shiki
 *
 * Pre-renders syntax-highlighted code blocks during SSR build.
 * Uses Shiki to generate static HTML with embedded styles.
 *
 * @param code - The code to highlight
 * @param language - Programming language (default: 'yaml')
 * @param title - Optional title displayed above code block
 * @param showLineNumbers - Show line numbers (default: false)
 * @param className - Additional CSS classes
 */
export default function SyntaxHighlighter({
  code,
  language = 'yaml',
  title,
  showLineNumbers = false,
  className = ''
}: SyntaxHighlighterProps): JSX.Element {
  // Create cache key
  const cacheKey = `${language}:${showLineNumbers}:${code}`;

  // Check cache first
  let highlightedHtml = htmlCache.get(cacheKey);

  if (!highlightedHtml) {
    // This will be called during SSR build
    // Note: codeToHtml is async, but in SSR context with React 18+
    // we can use it with React.use() or handle it differently

    // For now, we'll use a synchronous wrapper
    // In production, this should be pre-rendered during build
    try {
      // Create highlighted HTML synchronously
      // This uses Shiki's bundled WASM version
      const html = generateHighlightedCode(code, language, showLineNumbers);
      htmlCache.set(cacheKey, html);
      highlightedHtml = html;
    } catch (error) {
      console.error('Shiki highlighting failed:', error);
      // Fallback to plain code block with dark theme
      highlightedHtml = `<pre class="shiki" style="background-color: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-family: ${MONO_FAMILY}; font-size: ${MONO_SIZE}; line-height: ${MONO_LEADING};"><code>${escapeHtml(code)}</code></pre>`;
    }
  }

  return (
    <div className={`syntax-highlighter-wrapper ${className}`} style={{ marginBottom: '1rem' }}>
      {title && (
        <div className="code-title" style={{
          backgroundColor: '#1a1a1a',
          color: '#d4d4d4',
          padding: '0.5rem 1rem',
          fontSize: MONO_TITLE_SIZE,
          fontWeight: 600,
          borderTopLeftRadius: '0.375rem',
          borderTopRightRadius: '0.375rem',
          fontFamily: MONO_FAMILY,
          borderBottom: '1px solid #2d2d2d',
          letterSpacing: '0.025em'
        }}>
          {title}
        </div>
      )}
      <div
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        style={{ fontSize: MONO_SIZE }}
      />
    </div>
  );
}

/**
 * Generate highlighted code HTML synchronously
 * This is a placeholder that should be replaced with actual Shiki integration
 */
function generateHighlightedCode(code: string, language: string, showLineNumbers: boolean): string {
  // For SSR, we need to use a sync approach
  // This is a simplified version - in production you'd use Shiki's async API
  // during the build process

  const tokenized = isTokenizedLanguage(language);
  const source = language.toLowerCase() === 'json' ? formatJson(code) : code;
  const lines = tokenized ? tokenLines(source, language) : source.split('\n');
  const lineNumberWidth = lines.length.toString().length;

  const styledCode = lines.map((line, idx) => {
    const lineNum = (idx + 1).toString().padStart(lineNumberWidth, ' ');
    const lineNumberHtml = showLineNumbers
      ? `<span class="line-number" style="color: #858585; user-select: none; margin-right: 1.5rem; opacity: 0.6;">${lineNum}</span>`
      : '';

    const styledLine = tokenized ? line : highlightSyntax(line, language);

    return `<span class="line">${lineNumberHtml}${styledLine}</span>`;
  }).join('\n');

  return `<pre class="shiki" style="background-color: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: ${showLineNumbers ? '0' : '0.375rem'}; overflow-x: auto; margin: 0; border-bottom-left-radius: 0.375rem; border-bottom-right-radius: 0.375rem; font-family: ${MONO_FAMILY}; line-height: ${MONO_LEADING}; font-size: ${MONO_SIZE};"><code style="display: block;">${styledCode}</code></pre>`;
}

/** VS Code Dark+ colours for each token kind; `text` stays the block's foreground. */
const TOKEN_STYLES: Record<CodeTokenKind, string> = {
  text: '',
  key: 'color: #9cdcfe;',
  string: 'color: #ce9178;',
  number: 'color: #b5cea8;',
  keyword: 'color: #569cd6;',
  comment: 'color: #6a9955; font-style: italic;',
  punctuation: 'color: #808080;',
  tag: 'color: #569cd6;',
  attribute: 'color: #9cdcfe;',
  meta: 'color: #c586c0;',
};

/**
 * The highlighted HTML of each line of `code`. Tokens such as XML comments or
 * JSON strings may span lines, so each one is closed at a newline and reopened
 * on the next line, keeping every `.line` span self-contained.
 */
function tokenLines(code: string, language: string): string[] {
  const lines: string[] = [''];
  for (const token of tokenizeCode(code, language)) {
    const style = TOKEN_STYLES[token.kind];
    token.text.split('\n').forEach((part, index) => {
      if (index > 0) lines.push('');
      if (!part) return;
      lines[lines.length - 1] += style ? `<span style="${style}">${escapeHtml(part)}</span>` : escapeHtml(part);
    });
  }
  return lines;
}

/**
 * Basic syntax highlighting for common languages
 * Using VS Code Dark+ theme colors
 */
function highlightSyntax(line: string, language: string): string {
  let highlighted = escapeHtml(line);

  if (language === 'bash' || language === 'sh' || language === 'shell') {
    // Bash highlighting with enhanced dark theme
    highlighted = highlighted
      // Comments (green italic)
      .replace(/^(\s*#.*)$/g, '<span style="color: #6a9955; font-style: italic;">$1</span>')
      // Prompt (bright blue)
      .replace(/^\$\s/g, '<span style="color: #4fc1ff; font-weight: bold;">$ </span>')
      // Common commands (yellow)
      .replace(/\b(npm|node|helm|kubectl|git|docker|cd|ls|mkdir|cp|mv|rm|cat|echo|grep|find|curl|wget)\b/g, '<span style="color: #dcdcaa;">$1</span>')
      // Sub-commands and actions (cyan)
      .replace(/\b(install|build|run|add|apply|status|push|pull|clone|commit|port-forward)\b/g, '<span style="color: #4fc1ff;">$1</span>')
      // Strings (orange)
      .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span style="color: #ce9178;">$1</span>')
      // Flags (light blue)
      .replace(/--[\w-]+/g, '<span style="color: #9cdcfe;">$&</span>')
      // Short flags
      .replace(/\s-[\w]/g, '<span style="color: #9cdcfe;">$&</span>');
  } else if (language === 'sql') {
    // SQL highlighting with enhanced dark theme
    highlighted = highlighted
      // SQL keywords (blue)
      .replace(/\b(CREATE|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ON|AND|OR|GROUP BY|ORDER BY|GRANT|REVOKE|DROP|USER|TABLE|SCHEMA|ALL|IN|WITH|PASSWORD|USAGE|SCHEDULE|CRON)\b/gi, '<span style="color: #569cd6; font-weight: bold;">$1</span>')
      // Functions (yellow)
      .replace(/\b([a-z_]+)\s*\(/gi, '<span style="color: #dcdcaa;">$1</span>(')
      // Strings (orange)
      .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g, '<span style="color: #ce9178;">$1</span>')
      // Dollar-quoted strings (orange)
      .replace(/\$\$([^$]*)\$\$/g, '<span style="color: #ce9178;">$$$$1$$$$</span>')
      // Comments (green italic)
      .replace(/--.*$/g, '<span style="color: #6a9955; font-style: italic;">$&</span>')
      // Numbers (light green)
      .replace(/\b(\d+)\b/g, '<span style="color: #b5cea8;">$1</span>')
      // Identifiers (cyan)
      .replace(/\b([a-z_][a-z0-9_]*)\b(?!\s*\()/gi, function(match) {
        // Don't highlight SQL keywords again
        const keywords = ['create', 'select', 'insert', 'update', 'delete', 'from', 'where', 'join', 'on', 'and', 'or', 'grant', 'revoke', 'drop', 'user', 'table', 'schema', 'all', 'in', 'with', 'password', 'usage', 'schedule', 'cron'];
        if (keywords.includes(match.toLowerCase())) return match;
        return `<span style="color: #4fc1ff;">${match}</span>`;
      });
  }

  return highlighted;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
