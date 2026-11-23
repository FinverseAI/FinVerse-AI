import {
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_REASONING_MODEL,
} from '../ai/ai.config';
import { DEFAULT_EMBEDDING_MODEL } from '../rag/rag.config';
import {
  EVAL_DEFAULT_REPEATS,
  EVAL_EMBEDDING_MODEL,
  EVAL_MODEL_PRICES,
  EVAL_PRIMARY_MODEL,
  EVAL_REASONING_MODEL,
} from './eval.config';

describe('eval config', () => {
  it('pins the same model IDs production uses', () => {
    expect(EVAL_PRIMARY_MODEL).toBe(DEFAULT_PRIMARY_MODEL);
    expect(EVAL_REASONING_MODEL).toBe(DEFAULT_REASONING_MODEL);
    expect(EVAL_EMBEDDING_MODEL).toBe(DEFAULT_EMBEDDING_MODEL);
    expect(EVAL_PRIMARY_MODEL).toBe('qwen/qwen-2.5-72b-instruct');
    expect(EVAL_REASONING_MODEL).toBe('deepseek/deepseek-r1-0528');
    expect(EVAL_EMBEDDING_MODEL).toBe('baai/bge-base-en-v1.5');
  });

  it('prices both chat models (prompt + completion, USD per million)', () => {
    for (const model of [EVAL_PRIMARY_MODEL, EVAL_REASONING_MODEL]) {
      const price = EVAL_MODEL_PRICES[model];
      expect(price).toBeDefined();
      expect(price?.promptPerMillionUsd).toBeGreaterThan(0);
      expect(price?.completionPerMillionUsd).toBeGreaterThan(0);
    }
    // The 2026-11-23 live-catalog snapshot.
    expect(EVAL_MODEL_PRICES[EVAL_PRIMARY_MODEL]).toEqual({
      promptPerMillionUsd: 0.36,
      completionPerMillionUsd: 0.4,
    });
    expect(EVAL_MODEL_PRICES[EVAL_REASONING_MODEL]).toEqual({
      promptPerMillionUsd: 0.571,
      completionPerMillionUsd: 2.286,
    });
  });

  it('defaults to 5 self-consistency repeats (plan §2)', () => {
    expect(EVAL_DEFAULT_REPEATS).toBe(5);
  });
});
