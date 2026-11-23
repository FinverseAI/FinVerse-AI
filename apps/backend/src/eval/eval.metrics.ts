import type { TokenUsage } from '../ai/ai.provider';
import type { AiAnswer } from '../ai/ai.validation';
import type { ModelPrice } from './eval.config';

/**
 * The Phase 5 metric computations (plan §2). All pure functions over
 * recorded results — no I/O, no model calls — so every number in the
 * report is recomputable from the stored results file.
 *
 * Metric 1 — factual grounding: the guardrail pass rate. Two views:
 * answer-level (fraction of answers that passed verification outright)
 * and check-level (fraction of individual checks passed). A system can
 * have a high check-level rate while failing whole answers, so both
 * are reported; the headline is the answer-level rate.
 *
 * Metric 2 — self-consistency: the same prompt run N times, agreement
 * rate on the key conclusions. A conclusion is what the answer CLAIMS
 * about the assessment: the score it quotes, the band it names, and
 * the set of factors it mentions. Two runs agree when all three match.
 * The rate is pairwise (agreeing pairs / all pairs), which is 1.0 for
 * a perfectly consistent system and degrades smoothly as runs diverge.
 * Conclusion extraction is deliberately conservative: it reads the
 * structured claims first (values.score, values.name) and only falls
 * back to the prose for the band, which the template puts in prose
 * ("(Ready)") and a model may state the same way.
 *
 * Metric 3 — explanation quality — is human (see eval.rating-pack.ts);
 * there is nothing to compute here, and nothing is faked.
 *
 * Metric 4 — latency + cost: measured response times per call (the
 * runner records them) and USD cost from the provider's reported token
 * usage and the pinned price table. Cost is null whenever usage was
 * not reported — never estimated from characters.
 */

/** What an answer concludes about the assessment. */
export interface AnswerConclusions {
  /** The score the answer quotes, or null if it quotes none. */
  score: number | null;
  /** The band the answer names, or null if it names none. */
  band: string | null;
  /** Factor names the answer's claims mention, sorted. */
  factorsMentioned: string[];
}

export const READINESS_FACTOR_NAMES = [
  'Emergency fund',
  'Debt-to-income',
  'Monthly surplus',
  'Portfolio concentration',
  'Portfolio volatility',
] as const;

export const READINESS_BANDS = ['Not ready', 'Building', 'Ready'] as const;

/**
 * Extract the key conclusions from a structured answer. Reads the
 * claims (the machine-checked part) for the score and the factors,
 * and the prose for the band. "Not ready" is matched before "Ready"
 * so the longer phrase wins.
 */
export function extractConclusions(answer: AiAnswer): AnswerConclusions {
  let score: number | null = null;
  const factors = new Set<string>();
  for (const claim of answer.claims) {
    const values = claim.source.values;
    if (typeof values.score === 'number' && Number.isFinite(values.score)) {
      score = values.score;
    }
    if (typeof values.name === 'string') {
      const named = READINESS_FACTOR_NAMES.find(
        (factor) => factor === values.name,
      );
      if (named) factors.add(named);
    }
  }
  let band: string | null = null;
  const prose = answer.answer;
  // Longest first: "Not ready" contains "ready".
  for (const candidate of ['Not ready', 'Building', 'Ready']) {
    const pattern = new RegExp(`\\b${candidate}\\b`, 'i');
    if (pattern.test(prose)) {
      band = candidate;
      break;
    }
  }
  return {
    score,
    band,
    factorsMentioned: [...factors].sort(),
  };
}

function conclusionsAgree(a: AnswerConclusions, b: AnswerConclusions): boolean {
  if (a.score !== b.score) return false;
  if (a.band !== b.band) return false;
  if (a.factorsMentioned.length !== b.factorsMentioned.length) return false;
  return a.factorsMentioned.every(
    (factor, index) => factor === b.factorsMentioned[index],
  );
}

/**
 * Pairwise agreement across N runs: agreeing pairs / all pairs.
 * Returns null for fewer than 2 runs (agreement is undefined).
 */
export function pairwiseAgreement(
  conclusions: AnswerConclusions[],
): number | null {
  if (conclusions.length < 2) return null;
  let agreeing = 0;
  let total = 0;
  for (let i = 0; i < conclusions.length; i++) {
    for (let j = i + 1; j < conclusions.length; j++) {
      total += 1;
      if (
        conclusionsAgree(
          conclusions[i] as AnswerConclusions,
          conclusions[j] as AnswerConclusions,
        )
      ) {
        agreeing += 1;
      }
    }
  }
  return agreeing / total;
}

export interface GroundingSummary {
  /** Answers that passed verification outright. */
  answersPassed: number;
  /** Answers that were verified at all. */
  answersTotal: number;
  /** Answer-level pass rate (null when nothing was verified). */
  answerRate: number | null;
  checksPassed: number;
  checksTotal: number;
  /** Check-level pass rate (null when no checks ran). */
  checkRate: number | null;
}

/** The counts a grounding summary needs — full check rows not required. */
export interface VerificationCounts {
  passed: boolean;
  checksPassed: number;
  checksFailed: number;
}

/** Aggregate guardrail results into the grounding summary. */
export function summarizeGrounding(
  results: VerificationCounts[],
): GroundingSummary {
  const answersTotal = results.length;
  const answersPassed = results.filter((result) => result.passed).length;
  const checksPassed = results.reduce(
    (sum, result) => sum + result.checksPassed,
    0,
  );
  const checksTotal = results.reduce(
    (sum, result) => sum + result.checksPassed + result.checksFailed,
    0,
  );
  return {
    answersPassed,
    answersTotal,
    answerRate: answersTotal > 0 ? answersPassed / answersTotal : null,
    checksPassed,
    checksTotal,
    checkRate: checksTotal > 0 ? checksPassed / checksTotal : null,
  };
}

export interface LatencySummary {
  count: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
}

/** Latency stats over recorded per-call durations in milliseconds. */
export function summarizeLatency(latenciesMs: number[]): LatencySummary | null {
  if (latenciesMs.length === 0) return null;
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const at = (fraction: number): number => {
    const index = Math.min(
      sorted.length - 1,
      Math.floor(fraction * sorted.length),
    );
    return sorted[index] as number;
  };
  const mean =
    latenciesMs.reduce((sum, value) => sum + value, 0) / latenciesMs.length;
  return {
    count: latenciesMs.length,
    minMs: sorted[0] as number,
    medianMs: at(0.5),
    p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1] as number,
    meanMs: mean,
  };
}

/**
 * USD cost of one completion from the provider's reported usage and
 * the pinned price table. Null when usage was not reported — the
 * caller reports "usage not reported" instead of inventing a number.
 */
export function costOfUsage(
  usage: TokenUsage | null | undefined,
  price: ModelPrice,
): number | null {
  if (!usage) return null;
  return (
    (usage.promptTokens / 1_000_000) * price.promptPerMillionUsd +
    (usage.completionTokens / 1_000_000) * price.completionPerMillionUsd
  );
}
