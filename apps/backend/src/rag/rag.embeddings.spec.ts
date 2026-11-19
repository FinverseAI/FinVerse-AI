import { EMBEDDING_DIMENSIONS } from './rag.config';
import {
  OpenRouterEmbeddingsClient,
  RagEmbeddingError,
} from './rag.embeddings';

const vector = (seed: number) =>
  Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (seed + i) / 1000);

describe('OpenRouterEmbeddingsClient', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // No default parameter: client(undefined) must really mean "no key".
  function client(apiKey: string | undefined) {
    return new OpenRouterEmbeddingsClient(
      apiKey,
      'https://openrouter.ai/api/v1',
      'baai/bge-base-en-v1.5',
      5000,
    );
  }

  it('returns one vector per input, in input order', async () => {
    const fetchMock = jest.fn(async () =>
      Response.json({
        data: [
          { index: 0, embedding: vector(1) },
          { index: 1, embedding: vector(2) },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await client('test-key').embed(['first', 'second']);
    expect(result).toHaveLength(2);
    expect(result[0][0]).toBeCloseTo(0.001);
    expect(result[1][0]).toBeCloseTo(0.002);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://openrouter.ai/api/v1/embeddings');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'baai/bge-base-en-v1.5',
      input: ['first', 'second'],
    });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-key',
    );
  });

  it('sorts out-of-order results back by index', async () => {
    global.fetch = jest.fn(async () =>
      Response.json({
        data: [
          { index: 1, embedding: vector(2) },
          { index: 0, embedding: vector(1) },
        ],
      }),
    ) as unknown as typeof fetch;
    const result = await client('test-key').embed(['first', 'second']);
    expect(result[0][0]).toBeCloseTo(0.001);
    expect(result[1][0]).toBeCloseTo(0.002);
  });

  it('embedOne returns the single vector', async () => {
    global.fetch = jest.fn(async () =>
      Response.json({ data: [{ index: 0, embedding: vector(3) }] }),
    ) as unknown as typeof fetch;
    const result = await client('test-key').embedOne('only');
    expect(result).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(result[0]).toBeCloseTo(0.003);
  });

  it('returns [] for empty input without calling the provider', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(client('test-key').embed([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when no API key is configured', async () => {
    await expect(client(undefined).embed(['x'])).rejects.toThrow(
      RagEmbeddingError,
    );
    await expect(client(undefined).embed(['x'])).rejects.toThrow(
      'not configured',
    );
  });

  it('rejects a vector with the wrong dimension', async () => {
    global.fetch = jest.fn(async () =>
      Response.json({ data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }] }),
    ) as unknown as typeof fetch;
    await expect(client('test-key').embed(['x'])).rejects.toThrow(
      `expected ${EMBEDDING_DIMENSIONS}`,
    );
  });

  it('rejects a non-numeric vector', async () => {
    const bad = vector(1);
    (bad as unknown[])[10] = 'not a number';
    global.fetch = jest.fn(async () =>
      Response.json({ data: [{ index: 0, embedding: bad }] }),
    ) as unknown as typeof fetch;
    await expect(client('test-key').embed(['x'])).rejects.toThrow(
      'non-numeric',
    );
  });

  it('rejects the wrong number of vectors', async () => {
    global.fetch = jest.fn(async () =>
      Response.json({ data: [{ index: 0, embedding: vector(1) }] }),
    ) as unknown as typeof fetch;
    await expect(client('test-key').embed(['one', 'two'])).rejects.toThrow(
      'wrong number of vectors',
    );
  });

  it('maps provider errors to RagEmbeddingError with the status', async () => {
    global.fetch = jest.fn(async () =>
      Response.json({ error: { message: 'nope' } }, { status: 429 }),
    ) as unknown as typeof fetch;
    const error = await client('test-key')
      .embed(['x'])
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RagEmbeddingError);
    expect((error as RagEmbeddingError).status).toBe(429);
  });

  it('maps a timeout to a timed-out error', async () => {
    global.fetch = jest.fn(async () => {
      const error = new Error('timed out');
      error.name = 'TimeoutError';
      throw error;
    }) as unknown as typeof fetch;
    const error = await client('test-key')
      .embed(['x'])
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RagEmbeddingError);
    expect((error as RagEmbeddingError).timedOut).toBe(true);
  });

  it('maps a network failure to a reachable error', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    await expect(client('test-key').embed(['x'])).rejects.toThrow(
      'could not be reached',
    );
  });

  it('rejects an invalid JSON response', async () => {
    global.fetch = jest.fn(
      async () => new Response('not json', {}),
    ) as unknown as typeof fetch;
    await expect(client('test-key').embed(['x'])).rejects.toThrow(
      'invalid response',
    );
  });
});
