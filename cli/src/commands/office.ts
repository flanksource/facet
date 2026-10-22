import type { Command } from 'commander';
import { parseRedactAllow } from '../builders/remark-config.js';
import { generateDOCX, generatePPTX } from '../generators/office.js';
import type { GenerateOptions, RenderFormat } from '../types.js';
import { Logger } from '../utils/logger.js';
import { resolveOutput } from '../utils/resolve-output.js';
import { renderWithServer, resolveFacetURL } from '../utils/server-render.js';

interface OfficeFlags {
  data?: string;
  dataLoader?: string;
  output: string;
  outputNameField: string;
  schema?: string;
  validate: boolean;
  verbose: number;
  refresh?: boolean;
  clearCache?: boolean;
  skipModules?: boolean;
  allow: string[];
  live?: boolean;
  postProcessCss?: boolean;
  fontSize?: number;
  sandbox?: string | boolean;
  facetUrl?: string;
}

export function registerOfficeCommands(options: {
  program: Command;
  addSharedOptions: (command: Command) => Command;
  ensureRenderReady: (format: RenderFormat, flags: Record<string, unknown>, logger: Logger) => Promise<void>;
  parseDataLoaderArgs: () => string[];
}): void {
  for (const format of ['docx', 'pptx'] as const) {
    options.addSharedOptions(options.program.command(`${format} <templates...>`)
      .description(format === 'docx' ? 'Generate editable Word documents' : 'Generate editable widescreen PowerPoint slides with automatic pagination')
      .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
      .option('--no-validate', 'Skip data validation'))
      .addHelpText('after', format === 'docx'
        ? '\nWord exports use Page/Header/Footer template props. Headers, footers, figures and diagrams are captured as PDF and PNG, then embedded as EMF pictures containing both representations. Page numbers stay native. PDF export rendering depends on the viewer. Ordinary images and logos remain images.\n'
        : '\nOffice exports use Page/Header/Footer template props. Complex visuals are embedded images. PPTX uses 16:9 slides and an 18pt default body size.\n')
      .action(async (templates: string[], _flags: OfficeFlags, command: Command) => {
        const flags = command.optsWithGlobals<OfficeFlags>();
        const logger = new Logger(flags.verbose);
        try {
          const facetURL = resolveFacetURL(flags.facetUrl);
          await options.ensureRenderReady(format, { ...flags, facetURL }, logger);
          for (const template of templates) {
            const { outputDir, outputName } = resolveOutput(flags.output);
            const generateOptions: GenerateOptions = {
              template, data: flags.data, dataLoader: flags.dataLoader, dataLoaderArgs: options.parseDataLoaderArgs(),
              outputDir, outputName: templates.length === 1 ? outputName : undefined,
              outputNameField: flags.outputNameField, schema: flags.schema, validate: flags.validate, verbose: flags.verbose,
              refresh: flags.refresh, clearCache: flags.clearCache, skipModules: flags.skipModules,
              redact: parseRedactAllow(flags.allow), live: flags.live, postProcessCss: flags.postProcessCss,
              fontSize: flags.fontSize, sandbox: flags.sandbox,
            };
            if (facetURL) await renderWithServer({ facetURL, format, options: generateOptions });
            else await (format === 'docx' ? generateDOCX : generatePPTX)(generateOptions);
          }
        } catch (error) {
          logger.error(`${format.toUpperCase()} generation failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exitCode = 1;
        }
      });
  }
}
