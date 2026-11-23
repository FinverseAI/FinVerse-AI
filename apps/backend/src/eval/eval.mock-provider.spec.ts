import {
  buildReadinessGuardrailContext,
  verifyAnswer,
} from '../ai/ai.guardrail';
import { AiAnswerSchema, parseStructuredJson } from '../ai/ai.validation';
import { scoreReadiness } from '../readiness/readiness.formula';
import {
  MOCK_CORRUPTION_POINTS,
  MockLlmClient,
  corruptAnswer,
} from './eval.mock-provider';
import { EVAL_SCENARIOS } from './eval.scenarios';

function assessmentFor(scenarioId: string) {
  const scenario = EVAL_SCENARIOS.find((entry) => entry.id === scenarioId);
  expect(scenario).toBeDefined();
  const assessment = scoreReadiness(
    (scenario as (typeof EVAL_SCENARIOS)[number]).inputs,
  );
  expect(assessment.available).toBe(true);
  if (assessment.available !== true) throw new Error('unavailable');
  return assessment;
}

describe('MockLlmClient', () => {
  it('returns the template answer as structured JSON, labelled mock', async () => {
    const assessment = assessmentFor('healthy-saver');
    const client = new MockLlmClient('correct', assessment);
    const completion = await client.chat({
      model: 'mock/correct',
      messages: [],
      timeoutMs: 1000,
    });
    expect(completion.model).toBe('mock/correct');
    expect(completion.usage).toBeNull();
    expect(completion.toolCalls).toEqual([]);
    const parsed = parseStructuredJson(completion.content, AiAnswerSchema);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.answer).toContain('100 out of 100 (Ready)');
  });

  it('correct mode passes the guardrail', async () => {
    const assessment = assessmentFor('over-spender');
    const client = new MockLlmClient('correct', assessment);
    const completion = await client.chat({
      model: 'mock/correct',
      messages: [],
      timeoutMs: 1000,
    });
    const parsed = parseStructuredJson(completion.content, AiAnswerSchema);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const verification = verifyAnswer(
      parsed.value,
      buildReadinessGuardrailContext('eval-test', 'eval', assessment),
    );
    expect(verification.passed).toBe(true);
  });

  it('corrupt mode raises the score by 7 in the values and the prose', async () => {
    const assessment = assessmentFor('over-spender');
    const client = new MockLlmClient('corrupt', assessment);
    const completion = await client.chat({
      model: 'mock/corrupt',
      messages: [],
      timeoutMs: 1000,
    });
    expect(completion.model).toBe('mock/corrupt');
    const parsed = parseStructuredJson(completion.content, AiAnswerSchema);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const scoreClaim = parsed.value.claims.find(
      (claim) => typeof claim.source.values.score === 'number',
    );
    expect(scoreClaim?.source.values.score).toBe(48 + MOCK_CORRUPTION_POINTS);
    expect(parsed.value.answer).toContain('55 out of 100');
    expect(parsed.value.answer).not.toContain('48 out of 100');
  });

  it('corrupt mode FAILS the guardrail — the sensitivity check', async () => {
    const assessment = assessmentFor('over-spender');
    const client = new MockLlmClient('corrupt', assessment);
    const completion = await client.chat({
      model: 'mock/corrupt',
      messages: [],
      timeoutMs: 1000,
    });
    const parsed = parseStructuredJson(completion.content, AiAnswerSchema);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const verification = verifyAnswer(
      parsed.value,
      buildReadinessGuardrailContext('eval-test', 'eval', assessment),
    );
    expect(verification.passed).toBe(false);
    expect(verification.failures.length).toBeGreaterThan(0);
  });

  it('corrupt mode fails the guardrail on every measurable scenario', async () => {
    for (const scenario of EVAL_SCENARIOS) {
      if (scenario.expectedScore === null) continue;
      const assessment = scoreReadiness(scenario.inputs);
      expect(assessment.available).toBe(true);
      if (assessment.available !== true) continue;
      const client = new MockLlmClient('corrupt', assessment);
      const completion = await client.chat({
        model: 'mock/corrupt',
        messages: [],
        timeoutMs: 1000,
      });
      const parsed = parseStructuredJson(completion.content, AiAnswerSchema);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      const verification = verifyAnswer(
        parsed.value,
        buildReadinessGuardrailContext('eval-test', 'eval', assessment),
      );
      expect(verification.passed).toBe(false);
    }
  });

  it('corruptAnswer leaves an answer without numeric values untouched', () => {
    const untouched = corruptAnswer({
      answer: 'Nothing to say.',
      claims: [
        {
          text: 'Nothing to say.',
          source: { tool: 'getReadinessScore', values: { name: 'x' } },
        },
      ],
      refused: false,
      refusalReason: null,
    });
    expect(untouched.answer).toBe('Nothing to say.');
  });
});
