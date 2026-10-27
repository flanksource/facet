import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { requestAbortSignal } from './request-abort.js';

describe('request abort signal', () => {
  it('aborts render work when the client disconnects before the response finishes', () => {
    const request = new EventEmitter() as IncomingMessage;
    const response = Object.assign(new EventEmitter(), { writableFinished: false }) as ServerResponse;
    const signal = requestAbortSignal(request, response);
    response.emit('close');
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toMatchObject({ name: 'AbortError' });
  });

  it('does not abort finished requests', () => {
    const request = new EventEmitter() as IncomingMessage;
    const response = Object.assign(new EventEmitter(), { writableFinished: true }) as ServerResponse;
    const signal = requestAbortSignal(request, response);
    response.emit('finish');
    response.emit('close');
    expect(signal.aborted).toBe(false);
  });
});
