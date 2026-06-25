import { test, expect, describe } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { handleFillPdf, handleFillSamples, handleFillSampleSchema } from '../src/server/routes-fill.js';

const FIELD = 'topmostSubform[0].Page1[0].f1_4[0]';

async function blankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const form = doc.getForm();
  const tf = form.createTextField(FIELD);
  tf.addToPage(page, { x: 50, y: 350, width: 200, height: 20 });
  return doc.save();
}

const SCHEMA = {
  type: 'object',
  properties: {
    filer: {
      type: 'object',
      properties: { name: { type: 'string', 'x-pdf-field': FIELD, 'x-pdf-type': 'text' } },
    },
  },
};

function multipartReq(parts: Record<string, string | File>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(parts)) fd.set(k, v as string | Blob);
  return new Request('http://localhost/fill-pdf', { method: 'POST', body: fd });
}

describe('POST /fill-pdf', () => {
  test('fills an uploaded blank PDF from schema + data', async () => {
    const file = new File([await blankPdf()], 'blank.pdf', { type: 'application/pdf' });
    const res = await handleFillPdf(
      multipartReq({ pdf: file, schema: JSON.stringify(SCHEMA), data: JSON.stringify({ filer: { name: 'Acme Inc' } }) }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('X-Fill-Count')).toBe('1');

    const out = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(out.slice(0, 5))).toBe('%PDF-');
    const filled = await PDFDocument.load(out);
    expect(filled.getForm().getTextField(FIELD).getText()).toBe('Acme Inc');
  });

  test('fills a built-in sample by id', async () => {
    // The test SCHEMA's field is absent from the real f1120 form (so it warns and
    // skips), but the sample-resolution path must still return a valid PDF.
    const res = await handleFillPdf(
      multipartReq({ sample: 'f1120', schema: JSON.stringify(SCHEMA), data: JSON.stringify({ filer: { name: 'Sample Co' } }) }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });

  test('accepts schema/data posted as file parts, not just string fields', async () => {
    const fd = new FormData();
    fd.set('pdf', new File([await blankPdf()], 'blank.pdf', { type: 'application/pdf' }));
    fd.set('schema', new File([JSON.stringify(SCHEMA)], 'schema.json', { type: 'application/json' }));
    fd.set('data', new File([JSON.stringify({ filer: { name: 'Filed Co' } })], 'data.json', { type: 'application/json' }));
    const res = await handleFillPdf(new Request('http://localhost/fill-pdf', { method: 'POST', body: fd }));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Fill-Count')).toBe('1');
  });

  test('400 when schema/data fields are missing', async () => {
    const res = await handleFillPdf(multipartReq({ sample: 'f1120' }));
    expect(res.status).toBe(400);
  });

  test('400 for an unknown sample id', async () => {
    const res = await handleFillPdf(multipartReq({ sample: 'nope', schema: JSON.stringify(SCHEMA), data: '{}' }));
    expect(res.status).toBe(400);
  });
});

describe('fill-pdf samples', () => {
  test('lists built-in samples', async () => {
    const list = (await handleFillSamples().json()) as { id: string; name: string }[];
    expect(list.map((s) => s.id)).toContain('f1120');
  });

  test('returns a sample schema carrying x-pdf-field annotations', async () => {
    const res = handleFillSampleSchema('f1120');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('x-pdf-field');
  });

  test('404 for an unknown sample schema', () => {
    expect(handleFillSampleSchema('nope').status).toBe(404);
  });
});
