# FinVerse AI — Phase 5 Evaluation Results

Generated: 2026-11-24T14:31:31.584Z
Models (pinned): primary qwen/qwen-2.5-72b-instruct; reasoning deepseek/deepseek-r1-0528; embeddings baai/bge-base-en-v1.5.
Prices as of: 2026-11-23.
API key present: yes. Self-consistency repeats: 5.
Scenarios: 20 total, 19 measured, 1 unavailable (no score measurable).

## Aggregate metrics

| System | Grounding (answers) | Grounding (checks) | Self-consistency | Total cost |
| --- | --- | --- | --- | --- |
| Template baseline | 100.0% (19/19) | 100.0% (1355/1355) | n/a (deterministic) | $0 (no model calls) |
| LLM (reasoning model) | 0.0% (0/95) | 0.0% (0/95) | pending key | $0.0617 |
| Mock — correct (fixture) | not run | not run | n/a (1 run) | n/a (no tokens) |
| Mock — corrupt (fixture) | not run | not run | n/a (1 run) | n/a (no tokens) |

Mock rows exercise the runner mechanics only; they are not model measurements.

## Per-scenario results

| Scenario | Score | Band | Baseline grounding | LLM grounding | LLM consistency | LLM cost |
| --- | --- | --- | --- | --- | --- | --- |
| Healthy saver (healthy-saver) | 100 | Ready | 100.0% | 0.0% | — | $0.0037 |
| Over-spender (over-spender) | 48 | Building | 100.0% | 0.0% | — | $0.0058 |
| Concentrated portfolio (concentrated-portfolio) | 82 | Ready | 100.0% | 0.0% | — | $0.0108 |
| Diversified portfolio (diversified-portfolio) | 99 | Ready | 100.0% | 0.0% | — | $0.0075 |
| High debt (high-debt) | 33 | Not ready | 100.0% | 0.0% | — | $0.0059 |
| No emergency fund (no-emergency-fund) | 74 | Ready | 100.0% | 0.0% | — | $0.0055 |
| Volatile holdings (volatile-holdings) | 76 | Ready | 100.0% | 0.0% | — | $0.0029 |
| No portfolio yet (no-portfolio) | 91 | Ready | 100.0% | 0.0% | — | $0.0047 |
| No data at all (no-data) | — | — | n/a (no score) | n/a (no score) | n/a (no score) | n/a (no score) |
| Young starter (young-starter) | 54 | Building | 100.0% | 0.0% | — | $0.0046 |
| Mid-career builder (mid-career-builder) | 54 | Building | 100.0% | 0.0% | — | $0.0029 |
| Debt-free, high surplus (debt-free-high-surplus) | 76 | Ready | 100.0% | 0.0% | — | $0.0028 |
| Single-stock gambler (single-stock-gambler) | 28 | Not ready | 100.0% | 0.0% | — | $0.0022 |
| Retiree, steady (retiree-steady) | 96 | Ready | 100.0% | 0.0% | — | $0.0023 |
| Freelancer, irregular income (freelancer-irregular) | 65 | Building | 100.0% | 0.0% | — | — |
| New investor (new-investor) | 87 | Ready | 100.0% | 0.0% | — | — |
| Emergency fund only (emergency-only) | 66 | Building | 100.0% | 0.0% | — | — |
| Maxed out (maxed-out) | 0 | Not ready | 100.0% | 0.0% | — | — |
| Balanced and ready (balanced-ready) | 100 | Ready | 100.0% | 0.0% | — | — |
| Partial price history (partial-history) | 89 | Ready | 100.0% | 0.0% | — | — |

Total prompt size across measured scenarios: 98,502 characters.
