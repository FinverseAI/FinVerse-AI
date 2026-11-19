import { RagRepository, type NewRagDocument } from './rag.repository';

function sqlOf(call: unknown[]): string {
  const [strings] = call as [TemplateStringsArray, ...unknown[]];
  return strings.join('?');
}

function valuesOf(call: unknown[]): unknown[] {
  const [, ...values] = call as [TemplateStringsArray, ...unknown[]];
  return values;
}

const row = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

describe('RagRepository', () => {
  function makeRepo() {
    const queryRaw = jest.fn();
    const executeRaw = jest.fn();
    const prisma = {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as ConstructorParameters<typeof RagRepository>[0];
    return { repo: new RagRepository(prisma), queryRaw, executeRaw };
  }

  const doc = (overrides: Partial<NewRagDocument> = {}): NewRagDocument => ({
    sourceType: 'news',
    sourceId: 'https://example.test/a1',
    userId: null,
    symbol: 'RELIANCE.NS',
    title: 'Reliance profit jumps',
    content: 'Reliance profit jumps. Source: Reuters.',
    embedding: [0.1, 0.2, 0.3],
    publishedAt: new Date('2026-11-18T10:00:00Z'),
    url: 'https://example.test/a1',
    metadata: { publisher: 'Reuters' },
    ...overrides,
  });

  describe('upsertDocuments', () => {
    it('inserts with a vector literal and an upsert clause', async () => {
      const { repo, executeRaw } = makeRepo();
      executeRaw.mockResolvedValue(1);
      const count = await repo.upsertDocuments([doc()]);
      expect(count).toBe(1);
      expect(executeRaw).toHaveBeenCalledTimes(1);
      const sql = sqlOf(executeRaw.mock.calls[0]);
      expect(sql).toContain('INSERT INTO "rag_documents"');
      expect(sql).toContain(
        'ON CONFLICT ("source_type", "source_id") DO UPDATE SET',
      );
      expect(sql).toContain('::vector');
      const values = valuesOf(executeRaw.mock.calls[0]);
      expect(values).toContain('[0.1,0.2,0.3]');
      expect(values).toContain('{"publisher":"Reuters"}');
    });

    it('passes null metadata as SQL NULL, not JSON null', async () => {
      const { repo, executeRaw } = makeRepo();
      executeRaw.mockResolvedValue(1);
      await repo.upsertDocuments([doc({ metadata: null })]);
      const values = valuesOf(executeRaw.mock.calls[0]);
      expect(values).toContain(null);
      expect(values).not.toContain('null');
    });

    it('inserts each document and returns the count', async () => {
      const { repo, executeRaw } = makeRepo();
      executeRaw.mockResolvedValue(1);
      const count = await repo.upsertDocuments([
        doc(),
        doc({ sourceId: 'https://example.test/a2' }),
      ]);
      expect(count).toBe(2);
      expect(executeRaw).toHaveBeenCalledTimes(2);
    });

    it('does nothing for an empty list', async () => {
      const { repo, executeRaw } = makeRepo();
      await expect(repo.upsertDocuments([])).resolves.toBe(0);
      expect(executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('searchSimilar', () => {
    it('scopes retrieval to public rows plus the caller’s own rows', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([{ ...row(), similarity: 0.82 }]);
      const chunks = await repo.searchSimilar('owner-1', [0.1, 0.2, 0.3], {
        topK: 5,
        minSimilarity: 0.35,
      });
      expect(chunks).toHaveLength(1);
      expect(chunks[0].similarity).toBe(0.82);
      expect(chunks[0].title).toBe('Reliance profit jumps');
      const sql = sqlOf(queryRaw.mock.calls[0]);
      expect(sql).toContain('("user_id" IS NULL OR "user_id" = ?)');
      expect(sql).toContain('ORDER BY "similarity" DESC');
      const values = valuesOf(queryRaw.mock.calls[0]);
      expect(values).toContain('owner-1');
      expect(values).toContain(0.35);
      expect(values).toContain(5);
      expect(values).toContain('[0.1,0.2,0.3]');
    });

    it('passes the symbol and source-type filters through', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([]);
      await repo.searchSimilar('owner-1', [0.1], {
        symbol: 'TCS.NS',
        sourceType: 'profile',
        topK: 3,
        minSimilarity: 0.5,
      });
      const values = valuesOf(queryRaw.mock.calls[0]);
      expect(values).toContain('TCS.NS');
      expect(values).toContain('profile');
    });

    it('passes null filters when none are given', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([]);
      await repo.searchSimilar('owner-1', [0.1], {
        topK: 3,
        minSimilarity: 0.5,
      });
      const values = valuesOf(queryRaw.mock.calls[0]);
      expect(values).toContain(null);
    });
  });

  describe('listRecentNews', () => {
    it('orders by publish date, newest first', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([row(), row({ id: 'doc-2' })]);
      const news = await repo.listRecentNews('RELIANCE.NS', 8);
      expect(news).toHaveLength(2);
      const sql = sqlOf(queryRaw.mock.calls[0]);
      expect(sql).toContain('"source_type" = \'news\'');
      expect(sql).toContain('ORDER BY "published_at" DESC NULLS LAST');
      const values = valuesOf(queryRaw.mock.calls[0]);
      expect(values).toEqual(['RELIANCE.NS', 8]);
    });
  });

  describe('newsFreshness', () => {
    it('returns the count and newest ingest time', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([
        { count: 4, newest_at: new Date('2026-11-19T08:00:00Z') },
      ]);
      await expect(repo.newsFreshness('RELIANCE.NS')).resolves.toEqual({
        count: 4,
        newestAt: new Date('2026-11-19T08:00:00Z'),
      });
    });

    it('returns zero and null when nothing is indexed', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([{ count: 0, newest_at: null }]);
      await expect(repo.newsFreshness('TCS.NS')).resolves.toEqual({
        count: 0,
        newestAt: null,
      });
    });
  });

  describe('existingSourceIds', () => {
    it('returns the indexed source ids as a set', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([
        { source_id: 'tx-1' },
        { source_id: 'tx-2' },
      ]);
      const ids = await repo.existingSourceIds('transaction', 'owner-1');
      expect(ids).toEqual(new Set(['tx-1', 'tx-2']));
      const values = valuesOf(queryRaw.mock.calls[0]);
      expect(values).toEqual(['transaction', 'owner-1']);
    });
  });

  describe('existingNewsSourceIds', () => {
    it('returns the indexed news urls for a symbol', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([{ source_id: 'https://example.test/a1' }]);
      const ids = await repo.existingNewsSourceIds('RELIANCE.NS');
      expect(ids).toEqual(new Set(['https://example.test/a1']));
    });
  });

  describe('hasPublicSource', () => {
    it('returns true when a public document exists', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([{ found: 1 }]);
      await expect(
        repo.hasPublicSource('profile', 'RELIANCE.NS'),
      ).resolves.toBe(true);
      const sql = sqlOf(queryRaw.mock.calls[0]);
      expect(sql).toContain('"user_id" IS NULL');
      expect(valuesOf(queryRaw.mock.calls[0])).toEqual([
        'profile',
        'RELIANCE.NS',
      ]);
    });

    it('returns false when no public document exists', async () => {
      const { repo, queryRaw } = makeRepo();
      queryRaw.mockResolvedValue([]);
      await expect(repo.hasPublicSource('profile', 'TCS.NS')).resolves.toBe(
        false,
      );
    });
  });

  describe('deleteStaleNews', () => {
    it('deletes news older than the cutoff and returns the count', async () => {
      const { repo, executeRaw } = makeRepo();
      executeRaw.mockResolvedValue(3);
      const cutoff = new Date('2026-10-20T00:00:00Z');
      await expect(repo.deleteStaleNews(cutoff)).resolves.toBe(3);
      const sql = sqlOf(executeRaw.mock.calls[0]);
      expect(sql).toContain('DELETE FROM "rag_documents"');
      expect(valuesOf(executeRaw.mock.calls[0])).toEqual([cutoff]);
    });
  });
});
