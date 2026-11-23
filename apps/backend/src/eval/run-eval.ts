import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveAiConfig } from '../ai/ai.config';
import { OpenRouterClient } from '../ai/ai.provider';
import { EVAL_RATING_PACK_SEED } from './eval.config';
import { buildRatingPack, writeRatingPack } from './eval.rating-pack';
import { renderReportMarkdown, runEval } from './eval.runner';
import type { MockMode } from './eval.mock-provider';

/**
 * The Phase 5 eval CLI.
 *
 * Usage (from apps/backend, after `nest build`):
 *   node dist/eval/run-eval.js [--repeats N] [--mock correct|corrupt|both|off]
 *                              [--scenarios id1,id2] [--out DIR] [--pack DIR]
 *
 * Without OPENROUTER_API_KEY the run still completes: the baseline is
 * fully measured, the mock path exercises the mechanics, and every
 * live-LLM metric is reported as pending key. The key is read from
 * the environment only and is never printed, logged, or written to
 * any output file.
 *
 * Outputs: eval-results.json + eval-results.md in --out (default
 * eval/results), and the blind rating pack in --pack (default
 * eval/rating-pack).
 */

interface CliOptions {
  repeats?: number;
  mock?: MockMode[];
  scenarioIds?: string[];
  outDir: string;
  packDir: string;
}

function usage(): string {
  return [
    'Usage: node dist/eval/run-eval.js [options]',
    '',
    '  --repeats N            Self-consistency repeats per scenario (default 5)',
    '  --mock MODE            Mock modes to run: correct, corrupt, both, off',
    '                         (default: both without a key, off with a key)',
    '  --scenarios id1,id2    Run only these scenario ids (default: all 20)',
    '  --out DIR              Results directory (default: eval/results)',
    '  --pack DIR             Rating-pack directory (default: eval/rating-pack)',
    '  --help                 Show this help',
  ].join('\n');
}

function parseArgs(argv: string[]): CliOptions | null {
  const options: CliOptions = {
    outDir: join('eval', 'results'),
    packDir: join('eval', 'rating-pack'),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      return null;
    }
    if (arg === '--repeats') {
      const value = Number.parseInt(argv[++i] ?? '', 10);
      if (!Number.isFinite(value) || value < 1) {
        console.error('--repeats needs a positive integer.');
        return null;
      }
      options.repeats = value;
      continue;
    }
    if (arg === '--mock') {
      const value = argv[++i] ?? '';
      if (value === 'off') options.mock = [];
      else if (value === 'correct') options.mock = ['correct'];
      else if (value === 'corrupt') options.mock = ['corrupt'];
      else if (value === 'both') options.mock = ['correct', 'corrupt'];
      else {
        console.error('--mock needs one of: correct, corrupt, both, off.');
        return null;
      }
      continue;
    }
    if (arg === '--scenarios') {
      const value = argv[++i] ?? '';
      options.scenarioIds = value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');
      continue;
    }
    if (arg === '--out') {
      options.outDir = argv[++i] ?? options.outDir;
      continue;
    }
    if (arg === '--pack') {
      options.packDir = argv[++i] ?? options.packDir;
      continue;
    }
    console.error(`Unknown argument: ${arg}\n${usage()}`);
    return null;
  }
  return options;
}

function pct(rate: number | null): string {
  return rate === null ? 'pending key' : `${(rate * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options === null) return;
  const config = resolveAiConfig((key) => process.env[key]);
  const client =
    config.apiKey === undefined
      ? null
      : new OpenRouterClient(config.apiKey, config.baseUrl);
  console.log(
    client === null
      ? 'No OPENROUTER_API_KEY — running the no-key eval (baseline + mock; live LLM metrics will be pending key).'
      : `API key present — running the live eval with ${config.reasoningModel}.`,
  );
  const report = await runEval({
    client,
    repeats: options.repeats,
    mock: options.mock,
    scenarioIds: options.scenarioIds,
    onProgress: (done, total, scenarioId) => {
      console.log(`[${done}/${total}] ${scenarioId}`);
    },
  });
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(
    join(options.outDir, 'eval-results.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  writeFileSync(
    join(options.outDir, 'eval-results.md'),
    renderReportMarkdown(report),
    'utf8',
  );
  const pack = buildRatingPack(report, EVAL_RATING_PACK_SEED);
  writeRatingPack(options.packDir, pack);
  console.log('');
  console.log('=== Evaluation complete ===');
  console.log(
    `Scenarios: ${report.scenariosMeasured} measured, ${report.scenariosUnavailable} unavailable.`,
  );
  console.log(
    `Baseline grounding: ${pct(report.grounding.baseline?.answerRate ?? null)} (answers), ${pct(report.grounding.baseline?.checkRate ?? null)} (checks).`,
  );
  console.log(
    `LLM grounding: ${pct(report.grounding.llm?.answerRate ?? null)} (answers).`,
  );
  console.log(`LLM self-consistency: ${pct(report.consistency.llm)}.`);
  console.log(
    `Mock correct grounding: ${pct(report.grounding['mock-correct']?.answerRate ?? null)}; mock corrupt grounding: ${pct(report.grounding['mock-corrupt']?.answerRate ?? null)}.`,
  );
  if (report.pending.length > 0) {
    console.log('Pending:');
    for (const item of report.pending) console.log(`  - ${item}`);
  }
  console.log(`Results: ${join(options.outDir, 'eval-results.md')}`);
  console.log(
    `Rating pack: ${options.packDir} (${pack.outputsCount} outputs).`,
  );
}

main().catch((error: unknown) => {
  console.error(
    'The eval run failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
