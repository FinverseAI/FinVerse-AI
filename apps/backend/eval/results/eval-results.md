# FinVerse AI — Phase 5 Evaluation Results

Generated: 2026-11-24T17:22:03.307Z
Models (pinned): primary qwen/qwen-2.5-72b-instruct; reasoning baidu/ernie-5.5-flash-preview:free; embeddings baai/bge-base-en-v1.5.
Prices as of: 2026-11-23.
API key present: yes. Self-consistency repeats: 5.
Scenarios: 10 total, 9 measured, 1 unavailable (no score measurable).

## Aggregate metrics

| System | Grounding (answers) | Grounding (checks) | Self-consistency | Total cost |
| --- | --- | --- | --- | --- |
| Template baseline | 100.0% (9/9) | 100.0% (630/630) | n/a (deterministic) | n/a (no tokens) |
| LLM (reasoning model) | 86.7% (39/45) | 99.8% (3525/3531) | 100.0% | $0.0000 |
| Mock — correct (fixture) | not run | not run | n/a (1 run) | n/a (no tokens) |
| Mock — corrupt (fixture) | not run | not run | n/a (1 run) | n/a (no tokens) |

Mock rows exercise the runner mechanics only; they are not model measurements.

## Per-scenario results

| Scenario | Score | Band | Baseline grounding | LLM grounding | LLM consistency | LLM cost |
| --- | --- | --- | --- | --- | --- | --- |
| Healthy saver (healthy-saver) | 100 | Ready | 100.0% | 60.0% | 100.0% | $0.0000 |
| Over-spender (over-spender) | 48 | Building | 100.0% | 100.0% | 100.0% | $0.0000 |
| Concentrated portfolio (concentrated-portfolio) | 82 | Ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| Diversified portfolio (diversified-portfolio) | 99 | Ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| High debt (high-debt) | 33 | Not ready | 100.0% | 60.0% | 100.0% | $0.0000 |
| No emergency fund (no-emergency-fund) | 74 | Ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| Volatile holdings (volatile-holdings) | 76 | Ready | 100.0% | 60.0% | 100.0% | $0.0000 |
| No portfolio yet (no-portfolio) | 91 | Ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| No data at all (no-data) | — | — | n/a (no score) | n/a (no score) | n/a (no score) | n/a (no score) |
| Young starter (young-starter) | 54 | Building | 100.0% | 100.0% | 100.0% | $0.0000 |

## Pending

- 10 scenario(s) not yet run in this merged report (mid-career-builder, debt-free-high-surplus, single-stock-gambler, retiree-steady, freelancer-irregular, new-investor, emergency-only, maxed-out, balanced-ready, partial-history) — the free-model daily quota (50 requests/day) split the run across days.

Total prompt size across measured scenarios: 53,350 characters.
