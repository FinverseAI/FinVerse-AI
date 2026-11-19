import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_RAG_MIN_SIMILARITY,
  DEFAULT_RAG_TOP_K,
  EMBEDDING_DIMENSIONS,
  resolveRagConfig,
} from './rag.config';

describe('resolveRagConfig', () => {
  it('defaults to the in-family bge model on OpenRouter', () => {
    const config = resolveRagConfig(() => undefined);
    expect(config.apiKey).toBeUndefined();
    expect(config.embeddingModel).toBe(DEFAULT_EMBEDDING_MODEL);
    expect(config.embeddingModel).toBe('baai/bge-base-en-v1.5');
    expect(config.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config.topK).toBe(DEFAULT_RAG_TOP_K);
    expect(config.minSimilarity).toBe(DEFAULT_RAG_MIN_SIMILARITY);
    expect(EMBEDDING_DIMENSIONS).toBe(768);
  });

  it('shares the chat key and base URL when no embedding-specific values are set', () => {
    const env: Record<string, string> = {
      OPENROUTER_API_KEY: '  key-123 ',
      LLM_BASE_URL: 'https://example.test/v1',
    };
    const config = resolveRagConfig((key) => env[key]);
    expect(config.apiKey).toBe('key-123');
    expect(config.baseUrl).toBe('https://example.test/v1');
  });

  it('prefers the embedding-specific base URL and model overrides', () => {
    const env: Record<string, string> = {
      LLM_EMBEDDING_BASE_URL: 'https://embed.test/v1',
      LLM_EMBEDDING_MODEL: 'baai/bge-m3',
      RAG_TOP_K: '8',
      RAG_MIN_SIMILARITY: '0.5',
    };
    const config = resolveRagConfig((key) => env[key]);
    expect(config.baseUrl).toBe('https://embed.test/v1');
    expect(config.embeddingModel).toBe('baai/bge-m3');
    expect(config.topK).toBe(8);
    expect(config.minSimilarity).toBe(0.5);
  });

  it('falls back on invalid numeric values', () => {
    const env: Record<string, string> = {
      RAG_TOP_K: 'not a number',
      RAG_MIN_SIMILARITY: '2.5',
    };
    const config = resolveRagConfig((key) => env[key]);
    expect(config.topK).toBe(DEFAULT_RAG_TOP_K);
    expect(config.minSimilarity).toBe(DEFAULT_RAG_MIN_SIMILARITY);
  });
});
