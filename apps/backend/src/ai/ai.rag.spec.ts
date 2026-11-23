import { ConfigService } from '@nestjs/config';
import type { RagIngestService } from '../rag/rag.ingest';
import type { RagRetrievalService } from '../rag/rag.retrieval';
import type { RagService } from '../rag/rag.service';
import type { GuardrailService } from './ai.guardrail.service';
import {
  LlmProviderError,
  type ChatCompletion,
  type ChatOptions,
  type LlmClient,
} from './ai.provider';
import { AiService } from './ai.service';
import type { AiTools } from './ai.tools';

/**
 * The Phase 2 acceptance tests (plan §2, Phase 2):
 *
 * 1. An explanation about a news event cites the retrieved article
 *    (title + date).
 * 2. A question with no relevant retrieved context says so instead of
 *    answering from memory.
 *
 * Plus the surrounding RAG behaviours: retrieval outages degrade to
 * fundamentals-only explanations, the chat tool loop can retrieve, and
 * the NL screener translates criteria into deterministic filters.
 */

const USER_ID = 'user-123';

const NEWS_ANSWER_JSON = JSON.stringify({
  answer: 'Reliance reported a profit jump, according to Reuters.',
  claims: [
    {
      text: 'Reliance profit jumped.',
      source: {
        tool: 'searchKnowledge',
        values: { title: 'Reliance profit jumps', date: '2026-11-18' },
      },
    },
  ],
  refused: false,
  refusalReason: null,
});

const SCREEN_SUMMARY_JSON = JSON.stringify({
  answer: 'RELIANCE.NS stands out with a high RSI.',
  claims: [
    {
      text: 'RELIANCE.NS has an RSI of 100.',
      source: {
        tool: 'screenStocks',
        values: { symbol: 'RELIANCE.NS', rsi14: 100 },
      },
    },
  ],
  refused: false,
  refusalReason: null,
});

const FUNDAMENTALS = {
  symbol: 'RELIANCE.NS',
  name: 'Reliance Industries',
  price: 2600,
  fundamentals: { sector: 'Energy', marketCap: 1 },
  technicals: { rsi14: 60 },
};

const NEWS_CHUNK = {
  id: 'doc-1',
  source_type: 'news',
  source_id: 'https://example.test/a1',
  user_id: null,
  symbol: 'RELIANCE.NS',
  title: 'Reliance profit jumps',
  content: 'Reliance profit jumps. Source: Reuters.',
  published_at: new Date('2026-11-18T10:00:00Z'),
  url: 'https://example.test/a1',
  metadata: { publisher: 'Reuters' },
  created_at: new Date('2026-11-18T10:05:00Z'),
  updated_at: new Date('2026-11-18T10:05:00Z'),
  similarity: 0.82,
};

const SCREEN_RESULT = {
  filters: { minRsi: 70 },
  universe: ['RELIANCE.NS', 'TCS.NS'],
  matches: [
    {
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries',
      price: 2600,
      changePercent: 1.2,
      marketCap: 17_600_000_000_000,
      trailingPE: 25,
      sector: 'Energy',
      rsi14: 100,
      sma20: 2500,
      sma50: 2400,
      change1moPercent: 5.5,
      stale: false,
    },
  ],
  unavailable: [],
  evaluatedAt: new Date().toISOString(),
};

function scriptedClient(responses: Array<ChatCompletion | Error>): {
  client: LlmClient;
  calls: ChatOptions[];
} {
  const calls: ChatOptions[] = [];
  const queue = [...responses];
  const client: LlmClient = {
    chat: jest.fn(async (request: ChatOptions) => {
      calls.push(request);
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next ?? { content: null, toolCalls: [], model: 'test-model' };
    }),
  };
  return { client, calls };
}

function contentCompletion(content: string): ChatCompletion {
  return { content, toolCalls: [], model: 'test-model' };
}

function toolCallCompletion(name: string, args: unknown): ChatCompletion {
  return {
    content: null,
    toolCalls: [{ id: 'call_1', name, arguments: JSON.stringify(args) }],
    model: 'test-model',
  };
}

function passThroughGuardrail(): GuardrailService {
  return {
    verify: jest.fn().mockResolvedValue({
      passed: true,
      checksPassed: 1,
      checksFailed: 0,
      failures: [],
      checks: [],
    }),
  } as unknown as GuardrailService;
}

function makeService(
  client: LlmClient,
  overrides: {
    toolsResult?: unknown;
    retrievalResult?: unknown;
    newsResult?: unknown;
    screenResult?: unknown;
    // These fixtures predate the guardrail, so it is a pass-through by
    // default; the real guardrail flow has its own spec.
    guardrail?: GuardrailService;
  } = {},
) {
  const env: Record<string, string> = {
    OPENROUTER_API_KEY: 'test-key',
    LLM_MODEL_PRIMARY: 'qwen/qwen-2.5-72b-instruct',
    LLM_MODEL_REASONING: 'deepseek/deepseek-r1-0528',
  };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const toolsExecute = jest
    .fn()
    .mockResolvedValue(overrides.toolsResult ?? FUNDAMENTALS);
  const tools = { execute: toolsExecute } as unknown as AiTools;
  const retrieve = jest.fn().mockResolvedValue(
    overrides.retrievalResult ?? {
      available: false,
      chunks: [],
      reason: 'Retrieval is unavailable right now.',
    },
  );
  const retrieval = { retrieve } as unknown as RagRetrievalService;
  const ingest = {
    ensureProfileIndexed: jest.fn().mockResolvedValue(undefined),
    indexNews: jest.fn().mockResolvedValue({
      indexed: 0,
      skipped: 0,
      available: true,
      reason: null,
    }),
  } as unknown as RagIngestService;
  const newsForSymbol = jest
    .fn()
    .mockResolvedValue(overrides.newsResult ?? null);
  const screen = jest
    .fn()
    .mockResolvedValue(overrides.screenResult ?? SCREEN_RESULT);
  const rag = { newsForSymbol, screen } as unknown as RagService;
  const guardrail = overrides.guardrail ?? passThroughGuardrail();
  const service = new AiService(
    config,
    tools,
    client,
    retrieval,
    ingest,
    rag,
    guardrail,
  );
  return { service, toolsExecute, retrieve, newsForSymbol, screen };
}

function userContent(call: ChatOptions): string {
  return call.messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content ?? '')
    .join('\n');
}

describe('AiService RAG wiring', () => {
  describe('explain-stock with retrieved context', () => {
    it('cites the retrieved article by title and date (acceptance 1)', async () => {
      const { client, calls } = scriptedClient([
        contentCompletion(NEWS_ANSWER_JSON),
      ]);
      const { service } = makeService(client, {
        retrievalResult: {
          available: true,
          chunks: [NEWS_CHUNK],
          reason: null,
        },
      });
      const response = await service.explainStock(USER_ID, {
        symbol: 'RELIANCE.NS',
      });
      // The model was given the article with its title and date.
      expect(calls).toHaveLength(1);
      expect(userContent(calls[0])).toContain('Reliance profit jumps');
      expect(userContent(calls[0])).toContain('2026-11-18');
      expect(userContent(calls[0])).toContain('Reuters');
      // And the answer carries the citation through.
      expect(response.refused).toBe(false);
      expect(response.claims).toHaveLength(1);
      expect(response.claims[0].source.tool).toBe('searchKnowledge');
      expect(response.claims[0].source.values).toEqual({
        title: 'Reliance profit jumps',
        date: '2026-11-18',
      });
      expect(response.toolsUsed).toEqual([
        'getStockFundamentals',
        'searchKnowledge',
      ]);
    });

    it('tells the model not to invent news when nothing was retrieved', async () => {
      const { client, calls } = scriptedClient([
        contentCompletion(NEWS_ANSWER_JSON),
      ]);
      const { service } = makeService(client, {
        retrievalResult: { available: true, chunks: [], reason: null },
      });
      const response = await service.explainStock(USER_ID, {
        symbol: 'RELIANCE.NS',
      });
      expect(userContent(calls[0])).toContain('Do not invent news');
      expect(userContent(calls[0])).not.toContain('Retrieved context');
      expect(response.toolsUsed).toEqual(['getStockFundamentals']);
    });

    it('degrades to fundamentals-only when retrieval is down', async () => {
      const { client, calls } = scriptedClient([
        contentCompletion(NEWS_ANSWER_JSON),
      ]);
      const { service } = makeService(client, {
        retrievalResult: {
          available: false,
          chunks: [],
          reason: 'Retrieval is unavailable right now.',
        },
      });
      const response = await service.explainStock(USER_ID, {
        symbol: 'RELIANCE.NS',
      });
      expect(response.fallback).toBe(false);
      expect(response.answer).toContain('profit jump');
      expect(userContent(calls[0])).not.toContain('Retrieved context');
      expect(userContent(calls[0])).not.toContain('Do not invent news');
    });
  });

  describe('explain-news', () => {
    it('says so instead of answering from memory (acceptance 2)', async () => {
      const { client, calls } = scriptedClient([]);
      const { service } = makeService(client, {
        retrievalResult: { available: true, chunks: [], reason: null },
      });
      const response = await service.explainNews(USER_ID, {
        symbol: 'RELIANCE.NS',
      });
      expect(response.refused).toBe(true);
      expect(response.refusalReason).toContain('No relevant news articles');
      expect(response.answer).toContain('No relevant news was found');
      expect(response.claims).toEqual([]);
      // The model is never consulted when there is nothing to ground on.
      expect(calls).toHaveLength(0);
    });

    it('explains from retrieved articles, citing them', async () => {
      const { client, calls } = scriptedClient([
        contentCompletion(NEWS_ANSWER_JSON),
      ]);
      const { service } = makeService(client, {
        retrievalResult: {
          available: true,
          chunks: [NEWS_CHUNK],
          reason: null,
        },
      });
      const response = await service.explainNews(USER_ID, {
        symbol: 'RELIANCE.NS',
        question: 'Why did it move?',
      });
      expect(calls).toHaveLength(1);
      expect(userContent(calls[0])).toContain('Reliance profit jumps');
      expect(userContent(calls[0])).toContain('2026-11-18');
      expect(userContent(calls[0])).toContain('Why did it move?');
      expect(response.refused).toBe(false);
      expect(response.model).toBe('qwen/qwen-2.5-72b-instruct');
      expect(response.toolsUsed).toEqual(['searchKnowledge']);
    });

    it('falls back to the raw news list when the model fails', async () => {
      const { client } = scriptedClient([
        new LlmProviderError('provider down', 500),
      ]);
      const newsResult = {
        symbol: 'RELIANCE.NS',
        articles: [{ title: 'Reliance profit jumps' }],
        overall: { score: 1, label: 'positive' },
        available: true,
        reason: null,
        fetchedAt: new Date().toISOString(),
      };
      const { service, newsForSymbol } = makeService(client, {
        retrievalResult: {
          available: true,
          chunks: [NEWS_CHUNK],
          reason: null,
        },
        newsResult,
      });
      const response = await service.explainNews(USER_ID, {
        symbol: 'RELIANCE.NS',
      });
      expect(response.fallback).toBe(true);
      expect(response.fallbackReason).toContain('unavailable right now');
      expect(newsForSymbol).toHaveBeenCalledWith('RELIANCE.NS');
      expect((response.metrics as { news: unknown }).news).toEqual(newsResult);
    });
  });

  describe('chat with searchKnowledge', () => {
    it('lets the model retrieve before answering', async () => {
      const chunksResult = {
        available: true,
        chunks: [
          {
            sourceType: 'news',
            title: 'Reliance profit jumps',
            publishedAt: '2026-11-18',
            content: 'Reliance profit jumps.',
          },
        ],
      };
      const { client, calls } = scriptedClient([
        toolCallCompletion('searchKnowledge', { query: 'Reliance news' }),
        contentCompletion('thinking'),
        contentCompletion(NEWS_ANSWER_JSON),
      ]);
      const { service, toolsExecute } = makeService(client, {
        toolsResult: chunksResult,
      });
      const response = await service.chat(USER_ID, {
        message: 'What is the news on Reliance?',
      });
      expect(toolsExecute).toHaveBeenCalledWith(USER_ID, 'searchKnowledge', {
        query: 'Reliance news',
      });
      const toolMessages = calls[1].messages.filter(
        (message) => message.role === 'tool',
      );
      expect(toolMessages).toHaveLength(1);
      expect(toolMessages[0].content).toContain('Reliance profit jumps');
      expect(response.toolsUsed).toEqual(['searchKnowledge']);
      expect(response.claims[0].source.tool).toBe('searchKnowledge');
    });
  });

  describe('screenByQuery', () => {
    it('translates a criterion into filters and summarises the screen', async () => {
      const { client, calls } = scriptedClient([
        toolCallCompletion('applyScreenerFilters', { minRsi: 70 }),
        contentCompletion(SCREEN_SUMMARY_JSON),
      ]);
      const { service, screen } = makeService(client);
      const response = await service.screenByQuery(USER_ID, {
        query: 'overbought stocks',
      });
      // The translation call forces the tool.
      expect(calls[0].toolChoice).toEqual({
        type: 'function',
        function: { name: 'applyScreenerFilters' },
      });
      expect(screen).toHaveBeenCalledWith(USER_ID, { minRsi: 70 });
      // The summary prompt carries the screened figures.
      expect(userContent(calls[1])).toContain('RELIANCE.NS');
      expect(userContent(calls[1])).toContain('RSI 100');
      expect(response.fallback).toBe(false);
      expect(response.metrics).toEqual(
        expect.objectContaining({
          screen: SCREEN_RESULT,
          filters: { minRsi: 70 },
          note: null,
        }),
      );
      expect(response.toolsUsed).toEqual(['screenStocks']);
      expect(response.claims[0].source.tool).toBe('screenStocks');
    });

    it('screens unfiltered when the model does not call the tool', async () => {
      const { client } = scriptedClient([
        contentCompletion('I cannot translate that.'),
        contentCompletion(SCREEN_SUMMARY_JSON),
      ]);
      const { service, screen } = makeService(client);
      const response = await service.screenByQuery(USER_ID, {
        query: 'good stocks please',
      });
      expect(screen).toHaveBeenCalledWith(USER_ID, {});
      expect((response.metrics as { note: string | null }).note).toContain(
        'could not be turned into exact filters',
      );
      expect(response.fallback).toBe(false);
    });

    it('screens unfiltered when the translated filters are invalid', async () => {
      const { client } = scriptedClient([
        toolCallCompletion('applyScreenerFilters', { minRsi: 150 }),
        contentCompletion(SCREEN_SUMMARY_JSON),
      ]);
      const { service, screen } = makeService(client);
      const response = await service.screenByQuery(USER_ID, {
        query: 'RSI over 150',
      });
      expect(screen).toHaveBeenCalledWith(USER_ID, {});
      expect((response.metrics as { note: string | null }).note).toContain(
        'could not be turned into exact filters',
      );
    });

    it('falls back to the raw screen when the translation call fails', async () => {
      const { client } = scriptedClient([
        new LlmProviderError('provider down', 500),
      ]);
      const { service, screen } = makeService(client);
      const response = await service.screenByQuery(USER_ID, {
        query: 'overbought stocks',
      });
      expect(response.fallback).toBe(true);
      expect(response.fallbackReason).toContain('unavailable right now');
      expect(screen).toHaveBeenCalledWith(USER_ID, {});
      expect(response.metrics).toEqual(
        expect.objectContaining({ screen: SCREEN_RESULT, filters: {} }),
      );
    });
  });
});
