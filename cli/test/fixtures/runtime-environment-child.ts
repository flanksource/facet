import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureEnvironment } from '../../src/runtime/environment.js';
import { Logger } from '../../src/utils/logger.js';

const cacheRoot = process.argv[2];
if (!cacheRoot) throw new Error('Missing runtime test cache');
await ensureEnvironment({
  cacheRoot,
  manifest: { dependencies: { react: '18.3.1' } },
  npmrc: '',
  logger: new Logger(false),
  install: async root => {
    appendFileSync(join(cacheRoot, 'installations'), `${process.pid}\n`);
    await new Promise(resolve => setTimeout(resolve, 100));
    mkdirSync(join(root, 'node_modules/react'), { recursive: true });
    writeFileSync(join(root, 'node_modules/react/package.json'), '{"version":"18.3.1"}');
    writeFileSync(join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    return '11.22.0';
  },
});
