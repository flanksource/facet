import { describe, expect, it } from 'vitest';
import { parseRenderRequest, validateRequestModuleMode } from './request.js';

describe('parseRenderRequest postProcessCss', () => {
  it('accepts a JSON boolean', async () => {
    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', postProcessCss: false }),
    }), 1024);

    expect(parsed.postProcessCss).toBe(false);
  });

  it('accepts a multipart options boolean', async () => {
    const form = new FormData();
    form.set('archive', new File(['archive'], 'template.tar.gz'));
    form.set('options', JSON.stringify({ postProcessCss: false }));

    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      body: form,
    }), 1024);

    expect(parsed.postProcessCss).toBe(false);
  });

  it('preserves remote CLI render options from multipart requests', async () => {
    const form = new FormData();
    form.set('archive', new File(['archive'], 'template.tar.gz'));
    form.set('options', JSON.stringify({
      format: 'pdf',
      live: true,
      headerCode: 'export default () => <header />',
      footerCode: 'export default () => <footer />',
      pdfOptions: {
        defaultPageSize: 'letter',
        debugTypography: true,
        fontSize: 11,
      },
    }));

    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      body: form,
    }), 1024);

    expect(parsed).toMatchObject({
      format: 'pdf',
      live: true,
      headerCode: 'export default () => <header />',
      footerCode: 'export default () => <footer />',
      pdfOptions: {
        defaultPageSize: 'letter',
        debugTypography: true,
        fontSize: 11,
      },
    });
  });

  it('accepts a gzip query boolean', async () => {
    const parsed = await parseRenderRequest(new Request(
      'http://facet.test/render?postProcessCss=false',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024);

    expect(parsed.postProcessCss).toBe(false);
  });

  it('rejects non-boolean JSON values', async () => {
    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', postProcessCss: 'false' }),
    }), 1024)).rejects.toThrow('postProcessCss must be a boolean');
  });

  it('rejects invalid gzip query values', async () => {
    await expect(parseRenderRequest(new Request(
      'http://facet.test/render?postProcessCss=disabled',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1]),
      },
    ), 1024)).rejects.toThrow('postProcessCss must be true or false');
  });
});

describe('validateRequestModuleMode', () => {
  it('rejects request dependencies when the server uses shared modules', async () => {
    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'export default null',
        dependencies: { 'custom-module': '2.0.0' },
      }),
    }), 1024);

    expect(() => validateRequestModuleMode(parsed, true)).toThrow(
      'dependencies are unavailable while the server runs with --skip-modules',
    );
    expect(() => validateRequestModuleMode(parsed, false)).not.toThrow();
  });
});
