/**
 * The LLM client behind a narrow interface, so the AI service (and its
 * tests) never touch the provider's HTTP API directly. The implementation
 * is plain fetch against an OpenAI-compatible chat-completions endpoint —
 * no SDK dependency — pointed at OpenRouter by default.
 *
 * The API key travels only in the Authorization header of the provider
 * request. It is never logged, never returned, and never appears in an
 * error message.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string of the arguments, as the model sent them. */
  arguments: string;
}

export interface ChatCompletion {
  content: string | null;
  toolCalls: ToolCall[];
  model: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  /** Force one tool call (used by the NL screener translation). */
  toolChoice?: { type: 'function'; function: { name: string } };
  /** Ask for a JSON object response (structured output). */
  responseFormatJson?: boolean;
  maxTokens?: number;
  timeoutMs: number;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly timedOut = false,
  ) {
    super(message);
  }
}

export interface LlmClient {
  chat(options: ChatOptions): Promise<ChatCompletion>;
}

export const LLM_CLIENT = 'LLM_CLIENT';

/** Kept low: factual answers should not wander. */
const TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 2048;

export class OpenRouterClient implements LlmClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string,
  ) {}

  async chat(options: ChatOptions): Promise<ChatCompletion> {
    if (!this.apiKey) {
      throw new LlmProviderError('The AI provider is not configured.');
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'FinVerse AI',
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          tools: options.tools,
          tool_choice:
            options.toolChoice ?? (options.tools ? 'auto' : undefined),
          response_format: options.responseFormatJson
            ? { type: 'json_object' }
            : undefined,
          temperature: TEMPERATURE,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new LlmProviderError(
          'The AI provider took too long to respond.',
          undefined,
          true,
        );
      }
      throw new LlmProviderError('The AI provider could not be reached.');
    }
    if (!response.ok) {
      // Only the status is kept; provider error bodies can contain
      // request echoes and are never surfaced.
      throw new LlmProviderError(
        'The AI provider returned an error.',
        response.status,
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new LlmProviderError(
        'The AI provider returned an invalid response.',
      );
    }
    return parseCompletion(data);
  }
}

function parseCompletion(data: unknown): ChatCompletion {
  if (!data || typeof data !== 'object') {
    throw new LlmProviderError('The AI provider returned an invalid response.');
  }
  const record = data as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new LlmProviderError('The AI provider returned no answer.');
  }
  const message = (choices[0] as Record<string, unknown> | undefined)
    ?.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== 'object') {
    throw new LlmProviderError('The AI provider returned an invalid response.');
  }
  const content = typeof message.content === 'string' ? message.content : null;
  const toolCalls: ToolCall[] = [];
  const rawCalls = message.tool_calls;
  if (Array.isArray(rawCalls)) {
    for (const call of rawCalls) {
      if (!call || typeof call !== 'object') continue;
      const entry = call as Record<string, unknown>;
      const fn = entry.function as Record<string, unknown> | undefined;
      if (
        typeof entry.id === 'string' &&
        fn &&
        typeof fn.name === 'string' &&
        typeof fn.arguments === 'string'
      ) {
        toolCalls.push({
          id: entry.id,
          name: fn.name,
          arguments: fn.arguments,
        });
      }
    }
  }
  return {
    content,
    toolCalls,
    model: typeof record.model === 'string' ? record.model : '',
  };
}
