// Public API exports
export { generatePDF } from './generators/pdf.js';
export { generateHTML } from './generators/html.js';
export { generateWebComponent } from './generators/webcomponent.js';
export { generateFilledPdf } from './generators/fill-pdf.js';
export { startServer } from './server/preview.js';
export {
  collectPdfFieldMappings,
  fillPdfFormFromSchema,
} from './utils/pdf-form-fill.js';
export type {
  JsonSchema,
  PdfFieldMapping,
  PdfFillResult,
  PdfFillWarning,
} from './utils/pdf-form-fill.js';
export type { FillPdfOptions } from './generators/fill-pdf.js';
export type { GenerateOptions, LoadedData, RenderedTemplate } from './types.js';
export type { ServerConfig, ServerCLIFlags, S3Config } from './server/config.js';
