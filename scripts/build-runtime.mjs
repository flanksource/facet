import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const libraryDir = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let basePath;
try {
  basePath = require.resolve('@flanksource/clicky-ui/runtime/importmap.json');
  accessSync(basePath, constants.R_OK);
} catch (cause) {
  throw new Error('Facet runtime requires @flanksource/clicky-ui >=0.3.57 shipping runtime/importmap.json; install a version with the library runtime set and build it first when linked locally.', { cause });
}

const result = spawnSync(process.execPath, [
  '--import', require.resolve('tsx'),
  join(dirname(require.resolve('@flanksource/page-runtime/build')), '../../scripts/build-library-runtime.ts'),
  libraryDir, basePath,
], { cwd: libraryDir, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status === null) throw new Error(`Facet runtime build terminated by ${result.signal}`);
process.exitCode = result.status;
