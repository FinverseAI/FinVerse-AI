import {
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_REASONING_MODEL,
} from '../ai/ai.config';
import { DEFAULT_EMBEDDING_MODEL } from '../rag/rag.config';

/**
 * Phase 5 evaluation configuration: the pinned model versions and the
 * price table the cost metric is computed from.
 *
 * Version pinning (strategy doc §4.5, plan §5): exact model versions
 * are pinned and documented for every evaluation, so the results are
 * reproducible. The pinned IDs are the same defaults the production
 * code uses — the config spec asserts they agree, so a model swap in
 * production cannot silently change what the eval measured.
 *
 * Prices were read from the live OpenRouter model catalog
 * (https://openrouter.ai/api/v1/models) on 2026-11-23 and are stored
 * as USD per million tokens. They are a snapshot: OpenRouter reprices
 * models, so the report must carry the as-of date, and the prices
 * must be re-checked before the eval numbers are quoted in the final
 * report. The embeddings model does not appear in that catalog
 * endpoint (OpenRouter lists chat models there), so no embeddings
 * price is recorded — the readiness eval makes no embedding calls
 * anyway, so no embeddings cost is measured or claimed.
 */

export const EVAL_PRIMARY_MODEL = DEFAULT_PRIMARY_MODEL;
export const EVAL_REASONING_MODEL = DEFAULT_REASONING_MODEL;
export const EVAL_EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL;

/** When the price table below was read from the live catalog. */
export const EVAL_PRICES_AS_OF = '2026-11-23';

export interface ModelPrice {
  /** USD per 1M prompt tokens. */
  promptPerMillionUsd: number;
  /** USD per 1M completion tokens. */
  completionPerMillionUsd: number;
}

export const EVAL_MODEL_PRICES: Record<string, ModelPrice> = {
  [EVAL_PRIMARY_MODEL]: {
    promptPerMillionUsd: 0.36,
    completionPerMillionUsd: 0.4,
  },
  [EVAL_REASONING_MODEL]: {
    promptPerMillionUsd: 0.571,
    completionPerMillionUsd: 2.286,
  },
};

/** Self-consistency repeats per scenario (plan §2, metric 2). */
export const EVAL_DEFAULT_REPEATS = 5;
/** Max tokens for a reasoning-model explanation (same as production). */
export const EVAL_REASONING_MAX_TOKENS = 4096;
/** Per-call timeout for eval LLM calls (same as production default). */
export const EVAL_TIMEOUT_MS = 30_000;
/** Seed for the rating-pack shuffle, so the pack is reproducible. */
export const EVAL_RATING_PACK_SEED = 20261123;
