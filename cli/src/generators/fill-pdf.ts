import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, join, basename, extname } from 'path';
import { Logger } from '../utils/logger.js';
import { fillPdfFormFromSchema, type JsonSchema } from '../utils/pdf-form-fill.js';

export interface FillPdfOptions {
  // Path to the template/companion PDF that carries the blank AcroForm fields.
  template: string;
  // Path to the JSON document whose values are written into the form.
  data?: string;
  // Path to the JSON Schema whose `x-pdf-field` annotations map json paths to
  // AcroForm field names. Required: it is the source of truth for the mapping.
  schema?: string;
  outputDir: string;
  outputName?: string;
  verbose: boolean;
}

// generateFilledPdf fills the AcroForm fields of a template PDF with values from
// a JSON document, using the JSON Schema's `x-pdf-field` annotations to map
// values to fields, and writes the filled PDF. Returns the output path.
export async function generateFilledPdf(options: FillPdfOptions): Promise<string> {
  const logger = new Logger(options.verbose);

  if (!options.schema) {
    throw new Error('fill-pdf requires --schema <file> (JSON Schema with x-pdf-field annotations)');
  }
  if (!options.data) {
    throw new Error('fill-pdf requires --data <file> (JSON document to fill the form with)');
  }

  const pdfBytes = await readFile(resolve(process.cwd(), options.template));
  const schema = JSON.parse(await readFile(resolve(process.cwd(), options.schema), 'utf-8')) as JsonSchema;
  const data = JSON.parse(await readFile(resolve(process.cwd(), options.data), 'utf-8'));

  logger.info('Filling PDF form fields...');
  const result = await fillPdfFormFromSchema(pdfBytes, schema, data);

  for (const w of result.warnings) {
    logger.warn(`${w.fieldName} (${w.jsonPath}): ${w.message}`);
  }

  const outputDir = resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });
  const baseName = options.outputName ?? `${basename(options.template, extname(options.template))}-filled`;
  const outputPath = join(outputDir, `${baseName}.pdf`);
  await writeFile(outputPath, result.bytes);

  logger.success(`Filled ${result.filledCount} field(s), skipped ${result.skippedCount}: ${outputPath}`);
  return outputPath;
}
