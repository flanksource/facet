import { readFileSync } from 'node:fs';

export type LlmProvider = 'openai' | 'anthropic';

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  baseUrl: string;
  apiKey?: string;
}

export interface LlmRequest {
  imageBase64: string;
  prompt: string;
}

export interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface LlmResponse {
  text: string;
  provider: LlmProvider;
  model: string;
  usage?: LlmUsage;
}

export interface LlmClient {
  review(request: LlmRequest): Promise<LlmResponse>;
}

export type HttpPost = (url: string, init: RequestInit) => Promise<Response>;

const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
};
const DEFAULT_TIMEOUT_MS = 120_000;

function provider(value: unknown): LlmProvider {
  if (value === 'openai' || value === 'anthropic') return value;
  throw new Error(`Invalid LLM provider "${String(value)}". Expected "openai" or "anthropic"`);
}

function url(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Invalid LLM base URL'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Invalid LLM base URL: expected an http(s) URL without credentials, query, or fragment');
  }
  return parsed.toString().replace(/\/$/, '');
}

function configured(env: NodeJS.ProcessEnv, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined;
}

export interface LlmCliOptions { provider?: string; model?: string; baseUrl?: string; }

/** Resolve CLI values first, then FACET_LLM_* values, then provider defaults. */
export function resolveLlmConfig(env: NodeJS.ProcessEnv = process.env, options: LlmCliOptions = {}): LlmConfig {
  const selected = options.provider ?? configured(env, 'FACET_LLM_PROVIDER') ?? 'openai';
  const selectedProvider = provider(selected);
  const model = options.model ?? configured(env, 'FACET_LLM_MODEL');
  if (!model?.trim()) throw new Error('LLM model is required for --diagrams-ai (use --llm-model or FACET_LLM_MODEL)');
  const standardBase = selectedProvider === 'anthropic' ? configured(env, 'ANTHROPIC_BASE_URL') : configured(env, 'OPENAI_BASE_URL');
  const baseUrl = url(options.baseUrl ?? configured(env, 'FACET_LLM_BASE_URL') ?? standardBase ?? DEFAULT_BASE_URLS[selectedProvider]);
  // An explicitly empty FACET_LLM_API_KEY intentionally disables authentication for
  // local OpenAI-compatible endpoints. Standard provider keys are fallback only.
  const facetKey = configured(env, 'FACET_LLM_API_KEY');
  const apiKey = facetKey !== undefined ? facetKey : (selectedProvider === 'anthropic' ? configured(env, 'ANTHROPIC_API_KEY') : configured(env, 'OPENAI_API_KEY'));
  if (selectedProvider === 'anthropic' && !apiKey) throw new Error('Anthropic API key is required for --diagrams-ai (use FACET_LLM_API_KEY or ANTHROPIC_API_KEY)');
  if (selectedProvider === 'openai' && !apiKey && !isCustomOpenAiEndpoint(baseUrl)) throw new Error('OpenAI-compatible API key is required for the default endpoint (use FACET_LLM_API_KEY or OPENAI_API_KEY)');
  return { provider: selectedProvider, model: model.trim(), baseUrl, ...(apiKey === undefined ? {} : { apiKey }) };
}

function isCustomOpenAiEndpoint(baseUrl: string): boolean {
  return baseUrl !== DEFAULT_BASE_URLS.openai;
}

function joinEndpoint(baseUrl: string, suffix: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}

function finiteUsage(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`LLM returned invalid ${label}`);
  return value;
}

function responseObject(value: unknown, providerName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${providerName} returned malformed JSON`);
  return value as Record<string, unknown>;
}

function openAiText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) throw new Error('OpenAI-compatible response contained no text');
  const text = value.filter((part) => part && typeof part === 'object' && (part as Record<string, unknown>).type === 'text')
    .map((part) => (part as Record<string, unknown>).text).filter((part): part is string => typeof part === 'string').join('');
  if (!text) throw new Error('OpenAI-compatible response contained no text');
  return text;
}

function anthropicText(value: unknown): string {
  if (!Array.isArray(value)) throw new Error('Anthropic response contained no text');
  const text = value.filter((part) => part && typeof part === 'object' && (part as Record<string, unknown>).type === 'text')
    .map((part) => (part as Record<string, unknown>).text).filter((part): part is string => typeof part === 'string').join('');
  if (!text) throw new Error('Anthropic response contained no text');
  return text;
}

async function postJson(post: HttpPost, endpoint: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await post(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  } catch (error) {
    throw new Error(`LLM request failed: ${error instanceof Error ? error.message : 'network error'}`);
  }
  const text = await response.text();
  // Do not include response bodies: providers may echo credentials or image data.
  if (!response.ok) throw new Error(`LLM request failed (${response.status})`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('LLM returned malformed JSON envelope'); }
  return responseObject(parsed, 'LLM');
}

export function createLlmClient(config: LlmConfig, post: HttpPost = (endpoint, init) => fetch(endpoint, init)): LlmClient {
  const selectedProvider = provider(config.provider);
  if (!config.model?.trim()) throw new Error('LLM model is required');
  const baseUrl = url(config.baseUrl);
  if (selectedProvider === 'anthropic' && !config.apiKey) throw new Error('Anthropic API key is required');
  if (selectedProvider === 'openai' && !config.apiKey && !isCustomOpenAiEndpoint(baseUrl)) throw new Error('OpenAI-compatible API key is required for the default endpoint');
  const endpoint = selectedProvider === 'openai'
    ? joinEndpoint(baseUrl, '/chat/completions')
    : baseUrl.endsWith('/v1') ? `${baseUrl}/messages` : joinEndpoint(baseUrl, '/v1/messages');
  return {
    async review(request): Promise<LlmResponse> {
      if (selectedProvider === 'openai') {
        const root = await postJson(post, endpoint, config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}, {
          model: config.model,
          messages: [
            { role: 'system', content: request.prompt },
            { role: 'user', content: [{ type: 'text', text: 'Review the attached image and return only the structured JSON review.' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${request.imageBase64}` } }] },
          ],
          temperature: 0,
        });
        const choices = root.choices;
        if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') throw new Error('OpenAI-compatible response contained no choices');
        const message = (choices[0] as Record<string, unknown>).message;
        if (!message || typeof message !== 'object') throw new Error('OpenAI-compatible response contained no message');
        if (root.usage !== undefined && (!root.usage || typeof root.usage !== 'object' || Array.isArray(root.usage))) throw new Error('OpenAI-compatible response returned malformed usage');
        const usage = root.usage as Record<string, unknown> | undefined;
        return { text: openAiText((message as Record<string, unknown>).content), provider: selectedProvider, model: typeof root.model === 'string' && root.model ? root.model : config.model, usage: usage ? { inputTokens: finiteUsage(usage.prompt_tokens, 'input token count'), outputTokens: finiteUsage(usage.completion_tokens, 'output token count') } : undefined };
      }
      const root = await postJson(post, endpoint, { 'x-api-key': config.apiKey ?? '', 'anthropic-version': '2023-06-01' }, {
        model: config.model,
        max_tokens: 2048,
        temperature: 0,
        system: request.prompt,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: request.imageBase64 } }, { type: 'text', text: 'Return only the structured JSON review.' }] }],
      });
      if (root.usage !== undefined && (!root.usage || typeof root.usage !== 'object' || Array.isArray(root.usage))) throw new Error('Anthropic response returned malformed usage');
      const usage = root.usage as Record<string, unknown> | undefined;
      return { text: anthropicText(root.content), provider: selectedProvider, model: typeof root.model === 'string' && root.model ? root.model : config.model, usage: usage ? { inputTokens: finiteUsage(usage.input_tokens, 'input token count'), outputTokens: finiteUsage(usage.output_tokens, 'output token count') } : undefined };
    },
  };
}

export function readImageBase64(path: string): string { return readFileSync(path).toString('base64'); }
