import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { snapshotHTML } from './live-snapshot.js';
import { Logger } from '../utils/logger.js';

const SETTLE_AFTER_MS = 1500;

// A template that mounts its diagram after the network has gone idle, as a slow
// or busy machine does, and draws its arrows only later still.
function lateDiagram(mountAfterMs: number): string {
  return `<html><body><div id="facet-root"></div><script>
window.addEventListener('load', () => setTimeout(() => {
  const diagram = document.createElement('div');
  diagram.setAttribute('data-facet-diagram', '');
  diagram.setAttribute('data-facet-ready', 'false');
  diagram.innerHTML = '<div class="box">Source</div>';
  document.getElementById('facet-root').appendChild(diagram);
  setTimeout(() => {
    diagram.insertAdjacentHTML('beforeend', '<svg data-arrow="drawn"></svg>');
    diagram.setAttribute('data-facet-ready', 'true');
  }, ${SETTLE_AFTER_MS});
}, ${mountAfterMs}));
</script></body></html>`;
}

describe('live snapshot', () => {
  it.each(["new Error('template failed')", "'template failed'"])(
    'reports a browser exception thrown as %s', async (exception) => {
      const server = createServer((_request, response) => {
        response.setHeader('content-type', 'text/html');
        response.end(`<html><body><div id="facet-root">Report</div><script>throw ${exception}</script></body></html>`);
      });
      await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
      try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');
        await expect(snapshotHTML(`http://127.0.0.1:${address.port}`, new Logger(false)))
          .rejects.toThrow(/Live render failed.*browser errors:[\s\S]*template failed/);
      } finally {
        await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
      }
    }, 30_000,
  );
  it('returns HTML and logs diagram layout warnings', async () => {
    const server = createServer((_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end('<html><body><div id="facet-root"><div data-facet-diagram data-facet-ready="true" data-facet-warning="small text"></div></div></body></html>');
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');
      const logger = new Logger(false);
      const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const html = await snapshotHTML(`http://127.0.0.1:${address.port}`, logger);
      expect(html).toContain('data-facet-ready="true"');
      expect(warn).toHaveBeenCalledWith('Diagram 1: small text');
    } finally {
      await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
    }
  }, 30_000);

  it.each([
    // Mounted inside the old no-diagram settle delay: snapshotted without arrows.
    ['inside the fallback settle delay', 1500],
    // Mounted after it: reported as a template that never mounted.
    ['after the fallback settle delay', 4000],
  ])('waits for a diagram that mounts %s to draw its arrows', async (_when, mountAfterMs) => {
    const server = createServer((_request, response) => {
      response.setHeader('content-type', 'text/html');
      response.end(lateDiagram(mountAfterMs));
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a local TCP address');

      const html = await snapshotHTML(`http://127.0.0.1:${address.port}`, new Logger(false));

      expect(html).toContain('data-facet-ready="true"');
      expect(html).toContain('data-arrow="drawn"');
    } finally {
      await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
    }
  }, 30_000);
});
