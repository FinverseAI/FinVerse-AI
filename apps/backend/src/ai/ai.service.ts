import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeSymbol } from '../market/market.validation';
import { RagIngestService } from '../rag/rag.ingest';
import {
  isReadinessAssessment,
  type ReadinessAssessment,
} from '../readiness/readiness.formula';
import {
  formatRetrievedContext,
  formatScreenResults,
} from '../rag/rag.prompts';
import {
  RagRetrievalService,
  type RetrievedContext,
} from '../rag/rag.retrieval';
import { RagService } from '../rag/rag.service';
import { ScreenFiltersSchema } from '../rag/rag.validation';
import { AiResponseCache } from './ai.cache';
import { resolveAiConfig, type AiConfig } from './ai.config';
import {
  chunksFromRetrieved,
  chunksFromToolResults,
  type GuardrailContext,
  type VerificationState,
} from './ai.guardrail';
import { GuardrailService } from './ai.guardrail.service';
import {
  chatTemplate,
  explainNewsTemplate,
  explainStockTemplate,
  readinessTemplate,
  screenTemplate,
  type TemplateAnswer,
} from './ai.guardrail-templates';
import {
  LLM_CLIENT,
  LlmProviderError,
  type ChatMessage,
  type LlmClient,
  type ToolCall,
} from './ai.provider';
import {
  AI_DISCLAIMER,
  NEWS_EXPLANATION_INTRO,
  READINESS_EXPLANATION_INTRO,
  NO_RETRIEVED_CONTEXT_NOTE,
  SCREENER_SUMMARY_INTRO,
  SCREENER_TRANSLATION_INTRO,
  STOCK_EXPLANATION_INTRO,
  STRUCTURED_OUTPUT_INSTRUCTIONS,
  SYSTEM_PROMPT,
  correctionPrompt,
  guardrailCorrectionPrompt,
} from './ai.prompts';
import { AiRateLimiter } from './ai.rate-limit';
import {
  AI_TOOL_DEFINITIONS,
  APPLY_SCREENER_FILTERS_TOOL,
  AiTools,
} from './ai.tools';
import {
  AiAnswerSchema,
  ChatRequestSchema,
  ExplainNewsRequestSchema,
  ExplainReadinessRequestSchema,
  ExplainStockRequestSchema,
  ScreenQueryRequestSchema,
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
  /** Phase 3: how this answer was verified before it reached the user. */
  verification: VerificationState;
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

/** A tool result that is a failure marker, not evidence the model may cite. */
function isToolError(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    !Array.isArray(result) &&
    typeof (result as Record<string, unknown>).error === 'string'
  );
}

function unavailableVerification(): VerificationState {
  return { status: 'unavailable', checksPassed: 0, checksFailed: 0 };
}

function refusedVerification(): VerificationState {
  return { status: 'refused', checksPassed: 0, checksFailed: 0 };
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
    private readonly retrieval: RagRetrievalService,
    private readonly ingest: RagIngestService,
    private readonly rag: RagService,
    private readonly guardrail: GuardrailService,
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
    const context = await this.retrieveStockContext(userId, symbol);
    const response =
      this.config.apiKey === undefined
        ? this.explainFallback(
            symbol,
            fundamentals,
            'AI explanations are not configured yet. Here are the computed figures without the narrative.',
          )
        : await this.explainWithModel(
            userId,
            symbol,
            question,
            fundamentals,
            context,
          );
    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * A RAG-grounded explanation of a stock's recent news. The news index
   * is refreshed first; then retrieval decides the path:
   *
   * - retrieval unavailable → fall back to the raw news list;
   * - retrieval available but nothing relevant → a deterministic honest
   *   refusal WITHOUT calling the model (the model has nothing to ground
   *   an answer in, so asking it would only invite memory);
   * - relevant articles found → the model explains from them, citing
   *   each article by title and date.
   */
  async explainNews(userId: string, input: unknown): Promise<AiChatResponse> {
    const parsed = ExplainNewsRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(firstIssueMessage(parsed.error));
    }
    const symbol = normalizeSymbol(parsed.data.symbol);
    const question = parsed.data.question;
    const cacheKey = `explain-news:${userId}:${symbol}:${(question ?? '').toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.allow(userId)) {
      throw new HttpException(
        'You are asking too quickly. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.ingest.indexNews(symbol);
    if (this.config.apiKey === undefined) {
      const response = await this.newsFallback(
        symbol,
        'AI explanations are not configured yet. Here are the recent articles without the narrative.',
      );
      this.cache.set(cacheKey, response);
      return response;
    }
    const context = await this.retrieval.retrieve(
      userId,
      question ? `${question} ${symbol}` : `news about ${symbol}`,
      { symbol, sourceType: 'news' },
    );
    let response: AiChatResponse;
    if (!context.available) {
      response = await this.newsFallback(
        symbol,
        'News explanations are unavailable right now. Here are the recent articles without the narrative.',
      );
    } else if (context.chunks.length === 0) {
      response = {
        answer: `No relevant news was found for ${symbol} in the indexed articles, so there is nothing to explain from. Try again later, when newer articles may have been indexed.`,
        claims: [],
        refused: true,
        refusalReason: `No relevant news articles were retrieved for ${symbol}.`,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        model: null,
        toolsUsed: ['searchKnowledge'],
        disclaimer: AI_DISCLAIMER,
        verification: refusedVerification(),
      };
    } else {
      response = await this.explainNewsWithModel(
        userId,
        symbol,
        question,
        context,
      );
    }
    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * A reasoning-model explanation of the user's investment readiness
   * score. The score itself is deterministic — the model only explains
   * WHY it is what it is, from the computed assessment, through the
   * guardrail. An unavailable assessment is an honest refusal WITHOUT
   * a model call (there is nothing to explain from); a missing API key
   * falls back to the raw score without the narrative.
   */
  async explainReadiness(
    userId: string,
    input: unknown,
  ): Promise<AiChatResponse> {
    const parsed = ExplainReadinessRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(firstIssueMessage(parsed.error));
    }
    const question = parsed.data.question;
    const cacheKey = `explain-readiness:${userId}:${(question ?? '').toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.allow(userId)) {
      throw new HttpException(
        'You are asking too quickly. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const assessment = await this.tools.execute(
      userId,
      'getReadinessScore',
      {},
    );
    if (!isReadinessAssessment(assessment)) {
      const reason =
        typeof assessment === 'object' &&
        assessment !== null &&
        typeof (assessment as { reason?: unknown }).reason === 'string'
          ? (assessment as { reason: string }).reason
          : 'Your investment readiness score is not available yet.';
      const response: AiChatResponse = {
        answer: `${reason} Once your data is complete, the explanation will walk through each factor.`,
        claims: [],
        refused: true,
        refusalReason: reason,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        model: null,
        toolsUsed: ['getReadinessScore'],
        disclaimer: AI_DISCLAIMER,
        verification: refusedVerification(),
      };
      this.cache.set(cacheKey, response);
      return response;
    }
    const response =
      this.config.apiKey === undefined
        ? this.readinessFallback(
            assessment,
            'AI explanations are not configured yet. Here is your score without the narrative.',
          )
        : await this.explainReadinessWithModel(userId, question, assessment);
    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * The natural-language screener (strategy doc §3.1): the model
   * translates the criterion into filter conditions via one forced tool
   * call, the deterministic screen runs those filters, and the model
   * summarises the results. If the translation fails, the screen still
   * runs — unfiltered — and the summary says the criterion could not be
   * turned into exact filters.
   */
  async screenByQuery(userId: string, input: unknown): Promise<AiChatResponse> {
    const parsed = ScreenQueryRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(firstIssueMessage(parsed.error));
    }
    const query = parsed.data.query;
    const cacheKey = `screen:${userId}:${query.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    if (!this.limiter.allow(userId)) {
      throw new HttpException(
        'You are asking too quickly. Please wait a moment and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (this.config.apiKey === undefined) {
      const screen = await this.rag.screen(userId, {});
      const response: AiChatResponse = {
        answer: null,
        claims: [],
        refused: false,
        refusalReason: null,
        fallback: true,
        fallbackReason:
          'AI explanations are not configured yet. Here are the screened stocks without the summary.',
        metrics: { screen, filters: {} },
        model: null,
        toolsUsed: ['screenStocks'],
        disclaimer: AI_DISCLAIMER,
        verification: unavailableVerification(),
      };
      this.cache.set(cacheKey, response);
      return response;
    }
    const response = await this.screenByQueryWithModel(userId, query);
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
      // The guardrail checks the answer against exactly what the tools
      // returned in THIS request, so successful results are retained
      // (failures are not evidence — the model must not cite them).
      const toolResults = new Map<string, unknown[]>();
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
          if (!isToolError(result)) {
            const results = toolResults.get(call.name) ?? [];
            results.push(result);
            toolResults.set(call.name, results);
          }
          messages.push({
            role: 'tool',
            content: truncate(JSON.stringify(result)),
            tool_call_id: call.id,
          });
        }
      }
      const guardrailContext: GuardrailContext = {
        requestId: randomUUID(),
        userId,
        feature: 'chat',
        toolResults,
        chunks: chunksFromToolResults(toolResults.get('searchKnowledge') ?? []),
      };
      const { answer, verification } = await this.guardedAnswer(
        messages,
        this.config.primaryModel,
        guardrailContext,
        async () => {
          const { metrics } = await this.snapshotMetrics(userId);
          return chatTemplate(metrics);
        },
      );
      return {
        answer: answer.answer,
        claims: answer.claims,
        refused: answer.refused,
        refusalReason: answer.refusalReason ?? null,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        // A template answer is built by code, not by the model.
        model:
          verification.status === 'template' ? null : this.config.primaryModel,
        toolsUsed,
        disclaimer: AI_DISCLAIMER,
        verification,
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

  /**
   * The stock's retrieved context: the company profile is indexed on
   * first use (cheap no-op afterwards), then news + profile chunks are
   * retrieved for the symbol. Retrieval never throws — an outage yields
   * available: false and the explanation proceeds from fundamentals
   * alone.
   */
  private async retrieveStockContext(
    userId: string,
    symbol: string,
  ): Promise<RetrievedContext> {
    await this.ingest.ensureProfileIndexed(symbol);
    return this.retrieval.retrieve(
      userId,
      `news and background for ${symbol}`,
      {
        symbol,
      },
    );
  }

  private async explainWithModel(
    userId: string,
    symbol: string,
    question: string | undefined,
    fundamentals: unknown,
    context: RetrievedContext,
  ): Promise<AiChatResponse> {
    try {
      const contextBlock =
        context.available && context.chunks.length > 0
          ? formatRetrievedContext(context.chunks)
          : context.available
            ? NO_RETRIEVED_CONTEXT_NOTE
            : '';
      const userContent = [
        STOCK_EXPLANATION_INTRO,
        question ? `The user asks: ${question}` : '',
        contextBlock,
        `Computed data for ${symbol}:`,
        truncate(JSON.stringify(fundamentals), MAX_EXPLAIN_DATA_CHARS),
      ]
        .filter((line) => line !== '')
        .join('\n');
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];
      const chunks = chunksFromRetrieved(context.chunks);
      const guardrailContext: GuardrailContext = {
        requestId: randomUUID(),
        userId,
        feature: 'explain-stock',
        toolResults: new Map([['getStockFundamentals', [fundamentals]]]),
        chunks,
      };
      const { answer, verification } = await this.guardedAnswer(
        messages,
        this.config.reasoningModel,
        guardrailContext,
        async () => explainStockTemplate(symbol, fundamentals),
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
        model:
          verification.status === 'template'
            ? null
            : this.config.reasoningModel,
        toolsUsed:
          context.available && context.chunks.length > 0
            ? ['getStockFundamentals', 'searchKnowledge']
            : ['getStockFundamentals'],
        disclaimer: AI_DISCLAIMER,
        verification,
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

  private async explainNewsWithModel(
    userId: string,
    symbol: string,
    question: string | undefined,
    context: RetrievedContext,
  ): Promise<AiChatResponse> {
    try {
      const userContent = [
        NEWS_EXPLANATION_INTRO,
        question ? `The user asks: ${question}` : '',
        formatRetrievedContext(context.chunks),
      ]
        .filter((line) => line !== '')
        .join('\n');
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];
      const chunks = chunksFromRetrieved(context.chunks);
      const guardrailContext: GuardrailContext = {
        requestId: randomUUID(),
        userId,
        feature: 'explain-news',
        toolResults: new Map(),
        chunks,
      };
      const { answer, verification } = await this.guardedAnswer(
        messages,
        this.config.primaryModel,
        guardrailContext,
        async () => explainNewsTemplate(symbol, chunks),
      );
      return {
        answer: answer.answer,
        claims: answer.claims,
        refused: answer.refused,
        refusalReason: answer.refusalReason ?? null,
        fallback: false,
        fallbackReason: null,
        metrics: null,
        model:
          verification.status === 'template' ? null : this.config.primaryModel,
        toolsUsed: ['searchKnowledge'],
        disclaimer: AI_DISCLAIMER,
        verification,
      };
    } catch (error) {
      if (
        error instanceof LlmProviderError ||
        error instanceof AiUnverifiableError
      ) {
        return this.newsFallback(
          symbol,
          error instanceof AiUnverifiableError
            ? 'The AI answer could not be verified. Here are the recent articles without the narrative.'
            : 'The AI service is unavailable right now. Here are the recent articles without the narrative.',
        );
      }
      throw error;
    }
  }

  private async explainReadinessWithModel(
    userId: string,
    question: string | undefined,
    assessment: ReadinessAssessment,
  ): Promise<AiChatResponse> {
    try {
      const userContent = [
        READINESS_EXPLANATION_INTRO,
        question ? `The user asks: ${question}` : '',
        'Your computed readiness assessment:',
        truncate(JSON.stringify(assessment), MAX_EXPLAIN_DATA_CHARS),
      ]
        .filter((line) => line !== '')
        .join('\n');
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];
      const guardrailContext: GuardrailContext = {
        requestId: randomUUID(),
        userId,
        feature: 'explain-readiness',
        toolResults: new Map([['getReadinessScore', [assessment]]]),
        chunks: [],
      };
      const { answer, verification } = await this.guardedAnswer(
        messages,
        this.config.reasoningModel,
        guardrailContext,
        async () => readinessTemplate(assessment),
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
        model:
          verification.status === 'template'
            ? null
            : this.config.reasoningModel,
        toolsUsed: ['getReadinessScore'],
        disclaimer: AI_DISCLAIMER,
        verification,
      };
    } catch (error) {
      if (
        error instanceof LlmProviderError ||
        error instanceof AiUnverifiableError
      ) {
        return this.readinessFallback(
          assessment,
          error instanceof AiUnverifiableError
            ? 'The AI answer could not be verified. Here is your score without the narrative.'
            : 'The AI service is unavailable right now. Here is your score without the narrative.',
        );
      }
      throw error;
    }
  }

  /** The raw score, shown when the narrative is unavailable. */
  private readinessFallback(
    assessment: ReadinessAssessment,
    reason: string,
  ): AiChatResponse {
    return {
      answer: null,
      claims: [],
      refused: false,
      refusalReason: null,
      fallback: true,
      fallbackReason: reason,
      metrics: { assessment },
      model: null,
      toolsUsed: ['getReadinessScore'],
      disclaimer: AI_DISCLAIMER,
      verification: unavailableVerification(),
    };
  }

  /** The raw news list + sentiment, shown when the narrative is unavailable. */
  private async newsFallback(
    symbol: string,
    reason: string,
  ): Promise<AiChatResponse> {
    const news = await this.rag.newsForSymbol(symbol).catch(() => null);
    return {
      answer: null,
      claims: [],
      refused: false,
      refusalReason: null,
      fallback: true,
      fallbackReason: reason,
      metrics: news ? { symbol, news } : { symbol },
      model: null,
      toolsUsed: ['searchKnowledge'],
      disclaimer: AI_DISCLAIMER,
      verification: unavailableVerification(),
    };
  }

  private async screenByQueryWithModel(
    userId: string,
    query: string,
  ): Promise<AiChatResponse> {
    let filters: unknown = {};
    let translationNote: string | null = null;
    try {
      const translation = await this.client.chat({
        model: this.config.primaryModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${SCREENER_TRANSLATION_INTRO}\n\nThe user's criterion: "${query}"`,
          },
        ],
        tools: [APPLY_SCREENER_FILTERS_TOOL],
        toolChoice: {
          type: 'function',
          function: { name: 'applyScreenerFilters' },
        },
        timeoutMs: this.config.timeoutMs,
      });
      const call = translation.toolCalls.find(
        (toolCall) => toolCall.name === 'applyScreenerFilters',
      );
      if (call) {
        try {
          const parsed = ScreenFiltersSchema.safeParse(
            JSON.parse(call.arguments),
          );
          if (parsed.success) {
            filters = parsed.data;
          } else {
            translationNote =
              'The criterion could not be turned into exact filters, so all screened stocks are shown.';
          }
        } catch {
          translationNote =
            'The criterion could not be turned into exact filters, so all screened stocks are shown.';
        }
      } else {
        translationNote =
          'The criterion could not be turned into exact filters, so all screened stocks are shown.';
      }
    } catch (error) {
      if (error instanceof LlmProviderError) {
        return this.screenFallback(
          userId,
          'The AI service is unavailable right now. Here are the screened stocks without the summary.',
        );
      }
      throw error;
    }
    const screen = await this.rag.screen(userId, filters);
    try {
      const userContent = [
        SCREENER_SUMMARY_INTRO,
        `The user's criterion was: "${query}"`,
        formatScreenResults(screen),
      ].join('\n');
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];
      const guardrailContext: GuardrailContext = {
        requestId: randomUUID(),
        userId,
        feature: 'screen',
        toolResults: new Map(),
        chunks: [],
        screen,
      };
      const { answer, verification } = await this.guardedAnswer(
        messages,
        this.config.primaryModel,
        guardrailContext,
        async () => screenTemplate(screen),
      );
      return {
        answer: answer.answer,
        claims: answer.claims,
        refused: answer.refused,
        refusalReason: answer.refusalReason ?? null,
        fallback: false,
        fallbackReason: null,
        metrics: {
          screen,
          filters,
          note: translationNote,
        },
        model:
          verification.status === 'template' ? null : this.config.primaryModel,
        toolsUsed: ['screenStocks'],
        disclaimer: AI_DISCLAIMER,
        verification,
      };
    } catch (error) {
      if (
        error instanceof LlmProviderError ||
        error instanceof AiUnverifiableError
      ) {
        return {
          answer: null,
          claims: [],
          refused: false,
          refusalReason: null,
          fallback: true,
          fallbackReason:
            'The AI summary is unavailable right now. Here are the screened stocks without the summary.',
          metrics: { screen, filters, note: translationNote },
          model: null,
          toolsUsed: ['screenStocks'],
          disclaimer: AI_DISCLAIMER,
          verification: unavailableVerification(),
        };
      }
      throw error;
    }
  }

  /** The unfiltered screen, shown when the translation call itself fails. */
  private async screenFallback(
    userId: string,
    reason: string,
  ): Promise<AiChatResponse> {
    const screen = await this.rag.screen(userId, {});
    return {
      answer: null,
      claims: [],
      refused: false,
      refusalReason: null,
      fallback: true,
      fallbackReason: reason,
      metrics: { screen, filters: {} },
      model: null,
      toolsUsed: ['screenStocks'],
      disclaimer: AI_DISCLAIMER,
      verification: unavailableVerification(),
    };
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

  /**
   * The guarded answer (Phase 3): every model answer is verified
   * against the evidence of THIS request before it reaches the user.
   * Refusals skip verification (there is nothing to check). A failed
   * answer gets exactly ONE retry with a correction prompt naming the
   * failed claims and their correct values; if it still fails, the
   * template answer — built only from verified numbers — is returned
   * instead. No unverified claim ever reaches the user.
   *
   * Malformed JSON keeps the existing behaviour: structuredAnswer
   * throws AiUnverifiableError and the caller falls back to raw
   * metrics. The template applies only to valid JSON that fails
   * verification.
   */
  private async guardedAnswer(
    messages: ChatMessage[],
    model: string,
    context: GuardrailContext,
    template: () => Promise<TemplateAnswer>,
    maxTokens?: number,
  ): Promise<{ answer: AiAnswer; verification: VerificationState }> {
    const first = await this.structuredAnswer(messages, model, maxTokens);
    if (first.refused) {
      return { answer: first, verification: refusedVerification() };
    }
    const firstResult = await this.guardrail.verify(first, context, 1);
    if (firstResult.passed) {
      return {
        answer: first,
        verification: {
          status: 'verified',
          checksPassed: firstResult.checksPassed,
          checksFailed: 0,
        },
      };
    }
    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(first) },
      {
        role: 'user',
        content: guardrailCorrectionPrompt(firstResult.failures),
      },
    ];
    const second = await this.structuredAnswer(retryMessages, model, maxTokens);
    if (second.refused) {
      return { answer: second, verification: refusedVerification() };
    }
    const secondResult = await this.guardrail.verify(second, context, 2);
    if (secondResult.passed) {
      return {
        answer: second,
        verification: {
          status: 'verified',
          checksPassed: secondResult.checksPassed,
          checksFailed: 0,
        },
      };
    }
    const built = await template();
    return {
      answer: {
        answer: built.answer,
        claims: built.claims,
        refused: false,
        refusalReason: null,
      },
      verification: {
        status: 'template',
        checksPassed: secondResult.checksPassed,
        checksFailed: secondResult.checksFailed,
      },
    };
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
      verification: unavailableVerification(),
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
      verification: unavailableVerification(),
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
