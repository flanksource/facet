import { createImporter } from '@oxc-node/core/importer';
import { pathToFileURL } from 'node:url';

const [, , entry, ...args] = process.argv;
if (!entry) throw new Error('Missing Facet source entry');
process.argv = [process.execPath, entry, ...args];
await createImporter(pathToFileURL(entry), { interopDefault: false }).import(pathToFileURL(entry));
