import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import type { GenerateOptions } from '../types.js';
import { DataLoader } from './data-loader.js';
import { DataValidator } from './validator.js';
import { Logger } from './logger.js';
import { scopeHTML } from './css-scoper.js';
import { applyPDFSecurity } from './pdf-security.js';
import { resolveTemplateSource } from './template-source.js';
import { runLowPriority } from './subprocess-priority.js';

const archiveExcludes = [
  '.git', '.facet', '.gavel', '.task', '.tmp', 'node_modules',
  'dist', 'dist-*', 'npm-dist', 'coverage', '.DS_Store',
];

export interface ServerRenderOptions {
  facetURL: string;
  format: 'html' | 'pdf';
  options: GenerateOptions;
}

export function resolveFacetURL(flag?: string, environment = process.env['FACET_URL']): string | undefined {
  const value = flag?.trim() || environment?.trim();
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Facet URL must use http or https: ${value}`);
  }
  return url.toString().replace(/\/$/, '');
}

function rejectLocalOnlyOptions(options: GenerateOptions): void {
  const unsupported = [
    options.clearCache ? '--clear-cache' : undefined,
    options.skipModules ? '--skip-modules' : undefined,
    options.sandbox ? '--sandbox' : undefined,
  ].filter((option): option is string => option != null);
  if (unsupported.length > 0) {
    throw new Error(`${unsupported.join(', ')} cannot be used with --facet-url; configure these on the Facet server`);
  }
}

async function createProjectArchive(template: string, options: GenerateOptions): Promise<{
  archive: Buffer;
  entryFile: string;
}> {
  const source = await resolveTemplateSource(template, {
    refresh: options.refresh,
    verbose: Boolean(options.verbose),
  });
  const absoluteTemplate = resolve(source.consumerRoot ?? process.cwd(), source.templatePath);
  const consumerRoot = source.consumerRoot ?? (absoluteTemplate.startsWith(`${resolve(process.cwd())}${sep}`)
    ? resolve(process.cwd())
    : dirname(absoluteTemplate));
  const entryFile = relative(consumerRoot, absoluteTemplate).split(sep).join('/');
  if (!entryFile || entryFile === '..' || entryFile.startsWith('../')) {
    throw new Error(`Template must be inside its project root: ${template}`);
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'facet-upload-'));
  const archivePath = join(temporaryDirectory, 'project.tar.gz');
  try {
    await runLowPriority({
      command: 'tar',
      args: [
        '-czf', archivePath,
        ...archiveExcludes.map((pattern) => `--exclude=${pattern}`),
        '-C', consumerRoot,
        '.',
      ],
    });
    return { archive: await readFile(archivePath), entryFile };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function serverError(response: Response): Promise<Error> {
  const text = await response.text();
  let message = text || response.statusText;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    message = parsed.error?.message || message;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return new Error(`Facet server returned ${response.status}: ${message}`);
}

async function checkedFetch(url: URL, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`Failed to reach Facet server at ${url.origin}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw await serverError(response);
  return response;
}

async function readOptionalFile(path?: string): Promise<string | undefined> {
  return path ? readFile(resolve(path), 'utf-8') : undefined;
}

export async function renderWithServer({ facetURL, format, options }: ServerRenderOptions): Promise<void> {
  rejectLocalOnlyOptions(options);
  const logger = new Logger(options.verbose);
  const dataLoader = new DataLoader(logger);
  const { data, outputName } = await dataLoader.load(options);
  if (options.validate && options.schema) {
    await new DataValidator(logger).validate(data, options.schema);
  }

  const { archive, entryFile } = await createProjectArchive(options.template, options);
  const form = new FormData();
  form.set('archive', new Blob([new Uint8Array(archive)], { type: 'application/gzip' }), 'project.tar.gz');
  form.set('data', JSON.stringify(data));
  form.set('options', JSON.stringify({
    format,
    entryFile,
    filename: `${outputName}.${format}`,
    live: options.live,
    postProcessCss: options.postProcessCss,
    headerCode: await readOptionalFile(options.header),
    footerCode: await readOptionalFile(options.footer),
    pdfOptions: format === 'pdf' ? {
      defaultPageSize: options.pageSize,
      landscape: options.landscape,
      margins: options.margins,
      debug: options.debug,
      debugTypography: options.debugTypography,
      fontSize: options.fontSize,
    } : undefined,
  }));

  const renderURL = new URL('/render', `${facetURL}/`);
  logger.info(`Submitting ${basename(options.template)} to ${renderURL.origin}`);
  const response = await checkedFetch(renderURL, { method: 'POST', body: form });
  let output: Buffer | string;
  if (format === 'html') {
    const html = await response.text();
    output = options.cssScope ? scopeHTML(html, { scopeClass: options.cssScope }) : html;
  } else {
    const result = await response.json() as { url?: unknown };
    if (typeof result.url !== 'string' || !result.url) {
      throw new Error('Facet server PDF response did not include a result URL');
    }
    const pdfResponse = await checkedFetch(new URL(result.url, renderURL));
    output = Buffer.from(await pdfResponse.arrayBuffer());
    if (options.encryption || options.signature) {
      output = await applyPDFSecurity(output, {
        encryption: options.encryption,
        signature: options.signature,
      });
    }
  }

  const outputDirectory = resolve(process.cwd(), options.outputDir);
  const finalOutputName = options.outputName ?? outputName;
  const outputPath = join(outputDirectory, `${finalOutputName}.${format}`);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, output);
  logger.success(`${format.toUpperCase()} generated by Facet server: ${outputPath}`);
}
