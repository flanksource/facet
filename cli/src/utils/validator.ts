import { readFile } from 'fs/promises';
import { resolve } from 'path';
import Ajv, { type ValidateFunction } from 'ajv';
import { Logger } from './logger.js';

export class DataValidator {
  private ajv: Ajv;

  constructor(private logger: Logger) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
  }

  async validate(data: Record<string, unknown>, schemaPath: string): Promise<void> {
    this.logger.debug(`Validating data against schema: ${schemaPath}`);

    const schema = await this.loadSchema(schemaPath);
    const validate: ValidateFunction = this.ajv.compile(schema);

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
