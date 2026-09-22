import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseVisualResponse, runVisualReview } from './visual.js';
import type { LlmClient } from './llm.js';

describe('visual review contract', () => {
  it('accepts JSON and one fenced JSON object only', () => {
    const valid = JSON.stringify({ pass: false, summary: 'issue', issues: [{ category: 'spacing', severity: 'warning', location: 'A', evidence: 'tight', recommendedFix: 'add gap' }] });
    expect(parseVisualResponse(valid).issues).toHaveLength(1);
    const fenced = '```json\n' + JSON.stringify({ pass: true, summary: 'good', issues: [] }) + '\n```';
    expect(parseVisualResponse(fenced).issues).toHaveLength(0);
    expect(() => parseVisualResponse(`${valid}\nextra`)).toThrow(/malformed JSON/);
    expect(() => parseVisualResponse(JSON.stringify({ pass: true, summary: 'bad', issues: [{ category: 'spacing', severity: 'warning', location: 'A', evidence: 'tight', recommendedFix: 'fix' }] }))).toThrow(/inconsistent/);
  });

  it('encodes the rendered PNG and maps strict issues to the source file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'facet-visual-')); const png = join(dir, 'diagram.png'); writeFileSync(png, 'png');
    try {
      const client: LlmClient = { review: async (request) => { expect(request.imageBase64).toBe(Buffer.from('png').toString('base64')); expect(request.prompt).toContain('arrow-rendering'); return { provider: 'anthropic', model: 'claude-test', text: JSON.stringify({ pass: false, summary: 'bad', issues: [{ category: 'spacing', severity: 'warning', location: 'A', evidence: 'tight', recommendedFix: 'add gap' }] }), usage: { inputTokens: 1, outputTokens: 2 } }; } };
      const result = await runVisualReview(join('/tmp', 'diagram.tsx'), png, '/tmp', client);
      expect(result.issues[0]).toMatchObject({ file: 'diagram.tsx', rule: 'visual-review.spacing', severity: 'warning' });
      expect(result.metadata).toMatchObject({ provider: 'anthropic', model: 'claude-test', inputTokens: 1, outputTokens: 2 });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
