// @vitest-environment node
import { describe, expect, it } from 'vitest';
import config from '../../vite.lib.config';

describe('Facet library build', () => {
  it('keeps Markdown and Day.js plugin imports portable across installs', () => {
    expect(config.build?.rollupOptions?.external).toEqual(expect.arrayContaining([
      'marked',
      /^dayjs\//,
    ]));
  });
});
