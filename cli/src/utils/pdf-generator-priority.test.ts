import puppeteer from 'puppeteer-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBrowserLaunchOptions } from './pdf-generator.js';

describe('buildBrowserLaunchOptions', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('preserves Puppeteer defaults behind the macOS priority wrappers', () => {
    vi.stubEnv('FACET_LOW_PRIORITY', '1');
    const chromePath = '/Applications/Chromium.app/Contents/MacOS/Chromium';
    const chromeArgs = puppeteer.defaultArgs({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    expect(buildBrowserLaunchOptions({ chromePath, platform: 'darwin' })).toEqual({
      executablePath: '/usr/bin/nice',
      ignoreDefaultArgs: true,
      args: ['-n', '10', chromePath, ...chromeArgs],
    });
  });
});
