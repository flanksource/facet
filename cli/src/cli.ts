#!/usr/bin/env node

import { Command } from 'commander';
import { generatePDF } from './generators/pdf.js';
import { generateHTML } from './generators/html.js';
import { startServer } from './server/preview.js';
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
    .option('-o, --output <path>', 'Output file path or directory', '.')
    .option('--output-name-field <field>', 'Data field to use for output filename', 'name')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--refresh', 'Force re-fetch of remote template (bypass cache)');
}

const program = new Command();

program
  .name('facet')
  .description('Build beautiful datasheets and PDFs from React templates')
  .version('1.0.1');

// html command
addSharedOptions(
  program
    .command('html <templates...>')
    .description('Generate HTML from one or more templates')
    .option('--css-scope <prefix>', 'CSS scope prefix for scoped HTML generation')
    .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
    .option('--no-validate', 'Skip data validation')
).action(async (templates: string[], options: any) => {
  const logger = new Logger(options.verbose);
  try {
    for (const template of templates) {
      logger.info(`Generating HTML from template: ${template}`);
      const { outputDir, outputName } = resolveOutput(options.output);

      await generateHTML({
        template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs: parseDataLoaderArgs(),
        outputDir,
        outputName: templates.length === 1 ? outputName : undefined,
        outputNameField: options.outputNameField,
        cssScope: options.cssScope,
        schema: options.schema,
        validate: options.validate,
        verbose: options.verbose,
        refresh: options.refresh,
      });
    }

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
    .command('pdf <templates...>')
    .description('Generate PDF from one or more templates')
    .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
    .option('--no-validate', 'Skip data validation')
    .option('--debug', 'Add colored debug overlay lines for header/footer zones')
).action(async (templates: string[], options: any) => {
  const logger = new Logger(options.verbose);
  try {
    for (const template of templates) {
      logger.info(`Generating PDF from template: ${template}`);
      const { outputDir, outputName } = resolveOutput(options.output);

      await generatePDF({
        template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs: parseDataLoaderArgs(),
        outputDir,
        outputName: templates.length === 1 ? outputName : undefined,
        outputNameField: options.outputNameField,
        schema: options.schema,
        validate: options.validate,
        verbose: options.verbose,
        refresh: options.refresh,
        debug: options.debug,
      });
    }

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
program
  .command('serve')
  .description('Start API server for rendering templates')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('--templates-dir <dir>', 'Directory containing templates', '.')
  .option('--workers <count>', 'Number of browser workers', '2')
  .option('--timeout <ms>', 'Render timeout in milliseconds', '60000')
  .option('--api-key <key>', 'API key for authentication')
  .option('--max-upload <bytes>', 'Max upload size in bytes', '52428800')
  .option('--s3-endpoint <url>', 'S3 endpoint URL')
  .option('--s3-bucket <name>', 'S3 bucket name')
  .option('--s3-region <region>', 'S3 region', 'us-east-1')
  .option('--s3-prefix <prefix>', 'S3 key prefix')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: any) => {
    const logger = new Logger(options.verbose);
    try {
      await startServer({
        port: options.port,
        templatesDir: options.templatesDir,
        workers: options.workers,
        timeout: options.timeout,
        apiKey: options.apiKey,
        maxUpload: options.maxUpload,
        verbose: options.verbose,
        s3Endpoint: options.s3Endpoint,
        s3Bucket: options.s3Bucket,
        s3Region: options.s3Region,
        s3Prefix: options.s3Prefix,
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
