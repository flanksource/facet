import { SAMPLE_CONTENT } from './generated.js';

// Built-in blank-form samples for the Fill-PDF playground. Each bundles a blank
// AcroForm PDF and the x-pdf-annotated JSON Schema that maps data onto its
// fields, plus a small example data document. The heavy content is inlined in
// generated.ts (see cli/scripts/gen-samples.cjs); this module owns the id/name
// catalog and the typed accessors.

export interface Sample {
  id: string;
  name: string;
}

const SAMPLES: Sample[] = [
  { id: 'f1120', name: 'IRS Form 1120 (U.S. Corporation Income Tax Return)' },
  { id: 'f5471', name: 'IRS Form 5471 (Foreign Corporation Information Return)' },
];

export function listSamples(): Sample[] {
  return SAMPLES.filter((s) => SAMPLE_CONTENT[s.id]);
}

export function readSamplePdf(id: string): Uint8Array | undefined {
  const c = SAMPLE_CONTENT[id];
  return c ? new Uint8Array(Buffer.from(c.pdfB64, 'base64')) : undefined;
}

export function readSampleSchema(id: string): string | undefined {
  return SAMPLE_CONTENT[id]?.schema;
}

export function readSampleData(id: string): string | undefined {
  return SAMPLE_CONTENT[id]?.data;
}
