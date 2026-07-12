// Verifies the API server accepts connections on non-loopback interfaces,
// which Kubernetes probes and pod-network traffic require.
import { describe, it, expect, afterEach } from 'vitest';
import { networkInterfaces, tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
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

const ip = externalIPv4();

describe('server binding', () => {
  let handle: ServerHandle | undefined;
  let dir: string | undefined;

  afterEach(async () => {
    await handle?.stop();
    handle = undefined;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it.skipIf(!ip)('accepts connections on non-loopback interfaces', async () => {
    dir = mkdtempSync(join(tmpdir(), 'facet-serve-test-'));
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
