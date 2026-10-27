import type { IncomingMessage, ServerResponse } from 'node:http';

export function requestAbortSignal(request: IncomingMessage, response: ServerResponse): AbortSignal {
  const controller = new AbortController();
  const cleanup = () => {
    request.removeListener('aborted', abort);
    response.removeListener('close', closed);
    response.removeListener('finish', cleanup);
  };
  const abort = () => {
    cleanup();
    controller.abort(new DOMException('Client disconnected', 'AbortError'));
  };
  const closed = () => {
    if (!response.writableFinished) abort();
    else cleanup();
  };
  request.once('aborted', abort);
  response.once('close', closed);
  response.once('finish', cleanup);
  return controller.signal;
}
