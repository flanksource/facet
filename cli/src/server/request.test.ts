import { describe, expect, it } from 'vitest';
import { parseRenderRequest } from './request.js';

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
