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
/**
 * Max tokens for a reasoning-model explanation (same as production).
 * Raised from 4096 to 16384 after the 24 Nov 2026 re-run: the one call
 * that reached the model burned 4096 tokens on reasoning alone, twice
 * (first call + correction retry = 8192 completion tokens), and returned
 * empty content both times — R1 never got room to emit its answer.
 * The cap is a ceiling, not a spend: typical calls use 300–1500 tokens.
 */
export const EVAL_REASONING_MAX_TOKENS = 16384;
/**
 * Per-call timeout for eval LLM calls. Raised from 30s to 120s after the
 * first live run (24 Nov 2026), then to 300s after the re-run the same
 * day: at the observed ~48 tokens/s, a 16K-token reasoning call can take
 * over 5 minutes. The eval runs locally and unattended, so no function
 * timeout binds it (production keeps its own 30s default).
 */
export const EVAL_TIMEOUT_MS = 300_000;
/** Provider-error retries per repeat (24 Nov 2026 live run: instant rejections clustered late in the run — transient rate limiting). */
export const EVAL_PROVIDER_MAX_RETRIES = 2;
/** Base backoff between provider retries; doubled per attempt (2s, 4s). */
export const EVAL_PROVIDER_RETRY_BASE_MS = 2_000;
/** Pacing between live-system repeats, to stay under provider rate limits. Mocks are not paced. */
export const EVAL_REPEAT_PACE_MS = 1_000;
/** Seed for the rating-pack shuffle, so the pack is reproducible. */
export const EVAL_RATING_PACK_SEED = 20261123;
