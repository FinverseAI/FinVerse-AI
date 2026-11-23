import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { scoreReadiness } from '../readiness/readiness.formula';
import { RagIngestService } from '../rag/rag.ingest';
import { RagRetrievalService } from '../rag/rag.retrieval';
import { RagService } from '../rag/rag.service';
import { AiController } from './ai.controller';
import { GuardrailService } from './ai.guardrail.service';
import { LLM_CLIENT, type ChatCompletion, type LlmClient } from './ai.provider';
import { AiService } from './ai.service';
import { AiTools } from './ai.tools';

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

describe('ai endpoints', () => {
  const originalFetch = global.fetch;
  const apps: INestApplication[] = [];

  async function createApp(
    env: Record<string, string | undefined>,
    scripted: ChatCompletion[],
    toolsResult: unknown = {},
    ragOverrides: {
      retrievalResult?: unknown;
      newsResult?: unknown;
      screenResult?: unknown;
      // The scripted answers predate the guardrail and are not
      // guardrail-consistent, so the guardrail passes by default; one
      // test below overrides it to fail and asserts the template shape.
      guardrailResult?: unknown;
    } = {},
  ) {
    const toolsExecute = jest.fn().mockResolvedValue(toolsResult);
    const queue = [...scripted];
    const chat = jest.fn(
      async () =>
        queue.shift() ?? {
          content: null,
          toolCalls: [],
          model: 'test-model',
        },
    );
    const client: LlmClient = { chat };
    const retrieve = jest.fn().mockResolvedValue(
      ragOverrides.retrievalResult ?? {
        available: false,
        chunks: [],
        reason: 'Retrieval is unavailable right now.',
      },
    );
    const newsForSymbol = jest
      .fn()
      .mockResolvedValue(ragOverrides.newsResult ?? null);
    const screen = jest.fn().mockResolvedValue(
      ragOverrides.screenResult ?? {
        filters: {},
        universe: [],
        matches: [],
        unavailable: [],
        evaluatedAt: new Date().toISOString(),
      },
    );
    const module = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        AiService,
        SessionGuard,
        { provide: AiTools, useValue: { execute: toolsExecute } },
        { provide: LLM_CLIENT, useValue: client },
        { provide: RagRetrievalService, useValue: { retrieve } },
        {
          provide: RagIngestService,
          useValue: {
            ensureProfileIndexed: jest.fn().mockResolvedValue(undefined),
            indexNews: jest.fn().mockResolvedValue({
              indexed: 0,
              skipped: 0,
              available: true,
              reason: null,
            }),
          },
        },
        { provide: RagService, useValue: { newsForSymbol, screen } },
        {
          provide: GuardrailService,
          useValue: {
            verify: jest.fn().mockResolvedValue(
              ragOverrides.guardrailResult ?? {
                passed: true,
                checksPassed: 1,
                checksFailed: 0,
                failures: [],
                checks: [],
              },
            ),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'BETTER_AUTH_URL' ? 'http://localhost:3000' : env[key],
          },
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    apps.push(app);
    return { app, toolsExecute, client, chat, retrieve, newsForSymbol, screen };
  }

  afterAll(async () => {
    global.fetch = originalFetch;
    for (const app of apps) await app.close();
  });

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      Response.json({
        user: { id: 'owner' },
        session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
      }),
    );
  });

  const session = (req: request.Test) =>
    req.set('Cookie', 'session=test').set('Origin', 'http://localhost:3000');

  const configuredEnv = {
    OPENROUTER_API_KEY: 'test-key',
    LLM_MODEL_PRIMARY: 'qwen/qwen-2.5-72b-instruct',
    LLM_MODEL_REASONING: 'deepseek/deepseek-r1-0528',
  };

  describe('configured', () => {
    let app: INestApplication;

    beforeAll(async () => {
      ({ app } = await createApp(configuredEnv, [
        { content: 'thinking', toolCalls: [], model: 'test-model' },
        { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
        { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
      ]));
    });

    it('requires authentication for every AI route', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/ai/status').expect(401);
      await request(server)
        .post('/api/ai/chat')
        .send({ message: 'Hi' })
        .expect(401);
      await request(server)
        .post('/api/ai/explain-stock')
        .send({ symbol: 'RELIANCE' })
        .expect(401);
      await request(server)
        .post('/api/ai/explain-news')
        .send({ symbol: 'RELIANCE' })
        .expect(401);
      await request(server)
        .post('/api/ai/screen')
        .send({ query: 'cheap stocks' })
        .expect(401);
      await request(server)
        .post('/api/ai/explain-readiness')
        .send({})
        .expect(401);
    });

    it('rejects cross-origin requests', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/chat')
        .set('Cookie', 'session=test')
        .set('Origin', 'http://evil.example')
        .send({ message: 'Hi' })
        .expect(403);
    });

    it('reports status without the key', async () => {
      const response = await session(
        request(app.getHttpServer()).get('/api/ai/status'),
      ).expect(200);
      expect(response.body).toEqual({
        configured: true,
        primaryModel: 'qwen/qwen-2.5-72b-instruct',
        reasoningModel: 'deepseek/deepseek-r1-0528',
      });
      expect(JSON.stringify(response.body)).not.toContain('test-key');
    });

    it('answers a chat request with claims and a disclaimer', async () => {
      const response = await session(
        request(app.getHttpServer())
          .post('/api/ai/chat')
          .send({ message: 'Why did I overspend?' }),
      ).expect(200);
      expect(response.body.answer).toContain('dining out');
      expect(response.body.claims).toHaveLength(1);
      expect(response.body.fallback).toBe(false);
      expect(response.body.disclaimer).toContain('not financial advice');
      expect(response.headers['cache-control']).toContain('no-store');
    });

    it('rejects an invalid chat request', async () => {
      await session(
        request(app.getHttpServer())
          .post('/api/ai/chat')
          .send({ message: '  ' }),
      ).expect(400);
    });

    it('returns a template answer when the guardrail fails twice', async () => {
      // The snapshot tool result doubles as all three snapshot
      // sections, so the template has budget, goals, and portfolio
      // figures to build from.
      const snapshot = {
        available: true,
        month: '2026-11',
        totalSpent: 16200,
        totalBudgeted: 18000,
        totalRemaining: 1800,
        categories: [],
        goals: [
          {
            name: 'Emergency fund',
            target: 100000,
            saved: 50000,
            progressPercent: 50,
          },
        ],
        totalTarget: 100000,
        totalSaved: 50000,
        holdings: [{ symbol: 'RELIANCE.NS' }],
        totals: {
          totalValue: 26000,
          totalInvested: 24000,
          totalGainLoss: 2000,
          totalGainLossPercent: 8.33,
        },
      };
      const { app: failingApp } = await createApp(
        configuredEnv,
        [
          { content: 'thinking', toolCalls: [], model: 'test-model' },
          { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
          { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
        ],
        snapshot,
        {
          guardrailResult: {
            passed: false,
            checksPassed: 0,
            checksFailed: 1,
            failures: [
              {
                claimIndex: 0,
                claimText: 'You spent ₹8,200 on Food & Dining.',
                sourceTool: 'getCategorySpending',
                checkType: 'source',
                passed: false,
                detail: 'The tool was not called in this request.',
                expected: null,
                actual: null,
              },
            ],
            checks: [],
          },
        },
      );
      const response = await session(
        request(failingApp.getHttpServer())
          .post('/api/ai/chat')
          .send({ message: 'Why did I overspend?' }),
      ).expect(200);
      // The unverified model text never reaches the user.
      expect(response.body.answer).not.toContain('dining out');
      expect(response.body.answer).toContain(
        '₹16,200 spent of ₹18,000 budgeted',
      );
      expect(response.body.verification.status).toBe('template');
      expect(response.body.verification.checksFailed).toBe(1);
      expect(response.body.model).toBeNull();
      expect(response.body.fallback).toBe(false);
    });

    it('explains a stock with the reasoning model', async () => {
      const response = await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-stock')
          .send({ symbol: 'RELIANCE' }),
      ).expect(200);
      expect(response.body.model).toBe('deepseek/deepseek-r1-0528');
      expect(response.body.toolsUsed).toEqual(['getStockFundamentals']);
    });

    it('rejects an invalid stock symbol', async () => {
      await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-stock')
          .send({ symbol: 'not a symbol!' }),
      ).expect(400);
    });
  });

  describe('unconfigured', () => {
    let app: INestApplication;

    beforeAll(async () => {
      ({ app } = await createApp({}, [], {
        month: '2026-11',
        totalSpent: 20000,
      }));
    });

    it('reports unconfigured and still answers with fallback metrics', async () => {
      const status = await session(
        request(app.getHttpServer()).get('/api/ai/status'),
      ).expect(200);
      expect(status.body.configured).toBe(false);
      const chat = await session(
        request(app.getHttpServer())
          .post('/api/ai/chat')
          .send({ message: 'Why did I overspend?' }),
      ).expect(200);
      expect(chat.body.fallback).toBe(true);
      expect(chat.body.fallbackReason).toContain('not configured yet');
      expect(chat.body.metrics).not.toBeNull();
      const explain = await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-stock')
          .send({ symbol: 'RELIANCE' }),
      ).expect(200);
      expect(explain.body.fallback).toBe(true);
      expect(explain.body.metrics.symbol).toBe('RELIANCE');
    });
  });

  describe('readiness endpoints', () => {
    const assessment = scoreReadiness({
      emergencyFundBand: '3-6',
      monthlyIncome: 50000,
      monthlyExpenses: 40000,
      totalDebt: 120000,
      holdings: [
        { symbol: 'RELIANCE.NS', currentValue: 50000 },
        { symbol: 'TCS.NS', currentValue: 50000 },
      ],
      holdingVolatilities: [
        { symbol: 'RELIANCE.NS', volatility: 0.3, currentValue: 50000 },
        { symbol: 'TCS.NS', volatility: 0.3, currentValue: 50000 },
      ],
    });
    const readinessJson = JSON.stringify({
      answer: 'Your readiness score is 71 out of 100 (Ready).',
      claims: [
        {
          text: 'Your readiness score is 71 out of 100 (Ready).',
          source: {
            tool: 'getReadinessScore',
            values: { score: 71, scale: 100 },
          },
        },
      ],
      refused: false,
      refusalReason: null,
    });

    it('explains readiness with the reasoning model', async () => {
      const { app } = await createApp(
        configuredEnv,
        [{ content: readinessJson, toolCalls: [], model: 'test-model' }],
        assessment,
      );
      const response = await session(
        request(app.getHttpServer()).post('/api/ai/explain-readiness').send({}),
      ).expect(200);
      expect(response.body.model).toBe('deepseek/deepseek-r1-0528');
      expect(response.body.toolsUsed).toEqual(['getReadinessScore']);
      expect(response.body.answer).toContain('71 out of 100');
    });

    it('refuses honestly when the score is unavailable', async () => {
      const { app } = await createApp(configuredEnv, [], {
        available: false,
        reason: 'Complete your financial profile.',
        missing: ['financial profile'],
      });
      const response = await session(
        request(app.getHttpServer()).post('/api/ai/explain-readiness').send({}),
      ).expect(200);
      expect(response.body.refused).toBe(true);
      expect(response.body.refusalReason).toBe(
        'Complete your financial profile.',
      );
    });

    it('falls back to the raw score when unconfigured', async () => {
      const { app } = await createApp({}, [], assessment);
      const response = await session(
        request(app.getHttpServer()).post('/api/ai/explain-readiness').send({}),
      ).expect(200);
      expect(response.body.fallback).toBe(true);
      expect(response.body.metrics.assessment.score).toBe(71);
    });

    it('rejects an over-long question', async () => {
      const { app } = await createApp(configuredEnv, [], assessment);
      await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-readiness')
          .send({ question: 'x'.repeat(501) }),
      ).expect(400);
    });
  });

  describe('rag endpoints', () => {
    const newsChunk = {
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

    it('refuses a news explanation when nothing relevant was retrieved', async () => {
      const { app, chat } = await createApp(
        configuredEnv,
        [],
        {},
        {
          retrievalResult: { available: true, chunks: [], reason: null },
        },
      );
      const response = await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-news')
          .send({ symbol: 'RELIANCE' }),
      ).expect(200);
      expect(response.body.refused).toBe(true);
      expect(response.body.refusalReason).toContain('No relevant news');
      // The model is never consulted when there is nothing to ground on.
      expect(chat).not.toHaveBeenCalled();
    });

    it('explains news from retrieved articles, citing them', async () => {
      const { app } = await createApp(
        configuredEnv,
        [{ content: ANSWER_JSON, toolCalls: [], model: 'test-model' }],
        {},
        {
          retrievalResult: {
            available: true,
            chunks: [newsChunk],
            reason: null,
          },
        },
      );
      const response = await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-news')
          .send({ symbol: 'RELIANCE' }),
      ).expect(200);
      expect(response.body.fallback).toBe(false);
      expect(response.body.toolsUsed).toEqual(['searchKnowledge']);
      expect(response.body.model).toBe('qwen/qwen-2.5-72b-instruct');
    });

    it('rejects an invalid news explanation request', async () => {
      const { app } = await createApp(configuredEnv, []);
      await session(
        request(app.getHttpServer())
          .post('/api/ai/explain-news')
          .send({ symbol: 'not a symbol!' }),
      ).expect(400);
    });

    it('screens from a natural-language query', async () => {
      const screenResult = {
        filters: { minRsi: 70 },
        universe: ['RELIANCE.NS'],
        matches: [{ symbol: 'RELIANCE.NS', rsi14: 100 }],
        unavailable: [],
        evaluatedAt: new Date().toISOString(),
      };
      const { app, screen } = await createApp(
        configuredEnv,
        [
          {
            content: null,
            toolCalls: [
              {
                id: 'call_1',
                name: 'applyScreenerFilters',
                arguments: JSON.stringify({ minRsi: 70 }),
              },
            ],
            model: 'test-model',
          },
          { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
        ],
        {},
        { screenResult },
      );
      const response = await session(
        request(app.getHttpServer())
          .post('/api/ai/screen')
          .send({ query: 'overbought stocks' }),
      ).expect(200);
      expect(response.body.fallback).toBe(false);
      expect(response.body.metrics.screen).toEqual(screenResult);
      expect(response.body.metrics.filters).toEqual({ minRsi: 70 });
      expect(screen).toHaveBeenCalledWith('owner', { minRsi: 70 });
    });

    it('rejects an empty screen query', async () => {
      const { app } = await createApp(configuredEnv, []);
      await session(
        request(app.getHttpServer())
          .post('/api/ai/screen')
          .send({ query: '   ' }),
      ).expect(400);
    });
  });

  describe('rate limiting', () => {
    let app: INestApplication;

    beforeAll(async () => {
      ({ app } = await createApp(
        { ...configuredEnv, LLM_RATE_LIMIT_PER_MINUTE: '1' },
        [
          { content: 'thinking', toolCalls: [], model: 'test-model' },
          { content: ANSWER_JSON, toolCalls: [], model: 'test-model' },
        ],
      ));
    });

    it('returns 429 once the per-user limit is reached', async () => {
      const server = app.getHttpServer();
      await session(
        request(server).post('/api/ai/chat').send({ message: 'first' }),
      ).expect(200);
      await session(
        request(server).post('/api/ai/chat').send({ message: 'second' }),
      ).expect(429);
    });
  });
});
