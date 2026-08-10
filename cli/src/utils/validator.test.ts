import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Logger } from './logger.js';
import { DataValidator } from './validator.js';

const scratchRoot = resolve(process.cwd(), '.tmp');
const roots: string[] = [];

async function schemaFile(schema: Record<string, unknown>): Promise<string> {
  await mkdir(scratchRoot, { recursive: true });
  const root = await mkdtemp(join(scratchRoot, 'validator-'));
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
});
