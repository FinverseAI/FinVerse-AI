# FinVerse AI — Phase 5 Evaluation Results

Generated: 2026-11-25T15:20:17.789Z
Models (pinned): primary qwen/qwen-2.5-72b-instruct; reasoning baidu/ernie-5.5-flash-preview:free; embeddings baai/bge-base-en-v1.5.
Prices as of: 2026-11-23.
API key present: yes. Self-consistency repeats: 5.
Scenarios: 14 total, 13 measured, 1 unavailable (no score measurable).

## Aggregate metrics

| System | Grounding (answers) | Grounding (checks) | Self-consistency | Total cost |
| --- | --- | --- | --- | --- |
| Template baseline | 100.0% (13/13) | 100.0% (930/930) | n/a (deterministic) | n/a (no tokens) |
| LLM (reasoning model) | 86.2% (56/65) | 99.8% (5135/5144) | 100.0% | $0.0000 |
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
| Mid-career builder (mid-career-builder) | 54 | Building | 100.0% | 60.0% | 100.0% | $0.0000 |
| Debt-free, high surplus (debt-free-high-surplus) | 76 | Ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| Single-stock gambler (single-stock-gambler) | 28 | Not ready | 100.0% | 100.0% | 100.0% | $0.0000 |
| Retiree, steady (retiree-steady) | 96 | Ready | 100.0% | 80.0% | 100.0% | $0.0000 |

## Pending

- 6 scenario(s) not yet run in this merged report (freelancer-irregular, new-investor, emergency-only, maxed-out, balanced-ready, partial-history) — the free-model daily quota (50 requests/day) split the run across days.

Total prompt size across measured scenarios: 77,391 characters.
