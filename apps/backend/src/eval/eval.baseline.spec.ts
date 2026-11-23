import { scoreReadiness } from '../readiness/readiness.formula';
import { runBaseline } from './eval.baseline';
import { EVAL_SCENARIOS } from './eval.scenarios';

describe('template baseline', () => {
  it('passes the guardrail on every measurable scenario (100% by construction, measured)', () => {
    const measured = EVAL_SCENARIOS.filter(
      (scenario) => scenario.expectedScore !== null,
    );
    expect(measured.length).toBe(19);
    for (const scenario of measured) {
      const assessment = scoreReadiness(scenario.inputs);
      expect(assessment.available).toBe(true);
      if (assessment.available !== true) continue;
      const baseline = runBaseline(assessment);
      expect(baseline.verification.passed).toBe(true);
      expect(baseline.verification.checksFailed).toBe(0);
      expect(baseline.verification.checks.length).toBeGreaterThan(0);
      expect(baseline.answer.claims.length).toBeGreaterThan(0);
    }
  });

  it('quotes the computed score and band exactly', () => {
    const scenario = EVAL_SCENARIOS.find(
      (entry) => entry.id === 'concentrated-portfolio',
    );
    expect(scenario).toBeDefined();
    const assessment = scoreReadiness(
      (scenario as (typeof EVAL_SCENARIOS)[number]).inputs,
    );
    expect(assessment.available).toBe(true);
    if (assessment.available !== true) return;
    const baseline = runBaseline(assessment);
    expect(baseline.answer.answer).toContain('82 out of 100 (Ready)');
    expect(baseline.answer.answer).toContain('RELIANCE');
    expect(baseline.answer.answer).toContain('80%');
  });

  it('reports its latency (a real, measured number)', () => {
    const scenario = EVAL_SCENARIOS[0] as (typeof EVAL_SCENARIOS)[number];
    const assessment = scoreReadiness(scenario.inputs);
    expect(assessment.available).toBe(true);
    if (assessment.available !== true) return;
    const baseline = runBaseline(assessment);
    expect(baseline.latencyMs).toBeGreaterThanOrEqual(0);
    expect(baseline.latencyMs).toBeLessThan(1000);
  });
});
