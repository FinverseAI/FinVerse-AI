import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AiAnswer } from '../ai/ai.validation';
import type { EvalReport, EvalScenarioResult } from './eval.runner';

/**
 * The blind rating pack (plan §2, metric 3): explanation quality is
 * a HUMAN judgement — clarity, evidence use, actionability — rated by
 * the team on a sample of outputs, LLM vs baseline, blind.
 *
 * The pack is generated from a report, so it always reflects the
 * outputs the eval actually produced. Each scenario's outputs are
 * shuffled (seeded, reproducible) and labelled with opaque codes
 * (S01-A, S01-B); the mapping lives only in key.json, which raters
 * must not open until rating is complete. The rater sees the scenario
 * context (score, band, factor numbers) so evidence use can be judged
 * against the truth.
 *
 * Until the live run happens (no API key), the pack holds baseline
 * outputs only — the README says so plainly, and the generator adds
 * LLM outputs automatically when a report with measured LLM runs is
 * supplied. The ratings themselves are a human step: nothing here
 * scores an explanation, and no rating is ever pre-filled.
 */

export interface RatingPackFile {
  name: string;
  contents: string;
}

export interface RatingPack {
  files: RatingPackFile[];
  /** Opaque label → the system that produced it (sealed in key.json). */
  key: Record<string, { scenarioId: string; system: string }>;
  outputsCount: number;
}

/** Deterministic PRNG (mulberry32) so the shuffle is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = temp;
  }
  return copy;
}

interface PackOutput {
  label: string;
  scenarioId: string;
  scenarioName: string;
  system: string;
  answer: AiAnswer;
}

function contextBlock(scenario: EvalScenarioResult): string {
  const assessment = scenario.assessment;
  if (!assessment) return 'No score could be measured for this scenario.';
  const factors = assessment.factors
    .map((factor) =>
      factor.available
        ? `- ${factor.name}: ${factor.points}/${factor.maxPoints} points — ${factor.detail}`
        : `- ${factor.name}: not measured — ${factor.detail}`,
    )
    .join('\n');
  const suggestions = assessment.suggestions
    .map((suggestion) => `- ${suggestion.action}`)
    .join('\n');
  return [
    `Score: ${assessment.score} out of ${assessment.scale} (${assessment.band}); ${assessment.maxScore} of ${assessment.scale} points measurable.`,
    '',
    'Factors (the ground truth the explanation must match):',
    factors,
    '',
    'Top improvements (computed by code):',
    suggestions || '- None — every measured factor is at full marks.',
  ].join('\n');
}

const RUBRIC = `## Rubric — rate each output 1–5 on each dimension

**Clarity** — is the explanation easy to follow?
- 1: Confusing, jargon-heavy, or hard to follow; a non-expert would give up.
- 3: Understandable with effort; the main points come through.
- 5: Plain language throughout; a non-expert follows it first time.

**Evidence use** — does it use the numbers correctly?
- 1: Numbers missing, wrong, or stated without any tie to the factors.
- 3: Most numbers present and right; some factors mentioned without numbers.
- 5: Every number correct and tied to its factor; nothing invented, nothing missing that matters.

**Actionability** — does it say what to do?
- 1: No concrete next step at all.
- 3: A general direction (e.g. "save more") without specifics.
- 5: A specific, prioritised action tied to the score (what to fix, what it gains).

Rate each output independently. Do not compare outputs against each other — rate each against the rubric and the scenario context. If an output refuses to explain (no score measurable), mark all three dimensions "n/a" and note the refusal.`;

function readmeContents(
  outputsCount: number,
  llmIncluded: boolean,
  generatedAt: string,
): string {
  return `# Blind rating pack — FinVerse AI explanation quality

Generated: ${generatedAt}. Outputs: ${outputsCount} (one per system per measured scenario).

## What this is

This pack rates explanation quality (Phase 5, metric 3) — the one metric a script cannot measure. Each output is an explanation of one scenario's readiness score, produced either by the template baseline or by the reasoning model. The outputs are shuffled and labelled with opaque codes (S01-A, S01-B): **you do not know which system produced which output, and that is the point.** Rate them blind, then unblind with \`key.json\` afterwards.

${llmIncluded ? 'This pack contains BOTH systems (template baseline + LLM), shuffled per scenario.' : '⚠️ This pack contains TEMPLATE BASELINE outputs only — no LLM outputs exist yet (the eval ran without an API key). Rate the baseline now if useful, but the comparison needs a live run: re-generate this pack from a report with measured LLM runs.'}

## How to rate

1. Read \`outputs.md\` — each output has its scenario context (the true score, band, and factor numbers) above it.
2. Fill in \`rating-sheet.md\`: one row per output, 1–5 on each dimension, plus your name and any notes.
3. **Do not open \`key.json\` until every rating is finished.** It maps each label to its system; opening it early breaks the blind.
4. When all ratings are in, unblind with \`key.json\` and average each dimension per system. Report the averages and the number of raters.

${RUBRIC}

## Returning the sheet

Send the completed \`rating-sheet.md\` back to the eval owner with your name on every row you rated. Disagreements between raters are findings, not errors — note them.
`;
}

function outputsContents(
  outputs: PackOutput[],
  scenarios: EvalScenarioResult[],
): string {
  const lines = ['# Rating outputs (blind)', ''];
  const byScenario = new Map<string, PackOutput[]>();
  for (const output of outputs) {
    const list = byScenario.get(output.scenarioId) ?? [];
    list.push(output);
    byScenario.set(output.scenarioId, list);
  }
  for (const scenario of scenarios) {
    const list = byScenario.get(scenario.scenarioId);
    if (!list || list.length === 0) continue;
    lines.push(`## ${scenario.name} (${scenario.scenarioId})`);
    lines.push('');
    lines.push(contextBlock(scenario));
    lines.push('');
    for (const output of list) {
      lines.push(`### Output ${output.label}`);
      lines.push('');
      lines.push(output.answer.answer);
      lines.push('');
      lines.push('Claims cited:');
      lines.push('');
      for (const claim of output.answer.claims) {
        lines.push(`- ${claim.text}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function sheetContents(outputs: PackOutput[]): string {
  const lines = [
    '# Rating sheet',
    '',
    'One row per output. Fill in 1–5 for each dimension (see README.md for the rubric anchors), your name, and any notes. Do not open key.json until you are done.',
    '',
    '| Output | Scenario | Clarity (1–5) | Evidence use (1–5) | Actionability (1–5) | Rater | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const output of outputs) {
    lines.push(`| ${output.label} | ${output.scenarioName} | | | | | |`);
  }
  lines.push('');
  return lines.join('\n');
}

function keyContents(key: RatingPack['key'], generatedAt: string): string {
  return JSON.stringify(
    {
      warning:
        'SEALED — do not open until every rating is finished. Opening this file before rating breaks the blind.',
      generatedAt,
      key,
    },
    null,
    2,
  );
}

/**
 * Build the rating pack from a report. Measured scenarios only (an
 * unavailable scenario has no explanation to rate). The LLM output
 * included is the FIRST repeat's answer — repeats exist for the
 * self-consistency metric, not for rating.
 */
export function buildRatingPack(report: EvalReport, seed: number): RatingPack {
  const measured = report.scenarios.filter(
    (scenario) => scenario.status === 'measured',
  );
  const outputs: PackOutput[] = [];
  const key: RatingPack['key'] = {};
  measured.forEach((scenario, index) => {
    const candidates: Array<{ system: string; answer: AiAnswer }> = [];
    if (scenario.baseline?.answer) {
      candidates.push({
        system: 'baseline',
        answer: scenario.baseline.answer,
      });
    }
    if (scenario.llm.status === 'measured' && scenario.llm.answer) {
      candidates.push({ system: 'llm', answer: scenario.llm.answer });
    }
    // Mock outputs are fixtures, not systems to rate — never included.
    const shuffled = shuffle(candidates, seed + index);
    shuffled.forEach((candidate, position) => {
      const label = `S${String(index + 1).padStart(2, '0')}-${String.fromCharCode(65 + position)}`;
      outputs.push({
        label,
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.name,
        system: candidate.system,
        answer: candidate.answer,
      });
      key[label] = {
        scenarioId: scenario.scenarioId,
        system: candidate.system,
      };
    });
  });
  const llmIncluded = outputs.some((output) => output.system === 'llm');
  return {
    files: [
      {
        name: 'README.md',
        contents: readmeContents(
          outputs.length,
          llmIncluded,
          report.generatedAt,
        ),
      },
      { name: 'outputs.md', contents: outputsContents(outputs, measured) },
      { name: 'rating-sheet.md', contents: sheetContents(outputs) },
      {
        name: 'key.json',
        contents: keyContents(key, report.generatedAt),
      },
    ],
    key,
    outputsCount: outputs.length,
  };
}

/** Write a built pack into a directory (created if missing). */
export function writeRatingPack(directory: string, pack: RatingPack): void {
  mkdirSync(directory, { recursive: true });
  for (const file of pack.files) {
    writeFileSync(join(directory, file.name), file.contents, 'utf8');
  }
}
