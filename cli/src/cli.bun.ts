/**
 * Entry point for the bun-compiled standalone binary.
 *
 * Registers the embedded assets (side-effect import) before delegating to the
 * normal CLI. The npm package uses src/cli.ts directly; only `bun build
 * --compile` targets this file.
 */
import './utils/assets.bun.js';
import './cli.js';
