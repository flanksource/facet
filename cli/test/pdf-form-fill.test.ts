import { test, expect, describe } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  collectPdfFieldMappings,
  fillPdfFormFromSchema,
  type JsonSchema,
} from '../src/utils/pdf-form-fill.js';

// Field names mirror the IRS AcroForm naming convention used by the real
// companion PDFs (topmostSubform[0].Page1[0]...) so the test exercises the same
// shape of mapping the production schemas declare.
const F_NAME = 'topmostSubform[0].Page1[0].f1_4[0]';
const F_ASSETS = 'topmostSubform[0].Page1[0].f1_13[0]';
const C_CONSOLIDATED = 'topmostSubform[0].Page1[0].c1_1[0]';

async function buildTemplatePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const form = doc.getForm();

  const name = form.createTextField(F_NAME);
  name.addToPage(page, { x: 50, y: 350, width: 200, height: 20 });

  const assets = form.createTextField(F_ASSETS);
  assets.addToPage(page, { x: 50, y: 320, width: 200, height: 20 });

  const consolidated = form.createCheckBox(C_CONSOLIDATED);
  consolidated.addToPage(page, { x: 50, y: 290, width: 15, height: 15 });

  return doc.save();
}

const SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    filer: {
      type: 'object',
      properties: {
        name: { type: 'string', 'x-pdf-field': F_NAME, 'x-pdf-type': 'text' },
        total_assets: {
          type: 'number',
          'x-pdf-field': F_ASSETS,
          'x-pdf-type': 'text',
          'x-pdf-transform': 'number',
        },
      },
    },
    return_checks: {
      type: 'object',
      properties: {
        consolidated_return: { type: 'boolean', 'x-pdf-field': C_CONSOLIDATED, 'x-pdf-type': 'checkbox' },
      },
    },
  },
};

describe('collectPdfFieldMappings', () => {
  test('collects nested annotated leaves with dotted json paths', () => {
    const mappings = collectPdfFieldMappings(SCHEMA);
    expect(mappings).toEqual([
      { jsonPath: 'filer.name', fieldName: F_NAME, fieldType: 'text', transform: undefined },
      { jsonPath: 'filer.total_assets', fieldName: F_ASSETS, fieldType: 'text', transform: 'number' },
      { jsonPath: 'return_checks.consolidated_return', fieldName: C_CONSOLIDATED, fieldType: 'checkbox', transform: undefined },
    ]);
  });

  test('resolves $ref, array items, and anyOf branches', () => {
    const schema: JsonSchema = {
      $defs: {
        Filer: {
          type: 'object',
          properties: {
            name: { type: 'string', 'x-pdf-field': 'f_name', 'x-pdf-type': 'text' },
          },
        },
      },
      type: 'object',
      properties: {
        filer: { $ref: '#/$defs/Filer' },
        schedules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number', 'x-pdf-field': 'f_amount', 'x-pdf-type': 'text', 'x-pdf-transform': 'number' },
            },
          },
        },
        either: {
          anyOf: [{ type: 'string', 'x-pdf-field': 'f_either', 'x-pdf-type': 'text' }],
        },
      },
    };
    const paths = collectPdfFieldMappings(schema).map(m => `${m.jsonPath}=${m.fieldName}`);
    expect(paths).toEqual([
      'filer.name=f_name',
      'schedules.0.amount=f_amount',
      'either=f_either',
    ]);
  });
});

describe('fillPdfFormFromSchema', () => {
  test('fills text, number, and checkbox fields then reloads with values set', async () => {
    const template = await buildTemplatePdf();
    const data = {
      filer: { name: 'Acme (Pty) Ltd', total_assets: 66439.19 },
      return_checks: { consolidated_return: true },
    };

    const result = await fillPdfFormFromSchema(template, SCHEMA, data);

    expect(result.filledCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.warnings).toEqual([]);

    const reloaded = await PDFDocument.load(result.bytes);
    const form = reloaded.getForm();
    expect(form.getTextField(F_NAME).getText()).toBe('Acme (Pty) Ltd');
    expect(form.getTextField(F_ASSETS).getText()).toBe('66439.19');
    expect(form.getCheckBox(C_CONSOLIDATED).isChecked()).toBe(true);
  });

  test('skips unmapped data and warns when a mapped field is absent from the PDF', async () => {
    const template = await buildTemplatePdf();
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        filer: {
          type: 'object',
          properties: {
            name: { type: 'string', 'x-pdf-field': F_NAME, 'x-pdf-type': 'text' },
            ghost: { type: 'string', 'x-pdf-field': 'topmostSubform[0].Page9[0].nope[0]', 'x-pdf-type': 'text' },
          },
        },
      },
    };
    // total_assets has no value in data -> skipped; ghost field is not in the PDF -> warning.
    const data = { filer: { name: 'Beta LLC', ghost: 'present-in-data-missing-in-pdf' } };

    const result = await fillPdfFormFromSchema(template, schema, data);

    expect(result.filledCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].fieldName).toBe('topmostSubform[0].Page9[0].nope[0]');
  });
});
