import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { PortfolioService } from './portfolio.service';
import { MARKET_DATA_PROVIDER } from './market.provider';

describe('market data endpoints', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const prisma = {
    marketQuote: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    marketHistory: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    watchlistItem: {
      findMany: jest.fn(),
    },
  };
  const provider = {
    quote: jest.fn(),
    history: jest.fn(),
    search: jest.fn(),
    profile: jest.fn(),
  };
  const freshAt = () => new Date(Date.now() - 60 * 1000);
  const staleAt = () => new Date(Date.now() - 60 * 60 * 1000);
  const cachedQuote = (overrides: Record<string, unknown> = {}) => ({
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Limited',
    price: '2600.2500',
    previous_close: '2580.0000',
    currency: 'INR',
    sector: 'Energy',
    fetched_at: freshAt(),
    ...overrides,
  });
  const liveQuote = {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Limited',
    price: 2610.5,
    previousClose: 2580,
    currency: 'INR',
  };
  const bar = (date: string, close: number, fetchedAt: Date) => ({
    id: `bar-${date}`,
    symbol: 'RELIANCE.NS',
    date: new Date(`${date}T00:00:00Z`),
    open: `${close - 5}.0000`,
    high: `${close + 5}.0000`,
    low: `${close - 10}.0000`,
    close: `${close}.0000`,
    volume: 1000000n,
    fetched_at: fetchedAt,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        MarketService,
        PortfolioService,
        SessionGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://localhost:3000' },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: MARKET_DATA_PROVIDER, useValue: provider },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.marketQuote.findUnique.mockResolvedValue(null);
    prisma.marketQuote.upsert.mockImplementation(async (args: any) => ({
      ...cachedQuote(),
      ...args.create,
      fetched_at: freshAt(),
    }));
    prisma.marketHistory.findMany.mockResolvedValue([]);
    prisma.marketHistory.createMany.mockResolvedValue({ count: 0 });
    prisma.marketHistory.deleteMany.mockResolvedValue({ count: 0 });
    prisma.watchlistItem.findMany.mockResolvedValue([]);
    provider.quote.mockResolvedValue(liveQuote);
    provider.history.mockResolvedValue([]);
    provider.search.mockResolvedValue([]);
    provider.profile.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      sector: 'Energy',
      currency: 'INR',
    });
    global.fetch = jest.fn(async () =>
      Response.json({
        user: { id: 'owner' },
        session: { expiresAt: new Date(Date.now() + 60000).toISOString() },
      }),
    );
  });

  const session = (req: request.Test) =>
    req.set('Cookie', 'session=test').set('Origin', 'http://localhost:3000');

  it('requires authentication for every market route', async () => {
    await request(app.getHttpServer()).get('/api/market/overview').expect(401);
    await request(app.getHttpServer())
      .get('/api/market/search?q=reliance')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/market/quote/RELIANCE.NS')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/market/history/RELIANCE.NS')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/market/profile/RELIANCE.NS')
      .expect(401);
    expect(prisma.marketQuote.findUnique).not.toHaveBeenCalled();
    expect(provider.quote).not.toHaveBeenCalled();
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('serves a fresh cached quote without calling the provider', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue(cachedQuote());
    const result = await session(
      request(app.getHttpServer()).get('/api/market/quote/reliance.ns'),
    ).expect(200);
    expect(result.body).toMatchObject({
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Limited',
      price: 2600.25,
      previousClose: 2580,
      change: 20.25,
      changePercent: 0.78,
      currency: 'INR',
      sector: 'Energy',
      stale: false,
    });
    expect(provider.quote).not.toHaveBeenCalled();
    expect(prisma.marketQuote.upsert).not.toHaveBeenCalled();
  });

  it('refreshes a stale cached quote and caches the new price', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue(
      cachedQuote({ fetched_at: staleAt() }),
    );
    const result = await session(
      request(app.getHttpServer()).get('/api/market/quote/RELIANCE.NS'),
    ).expect(200);
    expect(provider.quote).toHaveBeenCalledWith('RELIANCE.NS');
    expect(prisma.marketQuote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { symbol: 'RELIANCE.NS' },
        create: expect.objectContaining({
          symbol: 'RELIANCE.NS',
          price: '2610.5000',
          previous_close: '2580.0000',
          currency: 'INR',
        }),
      }),
    );
    expect(result.body.price).toBe(2610.5);
    expect(result.body.stale).toBe(false);
  });

  it('falls back to a stale cached quote when the provider is down', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue(
      cachedQuote({ fetched_at: staleAt() }),
    );
    provider.quote.mockRejectedValue(new Error('Yahoo is down'));
    const result = await session(
      request(app.getHttpServer()).get('/api/market/quote/RELIANCE.NS'),
    ).expect(200);
    expect(result.body).toMatchObject({ price: 2600.25, stale: true });
  });

  it('reports 503 when the provider is down and nothing is cached', async () => {
    provider.quote.mockRejectedValue(new Error('Yahoo is down'));
    const result = await session(
      request(app.getHttpServer()).get('/api/market/quote/RELIANCE.NS'),
    ).expect(503);
    expect(result.body.message).toMatch(/unavailable/);
  });

  it('rejects invalid symbols with 400', async () => {
    await session(
      request(app.getHttpServer()).get('/api/market/quote/BAD%20SYMBOL'),
    ).expect(400);
    expect(provider.quote).not.toHaveBeenCalled();
  });

  it('serves fresh cached history without calling the provider', async () => {
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const bars = [
      bar(from.toISOString().slice(0, 10), 2500, freshAt()),
      bar('2026-11-18', 2600, freshAt()),
    ];
    prisma.marketHistory.findMany.mockResolvedValue(bars);
    const result = await session(
      request(app.getHttpServer()).get(
        '/api/market/history/RELIANCE.NS?range=1y',
      ),
    ).expect(200);
    expect(provider.history).not.toHaveBeenCalled();
    expect(result.body).toMatchObject({
      symbol: 'RELIANCE.NS',
      range: '1y',
      stale: false,
    });
    expect(result.body.bars).toHaveLength(2);
    expect(result.body.bars[1]).toMatchObject({
      date: '2026-11-18',
      open: 2595,
      high: 2605,
      low: 2590,
      close: 2600,
      volume: 1000000,
    });
  });

  it('refreshes stale history and re-reads from the cache', async () => {
    const oldBar = bar('2026-11-17', 2550, staleAt());
    const newBar = bar('2026-11-18', 2600, freshAt());
    prisma.marketHistory.findMany
      .mockResolvedValueOnce([oldBar])
      .mockResolvedValue([oldBar, newBar]);
    provider.history.mockResolvedValue([
      {
        date: new Date('2026-11-18T00:00:00Z'),
        open: 2595,
        high: 2605,
        low: 2590,
        close: 2600,
        volume: 1000000,
      },
    ]);
    const result = await session(
      request(app.getHttpServer()).get(
        '/api/market/history/RELIANCE.NS?range=1y',
      ),
    ).expect(200);
    expect(provider.history).toHaveBeenCalledWith(
      'RELIANCE.NS',
      expect.any(Date),
      expect.any(Date),
    );
    expect(prisma.marketHistory.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result.body.bars).toHaveLength(2);
    expect(result.body.stale).toBe(false);
  });

  it('serves stale history when the refresh fails', async () => {
    prisma.marketHistory.findMany.mockResolvedValue([
      bar('2026-11-17', 2550, staleAt()),
    ]);
    provider.history.mockRejectedValue(new Error('Yahoo is down'));
    const result = await session(
      request(app.getHttpServer()).get(
        '/api/market/history/RELIANCE.NS?range=1y',
      ),
    ).expect(200);
    expect(result.body.stale).toBe(true);
    expect(result.body.bars).toHaveLength(1);
  });

  it('reports 503 for history when the provider is down and nothing is cached', async () => {
    provider.history.mockRejectedValue(new Error('Yahoo is down'));
    await session(
      request(app.getHttpServer()).get(
        '/api/market/history/RELIANCE.NS?range=1y',
      ),
    ).expect(503);
  });

  it('returns an honest empty list when a symbol has no history in range', async () => {
    provider.history.mockResolvedValue([]);
    const result = await session(
      request(app.getHttpServer()).get(
        '/api/market/history/NEWCO.NS?range=1mo',
      ),
    ).expect(200);
    expect(result.body.bars).toEqual([]);
    expect(result.body.stale).toBe(false);
  });

  it('searches symbols and rejects empty queries', async () => {
    provider.search.mockResolvedValue([
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        exchange: 'NSE',
        type: 'EQUITY',
      },
    ]);
    const result = await session(
      request(app.getHttpServer()).get('/api/market/search?q=reliance'),
    ).expect(200);
    expect(provider.search).toHaveBeenCalledWith('reliance');
    expect(result.body).toEqual([
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        exchange: 'NSE',
        type: 'EQUITY',
      },
    ]);
    await session(
      request(app.getHttpServer()).get('/api/market/search?q=%20%20'),
    ).expect(400);
    await session(
      request(app.getHttpServer()).get('/api/market/search'),
    ).expect(400);
  });

  it('reports 503 when search is unavailable', async () => {
    provider.search.mockRejectedValue(new Error('Yahoo is down'));
    await session(
      request(app.getHttpServer()).get('/api/market/search?q=reliance'),
    ).expect(503);
  });

  it('returns a profile with fundamentals', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue(cachedQuote());
    provider.profile.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Limited',
      sector: 'Energy',
      industry: 'Oil & Gas',
      marketCap: 17000000000000,
      trailingPE: 28.5,
      forwardPE: 24.1,
      dividendYield: 0.4,
      fiftyTwoWeekHigh: 2700,
      fiftyTwoWeekLow: 2200,
      description: 'An Indian multinational conglomerate.',
      currency: 'INR',
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/market/profile/RELIANCE.NS'),
    ).expect(200);
    expect(result.body).toMatchObject({
      symbol: 'RELIANCE.NS',
      price: 2600.25,
      fundamentalsAvailable: true,
      fundamentals: {
        sector: 'Energy',
        industry: 'Oil & Gas',
        marketCap: 17000000000000,
        trailingPE: 28.5,
        forwardPE: 24.1,
        dividendYield: 0.4,
        fiftyTwoWeekHigh: 2700,
        fiftyTwoWeekLow: 2200,
        description: 'An Indian multinational conglomerate.',
      },
    });
  });

  it('returns the quote when fundamentals fail', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue(cachedQuote());
    provider.profile.mockRejectedValue(new Error('summary down'));
    const result = await session(
      request(app.getHttpServer()).get('/api/market/profile/RELIANCE.NS'),
    ).expect(200);
    expect(result.body).toMatchObject({
      price: 2600.25,
      fundamentals: null,
      fundamentalsAvailable: false,
    });
  });

  it('serves the overview with indices, watchlist quotes and unavailable symbols', async () => {
    prisma.watchlistItem.findMany.mockResolvedValue([
      {
        id: 'watch-1',
        user_id: 'owner',
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
      },
      { id: 'watch-2', user_id: 'owner', symbol: 'TCS.NS', name: 'TCS' },
    ]);
    const quotesBySymbol: Record<string, unknown> = {
      '^NSEI': cachedQuote({
        symbol: '^NSEI',
        name: 'NIFTY 50',
        price: '24500.0000',
        previous_close: '24400.0000',
        sector: null,
      }),
    };
    prisma.marketQuote.findUnique.mockImplementation(async (args: any) =>
      args.where.symbol in quotesBySymbol
        ? quotesBySymbol[args.where.symbol]
        : null,
    );
    provider.quote.mockImplementation(async (symbol: string) => {
      if (symbol === '^BSESN') {
        return {
          symbol: '^BSESN',
          name: 'S&P BSE SENSEX',
          price: 80500,
          previousClose: 80200,
          currency: 'INR',
        };
      }
      if (symbol === 'TCS.NS') {
        return {
          symbol: 'TCS.NS',
          name: 'Tata Consultancy Services',
          price: 4200,
          previousClose: 4180,
          currency: 'INR',
        };
      }
      throw new Error('no data');
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/market/overview'),
    ).expect(200);
    expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    expect(result.body.indices).toHaveLength(2);
    expect(result.body.indices[0]).toMatchObject({
      symbol: '^NSEI',
      name: 'NIFTY 50',
      price: 24500,
      stale: false,
    });
    expect(result.body.indices[1]).toMatchObject({
      symbol: '^BSESN',
      price: 80500,
      stale: false,
    });
    expect(result.body.watchlist).toHaveLength(2);
    expect(result.body.watchlist[0]).toMatchObject({
      symbol: 'RELIANCE.NS',
      quote: null,
    });
    expect(result.body.watchlist[1].quote).toMatchObject({
      symbol: 'TCS.NS',
      price: 4200,
    });
    expect(result.body.unavailable).toEqual(['RELIANCE.NS']);
  });

  it('reports an index as unavailable instead of failing the overview', async () => {
    provider.quote.mockRejectedValue(new Error('Yahoo is down'));
    const result = await session(
      request(app.getHttpServer()).get('/api/market/overview'),
    ).expect(200);
    expect(result.body.indices[0]).toMatchObject({
      symbol: '^NSEI',
      name: 'NIFTY 50',
      price: null,
    });
    expect(result.body.unavailable).toEqual(['^NSEI', '^BSESN']);
  });
});
