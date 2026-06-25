import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
} from 'pdf-lib';

// pdf-form-fill fills AcroForm fields in a template PDF from a JSON document,
// driven entirely by `x-pdf-*` annotations carried on a JSON Schema. The schema
// is the source of truth for the JSON-path -> PDF-field-name mapping, so this
// module has no dependency on how the schema was authored (zod, hand-written,
// generated). Each annotated leaf declares:
//   - x-pdf-field:     the AcroForm field name to write (required)
//   - x-pdf-type:      text | checkbox | radio | dropdown | option-list
//   - x-pdf-transform: string | number | currency | date | boolean
export type JsonSchema = {
  $ref?: string;
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  'x-pdf-field'?: string;
  'x-pdf-type'?: string;
  'x-pdf-transform'?: string;
  [key: string]: unknown;
};

export interface PdfFieldMapping {
  jsonPath: string;
  fieldName: string;
  fieldType?: string;
  transform?: string;
}

export interface PdfFillWarning {
  fieldName: string;
  jsonPath: string;
  message: string;
}

export interface PdfFillResult {
  bytes: Uint8Array;
  warnings: PdfFillWarning[];
  filledCount: number;
  skippedCount: number;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (!schema.$ref?.startsWith('#/')) return schema;
  const parts = schema.$ref.slice(2).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = root;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return schema;
    current = (current as Record<string, unknown>)[part];
  }
  return (current && typeof current === 'object') ? current as JsonSchema : schema;
}

function walkSchema(schema: JsonSchema, root: JsonSchema, path: string[], out: PdfFieldMapping[], seen: Set<string>) {
  const node = resolveRef(schema, root);
  const fieldName = node['x-pdf-field'];
  if (typeof fieldName === 'string' && fieldName.trim()) {
    const jsonPath = path.join('.');
    const key = `${jsonPath}:${fieldName}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({
        jsonPath,
        fieldName,
        fieldType: typeof node['x-pdf-type'] === 'string' ? node['x-pdf-type'] : undefined,
        transform: typeof node['x-pdf-transform'] === 'string' ? node['x-pdf-transform'] : undefined,
      });
    }
  }

  for (const variant of [...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])]) {
    walkSchema(variant, root, path, out, seen);
  }

  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      walkSchema(child, root, [...path, key], out, seen);
    }
  }

  if (node.items) {
    walkSchema(node.items, root, [...path, '0'], out, seen);
  }
}

// collectPdfFieldMappings walks a JSON Schema and returns every JSON-path ->
// PDF-field-name mapping declared via `x-pdf-field`, resolving `$ref` pointers
// and descending through properties, array items, and anyOf/oneOf/allOf.
export function collectPdfFieldMappings(schema: JsonSchema): PdfFieldMapping[] {
  const out: PdfFieldMapping[] = [];
  walkSchema(schema, schema, [], out, new Set());
  return out;
}

function getPathValue(data: unknown, path: string): unknown {
  if (!path) return data;
  let current = data;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatPdfValue(value: unknown, transform?: string): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (transform === 'string') return JSON.stringify(value);
  return String(value);
}

function boolValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['true', 'yes', 'y', '1', 'on', 'checked'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

// fillPdfFormFromSchema loads a template PDF, fills each AcroForm field named by
// the schema's `x-pdf-field` annotations with the matching value from `data`,
// and returns the saved bytes plus a per-field fill/skip/warning tally. Missing
// PDF fields and unsupported field types are recorded as warnings rather than
// aborting, so a partial mapping still produces a usable PDF.
export async function fillPdfFormFromSchema(
  pdfBytes: Uint8Array | Buffer,
  schema: JsonSchema,
  data: unknown,
): Promise<PdfFillResult> {
  const mappings = collectPdfFieldMappings(schema);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const warnings: PdfFillWarning[] = [];
  let filledCount = 0;
  let skippedCount = 0;

  for (const mapping of mappings) {
    const raw = getPathValue(data, mapping.jsonPath);
    if (raw == null || raw === '') {
      skippedCount += 1;
      continue;
    }

    let field;
    try {
      field = form.getField(mapping.fieldName);
    } catch {
      warnings.push({
        fieldName: mapping.fieldName,
        jsonPath: mapping.jsonPath,
        message: 'Mapped PDF field was not found in the template PDF',
      });
      skippedCount += 1;
      continue;
    }

    try {
      if (field instanceof PDFTextField) {
        field.setText(formatPdfValue(raw, mapping.transform));
      } else if (field instanceof PDFCheckBox) {
        if (boolValue(raw)) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown) {
        field.select(formatPdfValue(raw, mapping.transform));
      } else if (field instanceof PDFRadioGroup) {
        field.select(formatPdfValue(raw, mapping.transform));
      } else if (field instanceof PDFOptionList) {
        field.select(formatPdfValue(raw, mapping.transform));
      } else {
        warnings.push({
          fieldName: mapping.fieldName,
          jsonPath: mapping.jsonPath,
          message: `Unsupported PDF field type: ${field.constructor.name}`,
        });
        skippedCount += 1;
        continue;
      }
      filledCount += 1;
    } catch (error) {
      warnings.push({
        fieldName: mapping.fieldName,
        jsonPath: mapping.jsonPath,
        message: error instanceof Error ? error.message : 'Failed to fill PDF field',
      });
      skippedCount += 1;
    }
  }

  form.updateFieldAppearances();
  return {
    bytes: await pdfDoc.save(),
    warnings,
    filledCount,
    skippedCount,
  };
}
