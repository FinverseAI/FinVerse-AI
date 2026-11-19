/**
 * RAG configuration, resolved from environment variables.
 *
 * Embeddings go through the SAME OpenRouter key as the chat models
 * (OPENROUTER_API_KEY) — no new credential. Verified live 2026-11-19:
 * OpenRouter serves embeddings at POST /api/v1/embeddings (OpenAI-
 * compatible), and its BAAI catalogue is bge-base-en-v1.5 (768d),
 * bge-large-en-v1.5 (1024d) and bge-m3 (1024d). The blueprint's exact
 * model, bge-small-en-v1.5 (384d), is NOT offered, so the default is the
 * nearest in-family model, baai/bge-base-en-v1.5 — same v1.5 line, one
 * size up. (Note: the /v1/models endpoint lists only chat models, so
 * embedding models do not appear there; the embeddings collection page
 * and the endpoint itself are the source of truth.)
 *
 * EMBEDDING_DIMENSIONS is a code constant, not an env var: it must match
 * the vector(768) column in the rag_documents migration exactly. Swapping
 * LLM_EMBEDDING_MODEL to a model with a different dimension needs a new
 * migration changing the column — the client validates every returned
 * vector's length and fails loudly on a mismatch instead of storing a
 * vector the column cannot hold.
 */
export interface RagConfig {
  apiKey: string | undefined;
  baseUrl: string;
  embeddingModel: string;
  /** Per-embedding-call timeout in milliseconds. */
  timeoutMs: number;
  /** How many chunks a retrieval returns at most. */
  topK: number;
  /** Minimum cosine similarity for a chunk to count as relevant. */
  minSimilarity: number;
  /** How long indexed news stays fresh before a re-ingest is attempted. */
  newsTtlMs: number;
  /** Texts embedded in one provider call during ingestion. */
  ingestBatchSize: number;
}

/** Must match vector(768) in the rag_documents migration. */
export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL = 'baai/bge-base-en-v1.5';
export const DEFAULT_EMBEDDING_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_EMBEDDING_TIMEOUT_MS = 30_000;
export const DEFAULT_RAG_TOP_K = 5;
export const DEFAULT_RAG_MIN_SIMILARITY = 0.35;
export const DEFAULT_RAG_NEWS_TTL_MS = 6 * 60 * 60 * 1000;
export const DEFAULT_RAG_INGEST_BATCH_SIZE = 25;

function text(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function similarity(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

export function resolveRagConfig(
  get: (key: string) => string | undefined,
): RagConfig {
  const apiKey = get('OPENROUTER_API_KEY')?.trim();
  return {
    apiKey: apiKey ? apiKey : undefined,
    baseUrl: text(
      get('LLM_EMBEDDING_BASE_URL') ?? get('LLM_BASE_URL'),
      DEFAULT_EMBEDDING_BASE_URL,
    ),
    embeddingModel: text(get('LLM_EMBEDDING_MODEL'), DEFAULT_EMBEDDING_MODEL),
    timeoutMs: positiveInt(
      get('LLM_EMBEDDING_TIMEOUT_MS'),
      DEFAULT_EMBEDDING_TIMEOUT_MS,
    ),
    topK: positiveInt(get('RAG_TOP_K'), DEFAULT_RAG_TOP_K),
    minSimilarity: similarity(
      get('RAG_MIN_SIMILARITY'),
      DEFAULT_RAG_MIN_SIMILARITY,
    ),
    newsTtlMs: positiveInt(get('RAG_NEWS_TTL_MS'), DEFAULT_RAG_NEWS_TTL_MS),
    ingestBatchSize: positiveInt(
      get('RAG_INGEST_BATCH_SIZE'),
      DEFAULT_RAG_INGEST_BATCH_SIZE,
    ),
  };
}
