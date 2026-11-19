import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

describe('rag endpoints', () => {
  const originalFetch = global.fetch;
  const apps: INestApplication[] = [];

  async function createApp(rag: Partial<RagService>) {
    const module = await Test.createTestingModule({
      controllers: [RagController],
      providers: [
        SessionGuard,
        { provide: RagService, useValue: rag },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'BETTER_AUTH_URL' ? 'http://localhost:3000' : undefined,
          },
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.init();
    apps.push(app);
    return app;
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

  const cookie = 'better-auth.session_token=abc';
  const origin = 'http://localhost:3000';

  it('requires a session for news and screen', async () => {
    const app = await createApp({});
    await request(app.getHttpServer())
      .get('/api/rag/news/RELIANCE.NS')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/rag/screen')
      .set('Origin', origin)
      .send({})
      .expect(401);
  });

  it('returns news for a symbol', async () => {
    const newsForSymbol = jest.fn(async () => ({
      symbol: 'RELIANCE.NS',
      articles: [
        {
          title: 'Reliance profit surges',
          publisher: 'Reuters',
          publishedAt: '2026-11-18',
          url: 'https://example.test/a1',
          sentiment: {
            score: 1,
            label: 'positive' as const,
            matchedPositive: ['profit', 'surges'],
            matchedNegative: [],
          },
        },
      ],
      overall: {
        score: 1,
        label: 'positive' as const,
        positive: 1,
        negative: 0,
        neutral: 0,
      },
      available: true,
      reason: null,
      fetchedAt: new Date().toISOString(),
    }));
    const app = await createApp({ newsForSymbol });
    const response = await request(app.getHttpServer())
      .get('/api/rag/news/RELIANCE.NS')
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body.symbol).toBe('RELIANCE.NS');
    expect(response.body.articles).toHaveLength(1);
    expect(newsForSymbol).toHaveBeenCalledWith('RELIANCE.NS');
  });

  it('runs a screen and returns the matches', async () => {
    const screen = jest.fn(async () => ({
      filters: { minRsi: 70 },
      universe: ['RELIANCE.NS'],
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
    }));
    const app = await createApp({ screen });
    const response = await request(app.getHttpServer())
      .post('/api/rag/screen')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ symbols: ['RELIANCE.NS'], minRsi: 70 })
      .expect(200);
    expect(response.body.matches).toHaveLength(1);
    expect(screen).toHaveBeenCalledWith('owner', {
      symbols: ['RELIANCE.NS'],
      minRsi: 70,
    });
  });

  it('rejects a screen from a foreign origin', async () => {
    const app = await createApp({ screen: jest.fn() });
    await request(app.getHttpServer())
      .post('/api/rag/screen')
      .set('Cookie', cookie)
      .set('Origin', 'https://evil.test')
      .send({})
      .expect(403);
  });
});
