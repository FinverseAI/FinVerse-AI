import { HttpException, ServiceUnavailableException } from '@nestjs/common';
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

const USER_ID = 'user-123';
const PRIMARY = 'qwen/qwen-2.5-72b-instruct';
const REASONING = 'deepseek/deepseek-r1-0528';

const ANSWER_JSON = JSON.stringify({
  answer: 'You spent more on food because of dining out.',
  claims: [
    {
      text: 'You spent ₹8,200 on Food & Dining.',
      source: {
        tool: 'getCategorySpending',
        values: { totalSpent: 8200 },
      },
    },
  ],
  refused: false,
  refusalReason: null,
});

const REFUSAL_JSON = JSON.stringify({
  answer: 'I cannot predict what a stock will do tomorrow.',
  claims: [],
  refused: true,
  refusalReason: 'I cannot predict what a stock will do tomorrow.',
});

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
  env: Record<string, string>,
  toolsExecute: jest.Mock,
  client: LlmClient,
  // These fixtures predate the guardrail and are not guardrail-
  // consistent (the cited tool is often not the one called), so the
  // guardrail is a pass-through here by default; the real guardrail
  // flow has its own spec (ai.guardrail-flow.spec.ts).
  guardrail: GuardrailService = passThroughGuardrail(),
) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const tools = { execute: toolsExecute } as unknown as AiTools;
  // Retrieval is unavailable by default here, so the pre-RAG behaviour
  // (fundamentals-only explanations) is what these tests exercise; the
  // RAG paths have their own spec (ai.rag.spec.ts).
  const retrieval = {
    retrieve: jest.fn().mockResolvedValue({
      available: false,
      chunks: [],
      reason: 'Retrieval is unavailable right now.',
    }),
  } as unknown as RagRetrievalService;
  const ingest = {
    ensureProfileIndexed: jest.fn().mockResolvedValue(undefined),
    indexNews: jest.fn().mockResolvedValue({
      indexed: 0,
      skipped: 0,
      available: true,
      reason: null,
    }),
  } as unknown as RagIngestService;
  const rag = {
    newsForSymbol: jest.fn(),
    screen: jest.fn(),
  } as unknown as RagService;
  return new AiService(
    config,
    tools,
    client,
    retrieval,
    ingest,
    rag,
    guardrail,
  );
}

const DEFAULT_ENV: Record<string, string> = {
  OPENROUTER_API_KEY: 'test-key',
  LLM_MODEL_PRIMARY: PRIMARY,
  LLM_MODEL_REASONING: REASONING,
};

function toolCallCompletion(name: string, args: unknown): ChatCompletion {
  return {
    content: null,
    toolCalls: [{ id: 'call_1', name, arguments: JSON.stringify(args) }],
    model: 'test-model',
  };
}

function contentCompletion(content: string): ChatCompletion {
  return { content, toolCalls: [], model: 'test-model' };
}

describe('AiService', () => {
  describe('status', () => {
    it('reports configuration and model names, never the key', () => {
      const { client } = scriptedClient([]);
      const service = makeService(DEFAULT_ENV, jest.fn(), client);
      expect(service.status()).toEqual({
        configured: true,
        primaryModel: PRIMARY,
        reasoningModel: REASONING,
      });
      const unconfigured = makeService({}, jest.fn(), client);
      expect(unconfigured.status().configured).toBe(false);
    });
  });

  describe('chat', () => {
    it('runs the tool loop and returns a structured answer with evidence', async () => {
      const budget = { month: '2026-11', totalSpent: 20000 };
      const toolsExecute = jest.fn().mockResolvedValue(budget);
      const { client, calls } = scriptedClient([
        toolCallCompletion('getBudgetStatus', { month: '2026-11' }),
        contentCompletion('thinking'),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.chat(USER_ID, {
        message: 'Why did I overspend?',
      });
      expect(response.answer).toContain('dining out');
      expect(response.claims).toHaveLength(1);
      expect(response.claims[0]?.source.tool).toBe('getCategorySpending');
      expect(response.refused).toBe(false);
      expect(response.fallback).toBe(false);
      expect(response.model).toBe(PRIMARY);
      expect(response.toolsUsed).toEqual(['getBudgetStatus']);
      expect(response.disclaimer).toContain('not financial advice');
      expect(toolsExecute).toHaveBeenCalledWith(USER_ID, 'getBudgetStatus', {
        month: '2026-11',
      });
      // The tool result was fed back to the model before the final answer.
      const secondCall = calls[1];
      const toolMessage = secondCall?.messages.find(
        (message) => message.role === 'tool',
      );
      expect(toolMessage?.content).toContain('20000');
    });

    it('answers directly when no tool is needed', async () => {
      const toolsExecute = jest.fn();
      const { client } = scriptedClient([
        contentCompletion('thinking'),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.answer).toContain('dining out');
      expect(response.toolsUsed).toEqual([]);
      expect(toolsExecute).not.toHaveBeenCalled();
    });

    it('passes a model refusal through unchanged', async () => {
      const { client } = scriptedClient([
        contentCompletion('thinking'),
        contentCompletion(REFUSAL_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, jest.fn(), client);
      const response = await service.chat(USER_ID, {
        message: 'What will RELIANCE do tomorrow?',
      });
      expect(response.refused).toBe(true);
      expect(response.answer).toContain('cannot predict');
      expect(response.refusalReason).toContain('cannot predict');
      expect(response.claims).toEqual([]);
      expect(response.fallback).toBe(false);
    });

    it('retries once on invalid JSON and returns the corrected answer', async () => {
      const { client, calls } = scriptedClient([
        contentCompletion('thinking'),
        contentCompletion('not json at all'),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, jest.fn(), client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.answer).toContain('dining out');
      expect(calls).toHaveLength(3);
      const retry = calls[2];
      expect(
        retry?.messages.some(
          (message) =>
            message.role === 'user' &&
            typeof message.content === 'string' &&
            message.content.includes('not a valid'),
        ),
      ).toBe(true);
    });

    it('falls back to raw metrics when the answer stays invalid', async () => {
      const toolsExecute = jest
        .fn()
        .mockImplementation(async (_userId: string, name: string) => ({
          tool: name,
        }));
      const { client } = scriptedClient([
        contentCompletion('thinking'),
        contentCompletion('garbage'),
        contentCompletion('still garbage'),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.fallback).toBe(true);
      expect(response.answer).toBeNull();
      expect(response.fallbackReason).toContain('could not be verified');
      expect(response.metrics).toEqual({
        getBudgetStatus: { tool: 'getBudgetStatus' },
        getGoalProgress: { tool: 'getGoalProgress' },
        getPortfolioSummary: { tool: 'getPortfolioSummary' },
      });
      expect(response.model).toBeNull();
    });

    it('falls back to raw metrics when the provider fails', async () => {
      const toolsExecute = jest.fn().mockResolvedValue({ ok: true });
      const { client } = scriptedClient([
        new LlmProviderError('The AI service is unavailable.'),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.fallback).toBe(true);
      expect(response.fallbackReason).toContain('unavailable right now');
      expect(response.metrics).not.toBeNull();
    });

    it('falls back without calling the model when no API key is set', async () => {
      const toolsExecute = jest.fn().mockResolvedValue({ ok: true });
      const { client, calls } = scriptedClient([]);
      const service = makeService({}, toolsExecute, client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.fallback).toBe(true);
      expect(response.fallbackReason).toContain('not configured yet');
      expect(calls).toHaveLength(0);
    });

    it('bounds the tool loop and still produces a final answer', async () => {
      const toolsExecute = jest.fn().mockResolvedValue({ ok: true });
      const { client } = scriptedClient([
        toolCallCompletion('getBudgetStatus', {}),
        toolCallCompletion('getBudgetStatus', {}),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(
        { ...DEFAULT_ENV, LLM_MAX_TOOL_ROUNDS: '2' },
        toolsExecute,
        client,
      );
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.answer).toContain('dining out');
      expect(toolsExecute).toHaveBeenCalledTimes(2);
    });

    it('hands tool failures to the model as error results', async () => {
      const toolsExecute = jest
        .fn()
        .mockRejectedValue(
          new ServiceUnavailableException(
            'Market data is unavailable right now.',
          ),
        );
      const { client, calls } = scriptedClient([
        toolCallCompletion('getStockQuote', { symbol: 'RELIANCE' }),
        contentCompletion('thinking'),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.chat(USER_ID, { message: 'Hi' });
      expect(response.answer).toContain('dining out');
      const secondCall = calls[1];
      const toolMessage = secondCall?.messages.find(
        (message) => message.role === 'tool',
      );
      expect(toolMessage?.content).toContain(
        'Market data is unavailable right now.',
      );
    });

    it('rate-limits per user and caches identical queries', async () => {
      const toolsExecute = jest.fn().mockResolvedValue({ ok: true });
      const { client, calls } = scriptedClient([
        contentCompletion('thinking'),
        contentCompletion(ANSWER_JSON),
        contentCompletion('thinking'),
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(
        { ...DEFAULT_ENV, LLM_RATE_LIMIT_PER_MINUTE: '2' },
        toolsExecute,
        client,
      );
      const first = await service.chat(USER_ID, { message: 'first' });
      const cached = await service.chat(USER_ID, { message: 'first' });
      expect(cached).toEqual(first);
      expect(calls).toHaveLength(2); // second identical query was cached
      await service.chat(USER_ID, { message: 'second' });
      const error = await service.chat(USER_ID, { message: 'third' }).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    });

    it('rejects invalid requests before touching the model', async () => {
      const { client, calls } = scriptedClient([]);
      const service = makeService(DEFAULT_ENV, jest.fn(), client);
      await expect(service.chat(USER_ID, { message: '  ' })).rejects.toThrow(
        HttpException,
      );
      expect(calls).toHaveLength(0);
    });
  });

  describe('explainStock', () => {
    const fundamentals = {
      symbol: 'RELIANCE',
      quote: { price: 1500 },
      technicals: { rsi14: 55 },
    };

    it('explains from pre-fetched evidence with the reasoning model', async () => {
      const toolsExecute = jest.fn().mockResolvedValue(fundamentals);
      const { client, calls } = scriptedClient([
        contentCompletion(ANSWER_JSON),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.explainStock(USER_ID, {
        symbol: 'reliance',
        question: 'Why is it up?',
      });
      expect(response.answer).toContain('dining out');
      expect(response.model).toBe(REASONING);
      expect(response.toolsUsed).toEqual(['getStockFundamentals']);
      expect(toolsExecute).toHaveBeenCalledWith(
        USER_ID,
        'getStockFundamentals',
        { symbol: 'RELIANCE' },
      );
      expect(calls[0]?.model).toBe(REASONING);
      expect(calls[0]?.maxTokens).toBe(4096);
      expect(JSON.stringify(calls[0]?.messages)).toContain('Why is it up?');
    });

    it('falls back to the computed figures when the model fails', async () => {
      const toolsExecute = jest.fn().mockResolvedValue(fundamentals);
      const { client } = scriptedClient([
        new LlmProviderError('The AI service is unavailable.'),
      ]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      const response = await service.explainStock(USER_ID, {
        symbol: 'RELIANCE',
      });
      expect(response.fallback).toBe(true);
      expect(response.metrics).toEqual({
        symbol: 'RELIANCE',
        fundamentals,
      });
    });

    it('falls back without calling the model when no API key is set', async () => {
      const toolsExecute = jest.fn().mockResolvedValue(fundamentals);
      const { client, calls } = scriptedClient([]);
      const service = makeService({}, toolsExecute, client);
      const response = await service.explainStock(USER_ID, {
        symbol: 'RELIANCE',
      });
      expect(response.fallback).toBe(true);
      expect(response.metrics?.fundamentals).toEqual(fundamentals);
      expect(calls).toHaveLength(0);
    });

    it('fails honestly when the data itself is unavailable', async () => {
      const toolsExecute = jest
        .fn()
        .mockRejectedValue(
          new ServiceUnavailableException('Market data is unavailable.'),
        );
      const { client } = scriptedClient([]);
      const service = makeService(DEFAULT_ENV, toolsExecute, client);
      await expect(
        service.explainStock(USER_ID, { symbol: 'RELIANCE' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rejects invalid symbols', async () => {
      const { client } = scriptedClient([]);
      const service = makeService(DEFAULT_ENV, jest.fn(), client);
      await expect(
        service.explainStock(USER_ID, { symbol: 'not a symbol!' }),
      ).rejects.toThrow(HttpException);
    });
  });
});
