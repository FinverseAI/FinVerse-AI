import { RagEmbeddingError } from './rag.embeddings';
import { RagIngestService } from './rag.ingest';

const newsItem = (overrides: Record<string, unknown> = {}) => ({
  title: 'Reliance profit jumps 12%',
  publisher: 'Reuters',
  link: 'https://example.test/a1',
  publishedAt: new Date('2026-11-18T10:00:00Z'),
  ...overrides,
});

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  name: 'Swiggy order',
  amount: -420.5,
  category: 'Food & Dining',
  date: '2026-11-15',
  ...overrides,
});

describe('RagIngestService', () => {
  function makeService(env: Record<string, string | undefined> = {}) {
    const repository = {
      upsertDocuments: jest.fn().mockResolvedValue(0),
      existingNewsSourceIds: jest.fn().mockResolvedValue(new Set()),
      existingSourceIds: jest.fn().mockResolvedValue(new Set()),
      deleteStaleNews: jest.fn().mockResolvedValue(0),
      hasPublicSource: jest.fn().mockResolvedValue(false),
    };
    const embeddings = {
      embed: jest.fn(async (texts: string[]) =>
        texts.map(() => [0.1, 0.2, 0.3]),
      ),
      embedOne: jest.fn(),
    };
    const provider = { news: jest.fn() };
    const market = { profile: jest.fn() };
    const activity = { transactions: jest.fn() };
    const configService = { get: (key: string) => env[key] };
    const service = new RagIngestService(
      configService as never,
      repository as never,
      embeddings as never,
      provider as never,
      market as never,
      activity as never,
    );
    return { service, repository, embeddings, provider, market, activity };
  }

  function withKey() {
    return makeService({ OPENROUTER_API_KEY: 'key' });
  }

  describe('indexNews', () => {
    it('embeds and stores fresh news, skipping already-indexed urls', async () => {
      const { service, repository, embeddings, provider } = withKey();
      provider.news.mockResolvedValue([
        newsItem(),
        newsItem({
          link: 'https://example.test/a2',
          title: 'Reliance launches new unit',
        }),
      ]);
      repository.existingNewsSourceIds.mockResolvedValue(
        new Set(['https://example.test/a1']),
      );
      repository.upsertDocuments.mockResolvedValue(1);
      const result = await service.indexNews('RELIANCE.NS');
      expect(result).toEqual({
        indexed: 1,
        skipped: 1,
        available: true,
        reason: null,
      });
      expect(embeddings.embed).toHaveBeenCalledTimes(1);
      const [texts] = embeddings.embed.mock.calls[0] as [string[]];
      expect(texts).toHaveLength(1);
      expect(texts[0]).toContain('Reliance launches new unit');
      const [docs] = repository.upsertDocuments.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];
      expect(docs[0].sourceType).toBe('news');
      expect(docs[0].userId).toBeNull();
      expect(docs[0].symbol).toBe('RELIANCE.NS');
      expect(docs[0].url).toBe('https://example.test/a2');
    });

    it('prunes stale news after a successful ingest', async () => {
      const { service, repository, provider } = withKey();
      provider.news.mockResolvedValue([]);
      await service.indexNews('RELIANCE.NS');
      expect(repository.deleteStaleNews).toHaveBeenCalledTimes(1);
      const [cutoff] = repository.deleteStaleNews.mock.calls[0] as [Date];
      expect(Date.now() - cutoff.getTime()).toBeGreaterThan(
        29 * 24 * 60 * 60 * 1000,
      );
    });

    it('reports unavailable when embeddings are not configured', async () => {
      const { service, provider } = makeService({});
      const result = await service.indexNews('RELIANCE.NS');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('embeddings-not-configured');
      expect(provider.news).not.toHaveBeenCalled();
    });

    it('reports unavailable when the news provider fails', async () => {
      const { service, provider } = withKey();
      provider.news.mockRejectedValue(new Error('yahoo down'));
      const result = await service.indexNews('RELIANCE.NS');
      expect(result).toEqual({
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'source-unavailable',
      });
    });

    it('stops at the first failed batch and keeps earlier work', async () => {
      const { service, repository, embeddings, provider } = makeService({
        OPENROUTER_API_KEY: 'key',
        RAG_INGEST_BATCH_SIZE: '1',
      });
      provider.news.mockResolvedValue([
        newsItem(),
        newsItem({ link: 'https://example.test/a2' }),
      ]);
      embeddings.embed
        .mockResolvedValueOnce([[0.1, 0.2, 0.3]])
        .mockRejectedValueOnce(new RagEmbeddingError('provider down', 500));
      repository.upsertDocuments.mockResolvedValue(1);
      const result = await service.indexNews('RELIANCE.NS');
      expect(result.indexed).toBe(1);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('embeddings-unavailable');
      expect(repository.upsertDocuments).toHaveBeenCalledTimes(1);
    });
  });

  describe('indexProfile', () => {
    it('indexes the profile description and sector', async () => {
      const { service, repository, embeddings, market } = withKey();
      market.profile.mockResolvedValue({
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries',
        sector: 'Energy',
        fundamentals: {
          sector: 'Energy',
          industry: 'Oil & Gas',
          description: 'Operates refineries and retail.',
        },
        fundamentalsAvailable: true,
      });
      repository.upsertDocuments.mockResolvedValue(1);
      const result = await service.indexProfile('RELIANCE.NS');
      expect(result.indexed).toBe(1);
      expect(result.available).toBe(true);
      const [texts] = embeddings.embed.mock.calls[0] as [string[]];
      expect(texts[0]).toContain('Operates refineries and retail.');
      const [docs] = repository.upsertDocuments.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];
      expect(docs[0].sourceType).toBe('profile');
      expect(docs[0].sourceId).toBe('RELIANCE.NS');
      expect(docs[0].userId).toBeNull();
    });

    it('skips a profile with no description and no sector', async () => {
      const { service, embeddings, market } = withKey();
      market.profile.mockResolvedValue({
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries',
        sector: null,
        fundamentals: null,
        fundamentalsAvailable: false,
      });
      const result = await service.indexProfile('RELIANCE.NS');
      expect(result).toEqual({
        indexed: 0,
        skipped: 1,
        available: true,
        reason: null,
      });
      expect(embeddings.embed).not.toHaveBeenCalled();
    });

    it('reports unavailable when the profile fetch fails', async () => {
      const { service, market } = withKey();
      market.profile.mockRejectedValue(new Error('no price'));
      const result = await service.indexProfile('RELIANCE.NS');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('source-unavailable');
    });
  });

  describe('indexTransactions', () => {
    it('indexes fresh transactions user-scoped', async () => {
      const { service, repository, embeddings, activity } = withKey();
      activity.transactions.mockResolvedValue([
        transaction(),
        transaction({ id: 'tx-2', name: 'Salary', amount: 85000 }),
      ]);
      repository.existingSourceIds.mockResolvedValue(new Set(['tx-1']));
      repository.upsertDocuments.mockResolvedValue(1);
      const result = await service.indexTransactions('owner-1');
      expect(result).toEqual({
        indexed: 1,
        skipped: 1,
        available: true,
        reason: null,
      });
      const [docs] = repository.upsertDocuments.mock.calls[0] as [
        Array<Record<string, unknown>>,
      ];
      expect(docs[0].sourceType).toBe('transaction');
      expect(docs[0].userId).toBe('owner-1');
      expect(docs[0].sourceId).toBe('tx-2');
      expect(docs[0].symbol).toBeNull();
      const [texts] = embeddings.embed.mock.calls[0] as [string[]];
      expect(texts[0]).toContain('Salary');
    });

    it('caps ingestion at the most recent 200 transactions', async () => {
      const { service, embeddings, activity } = withKey();
      activity.transactions.mockResolvedValue(
        Array.from({ length: 250 }, (_, i) =>
          transaction({ id: `tx-${i}`, name: `Spend ${i}` }),
        ),
      );
      await service.indexTransactions('owner-1');
      const totalEmbedded = embeddings.embed.mock.calls.reduce(
        (sum: number, call: unknown[]) => sum + (call[0] as string[]).length,
        0,
      );
      expect(totalEmbedded).toBe(200);
    });

    it('batches embedding calls', async () => {
      const { service, embeddings, activity } = makeService({
        OPENROUTER_API_KEY: 'key',
        RAG_INGEST_BATCH_SIZE: '2',
      });
      activity.transactions.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) =>
          transaction({ id: `tx-${i}`, name: `Spend ${i}` }),
        ),
      );
      await service.indexTransactions('owner-1');
      expect(embeddings.embed).toHaveBeenCalledTimes(3);
      expect((embeddings.embed.mock.calls[0][0] as string[]).length).toBe(2);
    });

    it('reports unavailable when the activity fetch fails', async () => {
      const { service, activity } = withKey();
      activity.transactions.mockRejectedValue(new Error('db down'));
      const result = await service.indexTransactions('owner-1');
      expect(result.available).toBe(false);
      expect(result.reason).toBe('source-unavailable');
    });
  });

  describe('ensureProfileIndexed', () => {
    it('skips indexing when the profile is already stored', async () => {
      const { service, repository, market } = withKey();
      repository.hasPublicSource.mockResolvedValue(true);
      await service.ensureProfileIndexed('RELIANCE.NS');
      expect(repository.hasPublicSource).toHaveBeenCalledWith(
        'profile',
        'RELIANCE.NS',
      );
      expect(market.profile).not.toHaveBeenCalled();
    });

    it('indexes when the profile is missing', async () => {
      const { service, market } = withKey();
      market.profile.mockResolvedValue({
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries',
        sector: 'Energy',
        fundamentals: {
          sector: 'Energy',
          industry: 'Oil & Gas',
          description: 'Operates refineries and retail.',
        },
        fundamentalsAvailable: true,
      });
      await service.ensureProfileIndexed('RELIANCE.NS');
      expect(market.profile).toHaveBeenCalledWith('RELIANCE.NS');
    });

    it('never throws when the existence check fails', async () => {
      const { service, repository, market } = withKey();
      repository.hasPublicSource.mockRejectedValue(new Error('db down'));
      await expect(
        service.ensureProfileIndexed('RELIANCE.NS'),
      ).resolves.toBeUndefined();
      expect(market.profile).not.toHaveBeenCalled();
    });
  });

  describe('pruneStaleNews', () => {
    it('never throws', async () => {
      const { service, repository } = withKey();
      repository.deleteStaleNews.mockRejectedValue(new Error('db down'));
      await expect(service.pruneStaleNews()).resolves.toBe(0);
    });
  });
});
