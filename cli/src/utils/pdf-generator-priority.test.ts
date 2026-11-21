import puppeteer from 'puppeteer-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBrowserLaunchOptions } from './pdf-generator.js';

describe('buildBrowserLaunchOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it('awaits Puppeteer defaults behind the macOS priority wrappers', async () => {
    vi.stubEnv('FACET_LOW_PRIORITY', '1');
    const chromePath = '/Applications/Chromium.app/Contents/MacOS/Chromium';
    const chromeArgs = ['--headless=new', '--no-sandbox', '--disable-setuid-sandbox'];
    vi.spyOn(puppeteer, 'defaultArgs').mockResolvedValue(chromeArgs);

    await expect(buildBrowserLaunchOptions({ chromePath, platform: 'darwin' })).resolves.toEqual({
      executablePath: '/usr/bin/nice',
      ignoreDefaultArgs: true,
      args: ['-n', '10', chromePath, ...chromeArgs],
    });
  });
});
