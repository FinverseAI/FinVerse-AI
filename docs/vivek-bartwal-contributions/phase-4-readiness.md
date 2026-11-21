# Phase 4 — Investment Readiness

## Metadata

| Field           | Value                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase           | Phase 4 — Investment Readiness: the deterministic cross-module score and its guardrailed explanation (synopsis Objective 5)                                                                                                                                                                                                                                                                            |
| Date            | 21 November 2026                                                                                                                                                                                                                                                                                                                                                                                       |
| Author          | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                                                                                                                                                                                                                                                                                                     |
| Team            | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881)                                                                                                                                                                                                                                                                                |
| Guide           | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                                                                                                                                                                                                                                                                                                      |
| Repository      | github.com/FinverseAI/FinVerse-AI (public)                                                                                                                                                                                                                                                                                                                                                             |
| Branch          | `vivek/phase-4-readiness` (stacked on `vivek/phase-3-guardrails` at `38be5dd`; see §9)                                                                                                                                                                                                                                                                                                                 |
| Commits         | `5547f16`..`fd5bcb8` (5 commits)                                                                                                                                                                                                                                                                                                                                                                       |
| Scope           | 29 files, +3,050 / −7 lines; **no migration, no new environment variable**                                                                                                                                                                                                                                                                                                                             |
| Status          | **Built on its branch — NOT pushed, no PR yet, CI not run, live verification pending** (21 November 2026, ~20:40 IST)                                                                                                                                                                                                                                                                                  |
| Standing caveat | No readiness explanation has been verified against a live model call yet, and the score has never been computed for a real user in production. The formula is proven against scripted fixtures; how it behaves on real profiles and portfolios awaits the OpenRouter key and a deploy (§10). The branch also cannot be merged until PR #4 (Phase 3) lands, because Phase 4 extends the guardrail (§9). |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 21 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6,
and verified every result independently before it was called done. The branch
is unpushed at the time of writing, and this document says so plainly rather
than implying it.

---

## 1. Overview — what this phase is and why it exists

Phases 0–3 built two modules and a voice that explains them. Module 1
knows the user's cash flow; Module 2 knows their portfolio; the LLM
layer explains each. But no feature answers the question that connects
the two: **is this user ready to invest?** A healthy portfolio means
little if a single emergency would force its sale, and a healthy cash
flow means little if the portfolio is one volatile stock. Readiness is
the cross-module question, and it is the synopsis's Objective 5 — the
only objective that cannot be answered from either module alone.

Phase 4 answers it with a **deterministic score**: five factors, three
from the cash-flow side and two from the portfolio side, weighted and
summed by code into a 0–100 score with published bands (Not ready /
Building / Ready). The score is computed, never generated. What the
model does is explain: a reasoning model walks through why the score
is what it is, factor by factor, citing each factor's measured number —
and that explanation passes through the Phase 3 guardrail, so a wrong
number is caught, corrected, or replaced by a template built from the
verified score. The dashboard shows the score, the factor breakdown,
and what would move it most — the improvements computed by code too,
ranked by the points they would gain.

The phase maps to synopsis Objective 5 (cross-module Investment
Readiness) and to the LLM Integration Strategy's §3.2 (Investment
Readiness Score + AI Portfolio Health Score): deterministic sub-scores,
with the model writing the personalised explanation. It is also the
phase the plan explicitly sequences after Phase 3: Readiness
explanations go through the guardrail, so the guardrail had to exist
and be proven first — which is why this branch is stacked on the
Phase 3 branch rather than on `main` (§9).

In one sentence: **Phase 4 computes a 0–100 readiness score from the
user's own cash flow and portfolio with a documented, auditable
formula, explains it with a reasoning model through the guardrail, and
shows the user exactly what would move it — with missing data reported
as unmeasured, never invented.**

### What existed before this phase

| Area                                    | State at the start of Phase 4 (21 Nov, ~20:12 IST)                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Module 1 + Phase 0 (deterministic core) | Done, CI green, live — profile, transactions, holdings, price history, indicators                                              |
| Phase 1 (LLM foundation)                | Done, CI green, live — 7 tools, structured output, chat + explain-stock, fallback                                              |
| Phase 2 (RAG)                           | Done, CI green, live — 9 tools, screener, news & sentiment, explain-news                                                       |
| Phase 3 (Guardrails)                    | Built, in PR #4 (`vivek/phase-3-guardrails`, `38be5dd`) — awaiting Sarthak's review; **not on `main`**                         |
| Readiness score                         | 0% — no formula, no endpoint, no UI. The sample UI (`Vivek_frontend/`) had a concept-preview Readiness page, but no real score |
| Cross-module features                   | None — no feature had ever combined Module 1 and Module 2 data                                                                 |
| Dashboard                               | Chat card present; no readiness card                                                                                           |

---

## 2. Objectives and acceptance criteria

The objectives below are from the approved plan (Phase 4 section). One
model detail differs from the plan's wording — the reasoning model is
the configured `deepseek-r1-0528`, not the DeepSeek-R1-Distill the plan
names — and is recorded as a decision in §6.9 (the same substitution
decided in Phase 1, when the Distill IDs were found not to exist on
OpenRouter).

| #   | Objective (from the plan)                                                                                                                                                       | Met?        | Evidence                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Deterministic score — a documented, auditable formula from both modules (emergency-fund months, debt-to-income, monthly surplus, portfolio concentration, portfolio volatility) | **Yes**     | `readiness.formula.ts`: 5 factors, weights 25/20/25/15/15, the formula table in §4.1                                      |
| 2   | Score bands (Not ready / Building / Ready) with published thresholds                                                                                                            | **Yes**     | 0–39 / 40–69 / 70–100, `READINESS_BANDS`, boundary-tested (§4.1, §7.1)                                                    |
| 3   | LLM explanation — reasoning model explains _why_ the score is what it is, with per-factor evidence citations, through the Phase 3 guardrail                                     | **Yes**     | `explainReadiness` + `READINESS_EXPLANATION_INTRO` + `guardedAnswer`, feature `explain-readiness` (§4.5, §4.6)            |
| 4   | UI — Readiness card on the dashboard: score, band, factor breakdown (each factor with its number + source), the explanation, and what would move the score                      | **Yes**     | `ReadinessCard` (§4.7)                                                                                                    |
| 5   | Acceptance: the score is reproducible from the same inputs (same data → same score, always)                                                                                     | **Yes**     | Reproducibility test (§7.1)                                                                                               |
| 6   | Acceptance: the explanation cites every factor it mentions                                                                                                                      | **Yes**     | Prompt requires citation per factor; the guardrail enforces it — an uncited factor number fails verification (§4.5, §4.6) |
| 7   | Acceptance: guardrail passes on all scripted scenarios                                                                                                                          | **Yes**     | Clean explanation verified; corrupted score corrected on retry; double corruption → template (§7.1)                       |
| 8   | Acceptance: CI green                                                                                                                                                            | **Not yet** | Branch unpushed; no CI run exists (§7.3)                                                                                  |
| 9   | Acceptance: live-verified                                                                                                                                                       | **Not yet** | No deploy, no OpenRouter key (§7.4, §10)                                                                                  |

---

## 3. Architecture — how Phase 4 fits the system

### 3.1 Where the code lives

```
FinVerse-AI/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── readiness/                          NEW module
│   │       │   ├── readiness.formula.ts            NEW — pure formula
│   │       │   │                                   (605 lines) + types
│   │       │   ├── readiness.formula.spec.ts       NEW — 24 tests
│   │       │   ├── readiness.service.ts            NEW — gathers inputs,
│   │       │   │                                   scores them
│   │       │   ├── readiness.service.spec.ts       NEW — 7 tests
│   │       │   ├── readiness.controller.ts         NEW — GET /api/readiness
│   │       │   ├── readiness.http.spec.ts          NEW — 3 tests
│   │       │   └── readiness.module.ts             NEW — imports Market +
│   │       │                                       Profile; exports service
│   │       ├── ai/                                 (Phase 1/2/3 module,
│   │       │                                       extended)
│   │       │   ├── ai.service.ts                   + explainReadiness +
│   │       │   │                                   model/fallback helpers
│   │       │   ├── ai.readiness.spec.ts            NEW — 7 flow tests (real
│   │       │   │                                   guardrail, scripted model)
│   │       │   ├── ai.tools.ts                     + getReadinessScore tool
│   │       │   ├── ai.tools.spec.ts                +2 tests
│   │       │   ├── ai.controller.ts                + POST /api/ai/
│   │       │   │                                   explain-readiness
│   │       │   ├── ai.http.spec.ts                 +4 tests
│   │       │   ├── ai.prompts.ts                   + READINESS_EXPLANATION_
│   │       │   │                                   INTRO
│   │       │   ├── ai.validation.ts                + ExplainReadinessRequest-
│   │       │   │                                   Schema
│   │       │   ├── ai.guardrail.ts                 + 'explain-readiness'
│   │       │   │                                   feature; getReadinessScore
│   │       │   │                                   in CITATION_TOOLS (10)
│   │       │   ├── ai.guardrail-templates.ts       + readinessTemplate
│   │       │   ├── ai.guardrail-templates.spec.ts  +5 tests (incl. 2
│   │       │   │                                   invariant tests)
│   │       │   └── ai.module.ts                    + imports ReadinessModule
│   │       ├── app.module.ts                       + ReadinessModule
│   │       └── test/app.e2e-spec.ts                +1 test (readiness 401)
│   └── web/
│       ├── app/(module-one)/dashboard/
│       │   ├── readiness-card.tsx                  NEW — the card (339 lines)
│       │   ├── dashboard.tsx                       + <ReadinessCard />
│       │   └── ai-chat.tsx                         3 helpers now exported
│       │                                           (shared by the card)
│       ├── app/api/readiness/route.ts              NEW — GET forwarder
│       ├── app/api/ai/explain-readiness/route.ts   NEW — POST forwarder
│       │                                           (120s timeout)
│       ├── lib/readiness.ts                        NEW — types + validators
│       ├── lib/ai.ts                               + "Readiness score" label
│       └── test/readiness.test.mjs                 NEW — 5 tests
```

Two things about this tree are worth noting. First, the readiness
module is **new but thin**: it owns the formula, the input gathering
and one endpoint, and nothing else. It reads the profile and the
portfolio through the existing services, and adds no table, no
migration and no new dependency. Second, the AI side is **one more
path through existing machinery**: the fifth guardrail feature, the
fifth template builder, the tenth tool. Phase 4 adds no new AI
infrastructure; it uses the tool loop, the guardrail, the retry and
the fallback that Phases 1–3 already built.

### 3.2 The two flows, end to end

**The score (no model involved):** the card loads → `GET
/api/readiness` (SessionGuard) → `ReadinessService.assess(userId)`
reads the profile, the portfolio summary and 3 months of history per
holding in parallel (a failed history excludes that holding, never the
assessment) → `scoreReadiness(inputs)` → an assessment (score, band,
5 factors, top-3 suggestions) or the honest unavailable shape when
there is no profile.

**The explanation (reasoning model, guardrailed):** "Explain my score"
→ `POST /api/ai/explain-readiness` (120s) → validate, cache check,
rate limit, then the `getReadinessScore` tool runs the _same_
assessment → unavailable means an honest refusal with no model call;
no API key means the raw-score fallback; otherwise one reasoning-model
call (no tool loop — the assessment is already the complete evidence)
through `guardedAnswer` (feature `explain-readiness`, context = the
assessment) → a corrupted answer gets one correction-prompt retry,
then the `readinessTemplate` → the card shows the answer with the
"✓ Verified" badge (or the template note), evidence citations,
disclaimer and model id.

The two flows share one fact that matters: **the explanation is
checked against the same assessment the score came from.** The tool
runs the assessment fresh for the explanation request, and the
guardrail context holds that assessment — so the model is judged
against the numbers it was shown, the same principle Phase 3
established. There is no path in which the card shows one score and
the explanation describes another.

---

## 4. What was built — module by module

### 4.1 The formula (`readiness.formula.ts`, 605 lines)

The formula is pure: `scoreReadiness(inputs)` takes a plain object
and returns an assessment or an honest unavailable shape. No I/O, no
database, no model, no clock. Same inputs → same score, always —
pinned by the reproducibility test (§7.1).

**The five factors.** The weights sum to 100. Cash-flow factors carry
70 of the 100 points and portfolio factors 30 — readiness to _start_
investing is a cash-flow question first (§6.1).

| Factor                  | Weight | Measurement                               | Full marks at           | Zero at                 |
| ----------------------- | ------ | ----------------------------------------- | ----------------------- | ----------------------- |
| Emergency fund          | 25     | Profile emergency-fund band, as months    | 6+ months               | 0 months                |
| Debt-to-income          | 20     | Total debt ÷ annual income                | No debt (ratio 0)       | Debt ≥ 1 year of income |
| Monthly surplus         | 25     | (Income − expenses) ÷ income              | Surplus ≥ 30% of income | No surplus (rate ≤ 0)   |
| Portfolio concentration | 15     | Largest holding's weight by current value | Largest holding ≤ 20%   | Single holding (100%)   |
| Portfolio volatility    | 15     | Value-weighted avg annualised volatility  | Volatility ≤ 15%        | Volatility ≥ 60%        |

Each factor scores **linearly** between its full-marks and zero
points. The emergency fund uses the profile's band, converted to
months at the band midpoint — the profile stores a band, not a number,
so the formula documents the conversion (`'0'` → 0, `'1-3'` → 2,
`'3-6'` → 4.5, `'6+'` → 6) rather than hiding it. Every threshold is
a named, exported constant (`EMERGENCY_FULL_MONTHS`,
`DEBT_TO_INCOME_ZERO`, `SURPLUS_FULL_RATE`,
`CONCENTRATION_FULL_WEIGHT`, `VOLATILITY_FULL`, `VOLATILITY_ZERO`),
so the published formula can be read off the code and a threshold
change is a code-review decision, not a silent edit.

**Rounding that reconciles.** Factor points are rounded to 1 decimal;
the total is computed from the _rounded_ points and rounded to a whole
number. The displayed numbers therefore add up exactly: in the worked
example below, 18.8 + 16 + 16.7 + 9.4 + 10 = 70.9 → 71. A user who
adds the factors up gets the score they see.

**Bands (published thresholds, inclusive upper bounds):**

| Score  | Band      | Meaning                                            |
| ------ | --------- | -------------------------------------------------- |
| 0–39   | Not ready | Fix the cash-flow foundations before investing.    |
| 40–69  | Building  | On the way; the suggestions say what moves it.     |
| 70–100 | Ready     | The foundations and the portfolio both look sound. |

**Volatility — a documented simplification.** Portfolio volatility is
the **value-weighted average** of the holdings' individual annualised
volatilities (daily log returns over 3 months, × √252). Correlations
between holdings are **not** modelled, so a diversified portfolio's
true volatility is somewhat lower than this figure — the number is a
conservative estimate, and the formula file states the limitation in
its header rather than hiding it. Holdings with fewer than 30 closes
are excluded, and `annualizedVolatility` returns `null` — never a
made-up number — for too-short history or non-positive closes.

**The worked example — a mid user scores 71.** The fixtures in the
formula spec, the template spec and the flow spec all use the same
mid user, so the number is pinned three times over: emergency fund
band `'3-6'`, income ₹50,000, expenses ₹40,000, debt ₹1,20,000, two
holdings of ₹50,000 each (RELIANCE.NS, TCS.NS), both at 30%
annualised volatility.

| Factor          | Measurement                                        | Points         |
| --------------- | -------------------------------------------------- | -------------- |
| Emergency fund  | 4.5 months (band midpoint) → 4.5/6 × 25            | 18.8 / 25      |
| Debt-to-income  | ₹1,20,000 ÷ ₹6,00,000 = 0.2 → 20 × (1 − 0.2)       | 16 / 20        |
| Monthly surplus | ₹10,000 ÷ ₹50,000 = 20% → 25 × (0.20 / 0.30)       | 16.7 / 25      |
| Concentration   | Largest holding 50% → 15 × (1 − 0.50) / (1 − 0.20) | 9.4 / 15       |
| Volatility      | 30% → 15 × (0.60 − 0.30) / (0.60 − 0.15)           | 10 / 15        |
| **Total**       | 70.9, rounded                                      | **71 — Ready** |

**Missing data — unavailable, never zero.** A factor whose inputs are
missing is reported **unavailable**, not scored zero: scoring "no
holdings" as maximally concentrated would invent a bad grade for
absent data. The total is rescaled over the available factors only
(score = earned ÷ available weight × 100), and the response reports
`maxScore` — the available weight — plus which factors are missing, so
the reader can see exactly what the score rests on. A user with no
holdings gets a cash-flow readiness score (out of 70, rescaled), and
the formula spec pins the case (all three cash-flow factors at full
marks → maxScore 70, score 100). A user with no financial profile at
all gets **no score**: the three cash-flow factors need the profile,
and a portfolio-only score would mislead (§6.3).

**Suggestions — computed, ranked, capped.** For each available factor
below full marks, the formula computes the concrete target that would
earn full marks and the points it would gain: build the fund to 6
months, clear the debt, raise the surplus to 30% of income, reduce the
largest holding below 20%, reduce volatility to 15% or below. They are
sorted by points gained and capped at the top 3, computed in code —
never by the model. For the mid user above, the gains are surplus 8.3,
emergency 6.2, concentration 5.6, volatility 5, debt 4 — so the card
shows the first three, in that order.

### 4.2 The service (`readiness.service.ts`, 102 lines)

`ReadinessService.assess(userId)` gathers the deterministic inputs and
scores them. It reads three existing services and adds no new data
source: the **profile** (`ProfileService.get` — income is
`monthly_income + other_monthly_income`, expenses are fixed +
variable, debt is `existing_debt_total` with missing treated as none,
the emergency band comes straight from `emergency_fund_months`); the
**portfolio** (`PortfolioService.portfolioSummary` — only **priced**
holdings count, since an unpriced holding has no current value); and
**history** (`MarketService.history(symbol, '3mo')` per holding, in
parallel). **No profile is the one hard requirement**: the service
returns the unavailable shape (`missing: ['financial profile']`)
before touching the portfolio, because the three cash-flow factors
need the profile and a portfolio-only score would mislead. A holding
whose history fails is excluded from the volatility factor instead of
failing the assessment, and staleness propagates — if the summary or
any history was stale, the assessment is marked `stale: true` and the
card says so. No model call happens anywhere in the service, and it is
owner-scoped by construction: every input is the requesting user's own
profile and portfolio.

### 4.3 The endpoint (`readiness.controller.ts`, `readiness.module.ts`)

`GET /api/readiness` is the phase's only new route. It is guarded by
the `SessionGuard` (unauthenticated requests get 401 — pinned by both
the HTTP spec and the e2e test) and sends `Cache-Control: private,
no-store`, like the other personal-data endpoints. It returns the
`ReadinessResult` directly: the assessment, or the honest unavailable
shape with `missing` listed. `ReadinessModule` imports `MarketModule`
and `ProfileModule`, provides `ReadinessService` and the
`SessionGuard`, and **exports** `ReadinessService` — the export is
what lets the AI module call the same assessment through the tool
(§4.4) without duplicating the gathering logic. The module is
registered in `AppModule` (for the endpoint) and imported by `AiModule`
(for the tool).

### 4.4 The tool (`getReadinessScore`)

The tenth callable tool. It takes no parameters — the score is always
the requesting user's own — and returns the full assessment (or the
unavailable shape) by calling `readiness.assess(userId)`. Its
description tells the model the facts it must respect: the score is
computed by code from the profile and the portfolio, never by the
model; quote it exactly as returned, never recompute it. The tool is
available in the chat tool loop, so a user asking "am I ready to
invest?" in the Ask FinVerse AI chat gets the computed score, and it
is the tool the explain-readiness path calls to fetch its evidence
(§4.5). A counting note, because the numbers are easy to get wrong:
after Phase 4, `AI_TOOL_DEFINITIONS` declares **9 tools** (the 7 from
Phase 1, plus `searchKnowledge` from Phase 2, plus
`getReadinessScore`), and `applyScreenerFilters` remains a separate
single definition used only by the screener flow — so the system has
**10 callable tools** in total. The guardrail's `CITATION_TOOLS`
likewise has 10 entries: the 9 definitions plus `screenStocks`, the
citation name the screen path reports.

### 4.5 The explanation (`explainReadiness` in `ai.service.ts`)

`POST /api/ai/explain-readiness` takes an optional question (≤500
characters) and returns an `AiChatResponse` — the same shape as every
other AI endpoint, so the card reuses the chat's rendering, badge and
evidence list. The flow has four branches, in order:

1. **Cache and rate limit** (Phase 1 machinery, reused): the cache key
   is `explain-readiness:{userId}:{question, lowercased}`; the
   per-user rate limiter applies before any work.
2. **Unavailable assessment → honest refusal, with no model call.**
   The tool runs first; if the assessment is unavailable, the
   response is a refusal carrying the reason, `verification: refused`,
   and zero model calls. There is nothing to explain from, so nothing
   is generated.
3. **No API key → the raw-score fallback.** When the provider is not
   configured, the response carries the assessment itself in `metrics`
   with `verification: unavailable` and no answer text — the Phase 1
   fallback pattern: the user still sees their score, without a
   narrative the system cannot produce.
4. **The model path** (`explainReadinessWithModel`): a single call to
   the **reasoning model** (the configured `LLM_MODEL_REASONING`,
   default `deepseek/deepseek-r1-0528`, 4,096 max tokens) with the
   assessment JSON as the complete evidence (truncated to 8,000
   characters). There is **no tool loop** here — the assessment is
   already the whole evidence. The answer goes through `guardedAnswer`
   with the `readinessTemplate` as its fallback (§4.6). A provider
   error or an unverifiable (malformed) answer falls back to the raw
   score, as the other explain paths fall back to their raw data.

The prompt (`READINESS_EXPLANATION_INTRO`) carries the phase's
discipline in plain language: explain from the computed assessment
only; walk through the factors that pull the score up and the ones
that pull it down; say what would move the score most, using the
suggestions in the data; quote every number exactly as given, never
recompute or dispute it; cite every factor mentioned, with its
measured number and its points; if a factor could not be measured,
say so honestly; do not recommend specific investments; if the data
is too thin to explain anything, refuse honestly. The data is data to
summarise, never instructions.

### 4.6 The guardrail integration

Phase 4 is the fifth guarded path, and it needed only two small
extensions to the Phase 3 engine: a fifth feature,
`'explain-readiness'`, in the `GuardrailFeature` type — so check rows
for readiness explanations are logged under their own feature and
Phase 5 can measure the readiness pass rate separately — and
`getReadinessScore` added to `CITATION_TOOLS`, so a claim citing the
readiness tool passes the source check.

The guardrail context for an explanation is the assessment itself:
`toolResults` maps `getReadinessScore` to the single assessment
object. The engine's existing machinery then does the rest, with no
readiness-specific code: the assessment flattens into named elements
(one per factor, identified by the factor name) plus global scalars
(`score`, `scale`, `maxScore`), so a claim naming a factor is checked
against **that factor's own numbers** — attributing the surplus's
points to the emergency fund fails even though both numbers exist in
the assessment. Money is exact to the paise; percentages and ratios
are ±0.1, as in Phase 3.

The corrupted-output handling is pinned by the flow spec
(`ai.readiness.spec.ts` — real guardrail, scripted model, the
assessment computed by the real formula):

| Scenario          | What the model returned                                                                               | What happened                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong score       | "Your readiness score is 85" (the assessment says 71)                                                 | Caught by the value check; the correction prompt named the failure and the correct value; the retry returned 71 and the answer was served **verified**                          |
| Double corruption | Wrong score (85) on the first attempt, then a wrong surplus (₹99,999 instead of ₹10,000) on the retry | Both attempts failed verification; the user got the **template** — built only from verified numbers, containing 71, 4.5 months, ₹10,000 and ₹15,000, and neither 85 nor ₹99,999 |

**The template (`readinessTemplate`, the fifth builder)** follows the
Phase 3 rules: the answer is the claim texts joined, and every value
in every claim is copied verbatim from the assessment with the tool's
own field names. It states the score (with the band, and a note when
`maxScore < scale`), one claim per factor — each scoped by the factor
name, so the guardrail checks it against that factor's numbers — and
one claim per suggestion, scoped to its factor by name (the
suggestion's action restates the factor's _current_ numbers as well as
its target, so the scoped element's fields cover the current numbers
while the target fields fall through to the global scalars). An
unavailable factor gets its own detail sentence instead of an invented
number. Two details show how tight the field-name discipline is:
percentages are stated with the stored 1-decimal value, because
restating 33.3% as 33% would fail the ±0.1 text check; and the factor
name is the first value in each claim so the guardrail scopes the
checks to that factor. The template is pinned by two invariant tests
that run its output back through `verifyAnswer` against the same
assessment and assert it passes — with all factors available, and
with factors unavailable.

### 4.7 The web UI — the Readiness card

`ReadinessCard` sits on the dashboard, directly above the Ask FinVerse
AI chat. It fetches `GET /api/readiness` on mount, validates the
response with `isReadinessResult` (a backend drift fails loudly
instead of rendering half a score), and renders one of four states:
loading; error, with a Retry button; unavailable, with the reason
plus what is missing; and the assessment — the score in large type
with its band pill and the band's plain-language line, a progress bar
toned by band (accent / warning / red), the factor breakdown (each
factor with its name, its points out of its max, its own progress bar,
and its one-line detail — unavailable factors read "Not measured"),
and "What would move the score" (the top-3 suggestions with their
points gain; "Every factor is at full marks — nothing to improve" when
there are none). When `maxScore < scale`, a note says exactly what the
score rests on ("Based on 70 of 100 points — … could not be
measured"); when the data was stale, a note says the prices behind the
score are slightly out of date.

**"Explain my score"** posts to `/api/ai/explain-readiness` and
renders the response with the chat's own components — which is why
`ai-chat.tsx` now exports `aiErrorMessage`, `VerificationNote` and
`ReasoningIndicator` instead of keeping them private. While the
reasoning model works, the reasoning indicator shows; on success the
answer appears with the same "✓ Verified against your data (N checks
passed)" badge as the chat (or the template note when the answer is a
template), the evidence citations with the "Readiness score" tool
label, and the disclaimer with the model id. The explanation is a
single-shot explain, not a conversation — there is no follow-up input
on the card, by design: the question the card answers is fixed ("why
is my score what it is?"), and follow-ups belong in the chat, where
the `getReadinessScore` tool is available.

Two thin forwarders complete the web side: `GET /api/readiness`
(default timeout — a database read) and `POST
/api/ai/explain-readiness` with a **120s** budget, matching the other
explain routes: the backend allows 30s per model call and the
guardrail can retry once, so the forwarder must not time out first.
`lib/readiness.ts` holds the shared types and validators (mirroring
the backend's assessment types), and `lib/ai.ts` gained the
"Readiness score" label for the new tool's citations.

---

## 5. Configuration

Phase 4 adds **no new environment variable, no new secret, and no
migration**. The formula needs no provider; the explanation reuses the
Phase 1 configuration (`OPENROUTER_API_KEY`, `LLM_MODEL_REASONING`,
the rate-limit and cache settings). The only configuration-like values
are the formula's thresholds, deliberately constants in code — they
define what the score _means_, so changing them belongs in code
review, not in a dashboard. The deployment story therefore does not
change at all: the same backend environment, the same key, the same
build command — and, unlike Phase 3, no migration to apply on any
platform.

| Value (all in `readiness.formula.ts`)                | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| `READINESS_WEIGHTS` (25/20/25/15/15)                 | The published factor weights                      |
| `READINESS_BANDS` (39/69/100)                        | The published band thresholds                     |
| `EMERGENCY_FULL_MONTHS = 6`, `EMERGENCY_BAND_MONTHS` | Full marks at 6+ months; band-to-months midpoints |
| `DEBT_TO_INCOME_ZERO = 1`                            | Zero points at debt ≥ 1 year of income            |
| `SURPLUS_FULL_RATE = 0.3`                            | Full marks at a 30% surplus rate                  |
| `CONCENTRATION_FULL_WEIGHT = 0.2`                    | Full marks at a largest holding ≤ 20%             |
| `VOLATILITY_FULL = 0.15`, `VOLATILITY_ZERO = 0.6`    | Full marks ≤ 15% vol; zero ≥ 60%                  |
| `MIN_HISTORY_CLOSES = 30`                            | Minimum closes for a meaningful volatility        |
| `TRADING_DAYS_PER_YEAR = 252`                        | Annualisation factor for daily volatility         |

---

## 6. Decisions taken

| #   | Decision                                                                                                | Options considered                                                     | Why this one                                                                                                                                       | Decided by                                      |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Five factors, weights **25/20/25/15/15** — cash flow 70, portfolio 30                                   | Equal weights (20 each); portfolio-heavy weights                       | Readiness to _start_ investing is a cash-flow question; a user with no holdings must still get a meaningful score (§6.1)                           | Implementation decision, per plan's factor list |
| 2   | Band midpoints for the emergency fund (`'1-3'` → 2, `'3-6'` → 4.5)                                      | The band's lower or upper bound                                        | The profile stores a band, not months; the midpoint is the honest single number for the band, and the conversion is documented                     | Implementation decision                         |
| 3   | Missing factor = **unavailable, never zero**; score rescaled over available weight; `maxScore` reported | Score missing as zero; refuse to score at all when anything is missing | Zero invents a bad grade for absent data; refusing entirely would deny a cash-flow score to a user with no holdings (§6.2)                         | Implementation decision, test-pinned            |
| 4   | **No profile → no score at all**                                                                        | A portfolio-only score                                                 | The three cash-flow factors need the profile; a portfolio-only score would mislead (§6.3)                                                          | Implementation decision                         |
| 5   | **Linear** scoring between full-marks and zero points                                                   | Step functions; curved scoring                                         | Linear is the simplest shape a user can audit: half the target is half the points                                                                  | Implementation decision                         |
| 6   | Volatility = **value-weighted average**, correlations not modelled (documented)                         | Full covariance (Markowitz) volatility                                 | The formula is a _score_, not a risk model: the average is explainable in one sentence, and the simplification is stated, not hidden (§6.4)        | Implementation decision                         |
| 7   | **≥30 closes** for a holding's volatility; failed history excludes that holding only                    | Fewer closes; fail the whole assessment on a history error             | 30 closes is the minimum for a meaningful standard deviation; per-holding degradation keeps one provider failure from taking down the score        | Implementation decision                         |
| 8   | Factor points rounded to **1 decimal**; total from the rounded points                                   | Round only the total; keep full precision internally                   | The displayed numbers must reconcile exactly when the user adds them up (§4.1)                                                                     | Implementation decision                         |
| 9   | Explanation uses the **reasoning model** (`deepseek/deepseek-r1-0528` via config)                       | The primary model; the plan's DeepSeek-R1-Distill                      | The explanation is reasoning over evidence, which is what the reasoning model is for; the Distill IDs do not exist on OpenRouter (Phase 1 finding) | Per plan's intent; model per Phase 1 decision   |
| 10  | Unavailable assessment → **refusal with no model call**                                                 | Call the model and let it refuse                                       | There is nothing to explain from; a model call can only invent (§4.5)                                                                              | Implementation decision                         |
| 11  | No key / provider failure → **raw-score fallback**, not the template                                    | The template for all failures                                          | The template is the guardrail's double-failure floor; a missing narrative is a different fault with a different fallback (Phase 1 pattern)         | Implementation decision                         |
| 12  | Suggestions computed **deterministically in code**, top 3 by points gained                              | Let the model suggest improvements                                     | The model must not invent targets; the code knows exactly what each improvement is worth (§4.1)                                                    | Implementation decision                         |
| 13  | Explanation is **single-shot** (no tool loop, no follow-ups on the card)                                | A conversational readiness chat                                        | The assessment is the complete evidence; follow-ups belong in the chat, where the tool is available (§4.7)                                         | Implementation decision                         |
| 14  | Thresholds are **constants in code**, not environment variables                                         | Configurable thresholds via env vars                                   | They define what the score means; changing them belongs in code review (§5)                                                                        | Implementation decision                         |

### 6.1 Why these factors, and why these weights

The plan names the five factors; the weights are this phase's
judgement, and the judgement is that readiness is a cash-flow question
first. The emergency fund (25) and the monthly surplus (25) are the
two largest weights because they answer the two halves of "can I
invest without endangering myself?": the fund absorbs a shock without
forcing a sale, and the surplus is the money that actually funds the
investing. Debt-to-income (20) is close behind because servicing debt
competes directly with investing. The two portfolio factors (15 each)
measure the risk of what the user already holds: concentration asks
whether one stock dominates, volatility asks how violently the
holdings move. They are smaller because they describe the portfolio
the user has, while the cash-flow factors describe whether the user
can afford to hold one at all. The 70/30 split also has a practical
consequence: a user with no holdings still gets a score out of 70,
rescaled — and that user is exactly the one most likely to ask whether
they are ready to start.

### 6.2 Missing data is unavailable, never zero

The alternative to rescaling is seductive: score a missing factor as
zero, and the arithmetic stays simple. It is also wrong. A user with
no holdings is not maximally concentrated — they have no concentration
at all — and scoring them 0/15 for it would punish the absence of a
portfolio in a score that judges readiness to _build_ one. The
rescaling rule keeps the score honest: it is always a score _of what
could be measured_, and `maxScore` tells the reader how much that was.
The card shows the gap plainly ("Based on 70 of 100 points"), so a
rescaled 100 never pretends to be a full 100.

### 6.3 No profile, no score

The rescaling rule has a limit, and the limit is the profile. The
three cash-flow factors all need it, and without it the only
measurable factors would be the two portfolio ones. A portfolio-only
score would be 30 points rescaled to 100: a user with a diversified,
low-volatility portfolio and no emergency fund would score highly on
exactly the evidence that should worry them. So the service refuses
to score at all without a profile, and says what is missing. The
unavailable shape is not a failure mode; it is the honest answer to
"how ready am I?" when the system does not yet know enough to answer.

### 6.4 The volatility simplification, stated rather than hidden

The portfolio already has a Markowitz optimiser (Phase 0) that
computes covariance — so the full portfolio volatility _could_ have
been computed. It was not, deliberately. A covariance-based volatility
is a risk-model number: it depends on a correlation matrix the user
cannot see, and its movement is hard to explain in a factor breakdown.
The value-weighted average is explainable in one sentence, and its
bias is known and stated: it overstates the volatility of a
diversified portfolio, because it ignores the diversification benefit.
A score that is slightly pessimistic and fully explainable beats one
that is slightly more accurate and opaque — and the formula file's
header documents the limitation so a future phase can revisit it with
the trade-off visible.

---

## 7. Verification

Verification was re-run independently by me after the build — not taken
from the builder's report — following the standing rule earned in Phase
2: the full root suite, including e2e, before any branch is called done.

### 7.1 Tests

| Suite                                 | Result                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| Backend Jest (`apps/backend`)         | **565 / 565 passed** (513 existing + 52 new, 41 suites) |
| Web tests (`apps/web`, `node --test`) | **68 / 68 passed** (63 existing + 5 new)                |
| End-to-end (`test:e2e`)               | **4 / 4 passed** (3 existing + 1 new)                   |

The 52 new backend tests break down as follows (counts measured from
the spec files at `fd5bcb8`; the formula spec's band tests are one
`it.each` with six cases):

| Spec file                             | Tests  | What it pins down                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readiness.formula.spec.ts`           | 24     | Volatility (5: flat → 0, steady growth → ~0, hand-computed alternating series 1.5323, <30 closes → null, non-positive close → null); bands (6 boundary cases via `it.each`); scoreReadiness (13: reproducibility, healthy 99, perfect 100, struggling 0, mid 71 with auditable factors, no-holdings rescaling, zero income, nothing measurable, missing debt, debt cap, negative surplus, suggestion ranking, value-weighted volatility) |
| `readiness.service.spec.ts`           | 7      | Healthy assessment from profile + portfolio + history; unavailable without a profile; unpriced holdings excluded; a failed history excludes only that holding; volatility unavailable with no history; stale propagation; other income and debt                                                                                                                                                                                          |
| `readiness.http.spec.ts`              | 3      | 401 without a session (profile never called); 200 with the assessment for a profile with no holdings (score 100, maxScore 70); the honest unavailable shape without a profile                                                                                                                                                                                                                                                            |
| `ai.readiness.spec.ts`                | 7      | Verified explanation from the reasoning model (real guardrail, checks logged under `explain-readiness`); caching; corrupted score corrected on retry; double corruption → template; honest refusal with no model call; raw-score fallback with no API key; over-long question rejected                                                                                                                                                   |
| `ai.guardrail-templates.spec.ts` (+5) | 5      | The template states the score, every factor and the suggestions; unavailable factors named without invention; no assessment → the honest sentence; **two invariant tests** (template output passes `verifyAnswer`, with all factors and with factors unavailable)                                                                                                                                                                        |
| `ai.http.spec.ts` (+4)                | 4      | Explain-readiness at the HTTP layer: verified explanation, honest refusal, raw-score fallback, over-long question rejected                                                                                                                                                                                                                                                                                                               |
| `ai.tools.spec.ts` (+2)               | 2      | The definitions now declare nine tools including `getReadinessScore`; the tool returns the assessment (and passes the unavailable shape through unchanged)                                                                                                                                                                                                                                                                               |
| **Total new (backend)**               | **52** |                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `readiness.test.mjs` (+5, web)        | 5      | The validators accept a complete assessment and the unavailable shape; reject missing/mistyped fields and malformed unavailable shapes; and the fixture's factors reconcile with its score (earned ÷ maxScore × 100 = 71)                                                                                                                                                                                                                |

**The edge cases, and what they prove.** The formula spec is the
phase's real verification, because the formula is the phase's real
claim. Four fixtures anchor it: a healthy user scores **99** (6+
months fund, ₹60,000 income against ₹40,000 expenses, no debt, four
equal holdings at 15% volatility — the single deduction is
concentration, 14.1/15, because the largest holding is 25%); a perfect
user scores **100** with no suggestions (five equal holdings, 10%
volatility, 30% surplus rate); a struggling user scores **0** (no
emergency fund, expenses above income, debt equal to a year's income,
a single holding at 60% volatility — every factor at zero); and the
mid user scores **71**, with every factor's points asserted
individually (§4.1). The degenerate inputs are covered too: zero
income never divides by zero (only the emergency factor is measurable
→ maxScore 25, score 33); a negative surplus scores zero, never
negative, while the negative amount is still recorded; debt above a
year's income caps at zero points; and when nothing at all can be
measured, the result is unavailable with all five factors listed as
missing.

**The corrupted-output handling** (§4.6) is the guardrail acceptance
criterion for this phase: a wrong score is caught and corrected on
retry, and a doubly corrupted answer is replaced by the template —
the user never sees an unverified claim about their own score. As in
Phases 1–3, all tests use mocked providers and a mocked
`PrismaService` — no test calls a real model, no test writes to a real
database, and no test contains an API key.

### 7.2 Static checks and builds

| Check                                   | Result                              |
| --------------------------------------- | ----------------------------------- |
| Backend type-check (`tsc --noEmit`)     | Clean                               |
| Backend lint (`oxlint`)                 | **0 warnings, 0 errors** (97 files) |
| Prettier (`format:check`)               | Clean                               |
| Web type-check (`check-types`)          | Clean                               |
| Web lint (ESLint, `--max-warnings 0`)   | Clean (0 warnings)                  |
| NestJS production build (`nest build`)  | OK                                  |
| Next.js production build (`next build`) | OK                                  |

### 7.3 CI — not run yet

There is no CI run for this phase. CI runs on pushes to `main` and on
pull requests, and this branch is unpushed with no PR open. The local
verification above is the same gate CI runs, so the branch is expected
to pass — but "expected to pass" is not "passed", and this document
does not claim otherwise.

### 7.4 Live verification — pending

Nothing in this phase has been verified live. The score has never been
computed for a real user in production (no deploy), no readiness
explanation has come back from a real model call (no OpenRouter key),
no check row has been written to `guardrail_checks` under the
`explain-readiness` feature, and the card has never been seen in a
live browser session. What the tests prove is that the formula scores
the fixtures correctly, the service degrades gracefully, and the
guardrail catches the scripted corruptions; what they cannot prove is
how the formula behaves on real profiles, whether the reasoning model
actually cites every factor it mentions, or what the real guardrail
pass rate for explanations looks like. Those are the smoke test in §10.

---

## 8. Problems faced and fixes

Two defects were caught by the test suite during the build and fixed
before the commits landed — which is why neither has a fix commit of
its own in the appendix. Both are worth recording, because both are
the kind of defect that would have been invisible without the tests
that caught them.

**1. A controller naming collision.** While wiring the new endpoint,
the test suite failed on a collision involving the new controller's
registration. The failure surfaced in the HTTP and e2e tests rather
than at compile time — the class compiled cleanly, and only the
running NestJS application exposed the duplicate. It was fixed during
the build, before `e8d77a2` was committed, and the endpoint's three
HTTP tests and the e2e 401 test now pass against the final
registration. The lesson is the Phase 2 lesson again: the wiring is
only proven by running the app, which is why the e2e test exists for
every new endpoint.

**2. Template field-name mismatches.** The first version of
`readinessTemplate` failed its own invariant tests: the claim values
it built used field names that did not match the assessment's fields,
so the guardrail — which matches values by field name (§4.6) — could
not verify the template's own output. The numbers were right, but
under the wrong keys. The fix was to align every value key in the
template to the factor's own field names (`months`,
`surplusRatePercent`, `largestHoldingWeightPercent`,
`volatilityPercent`, and the suggestion targets), with the factor name
as the first value so the guardrail scopes each claim to its factor.
The two invariant tests now pass, which is what makes the template
provably verifiable rather than probably verifiable. The incident is
also why the template code carries its precision comments as warnings
to the next person who edits it.

One more detail qualifies the record honestly. The final commit
(`fd5bcb8`, ~20:28 IST) is a style commit: it fixed oxlint
`no-new-array` warnings and prettier formatting across 9 files (+71 /
−81 lines). That is normal finishing work, not a defect — both were
caught by the local gate before the branch was called done, which is
what the gate is for.

---

## 9. Deployment

| Event                    | Time (IST)  | Detail                                                                                              |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| Phase 4 built            | 20:12–20:28 | 5 commits, branch `vivek/phase-4-readiness`, head `fd5bcb8`                                         |
| Phase 4 locally verified | ~20:40      | Backend 565/565, e2e 4/4, web 68/68, static checks + builds clean (§7)                              |
| **Push**                 | **Pending** | Branch unpushed at the time of writing — and it cannot go up as a PR against `main` yet (see below) |
| PR                       | Not opened  | Blocked on PR #4 (Phase 3) merging first                                                            |
| CI                       | Not run     | No run exists until a PR is opened (§7.3)                                                           |
| Live verification        | Not done    | No deploy, no OpenRouter key (§7.4, §10)                                                            |

**The stacked branch (the deployment fact that matters most).** This
branch was cut from `vivek/phase-3-guardrails` at `38be5dd`, not from
`main`, because Phase 4 extends code that only exists on the Phase 3
branch: the guardrail engine (`guardedAnswer`, the template registry,
the `GuardrailFeature` type), which Phase 4's explanation path calls
directly. The guardrail is **not on `origin/main`** (`003c1a3`) — it
is in PR #4, awaiting Sarthak's review. A Phase 4 PR opened against
`main` today would therefore carry the Phase 3 commits with it. The
correct sequence, under the team's branches-and-PRs rule, is: PR #4
merges first; then this branch is **rebased onto the new `main`** (the
rebase should be clean — the two branches share `38be5dd` as their
base — but it must be verified with the full suite on the rebased
tree before the PR opens); then the Phase 4 PR opens against `main`
with only its own 5 commits.

**No migration, no deployment work.** Unlike Phase 3, this phase has
no migration to apply on any platform and no new environment variable
to set. When the PR merges and a deploy runs, the only new behaviour
is the endpoint, the tool and the card — all of which work without any
dashboard step. The one deployment caveat is inherited, not new: the
backend's move to Netlify Functions (§9 of the Phase 3 document) is
still the team's open decision, and the in-memory rate limiter and
query cache (§4.5) weaken further on serverless — a cold start resets
both. That is a Phase 1 design limitation Phase 4 inherits, not one
Phase 4 introduces.

Live services (Render free tier, as of writing): the backend
(`finverse-ai-r050.onrender.com`) still serves the Phase 2 code
(`ce9edaa`); the readiness endpoint is not deployed. The web service
still serves the backend instead of the website (the dashboard fault
from 19 November), so the card cannot be reached in production until
the web deployment question is settled (§10).

---

## 10. What is still open or unverified

1. **The branch, and the stack.** `vivek/phase-4-readiness` is built
   and verified locally but unpushed, with no PR. It cannot become a
   PR against `main` until PR #4 (Phase 3) merges, and then it needs a
   rebase onto the new `main` with the full suite re-run on the
   rebased tree (§9). Until then there is no CI run and no deploy.
2. **CI has not run on this phase.** The local gate is the same suite
   CI runs, and it passed — but CI is the project's record, and it
   does not exist yet for `fd5bcb8`.
3. **No real model explanation has been verified.** The flow tests
   prove the guardrail catches scripted corruptions, but whether the
   reasoning model actually cites every factor it mentions, how often
   it trips the guardrail, and whether the correction prompt fixes it
   are entirely unmeasured. The live smoke test needs the OpenRouter
   API key in the backend environment (Sarthak Thapliyal was to
   provide it by the evening of 19 November; as of writing I do not
   have confirmation that it has been provided) plus a logged-in user,
   and must check: an explanation showing "✓ Verified against your
   data" on the card, a wrong model number being corrected by the
   retry, a double failure producing the template answer with its
   note, and check rows appearing in `guardrail_checks` under the
   `explain-readiness` feature.
4. **The formula has never run on real user data.** The fixtures cover
   the shape of the inputs, but real profiles are messier: unusual
   emergency bands, partial portfolios, holdings with thin history,
   stale prices. The smoke test should include a real profile with
   holdings and one without, and confirm the rescaling and stale notes
   render as designed.
5. **The card has never been seen in a live browser session.**
   Build-, type- and lint-verified, but no one has opened the
   dashboard logged in and watched the score, the factor bars, the
   suggestions and the explanation render. Part of the smoke test —
   and blocked on the web deployment question below.
6. **Where the web app runs is still undecided.** The Render web
   service still serves the backend instead of the website (the
   dashboard fault from 19 November), and the backend's move to
   Netlify Functions leaves the Next.js app's home unconfirmed. Until
   the team settles it, the card cannot be reached in production.
7. **The `BETTER_AUTH_URL` localhost misconfiguration** (parked at my
   request) will break session verification and login in production,
   and it blocks real-user testing — the smoke test needs a logged-in
   user. If the backend moves to Netlify, the variable needs setting
   there too.
8. **The volatility simplification is unmeasured.** The value-weighted
   average overstates a diversified portfolio's true volatility by an
   unknown amount (§6.4). Phase 5 could measure the gap against the
   Markowitz covariance figure for the same portfolios; until then,
   the simplification is documented but its size is unknown.
9. **The correction prompt's real-world effectiveness is unknown.**
   The retry is tested with a mocked provider that returns a corrected
   answer on demand. Whether a real reasoning model actually fixes its
   claims when told the correct values is an empirical question the
   smoke test and Phase 5 will answer.

---

## 11. Lessons learned

1. **A score the user cannot audit is a verdict, not a feature.**
   Every choice in the formula — linear scoring, rounded points that
   reconcile, the published thresholds, the rescaling note — exists so
   that a user who adds the factors up gets the score they see, and a
   user who disagrees can point at the factor they disagree with.
2. **Missing data is a state, not a value.** The unavailable-not-zero
   rule (§6.2) generalises beyond this phase: any feature that scores
   or summarises partial data should report what it could not measure
   alongside what it did. Zero is a measurement; absence is not, and
   confusing the two manufactures conclusions the data never
   supported.
3. **Build the fallback's test before the fallback.** The template
   field-name incident (§8) was caught by the invariant tests because
   the invariant test is the fallback's definition of done: generate
   the fallback, verify it, assert it passes. Any future fallback in
   this project should carry the same kind of test from its first
   commit, not as an afterthought.
4. **A stacked branch is a dependency made visible.** Cutting Phase 4
   from the Phase 3 branch instead of from `main` was the honest
   shape of the dependency: the code needs the guardrail, the
   guardrail is not on `main`, so the branch says so in its ancestry.
   The rebase after PR #4 merges is the cost, and it is a small one —
   far smaller than building Phase 4 against a guardrail that did not
   exist yet, or duplicating one.
5. **Reuse is a verification strategy, not just a code strategy.**
   Phase 4 added no new AI infrastructure, and every reused piece
   came with its own tests already passing. The 52 new tests are
   almost all about the new formula and the new wiring; the guardrail,
   the retry and the fallback were proven in Phase 3 and merely
   exercised here.
6. **The explanation is a second product, not a label on the first.**
   The score and the explanation have different failure modes (wrong
   arithmetic vs. wrong words), different verifications (fixtures vs.
   corrupted outputs) and different fallbacks (the unavailable shape
   vs. the template). Keeping them separate — the service never calls
   the model, the explanation never computes — is what makes each one
   testable on its own.

---

## 12. Appendix

### 12.1 Commit table

Times are IST, converted from the commit timestamps in the repository.
Files and lines are the per-commit diff.

| Time      | Hash      | Message                                                                 | Change                    |
| --------- | --------- | ----------------------------------------------------------------------- | ------------------------- |
| 20:12     | `5547f16` | feat(phase-4): deterministic readiness score formula (pure)             | 2 files, +921             |
| 20:15     | `e8d77a2` | feat(phase-4): readiness service, GET /api/readiness endpoint, e2e test | 7 files, +488             |
| 20:21     | `0d65767` | feat(phase-4): readiness explanation through the guardrail              | 12 files, +982 / −4       |
| 20:24     | `8b8388a` | feat(phase-4): readiness card on the dashboard + API forwarders         | 8 files, +669 / −3        |
| 20:28     | `fd5bcb8` | style(phase-4): fix oxlint no-new-array warnings, prettier formatting   | 9 files, +71 / −81        |
| **Total** |           | **5 commits**                                                           | **29 files, +3,050 / −7** |

The range total (29 files, +3,050 / −7) is the diff total for
`38be5dd..fd5bcb8` and is exact; it differs from the sum of the
per-commit rows because later commits touch files created by earlier
ones (most visibly the style commit `fd5bcb8`). The branch was cut
from `vivek/phase-3-guardrails` at `38be5dd` and is unpushed at the
time of writing.

### 12.2 Full file list (`38be5dd..fd5bcb8`)

**Backend** (`apps/backend/`):

- `src/app.module.ts` (+ ReadinessModule)
- `src/ai/ai.controller.ts` (+ `POST /api/ai/explain-readiness`)
- `src/ai/ai.guardrail-templates.spec.ts` (+5 tests)
- `src/ai/ai.guardrail-templates.ts` (+ `readinessTemplate`)
- `src/ai/ai.guardrail.ts` (+ `'explain-readiness'` feature, `getReadinessScore` in `CITATION_TOOLS`)
- `src/ai/ai.http.spec.ts` (+4 tests)
- `src/ai/ai.module.ts` (+ ReadinessModule import)
- `src/ai/ai.prompts.ts` (+ `READINESS_EXPLANATION_INTRO`)
- `src/ai/ai.readiness.spec.ts` (7 tests)
- `src/ai/ai.service.ts` (+ `explainReadiness`, `explainReadinessWithModel`, `readinessFallback`)
- `src/ai/ai.tools.spec.ts` (+2 tests)
- `src/ai/ai.tools.ts` (+ `getReadinessScore` tool)
- `src/ai/ai.validation.ts` (+ `ExplainReadinessRequestSchema`)
- `src/readiness/readiness.controller.ts` (`GET /api/readiness`)
- `src/readiness/readiness.formula.spec.ts` (24 tests)
- `src/readiness/readiness.formula.ts`
- `src/readiness/readiness.http.spec.ts` (3 tests)
- `src/readiness/readiness.module.ts`
- `src/readiness/readiness.service.spec.ts` (7 tests)
- `src/readiness/readiness.service.ts`
- `test/app.e2e-spec.ts` (+1 test)

**Web** (`apps/web/`):

- `app/(module-one)/dashboard/ai-chat.tsx` (`aiErrorMessage`, `VerificationNote`, `ReasoningIndicator` now exported)
- `app/(module-one)/dashboard/dashboard.tsx` (+ `<ReadinessCard />`)
- `app/(module-one)/dashboard/readiness-card.tsx`
- `app/api/ai/explain-readiness/route.ts` (POST forwarder, 120s)
- `app/api/readiness/route.ts` (GET forwarder)
- `lib/ai.ts` (+ "Readiness score" tool label)
- `lib/readiness.ts` (types + validators)
- `test/readiness.test.mjs` (5 tests)

### 12.3 Sources

- Git repository `github.com/FinverseAI/FinVerse-AI`, branch
  `vivek/phase-4-readiness` at `fd5bcb8` (this phase:
  `5547f16`..`fd5bcb8`); `origin/main` at `003c1a3` at the time of
  writing (§9); Phase 3 in PR #4.
- Approved plan: `llm-layer-guardrails-readiness-evaluation-plan.md`
  (Plan v1, approved 19 November 2026), Phase 4 section, and
  Section 3 sequencing (Phase 3 before Phase 4).
- LLM Integration Strategy document (`FinVerse_AI_LLM_Integration_
Strategy.docx`, my own research): §3.2 (Investment Readiness Score +
  AI Portfolio Health Score); the governing principle "the LLM
  reasons, the code calculates".
- Daily Report — 19 November 2026 (FinVerse AI project files).
- Synopsis: `Finverse_Ai_Final_Synopsys.pdf`, Objective 5.
