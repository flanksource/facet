import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv, { type ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import { Logger } from './logger.js';

export class DataValidator {
  constructor(private logger: Logger) {}

  async validate(data: Record<string, unknown>, schemaPath: string): Promise<void> {
    this.logger.debug(`Validating data against schema: ${schemaPath}`);

    const absolutePath = resolve(process.cwd(), schemaPath);
    const schema = await this.loadSchema(absolutePath);
    const options = {
      allErrors: true,
      verbose: true,
      strictSchema: false,
      loadSchema: async (uri: string) => {
        const url = new URL(uri);
        if (url.protocol !== 'file:') throw new Error(`Only local file schema references are supported: ${uri}`);
        return this.loadSchema(fileURLToPath(url));
      },
    };
    const ajv = schema.$schema === 'https://json-schema.org/draft/2020-12/schema'
      ? new Ajv2020(options)
      : new Ajv(options);
    const validate: ValidateFunction = await ajv.compileAsync(schema);

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
      const parsed: unknown = JSON.parse(content);
      const documentUri = pathToFileURL(absolutePath).href;
      if (typeof parsed === 'boolean') return { $id: documentUri, allOf: [parsed] };
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Schema must be an object or boolean: ${absolutePath}`);
      }
      const schema = parsed as Record<string, unknown>;
      if (schema.$id === undefined) schema.$id = documentUri;
      else if (typeof schema.$id === 'string') schema.$id = new URL(schema.$id, documentUri).href;
      return schema;
    } catch (error) {
      throw new Error(`Failed to load schema file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
