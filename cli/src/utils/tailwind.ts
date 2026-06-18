/**
 * Tailwind CSS invocation.
 *
 * `tailwindcss` is installed into `.facet/node_modules/.bin/` by the facet-directory
 * builder. We invoke that binary directly instead of going through `pnpm exec`, so a
 * render does not need pnpm on PATH at runtime — only at install time.
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

export class TailwindBinNotFoundError extends Error {
  constructor(public readonly expectedPath: string) {
    super(
      `tailwindcss binary not found at ${expectedPath}. ` +
      `Run a render to populate \`.facet/node_modules\`, or \`cd .facet && pnpm install\`.`
    );
    this.name = 'TailwindBinNotFoundError';
  }
}

/**
 * Resolve the tailwindcss binary path inside a `.facet/` directory.
 * Does not check existence — call `tailwindBinExists()` for that.
 */
export function resolveTailwindBin(facetRoot: string): string {
  const name = process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss';
  return join(facetRoot, 'node_modules', '.bin', name);
}

export function tailwindBinExists(facetRoot: string): boolean {
  return existsSync(resolveTailwindBin(facetRoot));
}

export interface RunTailwindOptions {
  facetRoot: string;
  stylesInput: string;
  contentPath: string;
  outputCssPath: string;
  verbose?: boolean;
}

/**
 * Invoke the locally-installed tailwindcss CLI.
 *
 * Throws `TailwindBinNotFoundError` if the binary is missing; throws other errors
 * verbatim from the subprocess. Callers should catch and decide whether to fall
 * back (e.g. to Vite-generated CSS) or surface the failure.
 */
export async function runTailwind(opts: RunTailwindOptions): Promise<void> {
  const bin = resolveTailwindBin(opts.facetRoot);
  if (!existsSync(bin)) {
    throw new TailwindBinNotFoundError(bin);
  }
  const cmd = $`${bin} -i ${opts.stylesInput} --content ${opts.contentPath} -o ${opts.outputCssPath}`;
  if (opts.verbose) {
    await cmd;
  } else {
    await cmd.quiet();
  }
}
