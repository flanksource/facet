import { describe, expect, it } from 'vitest';
import { cacheKeyForRequest } from './routes.js';
import type { ServerConfig } from './config.js';
import type { ParsedRenderRequest } from './request.js';

const config = { skipModules: false } as ServerConfig;

const baseline: ParsedRenderRequest = {
  source: { kind: 'inline', code: 'export default () => null;', ext: 'tsx' },
  data: { title: 'Baseline' },
  format: 'pdf',
  output: 'direct',
};

/**
 * Every field that reaches the render pipeline must reach the cache key too —
 * a field that changes the output but not the key makes the server serve an
 * earlier render's bytes. `fontSize` was exactly that: it feeds injectFontScale
 * for html, png and pdf, but was absent from the key.
 */
const outputAffectingVariants: Array<[string, Partial<ParsedRenderRequest>]> = [
  ['source', { source: { kind: 'inline', code: 'export default () => 1;', ext: 'tsx' } }],
  ['data', { data: { title: 'Changed' } }],
  ['format', { format: 'png' }],
  ['dependencies', { dependencies: { 'react-icons': '^5.4.0' } }],
  ['headerCode', { headerCode: 'export default () => null;' }],
  ['footerCode', { footerCode: 'export default () => null;' }],
  ['pdfOptions', { pdfOptions: { landscape: true } }],
  ['encryption', { encryption: { ownerPassword: 'secret' } }],
  ['signature', { signature: { selfSigned: true } }],
  ['pngOptions', { pngOptions: { selector: '#chart' } }],
  ['live', { live: true }],
  ['postProcessCss', { postProcessCss: true }],
  ['redact', { redact: { allow: { classification: ['public'] } } }],
  ['fontSize', { fontSize: 14 }],
];

describe('cacheKeyForRequest', () => {
  it('is stable for identical inputs', () => {
    expect(cacheKeyForRequest(baseline, config))
      .toBe(cacheKeyForRequest({ ...baseline }, config));
  });

  it('changes when any output-affecting field changes', () => {
    const base = cacheKeyForRequest(baseline, config);

    const collisions = outputAffectingVariants
      .filter(([, override]) => cacheKeyForRequest({ ...baseline, ...override }, config) === base)
      .map(([field]) => field);

    expect(collisions).toEqual([]);
  });

  it('separates renders that differ only in fontSize', () => {
    expect(cacheKeyForRequest({ ...baseline, fontSize: 10 }, config))
      .not.toBe(cacheKeyForRequest({ ...baseline, fontSize: 14 }, config));
  });

  it('separates module modes so a skip-modules render is not reused', () => {
    expect(cacheKeyForRequest(baseline, { skipModules: true } as ServerConfig))
      .not.toBe(cacheKeyForRequest(baseline, config));
  });

  it('ignores fields that do not affect the rendered bytes', () => {
    const withDelivery: ParsedRenderRequest = {
      ...baseline,
      filename: 'report.pdf',
      s3Key: 'reports/report.pdf',
      timeoutMs: 60_000,
    };

    expect(cacheKeyForRequest(withDelivery, config)).toBe(cacheKeyForRequest(baseline, config));
  });
});
