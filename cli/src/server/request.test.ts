import { describe, expect, it } from 'vitest';
import { parseRenderRequest, validateRequestModuleMode } from './request.js';

const MAX_UPLOAD = 1024 * 1024;

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function multipartRequest(options: Record<string, unknown>): Request {
  const form = new FormData();
  form.set('archive', new File([new Uint8Array([1, 2, 3])], 'report.tar.gz'));
  form.set('options', JSON.stringify(options));
  return new Request('http://localhost/render', { method: 'POST', body: form });
}

function gzipRequest(query: string): Request {
  return new Request(`http://localhost/render${query}`, {
    method: 'POST',
    headers: { 'content-type': 'application/gzip' },
    body: new Uint8Array([1, 2, 3]),
  });
}

describe('parseRenderRequest timeout', () => {
  it('is unset when the request does not ask for one', async () => {
    const parsed = await parseRenderRequest(jsonRequest({ template: 'invoice' }), MAX_UPLOAD);
    expect(parsed.timeoutMs).toBeUndefined();
  });

  it('reads the timeout from a JSON body', async () => {
    const parsed = await parseRenderRequest(jsonRequest({ template: 'invoice', timeout: 5000 }), MAX_UPLOAD);
    expect(parsed.timeoutMs).toBe(5000);
  });

  it('reads the timeout from multipart options', async () => {
    const parsed = await parseRenderRequest(multipartRequest({ timeout: 7000 }), MAX_UPLOAD);
    expect(parsed.timeoutMs).toBe(7000);
  });

  it('reads the timeout from the gzip query string', async () => {
    const parsed = await parseRenderRequest(gzipRequest('?timeout=9000'), MAX_UPLOAD);
    expect(parsed.timeoutMs).toBe(9000);
  });

  it('rejects a timeout that is not a positive whole number', async () => {
    for (const timeout of [0, -1, 1.5, true, '30m', '', {}]) {
      await expect(parseRenderRequest(jsonRequest({ template: 'invoice', timeout }), MAX_UPLOAD))
        .rejects.toThrow(/Invalid timeout/);
    }
  });

  it('rejects a timeout setTimeout cannot represent', async () => {
    await expect(parseRenderRequest(jsonRequest({ template: 'invoice', timeout: 2_147_483_648 }), MAX_UPLOAD))
      .rejects.toThrow(/Invalid timeout/);
    const parsed = await parseRenderRequest(jsonRequest({ template: 'invoice', timeout: 2_147_483_647 }), MAX_UPLOAD);
    expect(parsed.timeoutMs).toBe(2_147_483_647);
  });
});

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

  it('rejects a font size that is not a usable number', async () => {
    // fontSize is interpolated into a <style> block, so a string reaching the
    // renderer could close the rule and control the stylesheet.
    const form = new FormData();
    form.set('archive', new File(['archive'], 'template.tar.gz'));
    form.set('options', JSON.stringify({
      format: 'pdf',
      pdfOptions: { fontSize: '12pt}body{display:none}/*' },
    }));

    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      body: form,
    }), 1024)).rejects.toThrow(/font size/i);
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

describe('parseRenderRequest PNG options', () => {
  it('leaves the output size unset so PNG defaults to a natural-size capture', async () => {
    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', format: 'png' }),
    }), 1024);

    expect(parsed.format).toBe('png');
    expect(parsed.pngOptions).toEqual({
      selector: 'body',
      viewport: { width: 1280, height: 800 },
      autocrop: false,
      autocropPadding: 0,
    });
  });

  it('accepts multipart PNG options', async () => {
    const form = new FormData();
    form.set('archive', new File(['archive'], 'template.tar.gz'));
    form.set('options', JSON.stringify({
      format: 'png',
      pngOptions: {
        width: 640,
        height: 360,
        selector: '[data-export]',
      },
    }));

    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      body: form,
    }), 1024);

    expect(parsed).toMatchObject({
      format: 'png',
      pngOptions: {
        width: 640,
        height: 360,
        selector: '[data-export]',
      },
    });
  });

  it('accepts gzip PNG query options', async () => {
    const parsed = await parseRenderRequest(new Request(
      'http://facet.test/render?format=png&pngWidth=320&pngHeight=180&pngSelector=%23export&pngViewport=1920x1080',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024);

    expect(parsed).toMatchObject({
      format: 'png',
      pngOptions: {
        width: 320,
        height: 180,
        selector: '#export',
        viewport: { width: 1920, height: 1080 },
      },
    });
  });

  it('accepts autocrop and its padding as JSON options', async () => {
    const parsed = await parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'export default null',
        format: 'png',
        pngOptions: { autocrop: true, autocropPadding: 24 },
      }),
    }), 1024);

    expect(parsed.pngOptions).toMatchObject({ autocrop: true, autocropPadding: 24 });
  });

  it('rejects autocrop padding without autocrop', async () => {
    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'export default null',
        format: 'png',
        pngOptions: { autocropPadding: 24 },
      }),
    }), 1024)).rejects.toThrow('pngOptions.autocropPadding has no effect without pngOptions.autocrop');
  });

  it('accepts autocrop and its padding as gzip query options', async () => {
    const parsed = await parseRenderRequest(new Request(
      'http://facet.test/render?format=png&pngAutocrop=true&pngAutocropPadding=16',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024);

    expect(parsed.pngOptions).toMatchObject({ autocrop: true, autocropPadding: 16 });
  });

  it('rejects a negative pngAutocropPadding query option', async () => {
    await expect(parseRenderRequest(new Request(
      'http://facet.test/render?format=png&pngAutocrop=true&pngAutocropPadding=-4',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024)).rejects.toThrow('pngAutocropPadding must be a non-negative integer');
  });

  it('rejects PNG autocrop query options on non-PNG renders', async () => {
    await expect(parseRenderRequest(new Request(
      'http://facet.test/render?format=pdf&pngAutocrop=true',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024)).rejects.toThrow('PNG query options require format=png');
  });

  it('rejects a malformed pngViewport query option', async () => {
    await expect(parseRenderRequest(new Request(
      'http://facet.test/render?format=png&pngViewport=1920-1080',
      {
        method: 'POST',
        headers: { 'content-type': 'application/gzip' },
        body: new Uint8Array([1, 2, 3]),
      },
    ), 1024)).rejects.toThrow('pngViewport must be <width>x<height> in pixels');
  });

  it('rejects unknown formats instead of treating them as PDF', async () => {
    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'export default null', format: 'jpeg' }),
    }), 1024)).rejects.toThrow('format must be one of: html, pdf, png');
  });

  it('rejects invalid PNG dimensions', async () => {
    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'export default null',
        format: 'png',
        pngOptions: { width: 0, height: 800, selector: 'body' },
      }),
    }), 1024)).rejects.toThrow('pngOptions.width must be a positive integer');
  });

  it('rejects PDF options for PNG renders', async () => {
    await expect(parseRenderRequest(new Request('http://facet.test/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'export default null',
        format: 'png',
        pdfOptions: { defaultPageSize: 'a4' },
      }),
    }), 1024)).rejects.toThrow('pdfOptions cannot be used with PNG renders');
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
