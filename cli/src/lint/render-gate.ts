import { runLint, type LintLogger } from './index.js';
import type { ExternalToolRunner } from './external-runner.js';

export interface LintBeforeRenderOptions {
  templates: string[];
  verbose: boolean;
  logger: LintLogger;
  cwd?: string;
  runner?: ExternalToolRunner;
}

/** `--lint` on html/png/pdf: print the lint report; warnings pass, any error throws so rendering is skipped. */
export async function lintBeforeRender({ templates, verbose, logger, cwd, runner }: LintBeforeRenderOptions): Promise<void> {
  const exitCode = await runLint({ paths: templates, verbose, severity: 'warning', failOnSeverity: 'error', logger, cwd, runner });
  if (exitCode !== 0) throw new Error('lint reported errors, rendering skipped');
}
