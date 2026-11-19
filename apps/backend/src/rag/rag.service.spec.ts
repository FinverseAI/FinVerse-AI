import { RagService } from './rag.service';

const newsRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  source_type: 'news',
  source_id: 'https://example.test/a1',
  user_id: null,
  symbol: 'RELIANCE.NS',
  title: 'Reliance profit surges to a record',
  content: 'Reliance profit surges to a record. Source: Reuters.',
  published_at: new Date('2026-11-18T10:00:00Z'),
  url: 'https://example.test/a1',
  metadata: { publisher: 'Reuters' },
  created_at: new Date('2026-11-18T10:05:00Z'),
  updated_at: new Date('2026-11-18T10:05:00Z'),
  ...overrides,
});

function barsFromCloses(closes: number[]) {
  return closes.map((close, i) => ({
    date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
  }));
}

const rising = Array.from({ length: 60 }, (_, i) => 100 + i);
const falling = Array.from({ length: 60 }, (_, i) => 200 - i);

function profileFor(symbol: string) {
  if (symbol === 'RELIANCE.NS') {
    return {
      symbol,
      name: 'Reliance Industries',
      price: 159,
      previousClose: 158,
      change: 1,
      changePercent: 0.63,
      currency: 'INR',
      sector: 'Energy',
      fetchedAt: new Date().toISOString(),
      stale: false,
      fundamentals: {
        sector: 'Energy',
        industry: 'Oil & Gas',
        marketCap: 2_000_000 * 10_000_000,
        trailingPE: 25,
        forwardPE: 22,
        dividendYield: 0.4,
        fiftyTwoWeekHigh: 160,
        fiftyTwoWeekLow: 100,
        description: 'Operates refineries and retail.',
      },
      fundamentalsAvailable: true,
    };
  }
  return {
    symbol,
    name: 'Tata Consultancy Services',
    price: 141,
    previousClose: 142,
    change: -1,
    changePercent: -0.7,
    currency: 'INR',
    sector: 'IT',
    fetchedAt: new Date().toISOString(),
    stale: false,
    fundamentals: {
      sector: 'IT',
      industry: 'Software',
      marketCap: 500_000 * 10_000_000,
      trailingPE: 30,
      forwardPE: 28,
      dividendYield: 1.2,
      fiftyTwoWeekHigh: 200,
      fiftyTwoWeekLow: 141,
      description: 'IT services company.',
    },
    fundamentalsAvailable: true,
  };
}

describe('RagService', () => {
  function makeService() {
    const repository = {
      newsFreshness: jest.fn(),
      listRecentNews: jest.fn(),
    };
    const ingest = { indexNews: jest.fn() };
    const market = {
      profile: jest.fn(async (symbol: string): Promise<unknown> =>
        profileFor(symbol),
      ),
      history: jest.fn(async (symbol: string) => ({
        symbol,
        range: '3mo',
        bars: barsFromCloses(symbol === 'RELIANCE.NS' ? rising : falling),
        fetchedAt: new Date().toISOString(),
        stale: false,
      })),
    };
    const portfolio = {
      holdings: jest.fn().mockResolvedValue([]),
      watchlist: jest.fn().mockResolvedValue([]),
    };
    const configService = { get: () => undefined };
    const service = new RagService(
      configService as never,
      repository as never,
      ingest as never,
      market as never,
      portfolio as never,
    );
    return { service, repository, ingest, market, portfolio };
  }

  describe('newsForSymbol', () => {
    it('serves fresh news without re-ingesting, with sentiment', async () => {
      const { service, repository, ingest } = makeService();
      repository.newsFreshness.mockResolvedValue({
        count: 2,
        newestAt: new Date(),
      });
      repository.listRecentNews.mockResolvedValue([
        newsRow(),
        newsRow({
          id: 'doc-2',
          title: 'Reliance shares fall on weak outlook',
          content: 'Reliance shares fall on weak outlook.',
          metadata: { publisher: 'Bloomberg' },
        }),
      ]);
      const result = await service.newsForSymbol('RELIANCE.NS');
      expect(ingest.indexNews).not.toHaveBeenCalled();
      expect(result.available).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].sentiment.label).toBe('positive');
      expect(result.articles[1].sentiment.label).toBe('negative');
      expect(result.overall).toEqual({
        score: 0,
        label: 'neutral',
        positive: 1,
        negative: 1,
        neutral: 0,
      });
      expect(result.articles[0].publisher).toBe('Reuters');
      expect(result.articles[0].publishedAt).toBe('2026-11-18');
    });

    it('refreshes the index when the stored news is stale', async () => {
      const { service, repository, ingest } = makeService();
      repository.newsFreshness.mockResolvedValue({
        count: 1,
        newestAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      repository.listRecentNews.mockResolvedValue([newsRow()]);
      ingest.indexNews.mockResolvedValue({
        indexed: 1,
        skipped: 0,
        available: true,
        reason: null,
      });
      const result = await service.newsForSymbol('RELIANCE.NS');
      expect(ingest.indexNews).toHaveBeenCalledWith('RELIANCE.NS');
      expect(result.available).toBe(true);
      expect(result.articles).toHaveLength(1);
    });

    it('reports honestly when no news exists and ingest is unavailable', async () => {
      const { service, repository, ingest } = makeService();
      repository.newsFreshness.mockResolvedValue({
        count: 0,
        newestAt: null,
      });
      repository.listRecentNews.mockResolvedValue([]);
      ingest.indexNews.mockResolvedValue({
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'source-unavailable',
      });
      const result = await service.newsForSymbol('RELIANCE.NS');
      expect(result.available).toBe(false);
      expect(result.articles).toEqual([]);
      expect(result.reason).toBe('No recent news was found for this stock.');
    });

    it('rejects an invalid symbol', async () => {
      const { service } = makeService();
      await expect(service.newsForSymbol('not a symbol!')).rejects.toThrow(
        'Enter a valid symbol.',
      );
    });
  });

  describe('screenerUniverse', () => {
    it('merges holdings, watchlist and the curated list without duplicates', async () => {
      const { service, portfolio } = makeService();
      portfolio.holdings.mockResolvedValue([
        { symbol: 'RELIANCE.NS' },
        { symbol: 'MYSTOCK.NS' },
      ]);
      portfolio.watchlist.mockResolvedValue([
        { symbol: 'TCS.NS' },
        { symbol: 'MYSTOCK.NS' },
      ]);
      const universe = await service.screenerUniverse('owner-1');
      expect(universe).toContain('RELIANCE.NS');
      expect(universe).toContain('TCS.NS');
      expect(universe).toContain('MYSTOCK.NS');
      expect(universe).toContain('INFY.NS');
      expect(new Set(universe).size).toBe(universe.length);
    });

    it('falls back to the curated list when portfolio reads fail', async () => {
      const { service, portfolio } = makeService();
      portfolio.holdings.mockRejectedValue(new Error('db down'));
      portfolio.watchlist.mockRejectedValue(new Error('db down'));
      const universe = await service.screenerUniverse('owner-1');
      expect(universe.length).toBe(15);
      expect(universe).toContain('RELIANCE.NS');
    });
  });

  describe('screen', () => {
    it('returns all matches sorted by 1-month change, best first', async () => {
      const { service } = makeService();
      const result = await service.screen('owner-1', {
        symbols: ['RELIANCE.NS', 'TCS.NS'],
      });
      expect(result.matches.map((m) => m.symbol)).toEqual([
        'RELIANCE.NS',
        'TCS.NS',
      ]);
      expect(result.matches[0].rsi14).toBe(100);
      expect(result.matches[1].rsi14).toBe(0);
      expect(result.matches[0].change1moPercent).toBeGreaterThan(0);
      expect(result.matches[1].change1moPercent).toBeLessThan(0);
      expect(result.unavailable).toEqual([]);
    });

    it('applies RSI, trend, sector, price, market-cap and change filters', async () => {
      const { service } = makeService();
      const only = async (filters: Record<string, unknown>) =>
        (
          await service.screen('owner-1', {
            symbols: ['RELIANCE.NS', 'TCS.NS'],
            ...filters,
          })
        ).matches.map((m) => m.symbol);
      await expect(only({ minRsi: 70 })).resolves.toEqual(['RELIANCE.NS']);
      await expect(only({ maxRsi: 30 })).resolves.toEqual(['TCS.NS']);
      await expect(only({ trend: 'above-sma20' })).resolves.toEqual([
        'RELIANCE.NS',
      ]);
      await expect(only({ trend: 'below-sma20' })).resolves.toEqual(['TCS.NS']);
      await expect(only({ trend: 'golden-cross' })).resolves.toEqual([
        'RELIANCE.NS',
      ]);
      await expect(only({ trend: 'death-cross' })).resolves.toEqual(['TCS.NS']);
      await expect(only({ sector: 'IT' })).resolves.toEqual(['TCS.NS']);
      await expect(only({ minPrice: 150 })).resolves.toEqual(['RELIANCE.NS']);
      await expect(only({ maxPrice: 150 })).resolves.toEqual(['TCS.NS']);
      await expect(only({ minMarketCapCr: 1_000_000 })).resolves.toEqual([
        'RELIANCE.NS',
      ]);
      await expect(only({ maxPe: 27 })).resolves.toEqual(['RELIANCE.NS']);
      await expect(only({ minChange1mo: 0 })).resolves.toEqual(['RELIANCE.NS']);
      await expect(only({ maxChange1mo: 0 })).resolves.toEqual(['TCS.NS']);
    });

    it('excludes symbols whose metric is missing for a filter', async () => {
      const { service, market } = makeService();
      market.profile.mockImplementation(async (symbol: string) => {
        const base = profileFor(symbol);
        if (symbol === 'RELIANCE.NS') {
          return {
            ...base,
            fundamentals: null,
            fundamentalsAvailable: false,
          };
        }
        return base;
      });
      const withCap = await service.screen('owner-1', {
        symbols: ['RELIANCE.NS', 'TCS.NS'],
        minMarketCapCr: 1,
      });
      // RELIANCE has no market cap to check, so it cannot pass.
      expect(withCap.matches.map((m) => m.symbol)).toEqual(['TCS.NS']);
      const noFilter = await service.screen('owner-1', {
        symbols: ['RELIANCE.NS', 'TCS.NS'],
      });
      expect(noFilter.matches).toHaveLength(2);
    });

    it('lists unavailable symbols instead of failing', async () => {
      const { service, market } = makeService();
      market.profile.mockImplementation(async (symbol: string) => {
        if (symbol === 'TCS.NS') throw new Error('no price');
        return profileFor(symbol);
      });
      const result = await service.screen('owner-1', {
        symbols: ['RELIANCE.NS', 'TCS.NS'],
      });
      expect(result.matches.map((m) => m.symbol)).toEqual(['RELIANCE.NS']);
      expect(result.unavailable).toEqual(['TCS.NS']);
    });

    it('respects the limit and dedupes the universe', async () => {
      const { service } = makeService();
      const result = await service.screen('owner-1', {
        symbols: ['RELIANCE.NS', 'RELIANCE.NS', 'TCS.NS'],
        limit: 1,
      });
      expect(result.universe).toEqual(['RELIANCE.NS', 'TCS.NS']);
      expect(result.matches).toHaveLength(1);
    });

    it('rejects invalid filters with a 400', async () => {
      const { service } = makeService();
      await expect(
        service.screen('owner-1', { minPrice: 500, maxPrice: 100 }),
      ).rejects.toThrow('minimum price must not exceed the maximum');
    });
  });
});
