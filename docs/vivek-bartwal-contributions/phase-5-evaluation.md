# Phase 5 — Evaluation

## Metadata

| Field           | Value                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase           | Phase 5 — Evaluation: the measurable research contribution — 20 scripted scenarios, template baseline, four metrics, reproducible runner, blind rating pack (synopsis Objective 6)                                                                                                                                                                                                                                                     |
| Date            | 23 November 2026                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Author          | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                                                                                                                                                                                                                                                                                                                                     |
| Team            | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881)                                                                                                                                                                                                                                                                                                                |
| Guide           | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                                                                                                                                                                                                                                                                                                                                      |
| Repository      | github.com/FinverseAI/FinVerse-AI (public)                                                                                                                                                                                                                                                                                                                                                                                             |
| Branch          | `main` — direct commit, no pull request (team rule from Sarthak, 23 November 2026: no PRs, commit directly)                                                                                                                                                                                                                                                                                                                            |
| Commits         | One commit on `main`, directly on top of `926973a` (the Phase 4 merge) — see `git log` for the hash                                                                                                                                                                                                                                                                                                                                    |
| Scope           | 34 files, +22,735 / −38 lines; **no migration, no new environment variable, no new dependency**                                                                                                                                                                                                                                                                                                                                        |
| Status          | **On `main`, CI green; live LLM metrics now measured — full 19/19 eval complete 27 Nov 2026 (see Appendix D)**                                                                                                                                                                                                                                                                                                                         |
| Standing caveat | Live model calls have now been measured (full 19/19 eval, 27 Nov 2026 — see Appendix D). The harness ran end to end without a key: the baseline is fully measured and the mock path exercises the mechanics, but every LLM number in the report was honestly labelled "pending key" until the live run — no LLM result was fabricated, estimated, or presented from the mock. The live run needed only the key; no code changes (§10). |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 23 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6,
and verified every result independently before it was called done.

---

## 1. Overview — what this phase is and why it exists

Phases 0–4 built a system and a story about it: deterministic math, an
LLM layer that explains it, a guardrail that checks the explanations,
and a cross-module readiness score. Every phase so far could say what
the system DOES. None could say, with a number, how WELL it does it.
That is what a major project report needs and what adjectives cannot
supply: the measurable research contribution. Phase 5 is the phase
that turns "the guardrail catches errors" into a pass rate, "the model
is consistent" into an agreement rate, and "the explanations are good"
into blind human ratings.

The plan (§2, Objective 6) asks for four things: a scenario dataset
(~20 scripted scenarios), a template baseline, four metrics (factual
grounding, self-consistency, explanation quality, latency + cost),
and a deliverable (results table + short write-up). This phase built
all four, plus the thing that makes them trustworthy: a reproducible
runner that re-measures everything from scratch on every run, and a
mock path that proves the runner's mechanics work before any real
model call is ever made.

One constraint shaped the whole phase: **there is still no OpenRouter
API key.** Sarthak was to provide it on 19 November; four days later
it has not arrived. The phase could have waited for the key. Instead
it was built so the key is the ONLY missing input: the harness runs
end to end without it, measures everything measurable without it
(the baseline, the prompt sizes, the template latency, the guardrail's
sensitivity), and reports every live-LLM metric as pending — never
failing, never fabricating. When the key arrives, one command
produces the live numbers. No code changes, no rework.

In one sentence: **Phase 5 built a reproducible evaluation harness
that measures the explain-readiness feature against its template
baseline on 20 scripted scenarios across four metrics, runs fully
without an API key, and reports the live model numbers as honestly
pending until the key exists.**

### What existed before this phase

| Area                                    | State at the start of Phase 5 (23 Nov, ~22:40 IST)                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Module 1 + Phase 0 (deterministic core) | Done, CI green, live — profile, transactions, holdings, price history, indicators                                            |
| Phase 1 (LLM foundation)                | Done, CI green, live — 7 tools, structured output, chat + explain-stock, fallback                                            |
| Phase 2 (RAG)                           | Done, CI green, live — 9 tools, screener, news & sentiment, explain-news                                                     |
| Phase 3 (Guardrails)                    | Done, on `main` via PR #4 (merged by Sarthak) — verification engine, template fallback, corrupted-output suite 22/22         |
| Phase 4 (Readiness)                     | Done, on `main` (`926973a`, direct merge, CI green) — deterministic 0–100 score, reasoning-model explanation, dashboard card |
| Evaluation                              | 0% — no dataset, no baseline harness, no metrics, no runner                                                                  |
| OpenRouter API key                      | Still missing (Sarthak, since 19 Nov) — all live AI smoke tests blocked                                                      |
| Repo workflow                           | Back on the old repo (FinverseAI/FinVerse-AI); Sarthak's rule: direct commits to `main`, no pull requests                    |

---

## 2. Objectives and acceptance criteria

From the approved plan (§2, Phase 5) and the strategy document (§4):

| #   | Objective                       | Acceptance criterion                                                                                  | Result                                                                                                  |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Scenario dataset                | ~20 scripted scenarios (seeded profiles + portfolios), deterministic, reproducible, no real user data | ✅ 20 scenarios, pinned scores, determinism spec                                                        |
| 2   | Template baseline               | Rule-generated explanations from the same numbers, directly comparable to LLM output                  | ✅ Production template reused as the baseline, verified 100%                                            |
| 3   | Metric 1 — factual grounding    | Guardrail pass rate on LLM claims vs baseline                                                         | ✅ Harness measures it; baseline 100.0% measured; LLM pending key                                       |
| 4   | Metric 2 — self-consistency     | Same prompt 5×, agreement rate on key conclusions                                                     | ✅ Harness measures it (pairwise agreement); LLM pending key                                            |
| 5   | Metric 3 — explanation quality  | Human rubric (clarity, evidence use, actionability), blind, LLM vs baseline                           | ✅ Blind rating pack generated (19 outputs); ratings are a human step, pending live outputs             |
| 6   | Metric 4 — latency + cost       | Measured response times and API costs per model                                                       | ✅ Harness measures both from provider usage; baseline latency measured (mean 1.51 ms); LLM pending key |
| 7   | Deliverable                     | Results table + short write-up for the report, honest numbers including failures                      | ✅ `eval/results/eval-results.md` + `docs/evaluation-writeup.md`                                        |
| 8   | Reproducibility                 | Results reproducible by re-running the eval script                                                    | ✅ One command; deterministic except the report timestamp                                               |
| 9   | Version pinning (strategy §4.5) | Exact model versions pinned + documented for every evaluation                                         | ✅ Config pins all three models; spec asserts they match production                                     |
| 10  | No-key operation                | Harness runs end to end without a key; never fails, never fabricates                                  | ✅ Verified by the no-key run and by spec                                                               |

Two deliberate scope decisions (recorded in §6, not omissions): the
eval covers the explain-readiness feature only (the chat/RAG flows
need a live database, so an offline harness cannot run them), and
the FinBERT sentiment baseline was not built (the plan marks it
optional extra credit, "only if time permits").

---

## 3. Architecture — how Phase 5 fits the system

The eval harness is a new pure-TypeScript module,
`apps/backend/src/eval/`, that sits BESIDE the AI layer and measures
it — it does not modify the AI layer's behaviour. It reuses the
production code at every point where reuse is what makes the
measurement valid:

```
20 scenarios (eval.scenarios.ts)
  │  seeded ReadinessInputs
  ▼
scoreReadiness() ── the PRODUCTION formula (readiness.formula.ts)
  │  deterministic assessment (score, band, factors, suggestions)
  ├──▶ readinessTemplate() ── the PRODUCTION fallback template
  │      │  (ai.guardrail-templates.ts)
  │      ▼
  │    verifyAnswer() ── the PRODUCTION guardrail (ai.guardrail.ts)
  │      │  baseline grounding: measured, not assumed
  │      ▼
  │    BaselineRun { answer, verification, latencyMs }
  │
  └──▶ buildReadinessExplanationMessages() ── SHARED with AiService
         │  the exact prompts production sends
         ▼
       LlmClient.chat() ── the live model (or the mock)
         │  responseFormatJson, reasoning model, 4096 max tokens
         ▼
       parseStructuredJson(AiAnswerSchema) ── the PRODUCTION parser
         │
         ▼
       verifyAnswer() ── the PRODUCTION guardrail, same evidence
         │
         ▼
       EvalRun { status, latencyMs, usage, costUsd, verification, conclusions }
```

The two shared pieces are the phase's key engineering decision (§6.1):
`buildReadinessExplanationMessages` (in `ai.prompts.ts`) and
`buildReadinessGuardrailContext` (in `ai.guardrail.ts`) are used by
both the production service and the eval runner. The eval therefore
measures the prompts the users actually get and the evidence the
users' answers are actually checked against — not a copy that drifts
from them. A refactor of `AiService.explainReadinessWithModel` to use
both helpers changed no behaviour (verified: all 82 AI specs still
pass, §7).

The harness is deliberately NOT a NestJS module. It has no
dependencies, no database, no HTTP server: pure functions plus a CLI
entry point. It runs from the compiled backend (`nest build`, then
`node dist/eval/run-eval.js`), which is why it works on this VM
without npm/pnpm (the toolchain note in §7). The same purity is what
lets the jest suite exercise the whole harness in-process, including
the no-key run and stub-client live runs.

### The four metrics, precisely

**Factual grounding.** The guardrail's verdict on each explanation,
aggregated two ways: answer-level (fraction of answers passing
verification outright) and check-level (fraction of individual
checks passed). Answer-level is the headline: a user reads one
answer, so one wrong number fails it. Check-level is the supporting
detail: it shows how much of a failed answer was still right. The
corrupt mock (§4.5) demonstrates the difference: 0% answer-level,
98.6% check-level — one wrong number in an otherwise correct answer.

**Self-consistency.** The same prompt run N times (default 5, per the
plan). Each run's key conclusions are extracted — the score it
quotes, the band it names, the set of factors it mentions — and the
rate is pairwise agreement: agreeing pairs / all pairs. 1.0 means
every repeat concluded the same thing; 0.5 with 4 runs means 3 of 6
pairs agreed. The extraction reads the structured claims first
(values.score, values.name) and falls back to the prose only for the
band, which the template puts in prose ("(Ready)"). "Not ready" is
matched before "Ready" so the longer phrase wins.

**Explanation quality.** A human judgement, by design. The harness
generates a blind rating pack (shuffled outputs, opaque labels, a
1–5 rubric on clarity / evidence use / actionability, a sealed key
file) and stops there. It never rates anything itself, and no rating
is ever pre-filled. Until the live run exists, the pack holds
baseline outputs only, and its README says so plainly.

**Latency + cost.** Per-call latency measured with `performance.now()`
around each call (baseline generation + verification, and each model
call). Cost computed from the provider's reported token usage and
the pinned price table — which required the provider to report usage
at all (§4.1). When usage is not reported, cost is null and the
report says so; it is never estimated from characters.

---

## 4. What was built — module by module

34 files, +22,735 / −38 lines: 16 new under `apps/backend/src/eval/` (8 modules + 7
specs + README), 6 generated artifacts under `apps/backend/eval/`,
1 write-up under `docs/`, 10 modified files (the provider change,
the shared helpers, and the spec updates they required), plus this
document. (The insertion count is dominated by the committed
`eval-results.json`, the full machine-readable report.)

### 4.1 Provider usage passthrough (`ai.provider.ts` + spec)

The `ChatCompletion` type gained a `usage` field
(`{ promptTokens, completionTokens, totalTokens } | null`), parsed
from the provider's `usage` block by a defensive `parseUsage`: all
three counts must be finite numbers, otherwise the whole block is
null — a partial usage block would understate cost, which is worse
than none. The OpenRouter client returns it on every completion; the
service ignores it (it does not need it); the eval turns it into
measured cost.

Two new specs: usage passed through when reported (and null when
absent), and a partial usage block treated as no usage. The change
is additive at runtime but broke 5 existing spec files at
compile time: their `ChatCompletion` literals lacked the new required
field. All 24 literals gained `usage: null` (§8.1).

### 4.2 Shared prompt + guardrail-context helpers

- `buildReadinessExplanationMessages(assessment, question,
maxDataChars)` in `ai.prompts.ts`: the exact messages the
  explain-readiness feature sends — system prompt, readiness intro,
  the user's question, the assessment as JSON truncated at 8,000
  chars with the service's `\u2026[truncated]` marker. The cap itself
  is now an exported constant,
  `READINESS_EXPLANATION_MAX_DATA_CHARS`, shared by the service and
  the runner.
- `buildReadinessGuardrailContext(requestId, userId, assessment)` in
  `ai.guardrail.ts`: the guardrail context with the assessment as
  the only evidence.
- `AiService.explainReadinessWithModel` was refactored to use both.
  Behaviour is identical (the helpers replicate the inlined code
  exactly, including the truncation marker); the refactor is covered
  by the existing 82 AI specs, all still passing.

### 4.3 Eval config (`eval.config.ts` + spec)

Pins the three model versions (re-exported from the production
config defaults, so a swap in production cannot silently change what
the eval measured), the price table (Qwen $0.36/$0.40, R1
$0.571/$2.286 per million prompt/completion tokens — read from the
live OpenRouter catalog on 2026-11-23, with the as-of date recorded),
and the constants: 5 repeats, 4,096 reasoning max tokens, 30s
timeout, the rating-pack shuffle seed. The spec asserts the pinned
IDs match production and the prices match the catalog snapshot. The
embeddings model has no price: it does not appear in the catalog
endpoint, and the readiness eval makes no embedding calls, so no
embeddings cost is measured or claimed.

### 4.4 Scenarios (`eval.scenarios.ts` + spec)

The 20 scenarios (§2.1), each with an id, name, fictional persona,
description, archetype, the question the model is asked, full
`ReadinessInputs`, and the hand-computed expected score + band.
Holdings use real NSE symbols with plausible seeded values;
volatilities are seeded parameters, as the production service would
compute them from 3 months of closes (the eval measures the
explanation layer, not the volatility computation, which has its own
spec). Scenario 20 seeds holdings with no volatility at all, to
exercise the missing-factor rescaling; scenario 9 seeds nothing at
all, to exercise the refusal path.

The expected scores were computed by hand from the published formula
and are asserted by spec — if the formula changes, the spec fails
and the pins must be recomputed by hand, not copied from the code.
All 20 hand computations matched the code on the first run. Score
distribution: Ready 11, Building 5, Not ready 3, unavailable 1.

### 4.5 Metrics (`eval.metrics.ts` + spec)

`extractConclusions` (score/band/factors from a structured answer),
`pairwiseAgreement` (agreeing pairs / all pairs, null with < 2
runs), `summarizeGrounding` (answer-level + check-level rates from
verification counts), `summarizeLatency` (min/median/p95/max/mean),
`costOfUsage` (USD from usage + price table, null when usage is
absent). The spec pins each with hand-built cases, including the
"Not ready" band-matching rule and the 4-run agreement arithmetic
(3 agreeing of 6 pairs = 0.5).

### 4.6 Baseline (`eval.baseline.ts` + spec)

`runBaseline(assessment)` generates the template and verifies it
with the production guardrail against the production evidence
context, timing the whole thing. The spec asserts the baseline
passes the guardrail on all 19 measurable scenarios — the "100% by
construction, measured" claim — quotes the computed score and band
exactly (checked on the concentrated-portfolio scenario: "82 out of
100 (Ready)", RELIANCE, 80%), and reports a real latency.

### 4.7 Mock provider (`eval.mock-provider.ts` + spec)

`MockLlmClient` implements `LlmClient` and returns the template
answer as a structured JSON reply, labelled `mock/correct` or
`mock/corrupt` (never a real model ID). Correct mode returns the
template verbatim; corrupt mode raises the score by 7 points in the
claim values AND the prose (rebuilding the answer from the claims,
the template's own rule), so the answer is internally consistent
and only the guardrail's check against the evidence can catch it.
The spec asserts: correct passes the guardrail on every measurable
scenario; corrupt fails it on every measurable scenario, with
exactly one failing check each (the score value check).

### 4.8 Runner (`eval.runner.ts` + spec, `run-eval.ts`)

`runEval(options)` runs the scenarios through the systems and
returns an `EvalReport`. The client is null when no key exists —
the live system is then `pending-key` and no call is attempted. The
mock defaults to both modes without a key and off with one. Each
live/mock run: build the production messages, time the call, parse
with the production parser, verify with the production guardrail,
extract conclusions, price the usage. Parse errors and provider
errors are recorded as failed runs with a synthetic failure
verification — the run never crashes on a bad model reply. Unavailable
scenarios are recorded as unavailable with no systems run.

The report stores slim verifications (verdict + counts + failing
checks only — passing rows are not stored, §8.4) and renders the
human-readable results table via `renderReportMarkdown`, with
system-aware null labels: only the live system says "pending key";
the baseline says "n/a (deterministic)", the mocks say "n/a (1 run)"
and "n/a (no tokens)". The CLI (`run-eval.ts`) parses
`--repeats/--mock/--scenarios/--out/--pack`, reads the key from the
environment only (never prints it), runs the eval with progress
output, and writes the results + rating pack.

The runner spec covers the no-key run end to end (19 measured, 1
unavailable, baseline 100%, LLM pending, mock correct 100% / corrupt
0%), the stub-client live path (request shape, JSON mode, reasoning
model, cost from stub usage, consistency 1.0 for a deterministic
stub), parse-error and provider-error recording, refusal recording,
scenario subsets, and the Markdown renderer (pending-key labels, no
fabricated numbers).

### 4.9 Rating pack (`eval.rating-pack.ts` + spec)

`buildRatingPack(report, seed)` builds the blind pack from a report:
per measured scenario, the baseline + LLM first-repeat answers are
shuffled (mulberry32, seeded, reproducible) and labelled `S01-A`,
`S01-B`; the mapping lives only in `key.json`, sealed with a warning.
`outputs.md` shows each output with its scenario context (true score,
band, factor numbers, top improvements) so evidence use can be judged
against the truth — and never names the system (verified by spec: the
outputs file contains no "baseline"/"LLM"/"mock"). `rating-sheet.md`
has one row per output (clarity / evidence use / actionability 1–5,
rater, notes). `README.md` carries the instructions and the rubric
anchors (what 1/3/5 mean per dimension). Mock outputs are never
included — fixtures are not systems to rate. `writeRatingPack`
writes the four files to a directory.

### 4.10 Generated artifacts (`apps/backend/eval/`)

The committed no-key run (23 Nov 2026, ~22:52 IST):

- `eval/results/eval-results.json` (693 KB) — the full report:
  scores, answers, per-run slim verifications, usage, cost.
- `eval/results/eval-results.md` — the results table (§7).
- `eval/rating-pack/` — README, outputs (19 outputs, 46 KB),
  rating sheet (19 rows), sealed key.

### 4.11 Evaluation write-up (`docs/evaluation-writeup.md`)

Report-ready material (third person): method, pinned models and
prices, the results table, what is pending and what unblocks it,
three observations for the report discussion (the formula's
generosity to strong cash flow; answer-level grounding as the honest
headline; the refusal path working), limitations and future work,
and reproduction instructions.

---

## 5. Configuration

No new environment variable. The eval reads the existing
`OPENROUTER_API_KEY` (and the existing `LLM_MODEL_REASONING` /
`LLM_BASE_URL` overrides, via `resolveAiConfig`). No new dependency.
No migration. The only new configuration is the eval config module
itself (§4.3), whose prices are a dated snapshot that must be
re-checked before the final report.

| Setting                   | Value                                          | Source                                  |
| ------------------------- | ---------------------------------------------- | --------------------------------------- |
| Primary model (pinned)    | `qwen/qwen-2.5-72b-instruct`                   | `eval.config.ts` (= production default) |
| Reasoning model (pinned)  | `deepseek/deepseek-r1-0528`                    | `eval.config.ts` (= production default) |
| Embeddings model (pinned) | `baai/bge-base-en-v1.5` (768d)                 | `eval.config.ts` (= production default) |
| Qwen price                | $0.36 / $0.40 per M tokens (prompt/completion) | Live OpenRouter catalog, 2026-11-23     |
| R1 price                  | $0.571 / $2.286 per M tokens                   | Live OpenRouter catalog, 2026-11-23     |
| Self-consistency repeats  | 5                                              | Plan §2                                 |
| Reasoning max tokens      | 4096                                           | = production `REASONING_MAX_TOKENS`     |
| Eval timeout              | 30,000 ms                                      | = production default                    |
| Rating-pack seed          | 20261123                                       | `eval.config.ts`                        |

---

## 6. Decisions taken

### 6.1 Share the prompt + guardrail construction with production

The eval could have rebuilt the readiness prompt from the prompt
constants and the guardrail context from the context type. Instead
both are shared helpers used by the service and the runner. Reason:
an eval that measures a COPY of the prompt measures nothing about
production — and the copy drifts silently. The cost was a small
refactor of `explainReadinessWithModel` (behaviour-identical,
covered by the existing specs). The same reasoning applies to the
guardrail and the template: the eval imports the production modules,
it does not reimplement them.

### 6.2 Evaluate explain-readiness only (for now)

The chat/RAG flows need a live database (their tools read the
user's stored data), so an offline harness cannot run them without
seeding one. The readiness flow needs only the pure formula + the
pure template + the pure guardrail + the model — everything an
offline harness can drive. The plan's scenario list ("seeded
profiles + portfolios") IS the readiness input shape, so the
readiness focus matches the plan exactly. Chat/RAG evaluation is
recorded as future work in the write-up (§6), and the runner is
written to host more features later (the scenario schema and the
system-result shape are feature-agnostic).

### 6.3 No-key operation is a first-class mode, not an error path

The harness detects the missing key, skips live calls, and reports
"pending key" — exit code 0. Reason: the key has been missing for
four days, and the phase's value (the baseline numbers, the
sensitivity check, the pack, the reproducibility) does not depend
on it. A harness that refused to run without a key would have
produced nothing for four days. The mock exists to make the no-key
run meaningful: it exercises the live code path (prompt → call →
parse → verify → measure) with a fixture, so the first real run
with a key exercises tested code, not new code.

### 6.4 The mock corrupts the score, not a random field

The corrupt mock raises the score by 7 — the single most important
number, in the claim values and the prose. Reason: the sensitivity
check must be unambiguous. A corruption in an obscure field might
pass by accident (a field the guardrail does not check); the score
is always checked, always in the prose, and always the first thing
a reader sees. Seven points is large enough to be unambiguously
wrong and small enough to be plausible — a model error, not a
caricature.

### 6.5 Store slim verifications, not full check rows

The first committed run's JSON was 3.16 MB — ~1,300 passing check
rows that add nothing the counts do not already say. The report now
stores the verdict, the counts, and the FAILING checks only (693 KB).
Reason: the failures are the evidence; the passing rows can be
regenerated by re-running the eval, which is deterministic. The
metrics are recomputable from the slim record (§8.4).

### 6.6 Answer-level grounding is the headline

The corrupt mock's two rates (0% answer-level, 98.6% check-level)
show why both are reported and why the answer-level rate leads. A
user reads one answer; one wrong number makes it untrustworthy, even
if 98.6% of its checks passed. The report quotes the answer-level
rate first and the check-level rate as supporting detail.

### 6.7 The rating pack is generated, not hand-written

The pack is built from the report, so it always reflects the outputs
the eval actually produced — a hand-written pack would drift from
the run it claims to rate. The shuffle is seeded (reproducible),
the labels are opaque, and the key is a separate sealed file. The
README warns raters not to open it until rating is complete; the
team's discipline, not the file system, enforces the blind.

### 6.8 Prices verified live, not copied from the plan

The plan recorded the Qwen prompt price ($0.36/M) but not its
completion price, and the R1 prices from 19 November. The eval
config's prices were read from the live OpenRouter catalog on
23 November (Qwen completion $0.40/M — new; R1 $0.571/$2.286 —
unchanged). The as-of date is recorded in the config and the report,
because OpenRouter reprices models and the final report must not
quote a stale price as current.

---

## 7. Verification

Run before the commit, all on this VM, 23 November 2026 (~22:40–23:30 IST):

| Check             | Command                                                              | Result                                                              |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Backend tests     | `node --experimental-vm-modules ../../node_modules/jest/bin/jest.js` | **612/612 (48 suites)** — baseline 565 + 2 provider usage + 45 eval |
| Web tests         | `node --test test/*.test.mjs` (apps/web)                             | **68/68** (unchanged — no web code touched)                         |
| Backend tsc       | `tsc --noEmit --incremental false`                                   | Clean                                                               |
| Backend oxlint    | `oxlint --type-aware --deny-warnings src/ test/`                     | 0 warnings, 0 errors                                                |
| Prettier          | `prettier --check` on all touched files                              | Clean                                                               |
| Web check-types   | `next typegen && tsc --noEmit`                                       | Clean                                                               |
| Web ESLint        | `eslint --max-warnings 0`                                            | Clean                                                               |
| Backend build     | `nest build`                                                         | Green; `dist/eval/run-eval.js` produced                             |
| Eval run (no key) | `node dist/eval/run-eval.js`                                         | Completed, exit 0; see table below                                  |

### The no-key eval run (23 Nov 2026, ~22:52 IST)

| System                   | Grounding (answers) | Grounding (checks) | Self-consistency    | Total cost      |
| ------------------------ | ------------------- | ------------------ | ------------------- | --------------- |
| Template baseline        | 100.0% (19/19)      | 100.0% (1355/1355) | n/a (deterministic) | $0              |
| LLM (reasoning model)    | pending key         | pending key        | pending key         | pending key     |
| Mock — correct (fixture) | 100.0% (19/19)      | 100.0% (1355/1355) | n/a (1 run)         | n/a (no tokens) |
| Mock — corrupt (fixture) | 0.0% (0/19)         | 98.6% (1340/1359)  | n/a (1 run)         | n/a (no tokens) |

19 scenarios measured, 1 unavailable (no-data). Baseline latency
0.39–5.25 ms per scenario (mean 1.51 ms). Prompt sizes 4,670–5,416
chars per scenario (98,502 total). The corrupt mock failed exactly
one check per scenario — the score value check (e.g. "'score' was
107 but the tool result says 100").

### What was hand-verified (not just asserted by spec)

- All 20 scenario scores were hand-computed from the published
  formula before the spec ran; all 20 matched the code on the first
  run (§4.4). Three were re-checked in full detail during writing
  (healthy-saver 100, maxed-out 0, no-portfolio 91 via the 70-point
  rescaling).
- The corrupt mock's failure mode was read in the results JSON: 19
  failures, one per scenario, each the score value check — the
  precise, minimal failure the design intended (§3).
- The rating pack was read end to end: 19 outputs, each with correct
  scenario context; the outputs file contains no system name (blind
  holds); the key maps every label to baseline (the only system in
  a no-key run).
- The prices were read from the live OpenRouter catalog response
  (477 models), not from the plan or memory (§6.8).

---

## 8. Problems faced and fixes

### 8.1 The usage field broke 5 spec files (tsc, not jest)

Adding required `usage` to `ChatCompletion` passed jest (ts-jest
does not fail the suite on these type errors) but failed `tsc`:
24 `ChatCompletion` literals across `ai.guardrail-flow.spec.ts`,
`ai.http.spec.ts`, `ai.rag.spec.ts`, `ai.readiness.spec.ts`, and
`ai.service.spec.ts` lacked the field. Fixed by adding
`usage: null` to every literal (sed for the regular one-liners,
manual edits for the multi-line literals), then `prettier --write`
to rewrap the lengthened lines. Lesson: run `tsc` after every
interface change, not just jest — the suite passing does not mean
the types pass.

### 8.2 `scenario.id` vs `scenario.scenarioId` — the silent undefined

In `eval.rating-pack.ts` I wrote `scenario.id` where the report type
has `scenario.scenarioId`. TypeScript should have caught it; jest
did not fail the suite, and the bug surfaced only because
`JSON.stringify` drops `undefined` values — the key.json entries
lost their `scenarioId`, and the rating-pack spec's key assertion
failed. Worse, the outputs grouping keyed on `undefined`, so every
scenario's outputs would have appeared under every heading (the
`toContain` assertions passed despite the duplication). Fixed by
using `scenario.scenarioId` in all four places. Lesson: a spec that
only asserts `toContain` cannot catch duplication — the key
assertion (exact equality) caught what the content assertions
missed.

### 8.3 Wrong import path (`../ai/validation`)

Three eval files imported from `../ai/validation`; the module is
`../ai/ai.validation`. Type-only imports failed silently at runtime
(ts-jest strips them); value imports failed loudly at suite load.
Fixed with a single sed across the eval directory. Lesson: check a
new import by running the suite immediately, not after writing five
more files.

### 8.4 The 3.16 MB results file

The first committed run's JSON was 3.16 MB — ~1,300 passing check
rows. Slimmed to verdict + counts + failures only (693 KB, §6.5).
The metrics module's `summarizeGrounding` was generalised to take
verification counts instead of full results, so the slim record
still recomputes every metric.

---

## 9. Deployment

Nothing in this phase deploys. The eval harness is developer
tooling: it runs from a local checkout (`nest build` + `node
dist/eval/run-eval.js`), reads no production data, and writes only
to `apps/backend/eval/`. It is not wired into the NestJS app module,
not exposed by any endpoint, and not run by CI — the jest specs
cover the harness mechanics in CI; the full eval run is a manual
step (it takes seconds without a key, and minutes with one, at the
cost of the live calls). The committed results and rating pack are
documentation, not runtime assets.

---

## 10. What is still open or unverified

| Item                        | Status                                                                               | Unblocked by            |
| --------------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| LLM grounding rate          | **Done 27 Nov 2026 — 84.2% (80/95 answers), ERNIE 5.5 Flash :free** (see Appendix D) | —                       |
| LLM self-consistency        | **Done 27 Nov 2026 — 100%** (see Appendix D)                                         | —                       |
| LLM latency + cost          | **Done 27 Nov 2026 — median 16.6s (part 2b), $0.0000 total** (see Appendix D)        | —                       |
| Explanation-quality ratings | Pack regenerated with all 19 scenarios' LLM outputs; no ratings collected yet        | Team raters             |
| CI on this commit           | Not run yet (commit is local; parent re-verifies before pushing)                     | Push                    |
| Chat/RAG evaluation         | Not built — needs a seeded database                                                  | Future work (§6.2)      |
| FinBERT baseline            | Not built — plan marks it optional extra credit                                      | Time permitting         |
| Prices in the final report  | Snapshot as of 2026-11-23; must be re-checked before quoting                         | Re-check at report time |

The live run, when the key arrives, is one command with no code
changes. The expected cost is on the order of a few US cents (19
scenarios × 1 call + 5 consistency repeats × 19 scenarios = 114
reasoning-model calls at ~5,000 prompt chars each).

---

## 11. Lessons learned

1. **Run `tsc` after every interface change.** Jest passing does
   not mean the types pass (§8.1). The full gate set (jest, tsc,
   oxlint, prettier) runs before every commit for this reason.
2. **A spec that only asserts `toContain` cannot catch duplication.**
   The rating-pack bug (§8.2) survived content assertions and was
   caught only by an exact-equality assertion on the key. Prefer
   exact assertions for generated artifacts.
3. **Design for the missing dependency, not around it.** The key was
   missing for four days. Building the harness to run fully without
   it — and to say so honestly — produced a complete, verifiable
   phase instead of a blocked one. The mock is not a substitute for
   the model; it is a substitute for waiting.
4. **Measure the baseline; do not assume it.** "100% by construction"
   is a design claim, not a measurement. The eval verifies the
   template with the same guardrail it applies to the model — and
   the 1,355/1,355 result is a measured fact, not a slogan.
5. **Sensitivity checks are as important as pass checks.** A metric
   that cannot go below 100% measures nothing. The corrupt mock
   exists to prove the grounding metric moves — and it moved exactly
   as designed (one failing check per scenario).
6. **Honest pending beats invented progress.** Every LLM number in
   this phase's report says "pending key". That is less impressive
   than a fabricated table and more useful than one: the team knows
   exactly what is measured, what is not, and what unblocks it.

---

## 12. Appendix

### A. File inventory (Phase 5)

New — `apps/backend/src/eval/`: `eval.config.ts`,
`eval.config.spec.ts`, `eval.scenarios.ts`, `eval.scenarios.spec.ts`,
`eval.baseline.ts`, `eval.baseline.spec.ts`, `eval.metrics.ts`,
`eval.metrics.spec.ts`, `eval.mock-provider.ts`,
`eval.mock-provider.spec.ts`, `eval.runner.ts`, `eval.runner.spec.ts`,
`eval.rating-pack.ts`, `eval.rating-pack.spec.ts`, `run-eval.ts`,
`README.md`.

New — `apps/backend/eval/`: `results/eval-results.json`,
`results/eval-results.md`, `rating-pack/README.md`,
`rating-pack/outputs.md`, `rating-pack/rating-sheet.md`,
`rating-pack/key.json`.

New — `docs/`: `evaluation-writeup.md`,
`vivek-bartwal-contributions/phase-5-evaluation.md` (this document).

Modified: `apps/backend/src/ai/ai.provider.ts`,
`ai.provider.spec.ts`, `ai.prompts.ts`, `ai.guardrail.ts`,
`ai.service.ts`, `ai.guardrail-flow.spec.ts`, `ai.http.spec.ts`,
`ai.rag.spec.ts`, `ai.readiness.spec.ts`, `ai.service.spec.ts`.

### B. Scenario scores (pinned)

| Scenario               | Score           | Band      |
| ---------------------- | --------------- | --------- |
| healthy-saver          | 100             | Ready     |
| over-spender           | 48              | Building  |
| concentrated-portfolio | 82              | Ready     |
| diversified-portfolio  | 99              | Ready     |
| high-debt              | 33              | Not ready |
| no-emergency-fund      | 74              | Ready     |
| volatile-holdings      | 76              | Ready     |
| no-portfolio           | 91              | Ready     |
| no-data                | — (unavailable) | —         |
| young-starter          | 54              | Building  |
| mid-career-builder     | 54              | Building  |
| debt-free-high-surplus | 76              | Ready     |
| single-stock-gambler   | 28              | Not ready |
| retiree-steady         | 96              | Ready     |
| freelancer-irregular   | 65              | Building  |
| new-investor           | 87              | Ready     |
| emergency-only         | 66              | Building  |
| maxed-out              | 0               | Not ready |
| balanced-ready         | 100             | Ready     |
| partial-history        | 89              | Ready     |

### C. How to run the eval

From `apps/backend` (Node 24, dependencies installed):

```powershell
..\..\node_modules\.bin\nest build
node dist/eval/run-eval.js
```

Without `OPENROUTER_API_KEY`: the no-key run (baseline + mock,
live metrics pending). With the key set in the environment: the
live run. See `apps/backend/src/eval/README.md` for options.

### D. Live-run results — addendum, 27 November 2026

Written after the full live eval completed. The harness needed no
code changes for the live run — only the key, pasted fresh for each
day's run and never stored.

**The run.** OpenRouter's free tier (Vivek's decision, 24 Nov 2026:
the paid account was at $0). Model `baidu/ernie-5.5-flash-preview:free`
(first pick Gemma 4 31B rejected every call with HTTP 429, upstream
saturation). Free quota 50 requests/day, so the 95-call eval split
across three days: part 1 (9 scenarios, 24 Nov), part 2a (4 scenarios,
25 Nov), part 2b (6 scenarios, 27 Nov 11:10–11:19 IST). A runtime
restart killed the first part-2 attempt at 27/50 calls (25 Nov) and
its results were lost; part 2b wrote to a durable folder with the
console log to a file. The parts were merged with a script that
recomputes every summary from the stored runs (never averages part
summaries). Merged results: `apps/backend/eval/results/`
(`eval-results.json` + `eval-results.md`); blind rating pack:
`apps/backend/eval/rating-pack/` (all 19 scenarios' outputs).
Full narrative: `docs/evaluation-writeup.md` §4.

**Final numbers (19 of 19 scenarios measured, + no-data unavailable).**

| System                      | Grounding (answers) | Grounding (checks) | Self-consistency    | Total cost |
| --------------------------- | ------------------- | ------------------ | ------------------- | ---------- |
| Template baseline           | 100.0% (19/19)      | 100.0% (1477/1477) | n/a (deterministic) | n/a        |
| LLM (ERNIE 5.5 Flash :free) | 84.2% (80/95)       | 99.8% (8106/8123)  | 100.0%              | $0.0000    |

Per scenario (LLM grounding): healthy-saver 60%, over-spender 100%,
concentrated-portfolio 100%, diversified-portfolio 100%, high-debt 60%,
no-emergency-fund 100%, volatile-holdings 60%, no-portfolio 100%,
young-starter 100%, mid-career-builder 60%, debt-free-high-surplus 100%,
single-stock-gambler 100%, retiree-steady 80%, freelancer-irregular 60%,
new-investor 100%, emergency-only 100%, maxed-out 60%, balanced-ready 60%,
partial-history 100%. The 15 failing answers failed 17 checks between
them (part 1: 6 answers / 6 checks; part 2a: 3 / 3; part 2b: 6 / 8).

**Scope note.** These numbers measure ERNIE 5.5 Flash, not the pinned
qwen-2.5-72B / DeepSeek R1. They prove the harness measures a real model
end to end and validate the prompt and guardrail design; the
pinned-model metrics still need the ~$5 top-up run (§10, write-up §5).
Blind human ratings are the remaining unmeasured piece: the pack holds
all 19 scenarios' outputs, awaiting team raters.
