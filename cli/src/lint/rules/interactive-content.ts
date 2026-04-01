import type { LintRule, LintContext, LintIssue } from '../types.js';

interface Pattern {
  regex: RegExp;
  message: string;
}

const EVENT_HANDLERS: Pattern = {
  regex: /\b(onClick|onSubmit|onChange|onFocus|onBlur|onKeyDown|onKeyUp|onKeyPress|onMouseEnter|onMouseLeave|onMouseDown|onMouseUp|onDoubleClick|onDrag|onDrop|onTouchStart|onTouchEnd)\b/,
  message: 'Event handlers have no effect in PDF',
};

const HOOKS: Pattern = {
  regex: /\b(useState|useEffect|useRef|useCallback|useReducer)\b/,
  message: 'Interactive React hooks have no effect in PDF',
};

const HOVER_FOCUS: Pattern = {
  regex: /\b(hover:|focus:|active:|group-hover:|peer:|focus-within:|focus-visible:)/,
  message: 'Hover/focus states are invisible in PDF',
};

const CURSOR: Pattern = {
  regex: /\bcursor-pointer\b/,
  message: 'Cursor styles have no effect in PDF',
};

const TRANSITIONS: Pattern = {
  regex: /\b(transition-|animate-|duration-)\w/,
  message: 'CSS transitions/animations don\'t play in PDF',
};

const FORM_ELEMENTS: Pattern = {
  regex: /<(input|button|select|textarea|form)\b/,
  message: 'Form elements are not interactive in PDF',
};

const MEDIA_ELEMENTS: Pattern = {
  regex: /<(video|audio|iframe)\b/,
  message: 'Embedded media won\'t play in PDF',
};

const BROWSER_APIS: Pattern = {
  regex: /\b(window\.|document\.|navigator\.)\w/,
  message: 'Browser APIs are unavailable in static PDF',
};

const TIMERS: Pattern = {
  regex: /\b(setTimeout|setInterval|requestAnimationFrame)\b/,
  message: 'Timers don\'t run in PDF',
};

const ALL_PATTERNS: Pattern[] = [
  EVENT_HANDLERS, HOOKS, HOVER_FOCUS, CURSOR, TRANSITIONS,
  FORM_ELEMENTS, MEDIA_ELEMENTS, BROWSER_APIS, TIMERS,
];

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
const IMPORT_LINE = /^\s*import\b/;

export const interactiveContent: LintRule = {
  name: 'interactive-content',
  description: 'Detect interactive features that don\'t work in static PDFs',
  severity: 'warning',

  check(ctx: LintContext): LintIssue[] {
    const issues: LintIssue[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];
      if (COMMENT_LINE.test(line)) continue;
      if (IMPORT_LINE.test(line)) continue;

      for (const pattern of ALL_PATTERNS) {
        if (pattern.regex.test(line)) {
          issues.push({
            file: ctx.filePath,
            line: i + 1,
            rule: this.name,
            severity: this.severity,
            message: pattern.message,
          });
        }
      }
    }

    return issues;
  },
};
