import { describe, expect, it } from 'vitest';
import { createLlmClient, resolveLlmConfig, type HttpPost } from './llm.js';

function reply(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status }); }

describe('LLM adapters', () => {
  it('sends OpenAI-compatible multimodal requests and normalizes usage', async () => {
    let endpoint = ''; let init: RequestInit | undefined;
    const post: HttpPost = async (url, request) => { endpoint = url; init = request; return reply({ model: 'local-model', choices: [{ message: { content: [{ type: 'text', text: '{"pass":true,"summary":"ok","issues":[]}' }] } }], usage: { prompt_tokens: 4, completion_tokens: 2 } }); };
    const result = await createLlmClient({ provider: 'openai', model: 'vision', baseUrl: 'http://localhost:11434/v1' }, post).review({ imageBase64: 'abc=', prompt: 'system' });
    expect(endpoint).toBe('http://localhost:11434/v1/chat/completions');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('vision'); expect(body.temperature).toBe(0); expect(body.messages[1].content[1].image_url.url).toBe('data:image/png;base64,abc=');
    expect(init?.headers).not.toHaveProperty('authorization');
    expect(result).toMatchObject({ text: '{"pass":true,"summary":"ok","issues":[]}', provider: 'openai', model: 'local-model', usage: { inputTokens: 4, outputTokens: 2 } });
  });

  it('sends native Anthropic image messages and text-block usage', async () => {
    let endpoint = ''; let init: RequestInit | undefined;
    const post: HttpPost = async (url, request) => { endpoint = url; init = request; return reply({ model: 'claude-test', content: [{ type: 'text', text: '{"pass":true,"summary":"ok","issues":[]}' }], usage: { input_tokens: 8, output_tokens: 3 } }); };
    const result = await createLlmClient({ provider: 'anthropic', model: 'claude-test', baseUrl: 'https://api.anthropic.com/v1', apiKey: 'secret' }, post).review({ imageBase64: 'abc', prompt: 'system' });
    expect(endpoint).toBe('https://api.anthropic.com/v1/messages');
    expect(init?.headers).toMatchObject({ 'x-api-key': 'secret', 'anthropic-version': '2023-06-01' });
    const body = JSON.parse(String(init?.body));
    expect(body.system).toBe('system'); expect(body.messages[0].content[0].source.data).toBe('abc');
    expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 3 });
  });

  it('keeps HTTP errors concise without leaking image data or keys', async () => {
    const post: HttpPost = async () => reply({ error: 'secret-key=topsecret data:image/png;base64,abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz' }, 401);
    await expect(createLlmClient({ provider: 'openai', model: 'm', baseUrl: 'http://localhost/v1', apiKey: 'topsecret' }, post).review({ imageBase64: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz', prompt: '' })).rejects.toThrow(/401/);
    await expect(createLlmClient({ provider: 'openai', model: 'm', baseUrl: 'http://localhost/v1', apiKey: 'topsecret' }, post).review({ imageBase64: 'x', prompt: '' })).rejects.not.toThrow(/topsecret|data:image|abcdefghijklmnopqrstuvwxyz/);
  });
});

describe('LLM config', () => {
  it('applies CLI, FACET, then provider-standard precedence and permits keyless custom OpenAI endpoints', () => {
    const env = { FACET_LLM_PROVIDER: 'anthropic', FACET_LLM_MODEL: 'facet-model', FACET_LLM_BASE_URL: 'http://facet/v1', ANTHROPIC_API_KEY: 'facet-key' };
    expect(resolveLlmConfig(env, { provider: 'openai', model: 'cli-model', baseUrl: 'http://localhost:11434/v1' })).toEqual({ provider: 'openai', model: 'cli-model', baseUrl: 'http://localhost:11434/v1' });
    expect(resolveLlmConfig({ FACET_LLM_PROVIDER: 'openai', FACET_LLM_MODEL: 'm', OPENAI_API_KEY: 'key' })).toMatchObject({ provider: 'openai', model: 'm', apiKey: 'key' });
    expect(resolveLlmConfig({ FACET_LLM_PROVIDER: 'openai', FACET_LLM_MODEL: 'm', FACET_LLM_BASE_URL: 'http://localhost:11434/v1', FACET_LLM_API_KEY: '', OPENAI_API_KEY: 'must-not-forward' })).toMatchObject({ provider: 'openai', model: 'm', apiKey: '' });
  });
  it('validates providers, model, and keys for hosted endpoints', () => {
    expect(() => resolveLlmConfig({ FACET_LLM_PROVIDER: 'bad', FACET_LLM_MODEL: 'm' })).toThrow(/provider/);
    expect(() => resolveLlmConfig({})).toThrow(/model/);
    expect(() => resolveLlmConfig({ FACET_LLM_PROVIDER: 'anthropic', FACET_LLM_MODEL: 'm' })).toThrow(/API key/);
    expect(() => resolveLlmConfig({ FACET_LLM_MODEL: 'm' })).toThrow(/API key/);
  });
});
