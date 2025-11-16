import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import type { CacheMetadata, CacheEntry } from './types';

export class CarbonCache {
  private cacheFile: string;
  private cache: CacheMetadata = {};

  constructor(private cacheDir: string) {
    this.cacheFile = join(cacheDir, 'cache.json');
  }

  async init(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });

    try {
      const data = await readFile(this.cacheFile, 'utf-8');
      this.cache = JSON.parse(data);
    } catch {
      this.cache = {};
    }
  }

  async get(filePath: string, content: string): Promise<string | null> {
    const hash = this.hashContent(content);
    const entry = this.cache[filePath];

    if (!entry || entry.hash !== hash) {
      return null;
    }

    try {
      await access(entry.screenshotPath);
      return entry.screenshotPath;
    } catch {
      return null;
    }
  }

  async set(filePath: string, content: string, screenshotPath: string): Promise<void> {
    const hash = this.hashContent(content);

    this.cache[filePath] = {
      hash,
      filePath,
      screenshotPath,
      timestamp: Date.now(),
    };

    await this.save();
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private async save(): Promise<void> {
    await writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2));
  }
}
