import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Ajv, { type ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import { Logger } from './logger.js';

export class DataValidator {
  private draft7: Ajv;
  private draft2020: Ajv2020;

  constructor(private logger: Logger) {
    // Schemas are authored for their whole toolchain, not just this validator:
    // they also carry annotations telling an editor how to label or draw a
    // field. Those keywords constrain nothing, so strict schema checking would
    // reject a document that is perfectly valid. Every real constraint —
    // types, enums, required, formats — is still enforced.
    const options = { allErrors: true, verbose: true, strictSchema: false };
    this.draft7 = new Ajv(options);
    this.draft2020 = new Ajv2020(options);
  }

  async validate(data: Record<string, unknown>, schemaPath: string): Promise<void> {
    this.logger.debug(`Validating data against schema: ${schemaPath}`);

    const schema = await this.loadSchema(schemaPath);
    const ajv = schema.$schema === 'https://json-schema.org/draft/2020-12/schema'
      ? this.draft2020
      : this.draft7;
    const validate: ValidateFunction = ajv.compile(schema);

    const valid = validate(data);

    if (!valid && validate.errors) {
      const errorMessages = validate.errors.map((err) => {
        const path = err.instancePath || 'root';
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new Error(`Data validation failed:\n${errorMessages}`);
    }

    this.logger.debug('Data validation passed');
  }

  private async loadSchema(filePath: string): Promise<Record<string, unknown>> {
    try {
      const absolutePath = resolve(process.cwd(), filePath);
      const content = await readFile(absolutePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load schema file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
