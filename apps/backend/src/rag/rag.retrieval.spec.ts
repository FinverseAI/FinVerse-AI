import { RagEmbeddingError } from './rag.embeddings';
import { RagRetrievalService } from './rag.retrieval';

const chunk = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

describe('RagRetrievalService', () => {
  function makeService(env: Record<string, string | undefined> = {}) {
    const searchSimilar = jest.fn();
    const embedOne = jest.fn();
    const configService = { get: (key: string) => env[key] };
    const service = new RagRetrievalService(
      configService as never,
      { searchSimilar } as never,
      { embed: jest.fn(), embedOne } as never,
    );
    return { service, searchSimilar, embedOne };
  }

  it('returns ranked chunks when retrieval is available', async () => {
    const { service, searchSimilar, embedOne } = makeService({
      OPENROUTER_API_KEY: 'key',
    });
    embedOne.mockResolvedValue([0.1, 0.2]);
    searchSimilar.mockResolvedValue([chunk()]);
    const result = await service.retrieve('owner-1', 'Reliance news');
    expect(result.available).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].title).toBe('Reliance profit jumps');
    expect(embedOne).toHaveBeenCalledWith('Reliance news');
    expect(searchSimilar).toHaveBeenCalledWith('owner-1', [0.1, 0.2], {
      symbol: undefined,
      sourceType: undefined,
      topK: 5,
      minSimilarity: 0.35,
    });
  });

  it('passes symbol, source type and top-k through', async () => {
    const { service, searchSimilar, embedOne } = makeService({
      OPENROUTER_API_KEY: 'key',
    });
    embedOne.mockResolvedValue([0.1]);
    searchSimilar.mockResolvedValue([]);
    await service.retrieve('owner-1', 'q', {
      symbol: 'TCS.NS',
      sourceType: 'profile',
      topK: 2,
    });
    expect(searchSimilar).toHaveBeenCalledWith('owner-1', [0.1], {
      symbol: 'TCS.NS',
      sourceType: 'profile',
      topK: 2,
      minSimilarity: 0.35,
    });
  });

  it('reports unavailable without embedding when no key is configured', async () => {
    const { service, searchSimilar, embedOne } = makeService({});
    const result = await service.retrieve('owner-1', 'Reliance news');
    expect(result).toEqual({
      available: false,
      chunks: [],
      reason: 'Embeddings are not configured yet.',
    });
    expect(embedOne).not.toHaveBeenCalled();
    expect(searchSimilar).not.toHaveBeenCalled();
  });

  it('reports unavailable when embedding fails', async () => {
    const { service, searchSimilar, embedOne } = makeService({
      OPENROUTER_API_KEY: 'key',
    });
    embedOne.mockRejectedValue(new RagEmbeddingError('provider down', 500));
    const result = await service.retrieve('owner-1', 'Reliance news');
    expect(result.available).toBe(false);
    expect(result.chunks).toEqual([]);
    expect(result.reason).toBe('Retrieval is unavailable right now.');
    expect(searchSimilar).not.toHaveBeenCalled();
  });

  it('reports unavailable when the database fails', async () => {
    const { service, embedOne, searchSimilar } = makeService({
      OPENROUTER_API_KEY: 'key',
    });
    embedOne.mockResolvedValue([0.1]);
    searchSimilar.mockRejectedValue(new Error('db down'));
    const result = await service.retrieve('owner-1', 'Reliance news');
    expect(result.available).toBe(false);
    expect(result.chunks).toEqual([]);
  });

  it('distinguishes empty results from an outage', async () => {
    const { service, embedOne, searchSimilar } = makeService({
      OPENROUTER_API_KEY: 'key',
    });
    embedOne.mockResolvedValue([0.1]);
    searchSimilar.mockResolvedValue([]);
    const result = await service.retrieve('owner-1', 'obscure query');
    // Available and empty: the query embedded fine, nothing relevant
    // passed the threshold — the caller must say so, not guess.
    expect(result).toEqual({ available: true, chunks: [], reason: null });
  });
});
