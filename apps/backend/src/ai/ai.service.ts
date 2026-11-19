import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeSymbol } from '../market/market.validation';
import { AiResponseCache } from './ai.cache';
import { resolveAiConfig, type AiConfig } from './ai.config';
import {
  LLM_CLIENT,
  LlmProviderError,
  type ChatMessage,
  type LlmClient,
  type ToolCall,
} from './ai.provider';
import {
  AI_DISCLAIMER,
  STOCK_EXPLANATION_INTRO,
  STRUCTURED_OUTPUT_INSTRUCTIONS,
  SYSTEM_PROMPT,
  correctionPrompt,
} from './ai.prompts';
import { AiRateLimiter } from './ai.rate-limit';
import { AI_TOOL_DEFINITIONS, AiTools } from './ai.tools';
import {
  AiAnswerSchema,
  ChatRequestSchema,
  ExplainStockRequestSchema,
  firstIssueMessage,
  parseStructuredJson,
  type AiAnswer,
  type AiClaim,
} from './ai.validation';

/**
 * The AI service: tool-calling chat and stock explanations over the
 * deterministic layer. The model reasons; the code calculates.
 *
 * Fallback design (strategy doc §4.7): when the model is unavailable (no
 * API key, provider error, timeout) or its answer cannot be validated,
 * the feature never fails outright — it returns the raw computed metrics
 * without the narrative (`fallback: true`), so the user still sees their
 * numbers. Rate limiting (429), bad requests (400), and missing data
 * (503, e.g. no price at all for a symbol) still fail with their status:
 * those are not model failures.
 */

export interface AiChatResponse {
  answer: string | null;
  claims: AiClaim[];
  refused: boolean;
  refusalReason: string | null;
  fallback: boolean;
  fallbackReason: string | null;
  metrics: Record<string, unknown> | null;
  model: string | null;
  toolsUsed: string[];
  disclaimer: string;
}

/** The model answered twice without producing a valid structured answer. */
export class AiUnverifiableError extends Error {}

/** Tool results are capped so one large result cannot flood the prompt. */
const MAX_TOOL_RESULT_CHARS = 6000;
const MAX_EXPLAIN_DATA_CHARS = 8000;
/** The reasoning model needs room for its chain of thought. */
const REASONING_MAX_TOKENS = 4096;

function truncate(value: string, max = MAX_TOOL_RESULT_CHARS): string {
  return value.length > max ? `${value.slice(0, max)}\u2026[truncated]` : value;
}

/** A safe message to hand back to the model when a tool fails. */
function toolErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
      const message = (response as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
    }
    return error.message;
  }
  return 'The tool could not complete this request.';
}

@Injectable()
export class AiService {
  private readonly config: AiConfig;
  private readonly limiter: AiRateLimiter;
  private readonly cache: AiResponseCache<AiChatResponse>;

  constructor(
    configService: ConfigService,
    private readonly tools: AiTools,
    @Inject(LLM_CLIENT) private readonly client: LlmClient,
  ) {
    this.config = resolveAiConfig((key) => configService.get<string>(key));
    this.limiter = new AiRateLimiter(
      this.config.rateLimitPerMinute,
      this.config.rateLimitWindowMs,
    );
    this.cache = new AiResponseCache<AiChatResponse>(
      this.config.cacheTtlMs,
      this.config.cacheMaxEntries,
    );
  }

  /** Never includes the API key — only whether one is set. */
  status() {
    return {
      configured: this.config.apiKey !== undefined,
      primaryModel: this.config.primaryModel,
      reasoningModel: this.config.reasoningModel,
    };
  }

  async chat(userId: string, input: unknown): Promise<AiChatResponse> {
    const parsed = ChatRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(firstIssueMessage(parsed.error));
    }
    const message = parsed.data.message;
    const cacheKey = `chat:${userId}:${message.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.allow(userId)) {
      throw new HttpException(
        'You are asking too quickly. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const response =
      this.config.apiKey === undefined
        ? await this.chatFallback(
            userId,
            'AI explanations are not configured yet. Here are your numbers without the narrative.',
          )
        : await this.chatWithModel(userId, message);
    this.cache.set(cacheKey, response);
    return response;
  }

  async explainStock(userId: string, input: unknown): Promise<AiChatResponse> {
    const parsed = ExplainStockRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(firstIssueMessage(parsed.error));
    }
    const symbol = normalizeSymbol(parsed.data.symbol);
    const question = parsed.data.question;
    const cacheKey = `explain:${userId}:${symbol}:${(question ?? '').toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.allow(userId)) {
      throw new HttpException(
        'You are asking too quickly. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Deterministic data first: without it there is nothing to explain,
    // with or without a model. If the data itself is unavailable the
    // service fails honestly (503) — that is a data failure, not a model
    // failure, and there are no metrics to fall back to.
    const fundamentals = await this.tools.execute(
      userId,
      'getStockFundamentals',
      { symbol },
    );
    const response =
      this.config.apiKey === undefined
        ? this.explainFallback(
            symbol,
            fundamentals,
            'AI explanations are not configured yet. Here are the computed figures without the narrative.',
          )
        : await this.explainWithModel(symbol, question, fundamentals);
    this.cache.set(cacheKey, response);
    return response;
  }

  private async chatWithModel(
    userId: string,
    message: string,
  ): Promise<AiChatResponse> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ];
      const toolsUsed: string[] = [];
      for (let round = 0; round < this.config.maxToolRounds; round++) {
        const completion = await this.client.chat({
          model: this.config.primaryModel,
          messages,
          tools: AI_TOOL_DEFINITIONS,
          timeoutMs: this.config.timeoutMs,
        });
        if (completion.toolCalls.length === 0) break;
        messages.push({
          role: 'assistant',
          content: completion.content,
          tool_calls: completion.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.arguments },
          })),
        });
        for (const call of completion.toolCalls) {
          if (!toolsUsed.includes(call.name)) toolsUsed.push(call.name);
          const result = await this.runTool(userId, call);
          messages.push({
            role: 'tool',
            content: truncate(JSON.stringify(result)),
            tool_call_id: call.id,
          });
        }
      }
      const answer = await this.structuredAnswer(
        messages,
        this.config.primaryModel,
      );
      return {
        answer: answer.answer,
        claims: answer.claims,
        refused: answer.refused,
        refusalReason: answer.refusalReason ?? null,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        model: this.config.primaryModel,
        toolsUsed,
        disclaimer: AI_DISCLAIMER,
      };
    } catch (error) {
      if (
        error instanceof LlmProviderError ||
        error instanceof AiUnverifiableError
      ) {
        return this.chatFallback(
          userId,
          error instanceof AiUnverifiableError
            ? 'The AI answer could not be verified. Here are your numbers without the narrative.'
            : 'The AI service is unavailable right now. Here are your numbers without the narrative.',
        );
      }
      throw error;
    }
  }

  private async explainWithModel(
    symbol: string,
    question: string | undefined,
    fundamentals: unknown,
  ): Promise<AiChatResponse> {
    try {
      const userContent = [
        STOCK_EXPLANATION_INTRO,
        question ? `The user asks: ${question}` : '',
        `Computed data for ${symbol}:`,
        truncate(JSON.stringify(fundamentals), MAX_EXPLAIN_DATA_CHARS),
      ]
        .filter((line) => line !== '')
        .join('\n');
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];
      const answer = await this.structuredAnswer(
        messages,
        this.config.reasoningModel,
        REASONING_MAX_TOKENS,
      );
      return {
        answer: answer.answer,
        claims: answer.claims,
        refused: answer.refused,
        refusalReason: answer.refusalReason ?? null,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        model: this.config.reasoningModel,
        toolsUsed: ['getStockFundamentals'],
        disclaimer: AI_DISCLAIMER,
      };
    } catch (error) {
      if (
        error instanceof LlmProviderError ||
        error instanceof AiUnverifiableError
      ) {
        return this.explainFallback(
          symbol,
          fundamentals,
          error instanceof AiUnverifiableError
            ? 'The AI answer could not be verified. Here are the computed figures without the narrative.'
            : 'The AI service is unavailable right now. Here are the computed figures without the narrative.',
        );
      }
      throw error;
    }
  }

  /**
   * The final structured answer: one call asking for the JSON object, one
   * retry with a correction prompt when the reply is not valid. Anything
   * else throws, and the caller falls back to raw metrics.
   */
  private async structuredAnswer(
    messages: ChatMessage[],
    model: string,
    maxTokens?: number,
  ): Promise<AiAnswer> {
    const withInstructions: ChatMessage[] = [
      ...messages,
      { role: 'user', content: STRUCTURED_OUTPUT_INSTRUCTIONS },
    ];
    const first = await this.client.chat({
      model,
      messages: withInstructions,
      responseFormatJson: true,
      timeoutMs: this.config.timeoutMs,
      maxTokens,
    });
    const parsed = parseStructuredJson(first.content, AiAnswerSchema);
    if (parsed.ok) return parsed.value;
    const retry = await this.client.chat({
      model,
      messages: [
        ...withInstructions,
        { role: 'assistant', content: first.content },
        { role: 'user', content: correctionPrompt(first.content ?? '') },
      ],
      responseFormatJson: true,
      timeoutMs: this.config.timeoutMs,
      maxTokens,
    });
    const reparsed = parseStructuredJson(retry.content, AiAnswerSchema);
    if (reparsed.ok) return reparsed.value;
    throw new AiUnverifiableError();
  }

  private async runTool(userId: string, call: ToolCall): Promise<unknown> {
    let args: unknown;
    try {
      args = JSON.parse(call.arguments);
    } catch {
      return { error: 'The tool arguments were not valid JSON.' };
    }
    try {
      return await this.tools.execute(userId, call.name, args);
    } catch (error) {
      return { error: toolErrorMessage(error) };
    }
  }

  private async chatFallback(
    userId: string,
    reason: string,
  ): Promise<AiChatResponse> {
    const { metrics, toolsUsed } = await this.snapshotMetrics(userId);
    return {
      answer: null,
      claims: [],
      refused: false,
      refusalReason: null,
      fallback: true,
      fallbackReason: reason,
      metrics,
      model: null,
      toolsUsed,
      disclaimer: AI_DISCLAIMER,
    };
  }

  private explainFallback(
    symbol: string,
    fundamentals: unknown,
    reason: string,
  ): AiChatResponse {
    return {
      answer: null,
      claims: [],
      refused: false,
      refusalReason: null,
      fallback: true,
      fallbackReason: reason,
      metrics: { symbol, fundamentals },
      model: null,
      toolsUsed: ['getStockFundamentals'],
      disclaimer: AI_DISCLAIMER,
    };
  }

  /** Best-effort snapshot: each section degrades independently. */
  private async snapshotMetrics(userId: string): Promise<{
    metrics: Record<string, unknown>;
    toolsUsed: string[];
  }> {
    const sections = await Promise.all([
      this.tools
        .execute(userId, 'getBudgetStatus', {})
        .then((value) => ({ name: 'getBudgetStatus', value }))
        .catch(() => ({
          name: 'getBudgetStatus',
          value: { available: false },
        })),
      this.tools
        .execute(userId, 'getGoalProgress', {})
        .then((value) => ({ name: 'getGoalProgress', value }))
        .catch(() => ({
          name: 'getGoalProgress',
          value: { available: false },
        })),
      this.tools
        .execute(userId, 'getPortfolioSummary', {})
        .then((value) => ({ name: 'getPortfolioSummary', value }))
        .catch(() => ({
          name: 'getPortfolioSummary',
          value: { available: false },
        })),
    ]);
    const metrics: Record<string, unknown> = {};
    const toolsUsed: string[] = [];
    for (const section of sections) {
      metrics[section.name] = section.value;
      toolsUsed.push(section.name);
    }
    return { metrics, toolsUsed };
  }
}
