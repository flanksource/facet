// Verifies the API server accepts connections on non-loopback interfaces,
// which Kubernetes probes and pod-network traffic require.
import { describe, it, expect, afterEach } from 'vitest';
import { networkInterfaces } from 'node:os';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type ServerHandle } from './preview.js';

function externalIPv4(): string | undefined {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return undefined;
}

describe('server binding', () => {
  let handle: ServerHandle | undefined;

  afterEach(async () => {
    await handle?.stop();
    handle = undefined;
  });

  it('accepts connections on non-loopback interfaces', async () => {
    const ip = externalIPv4();
    if (!ip) {
      console.warn('no external IPv4 interface available; skipping');
      return;
    }

    const dir = mkdtempSync(join(tmpdir(), 'facet-serve-test-'));
    handle = await createServer({
      port: 0,
      templatesDir: dir,
      workers: 0,
      renderTimeout: 1000,
      maxUploadSize: 1024,
      verbose: false,
      cacheMaxSize: 1048576,
      cacheDir: dir,
    });

    const res = await fetch(`http://${ip}:${handle.port}/healthz`);
    expect(res.status).toBe(200);
  });
});
