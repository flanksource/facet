/**
 * Bun-only asset embedding. Imported solely by the bun-compile entry
 * (cli.bun.ts) so the standalone binary carries styles.css, the vite loaders,
 * package.json and openapi.yaml inside its virtual filesystem.
 *
 * `with { type: 'file' }` is a Bun feature, not Node — this file is never part
 * of the Node/npm bundle (tsdown does not list it as an entry). It registers
 * the embedded /$bunfs paths so assetPath() resolves them instead of running
 * the import.meta.url filesystem search, which fails inside a compiled binary.
 */
// @ts-expect-error bun-only import attribute; values are paths into /$bunfs
import pkgJson from '../../../package.json' with { type: 'file' };
// @ts-expect-error bun-only import attribute
import openapi from '../../../openapi.yaml' with { type: 'file' };
// @ts-expect-error bun-only import attribute
import styles from '../../../src/styles.css' with { type: 'file' };
// @ts-expect-error bun-only import attribute
import ssrLoader from '../../vite-ssr-loader.ts' with { type: 'file' };
// @ts-expect-error bun-only import attribute
import devLoader from '../../vite-dev-loader.ts' with { type: 'file' };

import { registerEmbeddedAssets } from './assets.js';

registerEmbeddedAssets({
  'package.json': pkgJson,
  'openapi.yaml': openapi,
  'styles.css': styles,
  'vite-ssr-loader.ts': ssrLoader,
  'vite-dev-loader.ts': devLoader,
});
