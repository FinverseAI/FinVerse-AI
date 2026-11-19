import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { AiController } from './ai.controller';
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
  ) {
    const toolsExecute = jest.fn().mockResolvedValue(toolsResult);
    const queue = [...scripted];
    const client: LlmClient = {
      chat: jest.fn(
        async () =>
          queue.shift() ?? {
            content: null,
            toolCalls: [],
            model: 'test-model',
          },
      ),
    };
    const module = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        AiService,
        SessionGuard,
        { provide: AiTools, useValue: { execute: toolsExecute } },
        { provide: LLM_CLIENT, useValue: client },
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
    return { app, toolsExecute, client };
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
