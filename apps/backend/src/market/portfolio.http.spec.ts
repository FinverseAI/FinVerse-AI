import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { SessionGuard } from '../auth/session.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { PortfolioService } from './portfolio.service';
import { MARKET_DATA_PROVIDER } from './market.provider';

describe('holdings, watchlist and portfolio summary', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const prisma = {
    marketQuote: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    userHolding: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    watchlistItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const provider = {
    quote: jest.fn(),
    history: jest.fn(),
    search: jest.fn(),
    profile: jest.fn(),
  };
  const freshAt = () => new Date(Date.now() - 60 * 1000);
  const storedHolding = {
    id: 'holding-1',
    user_id: 'owner',
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Limited',
    sector: 'Energy',
    quantity: '10.0000',
    buy_price: '2450.50',
    buy_date: new Date('2026-01-15T00:00:00Z'),
    currency: 'INR',
    created_at: new Date('2026-01-15T00:00:00Z'),
    updated_at: new Date('2026-01-15T00:00:00Z'),
  };
  const storedWatchlistItem = {
    id: 'watch-1',
    user_id: 'owner',
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services',
    created_at: new Date('2026-11-18T00:00:00Z'),
  };
  const conflict = () =>
    // The real PrismaClientKnownRequestError constructor requires
    // clientVersion (KnownErrorParams); the local stub omits it, which is
    // why this passed locally and failed CI check-types on 1c10651.
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.16.3',
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
      symbol: args.create.symbol,
      name: args.create.name,
      price: args.create.price,
      previous_close: args.create.previous_close,
      currency: args.create.currency,
      sector: args.create.sector,
      fetched_at: freshAt(),
    }));
    prisma.userHolding.findMany.mockResolvedValue([storedHolding]);
    prisma.userHolding.findFirst.mockResolvedValue(storedHolding);
    prisma.userHolding.create.mockResolvedValue(storedHolding);
    prisma.userHolding.updateMany.mockResolvedValue({ count: 1 });
    prisma.userHolding.deleteMany.mockResolvedValue({ count: 1 });
    prisma.watchlistItem.findMany.mockResolvedValue([storedWatchlistItem]);
    prisma.watchlistItem.findFirst.mockResolvedValue(storedWatchlistItem);
    prisma.watchlistItem.create.mockResolvedValue(storedWatchlistItem);
    prisma.watchlistItem.update.mockResolvedValue(storedWatchlistItem);
    prisma.watchlistItem.deleteMany.mockResolvedValue({ count: 1 });
    provider.quote.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      price: 2600.25,
      previousClose: 2580,
      currency: 'INR',
      sector: 'Energy',
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

  it('requires authentication for portfolio routes', async () => {
    await request(app.getHttpServer()).get('/api/holdings').expect(401);
    await request(app.getHttpServer())
      .post('/api/holdings')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .put('/api/holdings/holding-1')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/holdings/holding-1')
      .expect(401);
    await request(app.getHttpServer()).get('/api/watchlist').expect(401);
    await request(app.getHttpServer())
      .post('/api/watchlist')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete('/api/watchlist/watch-1')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/portfolio/summary')
      .expect(401);
    expect(prisma.userHolding.findMany).not.toHaveBeenCalled();
    expect(prisma.userHolding.create).not.toHaveBeenCalled();
    expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
  });

  it('rejects cross-origin mutations', async () => {
    const holding = {
      symbol: 'TCS.NS',
      quantity: 2,
      buyPrice: 4000,
      buyDate: '2026-11-01',
    };
    await request(app.getHttpServer())
      .post('/api/holdings')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send(holding)
      .expect(403);
    await request(app.getHttpServer())
      .put('/api/holdings/holding-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send(holding)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/holdings/holding-1')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/watchlist')
      .set('Cookie', 'session=test')
      .set('Origin', 'https://other.example')
      .send({ symbol: 'TCS.NS' })
      .expect(403);
    expect(prisma.userHolding.create).not.toHaveBeenCalled();
    expect(prisma.userHolding.deleteMany).not.toHaveBeenCalled();
    expect(prisma.watchlistItem.create).not.toHaveBeenCalled();
  });

  it('lists holdings owned by the user', async () => {
    const result = await session(
      request(app.getHttpServer()).get('/api/holdings'),
    ).expect(200);
    expect(prisma.userHolding.findMany).toHaveBeenCalledWith({
      where: { user_id: 'owner' },
      orderBy: [{ symbol: 'asc' }, { id: 'asc' }],
    });
    expect(result.body).toEqual([
      {
        id: 'holding-1',
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        sector: 'Energy',
        quantity: 10,
        buyPrice: 2450.5,
        buyDate: '2026-01-15',
        currency: 'INR',
      },
    ]);
  });

  it('creates a holding with normalized values', async () => {
    const result = await session(
      request(app.getHttpServer()).post('/api/holdings').send({
        symbol: 'reliance.ns',
        name: 'Reliance Industries Limited',
        sector: 'Energy',
        quantity: 10,
        buyPrice: 2450.5,
        buyDate: '2026-01-15',
      }),
    ).expect(201);
    expect(prisma.userHolding.create).toHaveBeenCalledWith({
      data: {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        sector: 'Energy',
        quantity: '10.0000',
        buy_price: '2450.50',
        buy_date: new Date('2026-01-15T00:00:00Z'),
        currency: 'INR',
        user_id: 'owner',
      },
    });
    expect(result.body.symbol).toBe('RELIANCE.NS');
  });

  it('rejects duplicate holdings with 409 and invalid holdings with 400', async () => {
    prisma.userHolding.create.mockRejectedValueOnce(conflict());
    const duplicate = await session(
      request(app.getHttpServer()).post('/api/holdings').send({
        symbol: 'RELIANCE.NS',
        quantity: 5,
        buyPrice: 2500,
        buyDate: '2026-11-01',
      }),
    ).expect(409);
    expect(duplicate.body.message).toMatch(/already track/);
    await session(
      request(app.getHttpServer()).post('/api/holdings').send({
        symbol: 'RELIANCE.NS',
        quantity: 0,
        buyPrice: 2500,
        buyDate: '2026-11-01',
      }),
    ).expect(400);
    await session(
      request(app.getHttpServer()).post('/api/holdings').send({
        symbol: 'RELIANCE.NS',
        quantity: 5,
        buyPrice: 2500,
        buyDate: '9999-01-01',
      }),
    ).expect(400);
  });

  it('updates only a holding belonging to the owner', async () => {
    prisma.userHolding.findFirst.mockResolvedValue({
      ...storedHolding,
      quantity: '12.0000',
      buy_price: '2400.00',
    });
    const result = await session(
      request(app.getHttpServer()).put('/api/holdings/holding-1').send({
        symbol: 'RELIANCE.NS',
        quantity: 12,
        buyPrice: 2400,
        buyDate: '2026-01-15',
      }),
    ).expect(200);
    expect(prisma.userHolding.updateMany).toHaveBeenCalledWith({
      where: { id: 'holding-1', user_id: 'owner' },
      data: {
        symbol: 'RELIANCE.NS',
        name: null,
        sector: null,
        quantity: '12.0000',
        buy_price: '2400.00',
        buy_date: new Date('2026-01-15T00:00:00Z'),
        currency: 'INR',
      },
    });
    expect(result.body).toMatchObject({ quantity: 12, buyPrice: 2400 });
  });

  it('reports missing holdings on update and delete', async () => {
    prisma.userHolding.updateMany.mockResolvedValue({ count: 0 });
    await session(
      request(app.getHttpServer()).put('/api/holdings/missing').send({
        symbol: 'TCS.NS',
        quantity: 1,
        buyPrice: 4000,
        buyDate: '2026-11-01',
      }),
    ).expect(404);
    prisma.userHolding.deleteMany.mockResolvedValue({ count: 0 });
    await session(
      request(app.getHttpServer()).delete('/api/holdings/missing'),
    ).expect(404);
  });

  it('deletes only a holding belonging to the owner', async () => {
    await session(
      request(app.getHttpServer()).delete('/api/holdings/holding-1'),
    ).expect(200, { deleted: true });
    expect(prisma.userHolding.deleteMany).toHaveBeenCalledWith({
      where: { id: 'holding-1', user_id: 'owner' },
    });
  });

  it('saves or clears watch settings for only the signed-in owner', async () => {
    const save = (body: object) =>
      session(
        request(app.getHttpServer()).put('/api/watchlist/watch-1').send(body),
      );
    await save({
      note: 'Watch earnings',
      alertDirection: 'above',
      alertPrice: 4200,
    }).expect(200);
    expect(prisma.watchlistItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'watch-1', user_id: 'owner' },
    });
    // A newly set alert re-arms (the stored item had no alert).
    expect(prisma.watchlistItem.update).toHaveBeenCalledWith({
      where: { id: 'watch-1' },
      data: {
        note: 'Watch earnings',
        alert_direction: 'above',
        alert_price: '4200.00',
        alert_fired_at: null,
      },
    });
    await save({ note: '', alertDirection: null, alertPrice: null }).expect(
      200,
    );
    expect(prisma.watchlistItem.update).toHaveBeenLastCalledWith({
      where: { id: 'watch-1' },
      data: { note: null, alert_direction: null, alert_price: null },
    });
    await save({ alertDirection: 'below', alertPrice: -2 }).expect(400);
    prisma.watchlistItem.findFirst.mockResolvedValue(null);
    await save({ note: 'unowned item' }).expect(404);
  });

  it('re-arms the alert only when the alert itself changes', async () => {
    const save = (body: object) =>
      session(
        request(app.getHttpServer()).put('/api/watchlist/watch-1').send(body),
      );
    prisma.watchlistItem.findFirst.mockResolvedValue({
      ...storedWatchlistItem,
      alert_direction: 'above',
      alert_price: '4200.00',
      alert_fired_at: new Date('2026-11-24T10:00:00Z'),
    });
    // A note-only edit keeps the fired state: the alert already fired
    // and must not re-notify.
    await save({
      note: 'New note',
      alertDirection: 'above',
      alertPrice: 4200,
    }).expect(200);
    expect(prisma.watchlistItem.update).toHaveBeenLastCalledWith({
      where: { id: 'watch-1' },
      data: {
        note: 'New note',
        alert_direction: 'above',
        alert_price: '4200.00',
      },
    });
    // A changed target clears the fired state so the new target can fire.
    await save({
      note: 'New note',
      alertDirection: 'above',
      alertPrice: 4300,
    }).expect(200);
    expect(prisma.watchlistItem.update).toHaveBeenLastCalledWith({
      where: { id: 'watch-1' },
      data: {
        note: 'New note',
        alert_direction: 'above',
        alert_price: '4300.00',
        alert_fired_at: null,
      },
    });
    // Clearing the alert clears the fired state with it.
    await save({ note: '', alertDirection: null, alertPrice: null }).expect(
      200,
    );
    expect(prisma.watchlistItem.update).toHaveBeenLastCalledWith({
      where: { id: 'watch-1' },
      data: {
        note: null,
        alert_direction: null,
        alert_price: null,
        alert_fired_at: null,
      },
    });
  });

  it('manages the watchlist with duplicate protection', async () => {
    const list = await session(
      request(app.getHttpServer()).get('/api/watchlist'),
    ).expect(200);
    expect(list.body).toEqual([
      { id: 'watch-1', symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    ]);
    await session(
      request(app.getHttpServer()).post('/api/watchlist').send({
        symbol: 'infosys.ns',
        name: 'Infosys',
      }),
    ).expect(201);
    expect(prisma.watchlistItem.create).toHaveBeenCalledWith({
      data: { symbol: 'INFOSYS.NS', name: 'Infosys', user_id: 'owner' },
    });
    prisma.watchlistItem.create.mockRejectedValueOnce(conflict());
    const duplicate = await session(
      request(app.getHttpServer())
        .post('/api/watchlist')
        .send({ symbol: 'TCS.NS' }),
    ).expect(409);
    expect(duplicate.body.message).toMatch(/already on your watchlist/);
    await session(
      request(app.getHttpServer()).delete('/api/watchlist/watch-1'),
    ).expect(200, { deleted: true });
    expect(prisma.watchlistItem.deleteMany).toHaveBeenCalledWith({
      where: { id: 'watch-1', user_id: 'owner' },
    });
    prisma.watchlistItem.deleteMany.mockResolvedValue({ count: 0 });
    await session(
      request(app.getHttpServer()).delete('/api/watchlist/missing'),
    ).expect(404);
  });

  it('values the portfolio in exact paise', async () => {
    prisma.userHolding.findMany.mockResolvedValue([
      storedHolding,
      {
        id: 'holding-2',
        user_id: 'owner',
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services',
        sector: 'Technology',
        quantity: '0.5000',
        buy_price: '4000.00',
        buy_date: new Date('2026-06-01T00:00:00Z'),
        currency: 'INR',
        created_at: new Date('2026-06-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
      },
    ]);
    provider.quote.mockImplementation(async (symbol: string) => {
      if (symbol === 'RELIANCE.NS') {
        return {
          symbol,
          price: 2600.25,
          previousClose: 2580,
          currency: 'INR',
          sector: 'Energy',
        };
      }
      return {
        symbol,
        price: 4200.5,
        previousClose: 4180,
        currency: 'INR',
        sector: 'Technology',
      };
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    // RELIANCE: 10 × 2600.25 = 26002.50; invested 10 × 2450.50 = 24505.00;
    // gain 1497.50 (6.11%). TCS: 0.5 × 4200.50 = 2100.25; invested 2000.00;
    // gain 100.25 (5.01%).
    expect(result.body.holdings).toHaveLength(2);
    expect(result.body.holdings[0]).toMatchObject({
      symbol: 'RELIANCE.NS',
      currentPrice: 2600.25,
      currentValue: 26002.5,
      investedValue: 24505,
      gainLoss: 1497.5,
      gainLossPercent: 6.11,
      sector: 'Energy',
      priced: true,
      stale: false,
    });
    expect(result.body.holdings[1]).toMatchObject({
      symbol: 'TCS.NS',
      currentValue: 2100.25,
      investedValue: 2000,
      gainLoss: 100.25,
      gainLossPercent: 5.01,
      priced: true,
    });
    expect(result.body.totals).toEqual({
      totalValue: 28102.75,
      totalInvested: 26505,
      totalGainLoss: 1597.75,
      totalGainLossPercent: 6.03,
    });
    expect(result.body.totalsByCurrency).toEqual([
      {
        currency: 'INR',
        totalValue: 28102.75,
        totalInvested: 26505,
        totalGainLoss: 1597.75,
        totalGainLossPercent: 6.03,
      },
    ]);
    expect(result.body.sectors).toEqual([
      { sector: 'Energy', value: 26002.5, weight: 92.53 },
      { sector: 'Technology', value: 2100.25, weight: 7.47 },
    ]);
    expect(result.body.unavailable).toEqual([]);
    expect(result.body.stale).toBe(false);
    expect(typeof result.body.asOf).toBe('string');
  });

  it('excludes unpriced holdings from the totals and lists them', async () => {
    provider.quote.mockImplementation(async (symbol: string) => {
      if (symbol === 'RELIANCE.NS') throw new Error('no data');
      return { symbol, price: 4200.5, currency: 'INR' };
    });
    prisma.userHolding.findMany.mockResolvedValue([
      storedHolding,
      {
        id: 'holding-2',
        user_id: 'owner',
        symbol: 'TCS.NS',
        name: null,
        sector: null,
        quantity: '2.0000',
        buy_price: '4000.00',
        buy_date: new Date('2026-06-01T00:00:00Z'),
        created_at: new Date('2026-06-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
      },
    ]);
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    expect(result.body.unavailable).toEqual(['RELIANCE.NS']);
    expect(result.body.holdings[0]).toMatchObject({
      symbol: 'RELIANCE.NS',
      currentPrice: null,
      currentValue: null,
      gainLoss: null,
      priced: false,
    });
    // Only TCS is valued: 2 × 4200.50 = 8401.00; invested 8000.00.
    expect(result.body.totals).toEqual({
      totalValue: 8401,
      totalInvested: 8000,
      totalGainLoss: 401,
      totalGainLossPercent: 5.01,
    });
    expect(result.body.sectors).toEqual([
      { sector: 'Unknown', value: 8401, weight: 100 },
    ]);
  });

  it('values a USD holding in USD and reports per-currency totals when mixed', async () => {
    prisma.userHolding.findMany.mockResolvedValue([
      storedHolding,
      {
        id: 'holding-2',
        user_id: 'owner',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        quantity: '2.0000',
        buy_price: '200.00',
        buy_date: new Date('2026-06-01T00:00:00Z'),
        currency: 'USD',
        created_at: new Date('2026-06-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
      },
    ]);
    provider.quote.mockImplementation(async (symbol: string) => {
      if (symbol === 'RELIANCE.NS') {
        return {
          symbol,
          price: 2600.25,
          previousClose: 2580,
          currency: 'INR',
          sector: 'Energy',
        };
      }
      return {
        symbol,
        price: 250,
        previousClose: 245,
        currency: 'USD',
        sector: 'Technology',
      };
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    // AAPL: 2 × $250 = $500; invested $400; gain $100 (25%).
    expect(result.body.holdings[1]).toMatchObject({
      symbol: 'AAPL',
      currency: 'USD',
      currentPrice: 250,
      currentValue: 500,
      investedValue: 400,
      gainLoss: 100,
      gainLossPercent: 25,
      priced: true,
    });
    expect(result.body.unavailable).toEqual([]);
    expect(result.body.totalsByCurrency).toEqual([
      {
        currency: 'INR',
        totalValue: 26002.5,
        totalInvested: 24505,
        totalGainLoss: 1497.5,
        totalGainLossPercent: 6.11,
      },
      {
        currency: 'USD',
        totalValue: 500,
        totalInvested: 400,
        totalGainLoss: 100,
        totalGainLossPercent: 25,
      },
    ]);
  });

  it('leaves a holding unpriced when its quote is in another currency', async () => {
    provider.quote.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      price: 31,
      previousClose: 30,
      currency: 'USD',
      sector: 'Energy',
    });
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    expect(result.body.unavailable).toEqual(['RELIANCE.NS']);
    expect(result.body.holdings[0]).toMatchObject({
      symbol: 'RELIANCE.NS',
      currency: 'INR',
      currentPrice: null,
      priced: false,
    });
    expect(result.body.totalsByCurrency).toEqual([]);
  });

  it('returns zeros for an empty portfolio', async () => {
    prisma.userHolding.findMany.mockResolvedValue([]);
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    expect(result.body).toEqual({
      holdings: [],
      totals: {
        totalValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
      },
      totalsByCurrency: [],
      sectors: [],
      unavailable: [],
      asOf: null,
      stale: false,
    });
    expect(provider.quote).not.toHaveBeenCalled();
  });

  it('marks the summary stale when any quote is stale', async () => {
    prisma.marketQuote.findUnique.mockResolvedValue({
      symbol: 'RELIANCE.NS',
      name: 'Reliance Industries Limited',
      price: '2600.2500',
      previous_close: '2580.0000',
      currency: 'INR',
      sector: 'Energy',
      fetched_at: new Date(Date.now() - 60 * 60 * 1000),
    });
    provider.quote.mockRejectedValue(new Error('Yahoo is down'));
    const result = await session(
      request(app.getHttpServer()).get('/api/portfolio/summary'),
    ).expect(200);
    expect(result.body.stale).toBe(true);
    expect(result.body.holdings[0]).toMatchObject({
      currentPrice: 2600.25,
      stale: true,
      priced: true,
    });
    expect(result.body.unavailable).toEqual([]);
  });
});
