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
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    marketHistory: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    watchlistItem: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    // Runs the writes like a transaction would: each write executes in
    // order and a failure aborts the rest.
    $transaction: jest.fn(async (ops: unknown[]) => {
      const out: unknown[] = [];
      for (const op of ops) out.push(await op);
      return out;
    }),
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
    prisma.marketQuote.findMany.mockResolvedValue([]);
    prisma.marketQuote.upsert.mockImplementation(async (args: any) => ({
      ...cachedQuote(),
      ...args.create,
      fetched_at: freshAt(),
    }));
    prisma.marketHistory.findMany.mockResolvedValue([]);
    prisma.marketHistory.createMany.mockResolvedValue({ count: 0 });
    prisma.marketHistory.deleteMany.mockResolvedValue({ count: 0 });
    prisma.watchlistItem.findMany.mockResolvedValue([]);
    prisma.watchlistItem.updateMany.mockResolvedValue({ count: 1 });
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
    await request(app.getHttpServer()).get('/api/market/alerts').expect(401);
    await request(app.getHttpServer())
      .delete('/api/market/alerts/watch-1')
      .expect(401);
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
    // The delete + insert run in one transaction (B25), so a failed
    // insert cannot leave today's bar deleted.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
    expect(result.body.indices).toHaveLength(5);
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
    expect(result.body.unavailable).toEqual([
      '^NSEBANK',
      'GC=F',
      'SI=F',
      'RELIANCE.NS',
    ]);
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
      // A null price with stale:false would read as "loading" — the
      // fallback says outright that the fetch failed (B29).
      stale: true,
      available: false,
    });
    expect(result.body.unavailable).toEqual([
      '^NSEI',
      '^BSESN',
      '^NSEBANK',
      'GC=F',
      'SI=F',
    ]);
  });

  describe('price alerts', () => {
    const watchItem = (overrides: Record<string, unknown> = {}) => ({
      id: 'watch-1',
      user_id: 'owner',
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Limited',
      note: null,
      alert_direction: 'above',
      alert_price: '2500.00',
      alert_fired_at: null,
      ...overrides,
    });
    // Fresh cached quotes for every symbol, at the given prices.
    const freshQuotes = (prices: Record<string, number>) => {
      prisma.marketQuote.findUnique.mockImplementation(async (args: any) => {
        const symbol = args.where.symbol as string;
        return cachedQuote({
          symbol,
          price: (prices[symbol] ?? 100).toFixed(4),
          fetched_at: freshAt(),
        });
      });
    };

    it('fires a crossed price alert once on the overview load', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([watchItem()]);
      freshQuotes({ 'RELIANCE.NS': 2600 });
      const result = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      // Conditional write (B19): fire only if still unfired.
      // B26: the quote currency is stored on the item at fire time.
      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'watch-1', alert_fired_at: null },
        data: { alert_fired_at: expect.any(Date), alert_currency: 'INR' },
      });
      expect(result.body.alerts).toHaveLength(1);
      expect(result.body.alerts[0]).toMatchObject({
        id: 'watch-1',
        symbol: 'RELIANCE.NS',
        alertDirection: 'above',
        alertPrice: 2500,
        price: 2600,
        currency: 'INR',
      });
      expect(typeof result.body.alerts[0].firedAt).toBe('string');
      expect(result.body.watchlist[0].alertFiredAt).toBe(
        result.body.alerts[0].firedAt,
      );
    });

    it('fires a crossed alert exactly once across two simultaneous overview loads (B19)', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([watchItem()]);
      freshQuotes({ 'RELIANCE.NS': 2600 });
      // The first conditional write wins the race; the second sees
      // count 0 and reports nothing.
      prisma.watchlistItem.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValue({ count: 0 });
      const [first, second] = await Promise.all([
        session(request(app.getHttpServer()).get('/api/market/overview')),
        session(request(app.getHttpServer()).get('/api/market/overview')),
      ]);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const firedTotal = first.body.alerts.length + second.body.alerts.length;
      expect(firedTotal).toBe(1);
      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'watch-1', alert_fired_at: null },
        data: { alert_fired_at: expect.any(Date), alert_currency: 'INR' },
      });
    });

    it('does not re-fire an alert that already fired', async () => {
      const firedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: firedAt }),
      ]);
      freshQuotes({ 'RELIANCE.NS': 2600 });
      const result = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      expect(result.body.alerts).toEqual([]);
      expect(prisma.watchlistItem.updateMany).not.toHaveBeenCalled();
      expect(result.body.watchlist[0].alertFiredAt).toBe(firedAt.toISOString());
    });

    it('re-arms a fired alert when the price moves back across', async () => {
      const firedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: firedAt }),
      ]);
      freshQuotes({ 'RELIANCE.NS': 2400 });
      const result = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      // Conditional write (B19): re-arm only if still fired.
      // B26: re-arm clears the stored fire-time currency.
      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'watch-1', alert_fired_at: { not: null } },
        data: { alert_fired_at: null, alert_currency: null },
      });
      expect(result.body.alerts).toEqual([]);
      expect(result.body.watchlist[0].alertFiredAt).toBeNull();
    });

    it('never fires on a stale quote', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([watchItem()]);
      prisma.marketQuote.findUnique.mockImplementation(async (args: any) => {
        const symbol = args.where.symbol as string;
        return symbol === 'RELIANCE.NS'
          ? cachedQuote({ price: '2600.2500', fetched_at: staleAt() })
          : cachedQuote({ symbol, price: '100.0000', fetched_at: freshAt() });
      });
      provider.quote.mockRejectedValue(new Error('Yahoo is down'));
      const result = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      expect(result.body.watchlist[0].quote.stale).toBe(true);
      expect(result.body.alerts).toEqual([]);
      expect(prisma.watchlistItem.updateMany).not.toHaveBeenCalled();
    });

    it('a failed alert write never breaks the overview', async () => {
      prisma.watchlistItem.findMany.mockResolvedValue([watchItem()]);
      freshQuotes({ 'RELIANCE.NS': 2600 });
      prisma.watchlistItem.updateMany.mockRejectedValue(
        new Error('database is down'),
      );
      const result = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      expect(result.body.alerts).toEqual([]);
      expect(result.body.watchlist).toHaveLength(1);
      expect(result.body.watchlist[0].quote.price).toBe(2600);
    });

    it('serves currently fired alerts for the notification centre', async () => {
      const firedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: firedAt }),
      ]);
      prisma.marketQuote.findMany.mockResolvedValue([
        { symbol: 'RELIANCE.NS', currency: 'INR' },
      ]);
      const result = await session(
        request(app.getHttpServer()).get('/api/market/alerts'),
      ).expect(200);
      expect(prisma.watchlistItem.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'owner',
          alert_direction: { not: null },
          alert_fired_at: { gte: expect.any(Date) },
        },
        orderBy: [{ alert_fired_at: 'desc' }, { id: 'asc' }],
        take: 50,
      });
      expect(prisma.marketQuote.findMany).toHaveBeenCalledWith({
        where: { symbol: { in: ['RELIANCE.NS'] } },
      });
      expect(result.body).toEqual([
        {
          id: 'watch-1',
          symbol: 'RELIANCE.NS',
          name: 'Reliance Industries Limited',
          alertDirection: 'above',
          alertPrice: 2500,
          currency: 'INR',
          firedAt: firedAt.toISOString(),
        },
      ]);
    });

    it('prefers the stored fire-time currency over the cached quote (B26)', async () => {
      const firedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: firedAt, alert_currency: 'USD' }),
      ]);
      // The cached quote says INR, but the alert fired on a USD quote.
      prisma.marketQuote.findMany.mockResolvedValue([
        { symbol: 'RELIANCE.NS', currency: 'INR' },
      ]);
      const result = await session(
        request(app.getHttpServer()).get('/api/market/alerts'),
      ).expect(200);
      expect(result.body[0]).toMatchObject({
        symbol: 'RELIANCE.NS',
        currency: 'USD',
      });
    });

    it('reports an unknown currency as null instead of guessing INR (B26)', async () => {
      const firedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: firedAt }),
      ]);
      prisma.marketQuote.findMany.mockResolvedValue([]);
      const result = await session(
        request(app.getHttpServer()).get('/api/market/alerts'),
      ).expect(200);
      expect(result.body[0]).toMatchObject({
        symbol: 'RELIANCE.NS',
        currency: null,
      });
    });

    it('expires fired alerts older than seven days from the centre (B26)', async () => {
      const expiredAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: expiredAt }),
      ]);
      // The service filters by recency; a store that honours the
      // filter returns nothing for an expired alert.
      prisma.watchlistItem.findMany.mockImplementation(async (args: any) => {
        const gte = args.where.alert_fired_at.gte as Date;
        return expiredAt >= gte
          ? [watchItem({ alert_fired_at: expiredAt })]
          : [];
      });
      const result = await session(
        request(app.getHttpServer()).get('/api/market/alerts'),
      ).expect(200);
      expect(result.body).toEqual([]);
    });

    it('dismisses a fired alert, and a still-crossed price does not re-fire it (B26)', async () => {
      prisma.watchlistItem.updateMany.mockResolvedValue({ count: 1 });
      const dismissed = await session(
        request(app.getHttpServer()).delete('/api/market/alerts/watch-1'),
      ).expect(200);
      expect(dismissed.body).toEqual({ dismissed: true });
      expect(prisma.watchlistItem.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'watch-1',
          user_id: 'owner',
          alert_fired_at: { not: null },
        },
        data: { alert_fired_at: expect.any(Date) },
      });
      // The dismiss ages the fired timestamp past the expiry window.
      const writtenAt = (
        prisma.watchlistItem.updateMany.mock.calls[0][0] as {
          data: { alert_fired_at: Date };
        }
      ).data.alert_fired_at;
      expect(Date.now() - writtenAt.getTime()).toBeGreaterThan(
        7 * 24 * 60 * 60 * 1000,
      );
      // A still-crossed overview load must not re-fire it: the stored
      // timestamp is non-null (aged), so the decision is "none".
      prisma.watchlistItem.findMany.mockResolvedValue([
        watchItem({ alert_fired_at: writtenAt }),
      ]);
      freshQuotes({ 'RELIANCE.NS': 2600 });
      const overview = await session(
        request(app.getHttpServer()).get('/api/market/overview'),
      ).expect(200);
      expect(overview.body.alerts).toEqual([]);
      expect(overview.body.watchlist[0].alertFiredAt).toBeNull();
    });

    it('reports 404 when dismissing an alert that is not fired', async () => {
      prisma.watchlistItem.updateMany.mockResolvedValue({ count: 0 });
      await session(
        request(app.getHttpServer()).delete('/api/market/alerts/watch-1'),
      ).expect(404);
    });
  });
});
