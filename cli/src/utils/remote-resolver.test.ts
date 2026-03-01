import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { parseRemoteRef, cacheKey, cacheDir, resolveRemoteRef } from './remote-resolver.js';
import type { RemoteRef } from '../types.js';

// Override FACET_CACHE_DIR for tests
let testCacheDir: string;

beforeEach(async () => {
  testCacheDir = await mkdtemp(join(tmpdir(), 'facet-test-cache-'));
  process.env['FACET_CACHE_DIR'] = testCacheDir;
});

afterEach(async () => {
  delete process.env['FACET_CACHE_DIR'];
  await rm(testCacheDir, { recursive: true, force: true });
});

describe('parseRemoteRef', () => {
  describe('github shorthand', () => {
    it('parses github:owner/repo/path@ref', () => {
      const result = parseRemoteRef('github:flanksource/reports/MyReport.tsx@v1.2');
      expect(result).toEqual({
        type: 'github',
        repoUrl: 'https://github.com/flanksource/reports.git',
        subPath: 'MyReport.tsx',
        ref: 'v1.2',
      });
    });

    it('parses github:owner/repo/nested/path@sha', () => {
      const result = parseRemoteRef('github:flanksource/reports/templates/MyReport.tsx@a3f9c12');
      expect(result).toEqual({
        type: 'github',
        repoUrl: 'https://github.com/flanksource/reports.git',
        subPath: 'templates/MyReport.tsx',
        ref: 'a3f9c12',
      });
    });

    it('defaults ref to HEAD when omitted', () => {
      const result = parseRemoteRef('github:flanksource/reports/MyReport.tsx');
      expect(result?.ref).toBe('HEAD');
    });
  });

  describe('HTTPS URLs', () => {
    it('parses github.com blob URL', () => {
      const result = parseRemoteRef('https://github.com/flanksource/reports/blob/main/MyReport.tsx');
      expect(result).toEqual({
        type: 'https',
        repoUrl: 'https://github.com/flanksource/reports.git',
        subPath: 'MyReport.tsx',
        ref: 'main',
      });
    });

    it('parses raw.githubusercontent.com URL', () => {
      const result = parseRemoteRef('https://raw.githubusercontent.com/flanksource/reports/main/MyReport.tsx');
      expect(result).toEqual({
        type: 'https',
        repoUrl: 'https://github.com/flanksource/reports.git',
        subPath: 'MyReport.tsx',
        ref: 'main',
      });
    });

    it('parses nested paths in blob URL', () => {
      const result = parseRemoteRef('https://github.com/flanksource/reports/blob/v1.2/templates/Report.tsx');
      expect(result?.subPath).toBe('templates/Report.tsx');
      expect(result?.ref).toBe('v1.2');
    });
  });

  describe('git+ssh', () => {
    it('parses git+ssh URL with fragment ref', () => {
      const result = parseRemoteRef('git+ssh://git@github.com/flanksource/reports.git#v1.2/MyReport.tsx');
      expect(result).toEqual({
        type: 'git+ssh',
        repoUrl: 'git+ssh://git@github.com/flanksource/reports.git',
        subPath: 'MyReport.tsx',
        ref: 'v1.2',
      });
    });

    it('defaults ref to HEAD when no fragment', () => {
      const result = parseRemoteRef('git+ssh://git@github.com/flanksource/reports.git');
      expect(result?.ref).toBe('HEAD');
      expect(result?.subPath).toBe('');
    });
  });

  describe('npm packages', () => {
    it('parses scoped package with path and version', () => {
      const result = parseRemoteRef('@flanksource/reports:MyReport.tsx@1.2.0');
      expect(result).toEqual({
        type: 'npm',
        repoUrl: '@flanksource/reports',
        subPath: 'MyReport.tsx',
        ref: '1.2.0',
      });
    });

    it('defaults version to latest when omitted', () => {
      const result = parseRemoteRef('@flanksource/reports:MyReport.tsx');
      expect(result?.ref).toBe('latest');
    });

    it('parses scoped package with nested path', () => {
      const result = parseRemoteRef('@flanksource/reports:templates/Report.tsx@2.0.0');
      expect(result?.subPath).toBe('templates/Report.tsx');
    });
  });

  describe('local paths (no remote prefix)', () => {
    it('returns null for relative file path', () => {
      expect(parseRemoteRef('./MyReport.tsx')).toBeNull();
    });

    it('returns null for absolute file path', () => {
      expect(parseRemoteRef('/home/user/report/MyReport.tsx')).toBeNull();
    });

    it('returns null for plain filename', () => {
      expect(parseRemoteRef('MyReport.tsx')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseRemoteRef('')).toBeNull();
    });

    it('returns null for non-HTTPS URL', () => {
      expect(parseRemoteRef('http://example.com/file.tsx')).toBeNull();
    });

    it('returns null for generic HTTPS URL (not GitHub)', () => {
      expect(parseRemoteRef('https://example.com/file.tsx')).toBeNull();
    });
  });
});

describe('cacheKey', () => {
  it('produces a deterministic 32-char hex string', () => {
    const key1 = cacheKey('https://github.com/org/repo.git', 'v1.2');
    const key2 = cacheKey('https://github.com/org/repo.git', 'v1.2');
    expect(key1).toBe(key2);
    expect(key1).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(key1)).toBe(true);
  });

  it('produces different keys for different refs', () => {
    const key1 = cacheKey('https://github.com/org/repo.git', 'v1.2');
    const key2 = cacheKey('https://github.com/org/repo.git', 'v1.3');
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different repos', () => {
    const key1 = cacheKey('https://github.com/org/repo-a.git', 'main');
    const key2 = cacheKey('https://github.com/org/repo-b.git', 'main');
    expect(key1).not.toBe(key2);
  });
});

describe('cacheDir', () => {
  it('returns path inside the provided base dir', () => {
    const key = cacheKey('https://github.com/org/repo.git', 'v1.0');
    const dir = cacheDir(key, '/tmp/custom-cache');
    expect(dir).toBe(`/tmp/custom-cache/${key}`);
  });
});

describe('resolveRemoteRef cache hit/miss', () => {
  const gitRef: RemoteRef = {
    type: 'github',
    repoUrl: 'https://github.com/org/repo.git',
    subPath: 'Report.tsx',
    ref: 'v1.0',
  };

  it('returns cached result when manifest and file exist', async () => {
    // Arrange: pre-populate cache
    const key = cacheKey(gitRef.repoUrl, gitRef.ref);
    const dir = cacheDir(key, testCacheDir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'Report.tsx'), 'export default () => <div />', 'utf-8');
    await writeFile(join(dir, 'facet-cache.json'), JSON.stringify({
      ref: 'https://github.com/org/repo.git/Report.tsx@v1.0',
      resolvedSha: 'abc123def456abc123def456abc123def456abc1',
      fetchedAt: '2026-01-01T00:00:00Z',
      repoUrl: 'https://github.com/org/repo.git',
    }), 'utf-8');

    const result = await resolveRemoteRef(gitRef);

    expect(result.templateFile).toBe('Report.tsx');
    expect(result.resolvedSha).toBe('abc123def456abc123def456abc123def456abc1');
    expect(result.consumerRoot).toBe(dir);
  });

  it('clears stale cache and re-fetches on --refresh', async () => {
    // Arrange: pre-populate cache with stale data
    const key = cacheKey(gitRef.repoUrl, gitRef.ref);
    const dir = cacheDir(key, testCacheDir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'stale-file.txt'), 'stale', 'utf-8');
    await writeFile(join(dir, 'facet-cache.json'), JSON.stringify({
      ref: 'stale',
      resolvedSha: 'stale-sha',
      fetchedAt: '2020-01-01T00:00:00Z',
      repoUrl: gitRef.repoUrl,
    }), 'utf-8');

    // Act: refresh=true should clear cache and attempt re-fetch
    // Since we can't actually clone in unit tests, we expect it to throw
    // (no network access in unit test context)
    try {
      await resolveRemoteRef(gitRef, { refresh: true });
    } catch {
      // Expected: git clone will fail without network or fixture repo
    }

    // Assert: stale-file.txt was removed (cache was cleared)
    expect(existsSync(join(dir, 'stale-file.txt'))).toBe(false);
  });

  it('clears cache and re-fetches when manifest missing', async () => {
    // Arrange: cache dir exists but no manifest (corrupted)
    const key = cacheKey(gitRef.repoUrl, gitRef.ref);
    const dir = cacheDir(key, testCacheDir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'Report.tsx'), 'content', 'utf-8');
    // No facet-cache.json written

    // Act
    try {
      await resolveRemoteRef(gitRef);
    } catch {
      // Expected: git clone will fail
    }

    // The Report.tsx written above should be gone (cache cleared before re-fetch)
    expect(existsSync(join(dir, 'Report.tsx'))).toBe(false);
  });
});
