import { createUnplugin } from 'unplugin';
import { readFile } from 'fs/promises';
import { join, resolve, extname, basename } from 'path';
import { CarbonCache } from './cache';
import { generateCarbonScreenshot } from './carbon';
import type { CarbonLoaderOptions } from './types';

export const unpluginFactory = createUnplugin((options: CarbonLoaderOptions = {}) => {
  const {
    outputDir = 'assets/carbon-screenshots',
    cacheDir = '.cache/carbon-loader',
    carbonOptions = {}
  } = options;

  const cache = new CarbonCache(cacheDir);
  let cacheInitialized = false;

  return {
    name: 'unplugin-carbon',

    async buildStart() {
      if (!cacheInitialized) {
        await cache.init();
        cacheInitialized = true;
      }
    },

    async load(id: string) {
      const [filePath, query] = id.split('?');

      if (!query || !query.includes('carbon')) {
        return null;
      }

      try {
        const sourceCode = await readFile(filePath, 'utf-8');

        let screenshotPath = await cache.get(filePath, sourceCode);

        if (!screenshotPath) {
          const ext = extname(filePath);
          const name = basename(filePath, ext);
          const hash = require('crypto')
            .createHash('sha256')
            .update(sourceCode)
            .digest('hex')
            .substring(0, 8);

          const filename = `${name}-${hash}.png`;
          const absoluteOutputPath = resolve(outputDir, filename);

          screenshotPath = await generateCarbonScreenshot(
            sourceCode,
            absoluteOutputPath,
            carbonOptions
          );

          await cache.set(filePath, sourceCode, screenshotPath);
        }

        const relativePath = `/${outputDir}/${basename(screenshotPath)}`;

        return `export default ${JSON.stringify(relativePath)}`;
      } catch (error) {
        console.error(`Failed to generate carbon screenshot for ${filePath}:`, error);
        throw error;
      }
    },
  };
});

export default unpluginFactory;
export const CarbonLoader = unpluginFactory.vite;
export const CarbonWebpackLoader = unpluginFactory.webpack;
export const CarbonRollupLoader = unpluginFactory.rollup;
