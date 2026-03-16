import { createHash } from 'crypto';
import { join } from 'path';
import { mkdirSync, readdirSync, statSync, unlinkSync, readFileSync, writeFileSync, utimesSync } from 'fs';

interface CacheEntry {
  file: string;
  contentType: string;
  size: number;
  mtimeMs: number;
}

export class RenderCache {
  private dir: string;
  private maxBytes: number;

  constructor(cacheDir: string, maxBytes: number) {
    this.dir = join(cacheDir, 'render-cache');
    this.maxBytes = maxBytes;
    mkdirSync(this.dir, { recursive: true });
  }

  get(key: string): { contentType: string; data: Buffer } | undefined {
    const meta = this.readMeta(key);
    if (!meta) return undefined;
    try {
      const data = readFileSync(meta.file);
      // Touch file to mark as recently used
      const now = new Date();
      utimesSync(meta.file, now, now);
      return { contentType: meta.contentType, data };
    } catch {
      return undefined;
    }
  }

  set(key: string, contentType: string, data: Buffer): void {
    const ext = contentType === 'application/pdf' ? '.pdf' : '.html';
    const filePath = join(this.dir, key + ext);
    const metaPath = join(this.dir, key + '.meta');
    writeFileSync(filePath, data);
    writeFileSync(metaPath, contentType, 'utf-8');
    this.evictIfNeeded();
  }

  private readMeta(key: string): { file: string; contentType: string } | undefined {
    const metaPath = join(this.dir, key + '.meta');
    try {
      const contentType = readFileSync(metaPath, 'utf-8').trim();
      const ext = contentType === 'application/pdf' ? '.pdf' : '.html';
      const filePath = join(this.dir, key + ext);
      statSync(filePath);
      return { file: filePath, contentType };
    } catch {
      return undefined;
    }
  }

  private evictIfNeeded(): void {
    const entries: CacheEntry[] = [];
    let totalSize = 0;

    for (const name of readdirSync(this.dir)) {
      if (name.endsWith('.meta')) continue;
      const filePath = join(this.dir, name);
      try {
        const st = statSync(filePath);
        entries.push({ file: filePath, contentType: '', size: st.size, mtimeMs: st.mtimeMs });
        totalSize += st.size;
      } catch {}
    }

    if (totalSize <= this.maxBytes) return;

    // Sort oldest first (LRU)
    entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
    for (const entry of entries) {
      if (totalSize <= this.maxBytes) break;
      try {
        unlinkSync(entry.file);
        // Also remove the .meta file
        const base = entry.file.replace(/\.(pdf|html)$/, '');
        try { unlinkSync(base + '.meta'); } catch {}
      } catch {}
      totalSize -= entry.size;
    }
  }
}

export function computeCacheKey(inputs: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex').slice(0, 16);
}
