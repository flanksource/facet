import { fillPdfFormFromSchema, type JsonSchema } from '../utils/pdf-form-fill.js';
import { listSamples, readSamplePdf, readSampleSchema, readSampleData } from './samples/index.js';
import { playgroundFormJsB64, playgroundFormCssB64 } from './playground-form-generated.js';

// Endpoints backing the Fill-PDF playground island: serve the embedded React
// bundle, the built-in form samples, and a server-side fill that reuses
// fillPdfFormFromSchema in-process (no subprocess).

function badReq(message: string): Response {
  return Response.json({ error: { code: 'BAD_REQUEST', message } }, { status: 400 });
}

// fieldText reads a multipart field as text, accepting either a string field or
// an uploaded file part (so schema/data may be posted either way).
async function fieldText(v: FormDataEntryValue | null): Promise<string | undefined> {
  if (typeof v === 'string') return v;
  if (v instanceof File) return v.text();
  return undefined;
}

function b64Response(b64: string, contentType: string): Response {
  return new Response(Buffer.from(b64, 'base64'), {
    headers: { 'content-type': contentType, 'cache-control': 'no-cache' },
  });
}

export function handlePlaygroundFormJs(): Response {
  if (!playgroundFormJsB64) {
    return new Response('console.error("Fill-PDF island not built — run: pnpm run build:playground");\n', {
      status: 503,
      headers: { 'content-type': 'text/javascript; charset=utf-8' },
    });
  }
  return b64Response(playgroundFormJsB64, 'text/javascript; charset=utf-8');
}

export function handlePlaygroundFormCss(): Response {
  return b64Response(playgroundFormCssB64 || '', 'text/css; charset=utf-8');
}

export function handleFillSamples(): Response {
  return Response.json(listSamples());
}

export function handleFillSampleSchema(id: string): Response {
  const schema = readSampleSchema(id);
  if (!schema) return Response.json({ error: { code: 'NOT_FOUND', message: `unknown sample ${id}` } }, { status: 404 });
  return new Response(schema, { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

export function handleFillSampleData(id: string): Response {
  const data = readSampleData(id);
  // A sample without example data is valid — return an empty object.
  return new Response(data ?? '{}', { headers: { 'content-type': 'application/json; charset=utf-8' } });
}

// handleFillPdf fills a blank AcroForm PDF from form data using a JSON Schema's
// x-pdf-field annotations. Multipart fields: `schema` (JSON), `data` (JSON), and
// either a `pdf` file part or a `sample` id naming a built-in form.
export async function handleFillPdf(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badReq('expected multipart/form-data with schema, data and pdf|sample');
  }

  const schemaRaw = await fieldText(form.get('schema'));
  const dataRaw = await fieldText(form.get('data'));
  if (schemaRaw === undefined || dataRaw === undefined) {
    return badReq('schema and data fields are required');
  }
  let schema: JsonSchema;
  let data: unknown;
  try {
    schema = JSON.parse(schemaRaw) as JsonSchema;
  } catch {
    return badReq('schema is not valid JSON');
  }
  try {
    data = JSON.parse(dataRaw);
  } catch {
    return badReq('data is not valid JSON');
  }

  let pdfBytes: Uint8Array | undefined;
  const pdf = form.get('pdf');
  if (pdf instanceof File) {
    pdfBytes = new Uint8Array(await pdf.arrayBuffer());
  } else {
    const sample = form.get('sample');
    if (typeof sample === 'string' && sample) {
      pdfBytes = readSamplePdf(sample);
      if (!pdfBytes) return badReq(`unknown sample ${sample}`);
    }
  }
  if (!pdfBytes) return badReq("provide a 'pdf' file part or a 'sample' id");

  try {
    const result = await fillPdfFormFromSchema(pdfBytes, schema, data);
    return new Response(Buffer.from(result.bytes), {
      headers: {
        'content-type': 'application/pdf',
        'cache-control': 'no-store',
        'X-Fill-Count': String(result.filledCount),
        'X-Fill-Skipped': String(result.skippedCount),
        'X-Fill-Warnings': String(result.warnings.length),
      },
    });
  } catch (e) {
    return Response.json(
      { error: { code: 'FILL_FAILED', message: e instanceof Error ? e.message : String(e) } },
      { status: 500 },
    );
  }
}
