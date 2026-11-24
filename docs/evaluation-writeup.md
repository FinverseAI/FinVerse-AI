# FinVerse AI — Evaluation Write-up (Phase 5)

**Status: harness complete and verified; live LLM metrics pending the
OpenRouter API key (23 November 2026).** This document reports what
was measured, what is pending, and how to reproduce both. Nothing in
it is estimated or fabricated: every number comes from the eval run
recorded in `apps/backend/eval/results/eval-results.json`, and every
pending number is labelled pending.

## 1. What was evaluated

The explain-readiness feature: a deterministic readiness score
(Phase 4, five factors, 0–100) explained by the reasoning model
(Phase 1) through the guardrail (Phase 3), compared against the
template baseline (the production fallback). The evaluation answers
one question per metric: how close does the model's explanation come
to the template's guaranteed-correct one, and at what cost?

The chat and RAG flows are NOT evaluated here. Their tools read a
live database, so an offline harness cannot run them; evaluating them
needs a seeded database, which is recorded as future work (§6). The
scenario schema and the runner are written to host more features
later.

## 2. Method

### 2.1 Scenario dataset

20 scripted scenarios (`apps/backend/src/eval/eval.scenarios.ts`),
each a seeded fictional profile + portfolio: healthy saver,
over-spender, concentrated portfolio, diversified portfolio, high
debt, no emergency fund, volatile holdings, no portfolio, no data,
young starter, mid-career builder, debt-free high surplus,
single-stock gambler, retiree steady, freelancer irregular, new
investor, emergency fund only, maxed out (floor case), balanced
ready, partial price history. No real user data; deterministic and
reproducible.

Score distribution (computed by the production formula, pinned by
hand in the scenario file and asserted by spec): Ready 11, Building
5, Not ready 3, unavailable 1 (the no-data scenario, where nothing
is measurable and the honest behaviour is a refusal).

### 2.2 Baseline

The production template (`readinessTemplate`): rule-generated prose
built only from the computed assessment, with every number copied
verbatim. The baseline is the system's own fallback, so the
comparison is against what users already get when the model is
unavailable — not a straw man. The baseline is 100% grounded by
construction, but the eval measures it rather than assuming it.

### 2.3 Metrics

1. **Factual grounding** — guardrail pass rate on explanations,
   answer-level (fraction of answers passing verification outright)
   and check-level (fraction of individual checks passed). A system
   can have a high check-level rate while failing whole answers, so
   both are reported; the headline is the answer-level rate.
2. **Self-consistency** — the same prompt 5 times; pairwise agreement
   on the key conclusions (the score quoted, the band named, the set
   of factors mentioned). 1.0 means every repeat concluded the same
   thing.
3. **Explanation quality** — human rubric (clarity, evidence use,
   actionability), 1–5 each, rated blind by the team on the rating
   pack (`apps/backend/eval/rating-pack/`). The harness generates the
   pack; it never rates anything itself.
4. **Latency + cost** — measured per-call latency and USD cost from
   the provider's reported token usage and the pinned price table.
   Cost is null when usage is not reported — never estimated.

### 2.4 Models and prices (pinned)

Primary `qwen/qwen-2.5-72b-instruct`, reasoning
`deepseek/deepseek-r1-0528`, embeddings `baai/bge-base-en-v1.5`
(768d). Prices read from the live OpenRouter catalog on 2026-11-23:
Qwen $0.36/$0.40 per million prompt/completion tokens; R1
$0.571/$2.286. The readiness eval calls only the reasoning model.
Prices are a snapshot and must be re-checked before the final report.

### 2.5 The no-key run

The eval ran without an API key, by design: the harness detects the
missing key, skips live calls, and reports the live metrics as
pending. Two fixture paths ran instead, through the SAME code path
as the live system:

- **Mock correct** — the template answer returned as a structured
  model reply. Must pass the guardrail: the mechanics check.
- **Mock corrupt** — the template answer with the score raised by 7
  points (in the claim values and the prose, so the answer is
  internally consistent but wrong against the evidence). Must FAIL
  the guardrail: the sensitivity check, proving the grounding metric
  can go below 100%.

Mock numbers are fixture numbers. They say the pipeline works;
they say nothing about the model.

## 3. Results (no-key run, 23 November 2026)

| System | Grounding (answers) | Grounding (checks) | Self-consistency | Total cost |
| --- | --- | --- | --- | --- |
| Template baseline | 100.0% (19/19) | 100.0% (1355/1355) | n/a (deterministic) | $0 |
| LLM (reasoning model) | pending key | pending key | pending key | pending key |
| Mock — correct (fixture) | 100.0% (19/19) | 100.0% (1355/1355) | n/a (1 run) | n/a (no tokens) |
| Mock — corrupt (fixture) | 0.0% (0/19) | 98.6% (1340/1359) | n/a (1 run) | n/a (no tokens) |

Measured on 19 scenarios (the 20th, no-data, has no score to
explain). Per-scenario results are in
`apps/backend/eval/results/eval-results.md`.

### What the numbers say

- **The baseline is exactly as grounded as designed.** 19/19
  answers, 1,355/1,355 checks. This is the number the LLM has to
  match.
- **The guardrail is sensitive.** The corrupt mock failed every
  answer (0/19) — with exactly ONE failing check per scenario: the
  score value check (`'score' was 107 but the tool result says
  100`). The other 1,340 checks passed, because the rest of the
  answer was correct. Answer-level grounding is strict by design: a
  single wrong number fails the answer. Check-level grounding shows
  how much was right.
- **The template is fast.** Baseline generation + verification took
  0.39–5.25 ms per scenario (mean 1.51 ms) — measured, not estimated.
  The LLM's latency is pending the key.
- **Prompts are ~5,000 characters.** 4,670–5,416 characters per
  scenario (98,502 total across 19). At the pinned R1 prices, the
  full live eval (19 scenarios × 1 call + 5 consistency repeats)
  would cost on the order of a few US cents — the exact figure
  awaits the provider's reported token counts.

## 4. Live runs (24 November 2026) — what happened, honestly

Two live runs have been made. Neither produced LLM metrics yet — both
failed for reasons outside the model, and both are recorded here
because the report must not present a 0% as a model score.

**Run 1 (~19:45–20:01 IST).** Key provided; 0 of 95 LLM runs
parseable: 54 provider-errors + 41 parse-errors. Diagnosis: the
harness never sent the structured-output instructions to the model
(production does), so R1 returned valid JSON missing the `claims`
array (40 of 41 parse errors); there was no parse retry, and the 30s
timeout killed several slow calls. Baseline grounding re-confirmed
100% (19/19). Cost: $0.0617. Fix (commit `b98cb67`): instructions
appended, one correction retry mirroring production, timeout 30s →
120s, provider retry with backoff (timeouts/429/5xx only), 1s pacing
between live repeats, HTTP status recorded in errors, and the
misleading `pending key` label replaced with `no successful runs`
when the key was present but no run succeeded. Seven tests added.

**Run 2 (20:51–20:56 IST).** 0 of 95 parseable again — a different
cause: 94 calls rejected instantly with **HTTP 402 (Payment
Required)** — the OpenRouter account was out of credits (about $0.02
remained; the first call consumed it, cost $0.0202). The one call
that reached the model burned 4096 tokens on reasoning alone, twice
(first call + correction retry = 8192 completion tokens), and
returned empty content both times: the 4096-token cap left R1 no
room to emit its answer. Baseline grounding re-confirmed 100%
(19/19) again. Fix: reasoning max tokens 4096 → 16384 (eval and
production — the cap is a ceiling, typical answers use 300–1500
tokens), eval timeout 120s → 300s (at the observed ~48 tokens/s, a
16K-token call can take over 5 minutes; the eval runs unattended).

## 5. What is pending (and what unblocks it)

| Pending item | Blocked on | How to complete |
| --- | --- | --- |
| LLM grounding rate | OpenRouter **account credits** (the key is valid; the balance is $0) | Top up ~$5 on the account that owns the key — one full run costs ~$1–2 — then re-run `node dist/eval/run-eval.js` with the key |
| LLM self-consistency | Same top-up | Same run (5 repeats per scenario) |
| LLM latency + cost | Same top-up | Same run (usage reported by the provider) |
| Explanation-quality ratings | Live LLM outputs + human raters | Re-generate the rating pack from the live report; the team rates blind, then unblinds with `key.json` |

**Production note.** Production's reasoning timeout is still 30s
(`DEFAULT_TIMEOUT_MS`), while the live R1 calls took 8.5s (median,
run 1) to ~85s (run 2, long reasoning). Slow production R1 calls
fail into the template fallback — the user gets a correct but
template answer instead of an LLM one. Raising the production
timeout (Netlify AI routes allow 120s) is a product decision, not
yet taken.

## 6. Observations (for the report discussion)

- **The formula is generous to strong cash flow.** The
  no-emergency-fund scenario (no buffer at all) still scores 74
  (Ready), and the new-investor scenario (two holdings, one at 55%)
  scores 87. The score weights cash flow at 70 of 100 points, so a
  user with a good surplus and no debt can land in Ready with a thin
  portfolio or no buffer. The explanations must name those weak
  factors plainly instead of hiding behind the headline score — this
  is what the explanation-quality ratings should probe.
- **Answer-level grounding is the honest headline.** The corrupt
  mock's 98.6% check-level rate looks good and its 0% answer-level
  rate looks terrible; both are true. A user reads one answer, so
  the answer-level rate is what matters — and it is the rate the
  report should quote, with the check-level rate as supporting
  detail.
- **The refusal path works.** The no-data scenario produced no
  score, no explanation, and no invented numbers — the system
  refused honestly, and the eval recorded the scenario as
  unavailable rather than scoring it zero.

## 7. Limitations and future work

- The eval covers one feature (explain-readiness). Chat, stock
  explanations, news explanations, and the screener need a seeded
  database before they can be evaluated offline.
- Self-consistency measures agreement on extracted conclusions, not
  on the full text: two runs can agree on the score, band, and
  factors while wording the explanation differently. Wording-level
  consistency is not measured.
- The human ratings are not yet collected (no LLM outputs exist
  yet). The pack is ready; the ratings are a team step.
- Prices are a 2026-11-23 snapshot. Re-check before quoting in the
  final report.
- The FinBERT sentiment baseline from the plan is optional extra
  credit and was not built (plan §2: "only if time permits").

## 8. Reproduction

From `apps/backend` (Node 24, dependencies installed):

```powershell
..\..\node_modules\.bin\nest build
node dist/eval/run-eval.js
```

Without a key, the run reproduces this document's numbers exactly
(the harness is deterministic; the report's `generatedAt` is the
only varying field). With `OPENROUTER_API_KEY` set, the same command
produces the live numbers. The test suite
(`node --experimental-vm-modules ../../node_modules/jest/bin/jest.js src/eval/`)
pins the harness mechanics, including the mock sensitivity check.
