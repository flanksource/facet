import { startViteServer } from '../src/bundler/vite-server.js';
import { Logger } from '../src/utils/logger.js';

const templatePath = process.argv[2];
if (!templatePath) throw new Error('Usage: pnpm exec tsx cli/scripts/preview-runtime.ts <template.tsx>');
const server = await startViteServer({ consumerRoot: process.cwd(), templatePath, data: {}, skipModules: true, logger: new Logger(false) });
process.stdout.write(`${JSON.stringify({ url: server.url })}\n`);
const stop = async () => { await server.close(); process.exit(0); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
