import { readinessTemplate } from '../ai/ai.guardrail-templates';
import type { ChatCompletion, ChatOptions, LlmClient } from '../ai/ai.provider';
import type { AiAnswer } from '../ai/ai.validation';
import type { ReadinessAssessment } from '../readiness/readiness.formula';

/**
 * The mocked LLM (Phase 5, no-key path). This is a FIXTURE, not a
 * model: it returns the template baseline as a structured JSON answer,
 * so the runner's mechanics (prompt → call → parse → verify →
 * measure) can be exercised end to end without an API key.
 *
 * Two modes:
 * - 'correct': the template answer verbatim. The guardrail passes —
 *   the mechanics check.
 * - 'corrupt': the template answer with the score raised by 7 points
 *   (in the claim values AND the prose, so the answer is internally
 *   consistent but wrong against the evidence). The guardrail MUST
 *   fail — the sensitivity check, proving the factual-grounding metric
 *   can go below 100% when the model errs.
 *
 * The mock is labelled at every level: its model string is
 * 'mock/correct' or 'mock/corrupt' (never a real model ID), its
 * results are stored under the system name 'mock-correct' /
 * 'mock-corrupt', and the report marks them MOCKED. Mock numbers are
 * never presented as model measurements — a mocked 100% grounding
 * rate says the PIPELINE works, nothing about the model.
 */

export type MockMode = 'correct' | 'corrupt';

/** Points added to the score by the corrupt mock. */
export const MOCK_CORRUPTION_POINTS = 7;

export class MockLlmClient implements LlmClient {
  constructor(
    private readonly mode: MockMode,
    private readonly assessment: ReadinessAssessment,
  ) {}

  async chat(_options: ChatOptions): Promise<ChatCompletion> {
    const template = readinessTemplate(this.assessment);
    const answer: AiAnswer = {
      answer: template.answer,
      claims: template.claims,
      refused: false,
      refusalReason: null,
    };
    const rendered = this.mode === 'corrupt' ? corruptAnswer(answer) : answer;
    return {
      content: JSON.stringify(rendered),
      toolCalls: [],
      model: `mock/${this.mode}`,
      usage: null,
    };
  }
}

/**
 * Corrupt the score claim: raise the quoted score by
 * MOCK_CORRUPTION_POINTS in the claim values and in the claim text,
 * then rebuild the answer prose from the claims (the template's own
 * rule: the answer is the claims joined). The result is internally
 * consistent — only the guardrail's check against the evidence can
 * catch it.
 */
export function corruptAnswer(answer: AiAnswer): AiAnswer {
  const claims = answer.claims.map((claim) => ({
    ...claim,
    source: {
      tool: claim.source.tool,
      values: { ...claim.source.values },
    },
  }));
  const target =
    claims.find((claim) => typeof claim.source.values.score === 'number') ??
    claims.find((claim) =>
      Object.values(claim.source.values).some(
        (value) => typeof value === 'number',
      ),
    );
  if (!target) return answer;
  const values = target.source.values;
  const key =
    typeof values.score === 'number'
      ? 'score'
      : Object.keys(values).find((entry) => typeof values[entry] === 'number');
  if (!key) return answer;
  const original = values[key] as number;
  const corrupted = original + MOCK_CORRUPTION_POINTS;
  values[key] = corrupted;
  target.text = target.text.replace(
    new RegExp(`\\b${original}\\b`),
    String(corrupted),
  );
  return {
    ...answer,
    answer: claims.map((claim) => claim.text).join(' '),
    claims,
  };
}
