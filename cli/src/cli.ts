#!/usr/bin/env node

import { Command } from 'commander';
import { generatePDF } from './generators/pdf.js';
import { generateHTML } from './generators/html.js';
import { generateWebComponent } from './generators/webcomponent.js';
import { startPreviewServer } from './server/preview.js';
import { Logger } from './utils/logger.js';
import { resolveOutput } from './utils/resolve-output.js';
import { basename } from 'path';

/**
 * Parse arguments after -- in process.argv
 * Example: facet generate pdf -t template.tsx --data-loader script.ts -- arg1 arg2
 * Returns: ['arg1', 'arg2']
 */
function parseDataLoaderArgs(): string[] {
  const dashIndex = process.argv.indexOf('--');
  return dashIndex !== -1 ? process.argv.slice(dashIndex + 1) : [];
}

const program = new Command();

program
  .name('facet')
  .description('Build beautiful datasheets and PDFs from React templates')
  .version('1.0.1');

// Build command - build HTML datasheet using generators
program
  .command('build <template>')
  .description('Build HTML datasheet from template')
  .requiredOption('-d, --data <file>', 'Path to JSON data file')
  .option('--data-loader <script>', 'Path to custom data loader script')
  .option('-o, --output <path>', 'Output file path or directory', 'dist')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--css-scope <prefix>', 'CSS scope prefix for scoped HTML generation')
  .action(async (template, options) => {
    const logger = new Logger(options.verbose);

    try {
      logger.info(`Building datasheet from template: ${template}`);

      const variant = basename(template, '.tsx').replace(/^DatasheetApp-/, '');
      const dataLoaderArgs = parseDataLoaderArgs();
      const { outputDir, outputName } = resolveOutput(options.output);

      await generateHTML({
        template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs,
        outputDir,
        outputName,
        outputNameField: variant,
        cssScope: options.cssScope,
        validate: false,
        verbose: options.verbose,
      });

      logger.success('Build completed!');
      process.exit(0);
    } catch (error) {
      logger.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
      if (options.verbose && error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

// PDF command - generate PDF from template
program
  .command('pdf <template>')
  .description('Generate PDF from template')
  .requiredOption('-d, --data <file>', 'Path to JSON data file')
  .option('--data-loader <script>', 'Path to custom data loader script')
  .option('-o, --output <path>', 'Output file path or directory', 'dist')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (template, options) => {
    const logger = new Logger(options.verbose);

    try {
      logger.info(`Generating PDF from template: ${template}`);

      const variant = basename(template, '.tsx').replace(/^DatasheetApp-/, '');
      const dataLoaderArgs = parseDataLoaderArgs();
      const { outputDir, outputName } = resolveOutput(options.output);

      await generatePDF({
        template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs,
        outputDir,
        outputName,
        outputNameField: variant,
        validate: false,
        verbose: options.verbose,
      });

      logger.success('PDF generation completed!');
      process.exit(0);
    } catch (error) {
      logger.error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (options.verbose && error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

// Generate PDF command
program
  .command('generate')
  .description('Generate output from React template')
  .argument('<type>', 'Output type: pdf, html, webcomponent, or all')
  .requiredOption('-t, --template <file>', 'Path to React template file (.tsx)')
  .option('-d, --data <file>', 'Path to JSON data file')
  .option('-l, --data-loader <file>', 'Path to data loader module (.ts or .js)')
  .option('-o, --output <path>', 'Output file path or directory', './output')
  .option('--output-name-field <field>', 'Data field to use for output filename', 'name')
  .option('--css-scope <prefix>', 'CSS scope prefix for webcomponent mode')
  .option('-s, --schema <file>', 'Path to JSON Schema file for data validation')
  .option('--src-dir <dir>', 'Source directory containing components, styles, and assets to copy')
  .option('--no-validate', 'Skip data validation')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (type, options) => {
    const logger = new Logger(options.verbose);

    try {
      // Validate required options
      if (!options.data && !options.dataLoader) {
        logger.error('Either --data or --data-loader must be provided');
        process.exit(2);
      }

      if (options.data && options.dataLoader) {
        logger.error('Cannot use both --data and --data-loader');
        process.exit(2);
      }

      const validTypes = ['pdf', 'html', 'webcomponent', 'all'];
      if (!validTypes.includes(type)) {
        logger.error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        process.exit(2);
      }

      logger.info(`Generating ${type} from template: ${options.template}`);

      const dataLoaderArgs = parseDataLoaderArgs();
      const { outputDir, outputName } = resolveOutput(options.output);

      const generateOptions = {
        template: options.template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs,
        outputDir,
        outputName,
        outputNameField: options.outputNameField,
        cssScope: options.cssScope,
        schema: options.schema,
        srcDir: options.srcDir,
        validate: options.validate,
        verbose: options.verbose,
      };

      if (type === 'pdf' || type === 'all') {
        await generatePDF(generateOptions);
        logger.success('PDF generated successfully');
      }

      if (type === 'html' || type === 'all') {
        await generateHTML(generateOptions);
        logger.success('HTML generated successfully');
      }

      if (type === 'webcomponent' || type === 'all') {
        await generateWebComponent(generateOptions);
        logger.success('WebComponent generated successfully');
      }

      process.exit(0);
    } catch (error) {
      logger.error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (options.verbose && error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

// Preview server command
program
  .command('serve')
  .description('Start preview server with live editing')
  .requiredOption('-t, --template <file>', 'Path to React template file (.tsx)')
  .option('-d, --data <file>', 'Path to JSON data file')
  .option('-l, --data-loader <file>', 'Path to data loader module (.ts or .js)')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options) => {
    const logger = new Logger(options.verbose);

    try {
      // Validate required options
      if (!options.data && !options.dataLoader) {
        logger.error('Either --data or --data-loader must be provided');
        process.exit(2);
      }

      if (options.data && options.dataLoader) {
        logger.error('Cannot use both --data and --data-loader');
        process.exit(2);
      }

      logger.info(`Starting preview server on port ${options.port}`);

      const dataLoaderArgs = parseDataLoaderArgs();

      await startPreviewServer({
        template: options.template,
        data: options.data,
        dataLoader: options.dataLoader,
        dataLoaderArgs,
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

// Error handler for unknown commands
program.on('command:*', () => {
  console.error('Invalid command. See --help for available commands.');
  process.exit(2);
});

program.parse();
