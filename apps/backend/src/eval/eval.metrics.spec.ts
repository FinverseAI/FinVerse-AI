import type { GuardrailResult } from '../ai/ai.guardrail';
import type { AiAnswer } from '../ai/ai.validation';
import {
  costOfUsage,
  extractConclusions,
  pairwiseAgreement,
  summarizeGrounding,
  summarizeLatency,
  type AnswerConclusions,
} from './eval.metrics';

function guardrailResult(passed: boolean, checks: number): GuardrailResult {
  const rows = Array.from({ length: checks }, () => ({
    claimIndex: 0,
    claimText: 'claim',
    sourceTool: 'getReadinessScore',
    checkType: 'value' as const,
    expected: null,
    actual: null,
    passed,
    detail: passed ? 'ok' : 'wrong',
  }));
  return {
    passed,
    checks: rows,
    failures: passed ? [] : rows,
    checksPassed: passed ? checks : 0,
    checksFailed: passed ? 0 : checks,
  };
}

function answer(text: string, claims: AiAnswer['claims']): AiAnswer {
  return { answer: text, claims, refused: false, refusalReason: null };
}

describe('extractConclusions', () => {
  it('reads the score and factors from the claims, the band from the prose', () => {
    const conclusions = extractConclusions(
      answer('Your investment readiness score is 82 out of 100 (Ready).', [
        {
          text: 'Your investment readiness score is 82 out of 100 (Ready).',
          source: {
            tool: 'getReadinessScore',
            values: { score: 82, scale: 100 },
          },
        },
        {
          text: 'Emergency fund: 6 months of expenses saved.',
          source: {
            tool: 'getReadinessScore',
            values: { name: 'Emergency fund', months: 6 },
          },
        },
        {
          text: 'Portfolio concentration: your largest holding is 80%.',
          source: {
            tool: 'getReadinessScore',
            values: {
              name: 'Portfolio concentration',
              largestHoldingWeightPercent: 80,
            },
          },
        },
      ]),
    );
    expect(conclusions).toEqual({
      score: 82,
      band: 'Ready',
      factorsMentioned: ['Emergency fund', 'Portfolio concentration'],
    });
  });

  it('matches "Not ready" before "Ready" (the longer phrase wins)', () => {
    const conclusions = extractConclusions(
      answer('Your score is 28 out of 100 (Not ready).', [
        {
          text: 'Your score is 28 out of 100 (Not ready).',
          source: {
            tool: 'getReadinessScore',
            values: { score: 28, scale: 100 },
          },
        },
      ]),
    );
    expect(conclusions.band).toBe('Not ready');
    expect(conclusions.score).toBe(28);
  });

  it('returns nulls when the answer concludes nothing', () => {
    const conclusions = extractConclusions(
      answer('I cannot explain this.', []),
    );
    expect(conclusions).toEqual({
      score: null,
      band: null,
      factorsMentioned: [],
    });
  });

  it('ignores claim names that are not readiness factors', () => {
    const conclusions = extractConclusions(
      answer('Your score is 54 out of 100 (Building).', [
        {
          text: 'RELIANCE is doing well.',
          source: {
            tool: 'getReadinessScore',
            values: { name: 'RELIANCE', score: 54 },
          },
        },
      ]),
    );
    expect(conclusions.factorsMentioned).toEqual([]);
    expect(conclusions.score).toBe(54);
  });
});

describe('pairwiseAgreement', () => {
  const base: AnswerConclusions = {
    score: 82,
    band: 'Ready',
    factorsMentioned: ['Emergency fund'],
  };

  it('is 1.0 when every run agrees', () => {
    expect(
      pairwiseAgreement([base, { ...base }, { ...base }, { ...base }]),
    ).toBe(1);
  });

  it('is 0.0 when no pair agrees', () => {
    expect(
      pairwiseAgreement([base, { ...base, score: 81 }, { ...base, score: 80 }]),
    ).toBe(0);
  });

  it('counts agreeing pairs out of all pairs', () => {
    // 4 runs: 3 agree, 1 differs → 3 agreeing pairs of 6.
    expect(
      pairwiseAgreement([
        base,
        { ...base },
        { ...base },
        { ...base, band: 'Building' },
      ]),
    ).toBe(0.5);
  });

  it('treats a different factor set as disagreement', () => {
    expect(
      pairwiseAgreement([
        base,
        { ...base, factorsMentioned: ['Emergency fund', 'Monthly surplus'] },
      ]),
    ).toBe(0);
  });

  it('is null with fewer than 2 runs', () => {
    expect(pairwiseAgreement([])).toBeNull();
    expect(pairwiseAgreement([base])).toBeNull();
  });
});

describe('summarizeGrounding', () => {
  it('reports answer-level and check-level rates', () => {
    const summary = summarizeGrounding([
      guardrailResult(true, 10),
      guardrailResult(true, 8),
      guardrailResult(false, 4),
    ]);
    expect(summary.answersPassed).toBe(2);
    expect(summary.answersTotal).toBe(3);
    expect(summary.answerRate).toBeCloseTo(2 / 3);
    expect(summary.checksPassed).toBe(18);
    expect(summary.checksTotal).toBe(22);
    expect(summary.checkRate).toBeCloseTo(18 / 22);
  });

  it('is null rates when nothing was verified', () => {
    const summary = summarizeGrounding([]);
    expect(summary.answerRate).toBeNull();
    expect(summary.checkRate).toBeNull();
  });
});

describe('summarizeLatency', () => {
  it('reports min, median, p95, max, mean', () => {
    const summary = summarizeLatency([10, 20, 30, 40, 50]);
    expect(summary).toEqual({
      count: 5,
      minMs: 10,
      medianMs: 30,
      p95Ms: 50,
      maxMs: 50,
      meanMs: 30,
    });
  });

  it('is null with no samples', () => {
    expect(summarizeLatency([])).toBeNull();
  });
});

describe('costOfUsage', () => {
  it('prices prompt and completion tokens separately', () => {
    const cost = costOfUsage(
      {
        promptTokens: 1_000_000,
        completionTokens: 500_000,
        totalTokens: 1_500_000,
      },
      { promptPerMillionUsd: 0.571, completionPerMillionUsd: 2.286 },
    );
    expect(cost).toBeCloseTo(0.571 + 0.5 * 2.286);
  });

  it('is null when usage was not reported', () => {
    expect(
      costOfUsage(null, {
        promptPerMillionUsd: 0.571,
        completionPerMillionUsd: 2.286,
      }),
    ).toBeNull();
    expect(
      costOfUsage(undefined, {
        promptPerMillionUsd: 0.571,
        completionPerMillionUsd: 2.286,
      }),
    ).toBeNull();
  });
});
