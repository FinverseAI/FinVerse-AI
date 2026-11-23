# Phase 5 — Evaluation harness

The measurable research contribution (plan §2, Obj 6): 20 scripted
scenarios, a template baseline, and four metrics — factual grounding,
self-consistency, explanation quality (human, blind), and latency +
cost — for the explain-readiness feature.

## What is evaluated

The **explain-readiness** flow: a deterministic readiness score
(Phase 4) explained by the reasoning model (Phase 1) through the
guardrail (Phase 3), against the template baseline (the production
fallback). The runner sends the EXACT prompts production sends
(`buildReadinessExplanationMessages`, shared with `AiService`) and
verifies with the EXACT guardrail production uses (`verifyAnswer`).
The chat/RAG flows are not evaluated here: their tools read a live
database, so an offline harness cannot run them. Extending the
harness to chat needs a seeded database; the scenario schema and the
runner are written to host more features later.

## Run it

From `apps/backend`, after building:

```powershell
..\..\node_modules\.bin\nest build
node dist/eval/run-eval.js
```

Options: `--repeats N` (self-consistency repeats, default 5),
`--mock correct|corrupt|both|off`, `--scenarios id1,id2`,
`--out DIR` (default `eval/results`), `--pack DIR` (default
`eval/rating-pack`).

**Without `OPENROUTER_API_KEY` the run still completes.** The
baseline is fully measured, the mock path exercises the mechanics,
and every live-LLM metric is reported as `pending key` — never
fabricated, never failed. Set the key in the environment (never in
the repo) and re-run for the live numbers.

## Outputs

- `eval/results/eval-results.json` — the full machine-readable
  report (scores, answers, per-run verifications with failures only,
  usage, cost). Re-running the eval reproduces it.
- `eval/results/eval-results.md` — the human-readable results table
  (the deliverable table for the report).
- `eval/rating-pack/` — the blind rating pack: `outputs.md` (shuffled
  outputs with scenario context), `rating-sheet.md` (the 1–5 rubric),
  `README.md` (instructions + rubric anchors), `key.json` (SEALED —
  do not open until rating is complete).

## The four metrics

1. **Factual grounding** — guardrail pass rate, answer-level and
   check-level. The baseline is 100% by construction (every number
   copied verbatim) but the eval MEASURES it rather than assuming it.
   The mock-corrupt run (score raised by 7) must score 0% at the
   answer level: the sensitivity check, proving the metric can go
   below 100%.
2. **Self-consistency** — the same prompt N times; pairwise agreement
   on the key conclusions (quoted score, named band, set of factors
   mentioned). See `extractConclusions` in `eval.metrics.ts`.
3. **Explanation quality** — human rubric (clarity, evidence use,
   actionability), rated blind by the team. The harness generates the
   pack; it never rates anything itself.
4. **Latency + cost** — measured per-call latency and USD cost from
   the provider's reported token usage and the pinned price table
   (`eval.config.ts`, prices as of 2026-11-23). Cost is null when
   usage is not reported — never estimated from characters.

## Pinned versions

Primary `qwen/qwen-2.5-72b-instruct`, reasoning
`deepseek/deepseek-r1-0528`, embeddings `baai/bge-base-en-v1.5`
(768d). The config spec asserts these match the production defaults,
so a model swap cannot silently change what the eval measured.
Prices: Qwen $0.36/$0.40 per M prompt/completion tokens; R1
$0.571/$2.286 — read from the live OpenRouter catalog on 2026-11-23.

## Files

| File | What it is |
| --- | --- |
| `eval.config.ts` | Pinned models, prices, constants |
| `eval.scenarios.ts` | The 20 scenarios (seeded profiles + portfolios, pinned scores) |
| `eval.baseline.ts` | Template baseline generation + verification |
| `eval.metrics.ts` | Grounding, self-consistency, latency, cost computations |
| `eval.mock-provider.ts` | The labelled fixture LLM (correct + corrupt modes) |
| `eval.runner.ts` | The harness + the Markdown results renderer |
| `eval.rating-pack.ts` | Blind rating-pack generator |
| `run-eval.ts` | CLI entry point |
| `*.spec.ts` | Jest specs for all of the above |
