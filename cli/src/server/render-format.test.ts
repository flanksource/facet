import { describe, expect, it } from 'vitest';
import { renderContentTypeMetadata, renderFormatMetadata } from './render-format.js';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

describe('Office format metadata', () => {
  it('publishes the Office formats and binary response MIME types in OpenAPI', () => {
    const schema = load(readFileSync(new URL('../../../openapi.yaml', import.meta.url), 'utf8')) as {
      components: {
        schemas: {
          RenderRequest: {
            properties: { format: { enum: string[] } };
          };
        };
      };
      paths: Record<string, { get: { responses: { '200': { content: Record<string, unknown> } } } }>;
    };
    expect(schema.components.schemas.RenderRequest.properties.format.enum).toEqual(['html', 'pdf', 'png', 'docx', 'pptx']);
    for (const format of ['docx', 'pptx'] as const) expect(Object.keys(schema.paths['/results/{id}'].get.responses['200'].content)).toContain(renderFormatMetadata(format).contentType);
  });
  it.each([
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ] as const)('maps %s response bytes to the correct MIME type and extension', (format, contentType) => {
    expect(renderFormatMetadata(format)).toEqual({ format, extension: format, contentType, binary: true });
    expect(renderContentTypeMetadata(contentType)).toEqual(renderFormatMetadata(format));
  });
});
