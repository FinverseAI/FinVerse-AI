/**
 * The embeddings client behind a narrow interface, so the ingestion and
 * retrieval services (and their tests) never touch the provider's HTTP
 * API directly. The implementation is plain fetch against an
 * OpenAI-compatible embeddings endpoint — no SDK dependency — pointed at
 * OpenRouter by default, using the same key as the chat models.
 *
 * The API key travels only in the Authorization header of the provider
 * request. It is never logged, never returned, and never appears in an
 * error message.
 */
import { EMBEDDING_DIMENSIONS } from './rag.config';

export class RagEmbeddingError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly timedOut = false,
  ) {
    super(message);
  }
}

export interface EmbeddingsClient {
  /** One vector per input, in input order. Empty input returns []. */
  embed(texts: string[]): Promise<number[][]>;
  embedOne(text: string): Promise<number[]>;
}

export const EMBEDDINGS_CLIENT = 'EMBEDDINGS_CLIENT';

export class OpenRouterEmbeddingsClient implements EmbeddingsClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly dimensions: number = EMBEDDING_DIMENSIONS,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) {
      throw new RagEmbeddingError('The embeddings provider is not configured.');
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'FinVerse AI',
        },
        body: JSON.stringify({ model: this.model, input: texts }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new RagEmbeddingError(
          'The embeddings provider took too long to respond.',
          undefined,
          true,
        );
      }
      throw new RagEmbeddingError(
        'The embeddings provider could not be reached.',
      );
    }
    if (!response.ok) {
      // Only the status is kept; provider error bodies can contain
      // request echoes and are never surfaced.
      throw new RagEmbeddingError(
        'The embeddings provider returned an error.',
        response.status,
      );
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new RagEmbeddingError(
        'The embeddings provider returned an invalid response.',
      );
    }
    return parseEmbeddings(data, texts.length, this.dimensions);
  }

  async embedOne(text: string): Promise<number[]> {
    const [vector] = await this.embed([text]);
    return vector;
  }
}

function parseEmbeddings(
  data: unknown,
  expectedCount: number,
  dimensions: number,
): number[][] {
  if (!data || typeof data !== 'object') {
    throw new RagEmbeddingError(
      'The embeddings provider returned an invalid response.',
    );
  }
  const record = data as Record<string, unknown>;
  const items = record.data;
  if (!Array.isArray(items) || items.length !== expectedCount) {
    throw new RagEmbeddingError(
      'The embeddings provider returned the wrong number of vectors.',
    );
  }
  const vectors: number[][] = [];
  // The API returns items in input order, but sort by index defensively
  // so a provider that reorders cannot mislabel a chunk's vector.
  const indexed = (item: unknown): number | null => {
    if (!item || typeof item !== 'object') return null;
    const index = (item as Record<string, unknown>).index;
    return typeof index === 'number' ? index : null;
  };
  const sorted = items.every((item) => indexed(item) !== null)
    ? [...items].sort((a, b) => (indexed(a) as number) - (indexed(b) as number))
    : items;
  for (const item of sorted) {
    if (!item || typeof item !== 'object') {
      throw new RagEmbeddingError(
        'The embeddings provider returned an invalid response.',
      );
    }
    const embedding = (item as Record<string, unknown>).embedding;
    if (!Array.isArray(embedding) || embedding.length !== dimensions) {
      throw new RagEmbeddingError(
        `The embedding model returned ${Array.isArray(embedding) ? embedding.length : 'no'} dimensions, expected ${dimensions}.`,
      );
    }
    if (
      !embedding.every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      )
    ) {
      throw new RagEmbeddingError(
        'The embeddings provider returned a non-numeric vector.',
      );
    }
    vectors.push(embedding as number[]);
  }
  return vectors;
}
