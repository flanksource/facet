import { accessSync, constants, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildLibraryRuntime } from '@flanksource/page-runtime/build';

const libraryDir = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let basePath;
try {
  basePath = require.resolve('@flanksource/clicky-ui/runtime/importmap.json');
  accessSync(basePath, constants.R_OK);
} catch (cause) {
  throw new Error('Facet runtime requires @flanksource/clicky-ui >=0.3.57 shipping runtime/importmap.json; install a version with the library runtime set and build it first when linked locally.', { cause });
}

await buildLibraryRuntime({ libraryDir, outDir: fileURLToPath(new URL('../dist/runtime/', import.meta.url)), base: JSON.parse(readFileSync(basePath, 'utf8')) });
