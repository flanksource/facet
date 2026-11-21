import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Logger } from './logger.js';
import { DataValidator } from './validator.js';

const scratchRoot = resolve(process.cwd(), '.tmp');
const roots: string[] = [];

async function schemaFile(schema: unknown): Promise<string> {
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(join(scratchRoot, 'validator example-'));
  const file = join(root, 'incident.schema.json');
  roots.push(root);
  await writeFile(file, JSON.stringify(schema));
  return file;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('DataValidator', () => {
  it('validates JSON Schema 2020-12 documents', async () => {
    const schema = await schemaFile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: { id: { const: 'inc-2026-001' } },
      required: ['id'],
      unevaluatedProperties: false,
    });
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({ id: 'inc-2026-001' }, schema)).resolves.toBeUndefined();
    await expect(validator.validate({ id: 'security-event' }, schema)).rejects.toThrow('must be equal to constant');
  });

  it('ignores annotation keywords a schema carries for its own renderers', async () => {
    // A schema is authored for more than this validator: it also tells an
    // editor how to draw a field. Those annotations constrain nothing, so an
    // unknown keyword must not stop the document validating.
    const schema = await schemaFile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        tier: {
          enum: ['Public', 'Secrets'],
          'x-icons': { Public: 'ph:globe-thin', Secrets: 'sc:secrets-mgmt' },
        },
      },
      required: ['tier'],
    });
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({ tier: 'Secrets' }, schema)).resolves.toBeUndefined();
    // The annotation is ignored, not treated as a constraint that passes anything.
    await expect(validator.validate({ tier: 'Restricted' }, schema)).rejects.toThrow('must be equal to one of');
  });

  it.each([
    ['draft 7', 'http://json-schema.org/draft-07/schema#'],
    ['draft 2020-12', 'https://json-schema.org/draft/2020-12/schema'],
  ])('resolves nested local schema references for %s', async (_name, draft) => {
    const schema = await schemaFile({
      $schema: draft,
      type: 'object',
      properties: { presentation: { $ref: 'styles/styles.json.schema#/$defs/diagram' } },
      required: ['presentation'],
    });
    const stylesDir = join(dirname(schema), 'styles');
    await mkdir(stylesDir);
    await writeFile(join(stylesDir, 'styles.json.schema'), JSON.stringify({
      $schema: draft,
      $defs: { diagram: { type: 'object', properties: { color: { $ref: 'palette.schema.json#/$defs/color' } }, required: ['color'] } },
    }));
    await writeFile(join(stylesDir, 'palette.schema.json'), JSON.stringify({
      $schema: draft,
      $defs: { color: { enum: ['accent', 'muted'] } },
    }));
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({ presentation: { color: 'accent' } }, schema)).resolves.toBeUndefined();
    await expect(validator.validate({ presentation: { color: 'neon' } }, schema)).rejects.toThrow('must be equal to one of');
  });

  it('resolves a relative schema id against the schema file location', async () => {
    const schema = await schemaFile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'nested/root.schema.json',
      $ref: 'styles.json.schema#/$defs/diagram',
    });
    const nestedDir = join(dirname(schema), 'nested');
    await mkdir(nestedDir);
    await writeFile(join(nestedDir, 'styles.json.schema'), JSON.stringify({ $defs: { diagram: { type: 'object', properties: { color: { const: 'accent' } }, required: ['color'] } } }));
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({ color: 'accent' }, schema)).resolves.toBeUndefined();
  });

  it('resolves a referenced schema id before loading its own relative references', async () => {
    const schema = await schemaFile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $ref: 'styles.json.schema#/$defs/diagram',
    });
    await mkdir(join(dirname(schema), 'catalog'));
    await writeFile(join(dirname(schema), 'styles.json.schema'), JSON.stringify({
      $id: 'catalog/styles.schema.json',
      $defs: { diagram: { type: 'object', properties: { color: { $ref: 'colors.json#/$defs/color' } }, required: ['color'] } },
    }));
    await writeFile(join(dirname(schema), 'catalog', 'colors.json'), JSON.stringify({ $defs: { color: { const: 'accent' } } }));
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({ color: 'accent' }, schema)).resolves.toBeUndefined();
  });

  it('validates boolean schemas and references to boolean schemas', async () => {
    const allowed = await schemaFile(true);
    const denied = await schemaFile(false);
    const schema = await schemaFile({
      type: 'object',
      properties: { allowed: { $ref: 'allow.json' }, denied: { $ref: 'deny.json' } },
    });
    await writeFile(join(dirname(schema), 'allow.json'), 'true');
    await writeFile(join(dirname(schema), 'deny.json'), 'false');
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({}, allowed)).resolves.toBeUndefined();
    await expect(validator.validate({}, denied)).rejects.toThrow('boolean schema is false');
    await expect(validator.validate({ allowed: 'value' }, schema)).resolves.toBeUndefined();
    await expect(validator.validate({ denied: 'value' }, schema)).rejects.toThrow('boolean schema is false');
  });

  it('reports missing local references and refuses remote schema loading', async () => {
    const missing = await schemaFile({ $ref: 'missing.schema.json' });
    const remote = await schemaFile({ $ref: 'https://example.invalid/style.schema.json' });
    const validator = new DataValidator(new Logger(false));

    await expect(validator.validate({}, missing)).rejects.toThrow('missing.schema.json');
    await expect(validator.validate({}, remote)).rejects.toThrow('Only local file schema references are supported');
  });
});
