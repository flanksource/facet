import { describe, expect, it, vi } from 'vitest';
import { Logger } from './logger.js';
import { RenderTimings } from './performance.js';
import { applyPDFSecurity } from './pdf-security.js';

vi.mock('pdf-rfc3161', () => ({
  timestampPdf: vi.fn(async ({ pdf }: { pdf: Uint8Array }) => ({ pdf })),
}));

vi.mock('@pdfsmaller/pdf-encrypt', () => ({
  encryptPDF: vi.fn(async (pdf: Uint8Array) => pdf),
}));

describe('applyPDFSecurity timings', () => {
  it('separates timestamping from other PDF post-processing', async () => {
    const timings = new RenderTimings(() => 10);
    const logger = new Logger();
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    const result = await applyPDFSecurity(Buffer.from('test-pdf'), {
      signature: { timestampUrl: 'https://tsa.example.com' },
      encryption: { ownerPassword: 'test-owner-password' },
      timings,
    }, logger);

    expect({ result: result.toString(), timings: timings.entries() }).toEqual({
      result: 'test-pdf',
      timings: [
        { name: 'post-processing', description: 'Post-processing', durationMs: 0 },
        { name: 'timestamping', description: 'Timestamping', durationMs: 0 },
      ],
    });
  });
});
