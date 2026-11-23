import { scoreReadiness } from '../readiness/readiness.formula';
import { EVAL_SCENARIOS, scenarioById } from './eval.scenarios';

describe('eval scenarios', () => {
  it('has exactly 20 scenarios with unique ids', () => {
    expect(EVAL_SCENARIOS).toHaveLength(20);
    const ids = EVAL_SCENARIOS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(20);
    for (const scenario of EVAL_SCENARIOS) {
      expect(scenarioById(scenario.id)).toBe(scenario);
      expect(scenario.name.trim()).not.toBe('');
      expect(scenario.persona.trim()).not.toBe('');
      expect(scenario.description.trim()).not.toBe('');
      expect(scenario.question.trim()).not.toBe('');
    }
    expect(scenarioById('does-not-exist')).toBeUndefined();
  });

  it('covers every archetype the plan names', () => {
    const archetypes = EVAL_SCENARIOS.map((scenario) =>
      scenario.archetype.toLowerCase(),
    ).join(' ');
    for (const archetype of [
      'healthy saver',
      'over-spender',
      'concentrated portfolio',
      'diversified portfolio',
      'high debt',
      'no emergency fund',
      'volatile holdings',
    ]) {
      expect(archetypes).toContain(archetype);
    }
  });

  it('pins the hand-computed score and band for every scenario', () => {
    for (const scenario of EVAL_SCENARIOS) {
      const result = scoreReadiness(scenario.inputs);
      if (scenario.expectedScore === null) {
        expect(result.available).toBe(false);
        expect(scenario.expectedBand).toBeNull();
        continue;
      }
      expect(result.available).toBe(true);
      if (result.available !== true) continue;
      expect(result.score).toBe(scenario.expectedScore);
      expect(result.band).toBe(scenario.expectedBand);
    }
  });

  it('spans all three bands plus the unavailable case', () => {
    const bands = new Set(
      EVAL_SCENARIOS.map((scenario) => scenario.expectedBand),
    );
    expect(bands).toEqual(new Set(['Ready', 'Building', 'Not ready', null]));
    const ready = EVAL_SCENARIOS.filter(
      (scenario) => scenario.expectedBand === 'Ready',
    ).length;
    const building = EVAL_SCENARIOS.filter(
      (scenario) => scenario.expectedBand === 'Building',
    ).length;
    const notReady = EVAL_SCENARIOS.filter(
      (scenario) => scenario.expectedBand === 'Not ready',
    ).length;
    expect(ready).toBeGreaterThan(0);
    expect(building).toBeGreaterThan(0);
    expect(notReady).toBeGreaterThan(0);
  });

  it('scores deterministically — same inputs, same score, every time', () => {
    for (const scenario of EVAL_SCENARIOS) {
      const first = scoreReadiness(scenario.inputs);
      const second = scoreReadiness(scenario.inputs);
      expect(second).toEqual(first);
    }
  });
});
