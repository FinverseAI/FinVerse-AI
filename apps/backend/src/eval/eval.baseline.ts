import {
  buildReadinessGuardrailContext,
  verifyAnswer,
  type GuardrailResult,
} from '../ai/ai.guardrail';
import {
  readinessTemplate,
  type TemplateAnswer,
} from '../ai/ai.guardrail-templates';
import type { AiAnswer } from '../ai/ai.validation';
import type { ReadinessAssessment } from '../readiness/readiness.formula';

/**
 * The template baseline (plan §2): rule-generated explanations from
 * the same numbers the LLM sees, directly comparable to the LLM output
 * on the same scenarios. This is the production fallback template
 * (readinessTemplate) — the baseline IS the system's own fallback, so
 * the comparison is against what users already get when the model is
 * unavailable, not against a straw man.
 *
 * The baseline is 100% grounded BY CONSTRUCTION (every number copied
 * verbatim from the assessment), but the eval does not assume that:
 * runBaseline verifies the template with the production guardrail and
 * records the measured rate. If the template ever fails verification,
 * that is a real finding about the template, not an eval artefact.
 */

export interface BaselineRun {
  /** The template answer, in the structured-answer shape. */
  answer: AiAnswer;
  /** The template answer before conversion (for the rating pack). */
  template: TemplateAnswer;
  /** The guardrail's verdict on the template. */
  verification: GuardrailResult;
  /** Milliseconds the template took to build + verify. */
  latencyMs: number;
}

/**
 * Generate and verify the template baseline for one assessment.
 * The verification context is the same one production uses for
 * explain-readiness (the assessment as the only evidence).
 */
export function runBaseline(assessment: ReadinessAssessment): BaselineRun {
  const started = performance.now();
  const template = readinessTemplate(assessment);
  const answer: AiAnswer = {
    answer: template.answer,
    claims: template.claims,
    refused: false,
    refusalReason: null,
  };
  const context = buildReadinessGuardrailContext(
    `eval-baseline-${assessment.score}`,
    'eval',
    assessment,
  );
  const verification = verifyAnswer(answer, context);
  return {
    answer,
    template,
    verification,
    latencyMs: performance.now() - started,
  };
}
