import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTemplateDirectives, shouldPostProcessCSS, shouldUseLiveRendering } from './live-template.js';

const fixture = (name: string) => fileURLToPath(new URL(`../../test/fixtures/${name}`, import.meta.url));

describe('shouldUseLiveRendering', () => {
  it('enables live rendering when requested explicitly', () => {
    expect(shouldUseLiveRendering(true, fixture('standard-template.tsx'))).toBe(true);
  });

  it('enables live rendering when the first non-empty line is // @live', () => {
    expect(shouldUseLiveRendering(false, fixture('live-template.tsx'))).toBe(true);
  });

  it('does not enable live rendering for a later // @live comment', () => {
    expect(shouldUseLiveRendering(false, fixture('standard-template.tsx'))).toBe(false);
  });
});

describe('template directives', () => {
  it('parses a leading directive block in any order', () => {
    expect(parseTemplateDirectives(`
// @post-process-css=false
// @live
import React from 'react';
`)).toEqual({ live: true, postProcessCss: false });
  });

  it('stops parsing directives at the first source line', () => {
    expect(parseTemplateDirectives(`
// @live
import React from 'react';
// @post-process-css=false
`)).toEqual({ live: true });
  });

  it('lets an explicit option override the template directive', () => {
    expect(shouldPostProcessCSS(true, `// @post-process-css=false\nexport default null;`)).toBe(true);
    expect(shouldPostProcessCSS(false, `// @post-process-css=true\nexport default null;`)).toBe(false);
  });

  it('defaults CSS post-processing to enabled', () => {
    expect(shouldPostProcessCSS(undefined, 'export default null;')).toBe(true);
  });
});
