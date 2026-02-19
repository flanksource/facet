import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';
import { pathToFileURL } from 'url';
import { $ } from 'bun';
import { Logger } from './logger.js';
import type { LoadedData, GenerateOptions } from '../types.js';

export class DataLoader {
  constructor(private logger: Logger) { }

  async load(options: GenerateOptions): Promise<LoadedData> {
    let data: Record<string, unknown>;

    if (options.data) {
      // Load from JSON file
      this.logger.debug(`Loading data from JSON file: ${options.data}`);
      data = await this.loadJSON(options.data);
    } else if (options.dataLoader) {
      // Load from TS/JS module
      this.logger.debug(`Loading data from module: ${options.dataLoader}`);
      data = await this.loadModule(options.dataLoader, options.dataLoaderArgs || []);
    } else {
      throw new Error('No data source provided');
    }

    const outputName = options.outputName ?? this.extractOutputName(data, options.outputNameField);

    return { data, outputName };
  }

  private async loadJSON(filePath: string): Promise<Record<string, unknown>> {
    try {
      const absolutePath = resolve(process.cwd(), filePath);
      const content = await readFile(absolutePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load JSON file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadModule(filePath: string, args: string[] = []): Promise<Record<string, unknown>> {
    const absolutePath = resolve(process.cwd(), filePath);
    const ext = extname(absolutePath);

    try {
      // For TypeScript files, execute with tsx via bun shell
      if (ext === '.ts') {
        this.logger.debug('Executing TypeScript file with tsx');
        const result = await $`tsx ${absolutePath} ${args}`.text();
        this.logger.debug(`Executed ${absolutePath} with args: ${args.join(' ')}`);

        const module = { data: JSON.parse(result) };
        return this.extractDataFromModule(module);
      }

      // For JavaScript files, import directly
      const fileUrl = pathToFileURL(absolutePath).href;
      const module = await import(fileUrl);

      return this.extractDataFromModule(module);
    } catch (error) {
      throw new Error(`Failed to load data module: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractDataFromModule(module: any): Record<string, unknown> {
    if (!module.data) {
      throw new Error(`Module must export 'data' (named export): export const data = { ... }`);
    }

    // Check if data is a function (async or sync)
    if (typeof module.data === 'function') {
      this.logger.debug('Executing data function');
      const result = module.data();

      if (typeof result !== 'object' || result === null) {
        throw new Error('Data function must return an object');
      }

      return result as Record<string, unknown>;
    }

    // Static data object
    if (typeof module.data !== 'object' || module.data === null) {
      throw new Error('Exported data must be an object or function');
    }

    return module.data as Record<string, unknown>;
  }

  private extractOutputName(data: Record<string, unknown>, fieldPath: string): string {
    // Support dot notation for nested fields
    const parts = fieldPath.split('.');
    let value: unknown = data;

    for (const part of parts) {
      if (typeof value !== 'object' || value === null) {
        this.logger.warn(`Output name field '${fieldPath}' not found in data, using 'output'`);
        return 'output';
      }
      value = (value as Record<string, unknown>)[part];
    }

    if (typeof value !== 'string' || value.length === 0) {
      this.logger.warn(`Output name field '${fieldPath}' is not a valid string, using 'output'`);
      return 'output';
    }

    // Sanitize filename
    return this.sanitizeFilename(value);
  }

  private sanitizeFilename(name: string): string {
    // Remove or replace invalid filename characters
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
