#!/usr/bin/env node

import { Command } from 'commander';
import { generatePDF } from './generators/pdf.js';
import { generateHTML } from './generators/html.js';
import { startPreviewServer } from './server/preview.js';
import { Logger } from './utils/logger.js';
import { resolveOutput } from './utils/resolve-output.js';

function parseDataLoaderArgs(): string[] {
  const dashIndex = process.argv.indexOf('--');
  return dashIndex !== -1 ? process.argv.slice(dashIndex + 1) : [];
}

function addSharedOptions(cmd: Command): Command {
  return cmd
    .option('-d, --data <file>', 'Path to JSON data file')
    .option('-l, --data-loader <file>', 'Path to data loader module (.ts or .js)')
    .option('-o, --output <path>', 'Output file path or directory', 'dist')
    .option('--output-name-field <field>', 'Data field to use for output filename', 'name')
    .option('-v, --verbose', 'Enable verbose logging');
}

const program = new Command();

program
  .name('facet')
  .description('Build beautiful datasheets and PDFs from React templates')
  .version('1.0.1');

// html command
addSharedOptions(
  program
    .command('html <template>')
    .description('Generate HTML from template')
    .option('--css-scope <prefix>', 'CSS scope prefix for scoped HTML generation')
    .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
    .option('--no-validate', 'Skip data validation')
).action(async (template: string, options: any) => {
  const logger = new Logger(options.verbose);
  try {
    logger.info(`Generating HTML from template: ${template}`);
    const { outputDir, outputName } = resolveOutput(options.output);

    await generateHTML({
      template,
      data: options.data,
      dataLoader: options.dataLoader,
      dataLoaderArgs: parseDataLoaderArgs(),
      outputDir,
      outputName,
      outputNameField: options.outputNameField,
      cssScope: options.cssScope,
      schema: options.schema,
      validate: options.validate,
      verbose: options.verbose,
    });

    logger.success('HTML generated!');
    process.exit(0);
  } catch (error) {
    logger.error(`HTML generation failed: ${error instanceof Error ? error.message : String(error)}`);
    if (options.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
});

// pdf command
addSharedOptions(
  program
    .command('pdf <template>')
    .description('Generate PDF from template')
    .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
    .option('--no-validate', 'Skip data validation')
).action(async (template: string, options: any) => {
  const logger = new Logger(options.verbose);
  try {
    logger.info(`Generating PDF from template: ${template}`);
    const { outputDir, outputName } = resolveOutput(options.output);

    await generatePDF({
      template,
      data: options.data,
      dataLoader: options.dataLoader,
      dataLoaderArgs: parseDataLoaderArgs(),
      outputDir,
      outputName,
      outputNameField: options.outputNameField,
      schema: options.schema,
      validate: options.validate,
      verbose: options.verbose,
    });

    logger.success('PDF generated!');
    process.exit(0);
  } catch (error) {
    logger.error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
    if (options.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
});

// serve command
addSharedOptions(
  program
    .command('serve <template>')
    .description('Start preview server with live editing')
    .option('-p, --port <number>', 'Server port', '3000')
).action(async (template: string, options: any) => {
  const logger = new Logger(options.verbose);
  try {
    logger.info(`Starting preview server on port ${options.port}`);

    await startPreviewServer({
      template,
      data: options.data,
      dataLoader: options.dataLoader,
      dataLoaderArgs: parseDataLoaderArgs(),
      port: parseInt(options.port, 10),
      verbose: options.verbose,
    });
  } catch (error) {
    logger.error(`Server failed: ${error instanceof Error ? error.message : String(error)}`);
    if (options.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
});

program.on('command:*', () => {
  console.error('Invalid command. See --help for available commands.');
  process.exit(2);
});

program.parse();
