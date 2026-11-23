# FinVerse AI — Phase 5 Evaluation Results

Generated: 2026-11-23T17:22:14.904Z
Models (pinned): primary qwen/qwen-2.5-72b-instruct; reasoning deepseek/deepseek-r1-0528; embeddings baai/bge-base-en-v1.5.
Prices as of: 2026-11-23.
API key present: no. Self-consistency repeats: 5.
Scenarios: 20 total, 19 measured, 1 unavailable (no score measurable).

## Aggregate metrics

| System | Grounding (answers) | Grounding (checks) | Self-consistency | Total cost |
| --- | --- | --- | --- | --- |
| Template baseline | 100.0% (19/19) | 100.0% (1355/1355) | n/a (deterministic) | $0 (no model calls) |
| LLM (reasoning model) | pending key | pending key | pending key | pending key |
| Mock — correct (fixture) | 100.0% (19/19) | 100.0% (1355/1355) | n/a (1 run) | n/a (no tokens) |
| Mock — corrupt (fixture) | 0.0% (0/19) | 98.6% (1340/1359) | n/a (1 run) | n/a (no tokens) |

Mock rows exercise the runner mechanics only; they are not model measurements.

## Per-scenario results

| Scenario | Score | Band | Baseline grounding | LLM grounding | LLM consistency | LLM cost |
| --- | --- | --- | --- | --- | --- | --- |
| Healthy saver (healthy-saver) | 100 | Ready | 100.0% | pending key | pending key | pending key |
| Over-spender (over-spender) | 48 | Building | 100.0% | pending key | pending key | pending key |
| Concentrated portfolio (concentrated-portfolio) | 82 | Ready | 100.0% | pending key | pending key | pending key |
| Diversified portfolio (diversified-portfolio) | 99 | Ready | 100.0% | pending key | pending key | pending key |
| High debt (high-debt) | 33 | Not ready | 100.0% | pending key | pending key | pending key |
| No emergency fund (no-emergency-fund) | 74 | Ready | 100.0% | pending key | pending key | pending key |
| Volatile holdings (volatile-holdings) | 76 | Ready | 100.0% | pending key | pending key | pending key |
| No portfolio yet (no-portfolio) | 91 | Ready | 100.0% | pending key | pending key | pending key |
| No data at all (no-data) | — | — | n/a (no score) | n/a (no score) | n/a (no score) | n/a (no score) |
| Young starter (young-starter) | 54 | Building | 100.0% | pending key | pending key | pending key |
| Mid-career builder (mid-career-builder) | 54 | Building | 100.0% | pending key | pending key | pending key |
| Debt-free, high surplus (debt-free-high-surplus) | 76 | Ready | 100.0% | pending key | pending key | pending key |
| Single-stock gambler (single-stock-gambler) | 28 | Not ready | 100.0% | pending key | pending key | pending key |
| Retiree, steady (retiree-steady) | 96 | Ready | 100.0% | pending key | pending key | pending key |
| Freelancer, irregular income (freelancer-irregular) | 65 | Building | 100.0% | pending key | pending key | pending key |
| New investor (new-investor) | 87 | Ready | 100.0% | pending key | pending key | pending key |
| Emergency fund only (emergency-only) | 66 | Building | 100.0% | pending key | pending key | pending key |
| Maxed out (maxed-out) | 0 | Not ready | 100.0% | pending key | pending key | pending key |
| Balanced and ready (balanced-ready) | 100 | Ready | 100.0% | pending key | pending key | pending key |
| Partial price history (partial-history) | 89 | Ready | 100.0% | pending key | pending key | pending key |

## Pending

- Live LLM metrics (grounding, self-consistency, latency, cost) — no OPENROUTER_API_KEY. Re-run with the key set.
- Explanation-quality ratings — the rating pack holds baseline outputs only until the live run adds LLM outputs.

Total prompt size across measured scenarios: 98,502 characters.
