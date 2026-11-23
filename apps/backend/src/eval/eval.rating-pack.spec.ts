import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChatCompletion, LlmClient } from '../ai/ai.provider';
import { readinessTemplate } from '../ai/ai.guardrail-templates';
import { scoreReadiness } from '../readiness/readiness.formula';
import { EVAL_SCENARIOS } from './eval.scenarios';
import { buildRatingPack, writeRatingPack } from './eval.rating-pack';
import { runEval, type EvalReport } from './eval.runner';

function templateCompletionFor(scenarioId: string): ChatCompletion {
  const scenario = EVAL_SCENARIOS.find((entry) => entry.id === scenarioId);
  expect(scenario).toBeDefined();
  const assessment = scoreReadiness(
    (scenario as (typeof EVAL_SCENARIOS)[number]).inputs,
  );
  expect(assessment.available).toBe(true);
  if (assessment.available !== true) throw new Error('unavailable');
  const template = readinessTemplate(assessment);
  return {
    content: JSON.stringify({
      answer: template.answer,
      claims: template.claims,
      refused: false,
      refusalReason: null,
    }),
    toolCalls: [],
    model: 'deepseek/deepseek-r1-0528',
    usage: null,
  };
}

describe('buildRatingPack', () => {
  it('builds a baseline-only pack from a no-key report, with a sealed key', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['healthy-saver', 'maxed-out'],
      mock: [],
    });
    const pack = buildRatingPack(report, 20261123);
    expect(pack.outputsCount).toBe(2);
    expect(
      Object.values(pack.key).every((entry) => entry.system === 'baseline'),
    ).toBe(true);
    const names = pack.files.map((file) => file.name).sort();
    expect(names).toEqual([
      'README.md',
      'key.json',
      'outputs.md',
      'rating-sheet.md',
    ]);
    const readme =
      pack.files.find((file) => file.name === 'README.md')?.contents ?? '';
    expect(readme).toContain('TEMPLATE BASELINE outputs only');
    expect(readme).toContain('Do not open `key.json`');
    expect(readme).toContain('Clarity');
    expect(readme).toContain('Evidence use');
    expect(readme).toContain('Actionability');
    const outputs =
      pack.files.find((file) => file.name === 'outputs.md')?.contents ?? '';
    expect(outputs).toContain('Output S01-A');
    expect(outputs).toContain('Output S02-A');
    expect(outputs).toContain('Score: 100 out of 100 (Ready)');
    expect(outputs).toContain('Score: 0 out of 100 (Not ready)');
    // The outputs file never names the system — the blind holds.
    expect(outputs).not.toContain('baseline');
    expect(outputs).not.toContain('LLM');
    const sheet =
      pack.files.find((file) => file.name === 'rating-sheet.md')?.contents ??
      '';
    expect(sheet).toContain('| S01-A | Healthy saver |');
    expect(sheet).toContain('| S02-A | Maxed out |');
    const keyFile =
      pack.files.find((file) => file.name === 'key.json')?.contents ?? '';
    expect(keyFile).toContain('SEALED');
    const parsed = JSON.parse(keyFile) as {
      key: Record<string, { scenarioId: string; system: string }>;
    };
    expect(parsed.key['S01-A']).toEqual({
      scenarioId: 'healthy-saver',
      system: 'baseline',
    });
  });

  it('includes both systems shuffled when the report has live runs', async () => {
    const client: LlmClient = {
      chat: async () => templateCompletionFor('healthy-saver'),
    };
    const report = await runEval({
      client,
      scenarioIds: ['healthy-saver'],
      repeats: 1,
      mock: [],
    });
    const pack = buildRatingPack(report, 20261123);
    expect(pack.outputsCount).toBe(2);
    const systems = Object.values(pack.key)
      .map((entry) => entry.system)
      .sort();
    expect(systems).toEqual(['baseline', 'llm']);
  });

  it('is deterministic for the same seed', async () => {
    const report: EvalReport = await runEval({
      client: null,
      scenarioIds: ['healthy-saver', 'over-spender', 'maxed-out'],
      mock: [],
    });
    const first = buildRatingPack(report, 42);
    const second = buildRatingPack(report, 42);
    expect(second).toEqual(first);
  });

  it('never includes mock outputs', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['healthy-saver'],
    });
    expect(report.scenarios[0]?.mockCorrect).not.toBeNull();
    const pack = buildRatingPack(report, 20261123);
    expect(pack.outputsCount).toBe(1);
    expect(Object.values(pack.key)[0]?.system).toBe('baseline');
  });

  it('writes the pack files to a directory', async () => {
    const report = await runEval({
      client: null,
      scenarioIds: ['healthy-saver'],
      mock: [],
    });
    const pack = buildRatingPack(report, 20261123);
    const dir = mkdtempSync(join(tmpdir(), 'finverse-eval-pack-'));
    try {
      writeRatingPack(dir, pack);
      const files = readdirSync(dir).sort();
      expect(files).toEqual([
        'README.md',
        'key.json',
        'outputs.md',
        'rating-sheet.md',
      ]);
      expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain(
        'Blind rating pack',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
