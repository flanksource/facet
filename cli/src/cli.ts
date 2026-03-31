#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from './utils/logger.js';
import { resolveOutput } from './utils/resolve-output.js';
import { VERSION, BUILD_DATE, GIT_COMMIT } from './version-generated.js';
import type { PDFMargins } from './utils/pdf-generator.js';
import type { PDFEncryptionOptions, PDFSignatureOptions } from './utils/pdf-security.js';

function parseDataLoaderArgs(): string[] {
  const dashIndex = process.argv.indexOf('--');
  return dashIndex !== -1 ? process.argv.slice(dashIndex + 1) : [];
}

function buildMargins(options: any): PDFMargins | undefined {
  const m: PDFMargins = {};
  if (options.marginTop != null) m.top = options.marginTop;
  if (options.marginBottom != null) m.bottom = options.marginBottom;
  if (options.marginLeft != null) m.left = options.marginLeft;
  if (options.marginRight != null) m.right = options.marginRight;
  return Object.keys(m).length > 0 ? m : undefined;
}

function buildEncryption(options: any): PDFEncryptionOptions | undefined {
  if (!options.ownerPassword) return undefined;
  return {
    ownerPassword: options.ownerPassword,
    userPassword: options.userPassword,
    permissions: {
      print: options.print ?? true,
      copy: options.copy ?? true,
    },
  };
}

function buildSignature(options: any): PDFSignatureOptions | undefined {
  if (!options.signCert && !options.selfSigned && !options.timestampUrl) return undefined;
  return {
    certPath: options.signCert,
    certPassword: options.signPassword ?? '',
    selfSigned: options.selfSigned ?? false,
    reason: options.signReason,
    name: options.signName,
    timestampUrl: options.timestampUrl,
  };
}

function addSharedOptions(cmd: Command): Command {
  return cmd
    .option('-d, --data <file>', 'Path to JSON data file')
    .option('-l, --data-loader <file>', 'Path to data loader module (.ts or .js)')
    .option('-o, --output <path>', 'Output file path or directory', '.')
    .option('--output-name-field <field>', 'Data field to use for output filename', 'name')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('--refresh', 'Force re-fetch of remote template (bypass cache)')
    .option('--sandbox [settings]', 'Enable sandbox via srt (optionally specify settings file path)');
}

const program = new Command();

const versionStr = BUILD_DATE === 'dev'
  ? `${VERSION} (dev)`
  : `${VERSION} (${BUILD_DATE}${GIT_COMMIT ? ` ${GIT_COMMIT}` : ''})`;

program
  .name('facet')
  .description('Build beautiful datasheets and PDFs from React templates')
  .version(versionStr)
  .hook('preAction', () => {
    console.log(chalk.gray(`facet ${versionStr}`));
  });

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

      const { generateHTML } = await import('./generators/html.js');
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
        sandbox: options.sandbox,
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
    .option('--page-size <size>', 'Default page size (a4, a3, letter, legal, fhd, qhd, wqhd, 4k, 5k, 16k)', 'a4')
    .option('--landscape', 'Use landscape orientation')
    .option('--margin-top <mm>', 'Top margin in mm', parseFloat)
    .option('--margin-bottom <mm>', 'Bottom margin in mm', parseFloat)
    .option('--margin-left <mm>', 'Left margin in mm', parseFloat)
    .option('--margin-right <mm>', 'Right margin in mm', parseFloat)
    .option('--header <file>', 'Header template file (.tsx)')
    .option('--footer <file>', 'Footer template file (.tsx)')
    .option('--user-password <password>', 'PDF password required to open')
    .option('--owner-password <password>', 'PDF owner password (controls permissions)')
    .option('--no-print', 'Disable printing permission')
    .option('--no-copy', 'Disable copy permission')
    .option('--sign-cert <path>', 'Path to PKCS#12 (.p12/.pfx) certificate')
    .option('--sign-password <password>', 'Certificate password')
    .option('--self-signed', 'Auto-generate a self-signed certificate for signing')
    .option('--sign-reason <reason>', 'Signature reason text')
    .option('--sign-name <name>', 'Signer name')
    .option('--timestamp-url <url>', 'RFC 3161 Timestamp Authority URL')
).action(async (templates: string[], options: any) => {
  const logger = new Logger(options.verbose);
  try {
    for (const template of templates) {
      logger.info(`Generating PDF from template: ${template}`);
      const { outputDir, outputName } = resolveOutput(options.output);

      const { generatePDF } = await import('./generators/pdf.js');
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
        pageSize: options.pageSize,
        landscape: options.landscape,
        margins: buildMargins(options),
        header: options.header,
        footer: options.footer,
        encryption: buildEncryption(options),
        signature: buildSignature(options),
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
  .option('-p, --port <number>', 'Server port', '3010')
  .option('--templates-dir <dir>', 'Directory containing templates', '.')
  .option('--workers <count>', 'Number of browser workers', '2')
  .option('--timeout <ms>', 'Render timeout in milliseconds', '60000')
  .option('--api-key <key>', 'API key for authentication')
  .option('--max-upload <bytes>', 'Max upload size in bytes', '52428800')
  .option('--cache-max-size <bytes>', 'Max render cache size in bytes', '104857600')
  .option('--s3-endpoint <url>', 'S3 endpoint URL')
  .option('--s3-bucket <name>', 'S3 bucket name')
  .option('--s3-region <region>', 'S3 region', 'us-east-1')
  .option('--s3-prefix <prefix>', 'S3 key prefix')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--sandbox [settings]', 'Enable sandbox via srt (optionally specify settings file path)')
  .action(async (options: any) => {
    const logger = new Logger(options.verbose);
    try {
      const { startServer } = await import('./server/preview.js');
      await startServer({
        port: options.port,
        templatesDir: options.templatesDir,
        workers: options.workers,
        timeout: options.timeout,
        apiKey: options.apiKey,
        maxUpload: options.maxUpload,
        cacheMaxSize: options.cacheMaxSize,
        verbose: options.verbose,
        s3Endpoint: options.s3Endpoint,
        s3Bucket: options.s3Bucket,
        s3Region: options.s3Region,
        s3Prefix: options.s3Prefix,
        sandbox: options.sandbox,
      });
    } catch (error) {
      logger.error(`Server failed: ${error instanceof Error ? error.message : String(error)}`);
      if (options.verbose && error instanceof Error && error.stack) {
        logger.debug(error.stack);
      }
      process.exit(1);
    }
  });

// lint command
program
  .command('lint [paths...]')
  .description('Scan TSX files for styling, CSS, and page layout issues')
  .option('-v, --verbose', 'Show detailed output including passing files')
  .option('--rule <name>', 'Run only a specific rule')
  .option('--severity <level>', 'Minimum severity to report (warning, error)', 'warning')
  .action(async (paths: string[], options: any) => {
    const logger = new Logger(options.verbose);
    try {
      const { runLint } = await import('./lint/index.js');
      const exitCode = await runLint({
        paths: paths.length > 0 ? paths : ['.'],
        verbose: options.verbose,
        rule: options.rule,
        severity: options.severity,
        logger,
      });
      process.exit(exitCode);
    } catch (error) {
      logger.error(`Lint failed: ${error instanceof Error ? error.message : String(error)}`);
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
