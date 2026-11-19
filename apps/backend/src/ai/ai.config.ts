/**
 * AI configuration, resolved from environment variables.
 *
 * OPENROUTER_API_KEY is the only secret and is optional: without it the AI
 * endpoints answer 503 ("AI is not configured") instead of crashing, so the
 * rest of the app keeps working. Set it in Render env vars, never in the
 * repo, never in a test, never in a log.
 *
 * Model IDs are configurable so a model can be swapped without a code
 * change. The defaults below were verified against the live OpenRouter
 * catalog on 2026-11-19:
 *
 * - The synopsis names Qwen2.5-7B/14B-Instruct and DeepSeek-R1-Distill-7B/14B,
 *   but those exact IDs no longer exist on OpenRouter (no Qwen2.5 7B/14B
 *   instruct model and no R1-Distill model at all; there are also no free
 *   Qwen or DeepSeek models). The defaults are the nearest existing IDs in
 *   the same families: Qwen2.5-72B-Instruct for the primary model and the
 *   full DeepSeek-R1 (0528) for deep reasoning. Both are paid but cheap at
 *   prototype scale (about $0.36 and $0.57 per million prompt tokens).
 * - To run free instead, point LLM_MODEL_PRIMARY at a `:free` model
 *   (for example a Nemotron or Gemma free variant) or at `openrouter/free`
 *   — the code does not depend on any specific model.
 */
export interface AiConfig {
  apiKey: string | undefined;
  baseUrl: string;
  primaryModel: string;
  reasoningModel: string;
  /** Per-LLM-call timeout in milliseconds. */
  timeoutMs: number;
  /** Maximum tool-calling rounds before the final answer is forced. */
  maxToolRounds: number;
  /** Per-user requests allowed inside the rate-limit window. */
  rateLimitPerMinute: number;
  rateLimitWindowMs: number;
  /** How long an identical query's answer is reused (latency, §4.3). */
  cacheTtlMs: number;
  /** Maximum cached answers held in memory. */
  cacheMaxEntries: number;
}

export const DEFAULT_PRIMARY_MODEL = 'qwen/qwen-2.5-72b-instruct';
export const DEFAULT_REASONING_MODEL = 'deepseek/deepseek-r1-0528';
export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_TOOL_ROUNDS = 4;
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_CACHE_TTL_MS = 60_000;
export const DEFAULT_CACHE_MAX_ENTRIES = 100;

function text(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveAiConfig(
  get: (key: string) => string | undefined,
): AiConfig {
  const apiKey = get('OPENROUTER_API_KEY')?.trim();
  return {
    apiKey: apiKey ? apiKey : undefined,
    baseUrl: text(get('LLM_BASE_URL'), DEFAULT_BASE_URL),
    primaryModel: text(get('LLM_MODEL_PRIMARY'), DEFAULT_PRIMARY_MODEL),
    reasoningModel: text(get('LLM_MODEL_REASONING'), DEFAULT_REASONING_MODEL),
    timeoutMs: positiveInt(get('LLM_TIMEOUT_MS'), DEFAULT_TIMEOUT_MS),
    maxToolRounds: positiveInt(
      get('LLM_MAX_TOOL_ROUNDS'),
      DEFAULT_MAX_TOOL_ROUNDS,
    ),
    rateLimitPerMinute: positiveInt(
      get('LLM_RATE_LIMIT_PER_MINUTE'),
      DEFAULT_RATE_LIMIT_PER_MINUTE,
    ),
    rateLimitWindowMs: positiveInt(
      get('LLM_RATE_LIMIT_WINDOW_MS'),
      DEFAULT_RATE_LIMIT_WINDOW_MS,
    ),
    cacheTtlMs: positiveInt(get('LLM_CACHE_TTL_MS'), DEFAULT_CACHE_TTL_MS),
    cacheMaxEntries: positiveInt(
      get('LLM_CACHE_MAX_ENTRIES'),
      DEFAULT_CACHE_MAX_ENTRIES,
    ),
  };
}
