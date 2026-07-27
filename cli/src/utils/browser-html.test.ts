import { describe, expect, it } from 'vitest';
import { hasMermaidCodeBlocks } from './browser-html.js';

describe('hasMermaidCodeBlocks', () => {
  it('detects Mermaid language classes regardless of class order', () => {
    expect(hasMermaidCodeBlocks('<pre><code class="foo language-mermaid bar">graph LR</code></pre>')).toBe(true);
    expect(hasMermaidCodeBlocks('<pre><code class="language-yaml">key: value</code></pre>')).toBe(false);
  });
});
