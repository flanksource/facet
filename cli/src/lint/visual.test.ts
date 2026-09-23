import { describe, expect, it } from 'vitest';
import { basename } from 'node:path';
import { parseCaptainVisualResponse, runVisualReview } from './visual.js';
import type { ExternalToolRunner } from './external-runner.js';

const validReview = {
  pass: false,
  summary: 'issue',
  issues: [{ category: 'spacing', severity: 'warning', location: 'A', evidence: 'tight', recommendedFix: 'add gap' }],
};

function machineResult(structuredOutput: unknown = validReview): string {
  return JSON.stringify({
    status: 'completed',
    model: 'claude-sonnet-4-6',
    provider: 'anthropic',
    inputTokens: 10,
    outputTokens: 4,
    duration: '1s',
    costUSD: 0.01,
    structuredOutput,
  });
}

describe('Captain visual review contract', () => {
  it('runs the packaged prompt with one attachment and an optional model override', async () => {
    let call: { command: string; args: string[]; cwd: string } | undefined;
    const runner: ExternalToolRunner = async (command, args, options) => {
      call = { command, args, cwd: options.cwd };
      return { stdout: machineResult(), stderr: '' };
    };

    const result = await runVisualReview('/repo/diagram.tsx', '/tmp/diagram.png', '/repo', runner, 'api:claude-sonnet-4-6');
    expect(call?.command).toBe('captain');
    expect(call?.cwd).toBe('/repo');
    expect(call?.args.slice(0, 3)).toEqual(['--json', 'prompt', 'run']);
    expect(basename(call!.args[3])).toBe('review-diagram.prompt');
    expect(call?.args.slice(4)).toEqual(['--attach', '/tmp/diagram.png', '--no-stream', '--model', 'api:claude-sonnet-4-6']);
    expect(result.issues[0]).toMatchObject({ file: 'diagram.tsx', rule: 'visual-review.spacing', severity: 'warning' });
    expect(result.metadata).toMatchObject({ provider: 'anthropic', model: 'claude-sonnet-4-6', inputTokens: 10, outputTokens: 4, costUSD: 0.01 });
  });

  it('omits the model flag when Captain should use its configured default', async () => {
    let args: string[] = [];
    const runner: ExternalToolRunner = async (_command, received) => { args = received; return { stdout: machineResult({ pass: true, summary: 'good', issues: [] }), stderr: '' }; };
    await runVisualReview('/repo/diagram.tsx', '/tmp/diagram.png', '/repo', runner);
    expect(args).not.toContain('--model');
  });

  it('rejects malformed, failed, and inconsistent machine output', () => {
    expect(() => parseCaptainVisualResponse('not json')).toThrow(/malformed JSON/);
    expect(() => parseCaptainVisualResponse(JSON.stringify({ status: 'failed', model: 'm', provider: 'p', structuredOutput: { pass: true, summary: 'ok', issues: [] } }))).toThrow(/did not complete/);
    expect(() => parseCaptainVisualResponse(machineResult({ pass: true, summary: 'bad', issues: validReview.issues }))).toThrow(/inconsistent/);
    expect(() => parseCaptainVisualResponse(JSON.stringify({ ...JSON.parse(machineResult()), unexpected: true }))).toThrow(/machine result/);
  });
});
