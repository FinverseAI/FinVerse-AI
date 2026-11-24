# FinVerse AI — System Architecture and Methodology

**B.Tech Major Project, Team CSE27-079 — report-submission write-up**

**Date:** 23 November 2026 · **Status:** Phases 0–6 complete; live LLM metrics pending the OpenRouter API key

**Companion documents:** `docs/finverse-project-guide.md` (Edition 1.2, the living project guide), `docs/evaluation-writeup.md` (evaluation results), `docs/vivek-bartwal-contributions/` (per-phase contribution records).

---

## Abstract

FinVerse AI is a unified financial-intelligence platform that combines a personal-finance dashboard (Module 1) with stock-market and investment intelligence (Module 2). Its central contribution is a **hybrid deterministic–LLM architecture**: every number the system shows is computed by ordinary, auditable code, while a reasoning-capable large language model (LLM) interprets the computed evidence and explains it in plain language. A **guardrail layer** re-checks every number in a model's answer against the deterministic evidence before the answer reaches the user, and an **evaluation harness** measures the system's factual grounding, self-consistency, explanation quality, latency and cost against a rule-written template baseline. The cross-module **Investment Readiness** score (0–100) demonstrates the integration of cash-flow and portfolio-risk data in a single deterministic formula. This document describes the architecture, the methodology behind each design decision, what was measured, and what remains unverified.

---

## 1. Introduction: the problem

Personal-finance applications and investment applications operate as isolated systems. A user who wants to know whether they can afford to invest must manually reconcile their cash-flow position (income, expenses, debt, savings) with their investment position (holdings, concentration, volatility) — two pictures that live in different products and are never combined. Meanwhile, the AI features that do exist in finance products are typically **black-box machine-learning predictions**: a trained model outputs a single number ("risk score: 62") with no built-in explanation of why it produced that number for this user. Any explanation must be bolted on afterwards with post-hoc attribution techniques (SHAP, LIME) that only approximate which inputs mattered.

FinVerse AI addresses both gaps:

1. **One system, two modules.** Personal finance and investment intelligence share one account, one database and one cross-module score.
2. **Reasoning, not prediction.** The LLM never computes a number. It reasons over deterministically computed evidence and explains it, with every claim cited and verified.

The synopsis (Expected Outcomes) requires: a working prototype of both modules; a functioning hybrid deterministic–LLM reasoning layer; a cross-module Investment Readiness feature; a guardrail validation mechanism; a quantitative and qualitative evaluation against a template baseline; and a documented architecture and methodology suitable for submission as a research contribution. This document is the last of those outcomes; the others are described in Sections 5–9 with their verification status.

---

## 2. Design principles

Five principles governed every phase of the build (Phases 0–6, 17–23 November 2026):

| # | Principle | What it means in practice |
| --- | --- | --- |
| 1 | **The LLM reasons, the code calculates** | All financial arithmetic — surplus, allocations, indicators, returns, scores — is deterministic code. The model interprets and explains; it never computes. |
| 2 | **No number reaches the user unverified** | The guardrail re-checks every numeric claim in a model answer against the evidence. A failed answer is retried once, then replaced by a rule-written template. |
| 3 | **Missing data is labelled, never invented** | Empty history, missing prices and absent portfolios produce "unavailable" or "stale" labels, never fabricated values. A price that cannot be fetched is a 503, not a guess. |
| 4 | **Ownership is structural, not trusted** | Every query is scoped to the session user's ID at the data-access layer. The model cannot request another user's data because no tool accepts a user ID. |
| 5 | **Honest measurement only** | The evaluation reports what was measured and labels what was not. Fixture/mock numbers are never presented as real measurements; live metrics are "pending key", not estimated. |

---

## 3. System architecture

### 3.1 Components

The system is a TypeScript monorepo (npm/Turborepo) with two applications and one database:

| Component | Technology | Role |
| --- | --- | --- |
| Web application | Next.js 16 (App Router), React 19, Tailwind CSS 4 | Screens, authentication (Better Auth, Google sign-in), and server-side forwarding of all API requests to the backend. |
| Backend | NestJS 12, Prisma 6 | Business rules, protected endpoints, market data, the AI layer, guardrails, readiness, retrieval and evaluation. |
| Database | PostgreSQL 17 (Neon, hosted) + pgvector | All structured records; the `rag_documents` table also holds 768-number embeddings for retrieval. |
| Market data | Yahoo Finance via `yahoo-finance2` | Quotes, price history, company profiles and news. Free, no API key. |
| LLM provider | OpenRouter (hosted API) | Serves the pinned models over HTTPS. No model runs on the user's machine. |

### 3.2 Request lifecycle

```
Browser ──▶ Next.js /api/* route ──▶ NestJS endpoint ──▶ Prisma ──▶ PostgreSQL
              (origin check,            (session guard,
               cookie forward)          validation, rules)
```

1. The browser calls a Next.js `/api/*` route. The web server checks the request origin and forwards it, with the session cookie, to NestJS (15 s default timeout; AI routes 120 s).
2. NestJS verifies the session with Better Auth, derives the user ID server-side, validates the request with Zod schemas, and applies the business rules.
3. For AI requests, deterministic code first gathers the evidence (profile, transactions, quotes, indicators, retrieved passages), then calls the model, then runs the guardrail over the answer (Section 7).
4. Financial responses are private and uncached.

### 3.3 Data model

The schema (Prisma, 11 migrations) has three groups:

- **Identity and auth:** `User`, `Session`, `Account`, `Verification` (Better Auth).
- **Module 1:** `UserFinancialProfile` (one per user), `UserGoal` + `UserGoalContribution`, `UserTransaction`, `UserBill` + `UserBillPayment`. Money is stored as `Decimal(12, 2)` — two decimal places, whole-paise arithmetic in code.
- **Module 2 and AI:** `UserHolding` (one per user per symbol), `WatchlistItem`, `MarketQuote` and `MarketHistory` (public market data with fetched-at timestamps), `RagDocument` (retrievable chunks with a `vector(768)` embedding; `user_id` null for public content, set for user-owned notes), `GuardrailCheck` (one row per verified claim — the evaluation's grounding metric is computed from this table).

All user-owned tables cascade on user deletion. The embedding column is `Unsupported` in Prisma (the typed client cannot read pgvector values), so all embedding access goes through raw SQL in the RAG repository.

### 3.4 Deployment

The public deployment is on **Netlify** (`https://finverseaii.netlify.app`): the Next.js frontend and the NestJS backend, the latter running as a Netlify Function (`netlify/functions/api.ts`, serverless-http). The site was live-checked on 23 November 2026 (homepage, health endpoint, auth-guard and origin-check responses all behaved as expected). Two environment variables are required in production: `BACKEND_URL` and `BETTER_AUTH_URL`. The OpenRouter API key (`OPENROUTER_API_KEY`) is not yet configured, so live model calls are not yet possible. Migrations are recorded in the repository; whether the Phase 0/2/3 migrations have been applied to the production database is a deployment step that cannot be verified from source.

---

## 4. Methodology: phased construction with gates

The LLM layer was built in seven phases (the plan at `llm-layer-guardrails-readiness-evaluation-plan.md`), each gated on the previous phase's acceptance criteria and a green test suite:

| Phase | What was built | Date | Key acceptance evidence |
| --- | --- | --- | --- |
| 0 | Module 2 deterministic core: market data, indicators, portfolio math, optimization | 19 Nov 2026 | Indicators match reference values (e.g. RSI 55.55 on the Investopedia series); portfolio math hand-verified |
| 1 | LLM foundation: provider, 7 tools, structured output, prompts, rate limits, cache | 19 Nov 2026 | All tools owner-scoped; schema validation rejects malformed replies |
| 2 | RAG + pgvector, news, screener, 8th tool | 19 Nov 2026 | Retrieval scoped to public + own records; news cached and batched |
| 3 | Guardrails: verification engine, check log, template fallback | 21 Nov 2026 | Corrupted-output suite 22/22 — every planted error caught |
| 4 | Investment Readiness: deterministic 0–100 formula + LLM explanation | 21 Nov 2026 | All scenario scores hand-computed and pinned by tests |
| 5 | Evaluation: 20 scenarios, template baseline, 4 metrics, blind rating pack | 23 Nov 2026 | Baseline grounding 100.0%; corrupt fixture caught on every answer |
| 6 | Documentation: this write-up, guide Edition 1.2, README correction | 23 Nov 2026 | Guide rebuilt as a 36-page PDF; all claims re-verified against code |

Each phase was verified before the next began: backend tests (612/612 at Phase 6), web tests (68/68), end-to-end tests (4/4), type checks and lint. No phase was declared complete from commit state alone — the test suite and, where applicable, a live check had to pass.

---

## 5. The deterministic core

### 5.1 Module 1 — personal finance

Income, expenses, savings target, budgets, goals, transactions and bills are recorded manually (no bank connections, no payments). The implemented calculations are:

- **Monthly surplus:** income + other income − fixed expenses − variable expenses − savings target.
- **Category budget allocation:** percentages (whole numbers totalling 100) applied with whole-paise arithmetic; leftover paise are distributed so the allocation stays exact.
- **Spending totals and shares:** date-filtered sums and category percentages; expenses are identified by negative amounts.
- **Month-end estimate:** spending so far ÷ elapsed days × days in the month — an extrapolation, labelled as such, not a prediction.

### 5.2 Module 2 — market data and portfolio math

**Market data.** Quotes come from Yahoo Finance (`yahoo-finance2`), covering NSE symbols (e.g. `RELIANCE.NS`) and indices (`^NSEI`, `^BSESN`). Quotes are cached 15 minutes and history 24 hours in PostgreSQL; every cached row carries a fetched-at timestamp. A stale cache returns the last-known price **marked stale**; a symbol with no price at all returns a 503. No price is ever invented.

**Indicators.** SMA, EMA, RSI and MACD are computed in TypeScript from stored price history, unit-tested against published reference values (RSI 55.55 on the Investopedia example series). The same indicator code is shared by the market module and the AI layer's tools, so the model and the charts can never disagree.

**Portfolio math.** Holdings are valued at current prices (total value, invested amount, gains in rupees and percent), with sector concentration, CAGR (single holding period) and XIRR (irregular cash flows). **Optimization** is a mean-variance (Markowitz) solver with Sharpe-ratio reporting, in pure TypeScript — the repository contains no Python, so the blueprint's NumPy/SciPy/QuantLib stack was not used.

**Screener.** A rule-based filter over the stock universe (market cap, P/E, sector, technical conditions). The AI layer adds a natural-language front end that converts a request ("large-cap, low P/E") into structured conditions; the filter itself is code, not the model.

---

## 6. The LLM layer

### 6.1 Models and hosting

The models are hosted by OpenRouter and called over HTTPS from the NestJS backend. The pinned models (verified against the live OpenRouter catalogue on 19 November 2026 — the synopsis's original model IDs no longer exist) are:

| Role | Model | Used for |
| --- | --- | --- |
| Primary | `qwen/qwen-2.5-72b-instruct` | Chat, explanations, extraction, screening interpretation |
| Reasoning | `deepseek/deepseek-r1-0528` | Multi-step analysis; the reasoning trace is stripped before the answer is shown |
| Embeddings | `baai/bge-base-en-v1.5` | 768-dimension vectors for retrieval |

Prices as of 23 November 2026 (Qwen $0.36/$0.40, R1 $0.571/$2.286 per million prompt/completion tokens) are recorded in the evaluation config for cost benchmarking. The API key comes from an environment variable only; without it, AI endpoints answer with the raw computed numbers and no narrative — chat included, which returns the computed metrics with `fallback: true` instead of failing. A 503 means the data itself is unavailable (for example no price at all for a symbol), never a missing key.

The strategy document proposed locally hosted 7B/14B models (Ollama/vLLM). The implemented system uses hosted 72B/full-size models instead, because the free hosting tier cannot run a 7B model and no team machine has a confirmed GPU; the synopsis (§5.2) explicitly allows hosted inference as a fallback. This is a documented deviation, not an oversight — and it is reversible: the provider is a single interface, so a local model can be swapped in later without changing the tools, prompts or guardrail.

### 6.2 Tools: the model's only access to data

The model cannot touch the database. It can only call nine typed, owner-scoped **tools**, each returning facts for the signed-in user (identifiers as in `apps/backend/src/ai/ai.tools.ts`; the strategy document names the same tools in snake_case):

`getPortfolioSummary`, `getBudgetStatus`, `getTransactions`, `getStockQuote`, `getStockFundamentals`, `getCategorySpending`, `getGoalProgress`, `getReadinessScore`, `searchKnowledge`.

There is no separate profile, history or indicators tool: profile data reaches the model through `getBudgetStatus`, and price history and indicators (RSI, moving averages, MACD) are computed inside `getStockFundamentals`. The screener has one further tool, `applyScreenerFilters`, which runs in a dedicated translation round rather than in the chat tool loop.

No tool accepts a user ID, so cross-user access is impossible by construction. Tool results are the **evidence** the model must cite; a claim without evidence cannot pass the guardrail.

### 6.3 Structured output

Every model reply is parsed as JSON against a Zod schema: a summary, a list of **claims** (each a number, its unit, and its source), and citations. A reply that does not match the schema is retried once, then replaced by a template. Structured output is what makes the guardrail possible — free prose cannot be verified claim by claim.

### 6.4 Retrieval (RAG)

News articles, company profiles (Yahoo `longBusinessSummary`) and the user's own transaction notes are split into chunks, embedded with `bge-base-en-v1.5`, and stored in pgvector. A question is embedded the same way; the closest passages are fetched and passed to the model with their source. Retrieval is scoped to public content plus the signed-in user's own records. Retrieved text is treated as **data to summarise, never as instructions** — the prompt templates say so explicitly (prompt-injection guard). News is cached (configurable TTL) and fetched in batches of five so the provider is not hammered.

### 6.5 Features

| Feature | Endpoint | Behaviour |
| --- | --- | --- |
| Chat | `POST /ai/chat` | Free-form questions; the model picks tools, reads the evidence, answers with cited claims. |
| Explain a stock | `POST /ai/explain-stock` | Price, indicators and profile facts → a plain-language explanation of what the numbers say (and do not say). |
| Explain the news | `POST /ai/explain-news` | Retrieved news passages → a summary with sentiment, each claim tied to a passage. |
| Screen stocks | `POST /ai/screen` | Natural language → structured conditions → the rule-based screener. |
| Explain Readiness | `POST /ai/explain-readiness` | The computed score and its five factors → a plain-language explanation (Section 8). |
| Status | `GET /ai/status` | Whether the key is configured and which models are pinned. |

### 6.6 Safety rails

Per-user rate limits, a 30-second model timeout, a per-request cost cap, and a refusal path for questions the evidence cannot answer. The assistant explains numbers; it does not give personalised investment advice, connect bank accounts, or execute payments.

---

## 7. Guardrails: verifying every claim

The guardrail is the system's answer to hallucination. It does not judge style — it re-checks numbers.

### 7.1 Verification rules

Each claim is compared against the deterministic evidence that was handed to the model:

| Check | Tolerance | Rationale |
| --- | --- | --- |
| Money amounts | Exact to the paise (₹0.01) | A price or total is either right or wrong; there is no "close enough" for money. |
| Percentages and ratios | ±0.1 | Rounding in prose (62.5% vs 62.45%) is acceptable; a different value is not. |
| Scores | Exact | A Readiness score of 100 must be exactly 100. |
| Source existence | The claimed source must be in the evidence | A claim citing "the news" fails if no news passage was retrieved. |
| Citation match | Cited passages must exist | A citation to passage #3 fails if only two passages were retrieved. |

### 7.2 Failure handling

A failed answer is not shown with the wrong number. The pipeline retries the model once with the failure pointed out; if the retry also fails, the user receives a **template answer** — rule-written prose stating the computed numbers directly. The user always gets a correct answer, even if it is plainer than a model would write.

### 7.3 The check log

Every check — pass or fail — is written to the `guardrail_checks` table with the claimed and expected values, the check type, the feature, the request ID and the attempt number. The evaluation's grounding metric is computed from this table, not estimated from samples.

### 7.4 How the guardrail is tested

A **corrupted-output suite** (22 tests) feeds the guardrail deliberately wrong answers — inflated scores, shifted percentages, invented prices, phantom citations — and requires it to catch every one. The evaluation (Section 9) goes further with a labelled fixture model that raises the score by 7 in both its values and its prose, so the error is internally consistent and only the guardrail can catch it. In the no-key evaluation run it caught exactly one check per scenario — the score value — and rejected all 19 corrupted answers.

### 7.5 What the guardrail cannot do

It checks numbers against evidence. It cannot check whether prose is fair, complete or well-judged, and it cannot detect a true number used to support a misleading conclusion. Those qualities are what the human rubric in the evaluation (Section 9) is for. The blueprint's phrases "100% verified" and "hallucination-free" remain aspirations, not demonstrated guarantees.

---

## 8. Investment Readiness: the cross-module score

### 8.1 The formula

Five factors, each scored 0–100 and weighted:

| Factor | Weight | What it measures | Full marks | Zero marks |
| --- | --- | --- | --- | --- |
| Emergency fund | 25 | Months of expenses covered by savings | ≥ 6 months | 0 months |
| Debt-to-income | 20 | Total debt ÷ annual income | No debt (ratio 0) | Debt ≥ 1 year of income |
| Surplus | 25 | Monthly surplus ÷ monthly income | ≥ 30% | ≤ 0% |
| Concentration | 15 | Largest holding's share of the portfolio | ≤ 20% | Single holding (100%) |
| Volatility | 15 | Portfolio volatility (annualized) | ≤ 15% | ≥ 60% |

Each factor scales linearly between its thresholds. The bands are **Ready** 70–100, **Building** 40–69, **Not ready** 0–39. (These are the implemented values in `apps/backend/src/readiness/readiness.formula.ts`, pinned by `readiness.formula.spec.ts`. The first edition of this write-up printed the plan's draft bands — Ready 80–100, monthly debt-to-income, concentration zero at 80%, volatility 10–40% — which were never implemented; corrected 24 November 2026.) The first three factors come from Module 1; the last two from Module 2 — the score is cross-module by construction.

### 8.2 Missing data

A user without a portfolio has no concentration or volatility. Instead of scoring those factors zero — which would punish someone for not yet investing — the formula **rescales**: the weights of the available factors are stretched to fill 100. A user with no data at all gets no score, labelled "unavailable", rather than a misleading zero.

### 8.3 Explanation

`POST /ai/explain-readiness` runs the formula, then asks the model to explain the result: which factors help, which hurt, and what would move the score. The explanation passes through the guardrail — the model must state the score and each factor value exactly as computed. Without the API key, the endpoint returns the score, the band and the factor breakdown with no narrative.

### 8.4 Worked examples (from the evaluation scenarios)

A healthy saver (₹80,000/month income, ₹30,000 expenses, 12 months of savings, no debt, diversified portfolio) scores **100 — Ready**. A single-stock gambler (one holding, high debt, no savings) scores **28 — Not ready**. All 20 scenario scores are hand-computed from the formula and pinned by tests, so the formula cannot drift silently.

---

## 9. Evaluation methodology and results

### 9.1 Design

The evaluation harness (`apps/backend/src/eval/`) measures four things, using 20 scripted scenarios — seeded fictional profiles and portfolios (a healthy saver, an over-spender, a concentrated portfolio, a high-debt household, a single-stock gambler, and so on). All scenarios use invented data; no real user data is involved. Every scenario's expected score is hand-computed and pinned by a test.

| Metric | What it measures | How |
| --- | --- | --- |
| Factual grounding | Do the model's numbers match the computed evidence? | Guardrail pass rate: the fraction of answers (and of individual checks) that pass verification. |
| Self-consistency | Does the model reach the same conclusions when asked the same question five times? | Pairwise agreement on the extracted conclusions: the quoted score, the named band, and the set of factors mentioned. |
| Explanation quality | Is the explanation clear, evidence-based and actionable? | A human rubric (1–5 on clarity, evidence use, actionability) applied to a **blind rating pack**: model and baseline outputs shuffled under opaque labels, so the rater does not know which is which. |
| Latency and cost | How long does an answer take, and what does it cost? | Measured per model from real API usage (token counts × the pinned price table). Cost is null when the provider does not report usage — never estimated. |

### 9.2 The baseline

The **template baseline** is a rule-written explanation generated from the same numbers the model sees — no model involved. It is the comparison point: the model's explanations must be at least as accurate as the template, and the rating pack tests whether they are clearer or more actionable. If the model cannot beat a template on grounding, it should not be shown to users at all.

### 9.3 Results (23 November 2026, no API key)

The OpenRouter key is not configured, so the harness ran end-to-end **without live model calls**: the baseline was fully measured, and two labelled fixture models exercised the runner's mechanics. No fixture number is presented as a real measurement.

| Path | Grounding (answers) | Grounding (checks) |
| --- | --- | --- |
| Template baseline | 100.0% (19/19) | 100.0% (1,355/1,355) |
| Fixture model, correct | 100.0% (19/19) | 100.0% |
| Fixture model, corrupt | 0.0% (0/19) | 98.6% (1,340/1,359) |
| Live LLM (Qwen / R1) | **Pending key** | **Pending key** |

Baseline latency was 0.39–5.25 ms per scenario (mean 1.51 ms) — the template is pure arithmetic. One scenario (no data at all) correctly produced no score, labelled "unavailable". The full results table and the report-ready write-up are in `docs/evaluation-writeup.md`; the raw results are in `apps/backend/eval/results/`.

### 9.4 What is still to be measured

Live grounding, self-consistency, latency and cost for both models — one command (`node dist/eval/run-eval.js`) once the key is configured, with no code changes. The human rubric ratings, from the blind rating pack in `apps/backend/eval/rating-pack/`. The harness currently covers the readiness explainer only; chat and RAG answers need a live database and are future work.

### 9.5 Discussion

Three observations from the first run, recorded in the evaluation write-up:

1. **The formula is generous to strong cash flow.** A user with a large surplus and no debt scores highly even with a concentrated portfolio — the cash-flow factors (70 of the 100 points) dominate. Whether that weighting is right is a product decision the team should revisit with real user feedback.
2. **Answer-level grounding is the honest headline.** The corrupt fixture passed 98.6% of individual checks — it only failed one check per answer. Reporting check-level rates alone would hide the fact that every answer was wrong. The answer-level rate (0/19) is the number that matters.
3. **The refusal path works.** The no-data scenario produced "unavailable", not a zero or a guess — the system fails safe.

---

## 10. Why LLM reasoning, not traditional machine learning

The strategy document (Vivek Bartwal, *LLM Integration Strategy*, §1) makes the case feature by feature. The core limitation of traditional ML in this context is that a trained model (a regression, a random forest, a gradient-boosted tree) produces **a number with no built-in explanation**. Any explanation must be bolted on with post-hoc attribution (SHAP/LIME), which only approximates which inputs mattered. In a finance application — where the user is making decisions with their own money — that creates three concrete problems: **opacity** (the user cannot audit why the system reached a conclusion), **rigidity** (the model can only reason about the features it was trained on), and **false precision** (a single number implies a certainty a small training dataset cannot support).

An LLM, given the same underlying data, produces **an argument**: a step-by-step line of reasoning that weighs evidence, states which evidence mattered most, and is explicit about uncertainty. The comparison, from the strategy document:

| Dimension | Traditional ML algorithm | LLM reasoning (hybrid) |
| --- | --- | --- |
| Output type | A single number or label (score, class, prediction) | A structured, evidence-cited explanation, optionally alongside a number computed separately |
| Explainability | Requires separate post-hoc tools (SHAP/LIME); only approximate | Native — the reasoning trace is the explanation |
| Data requirement | Needs a large labelled training dataset specific to the task | Works zero-shot / few-shot using general pretraining plus retrieved context |
| Handling new evidence types | Requires retraining to add a new feature/signal | Can incorporate a new type of evidence (a news snippet, a user question) immediately, in-context |
| User interaction | One-shot output; no follow-up capability | Conversational — supports follow-up questions and clarification |
| Numeric precision | High, if well trained — this is ML's core strength | Weak if asked to calculate directly — must be paired with a deterministic tool layer |
| Best suited for | Well-defined numeric computation and pattern-fitting tasks | Interpretation, synthesis, natural-language explanation, and open-ended reasoning tasks |

The last row is the key: the hybrid architecture assigns each side the job it is good at. ML's strength (numeric precision) is preserved in the deterministic layer; the LLM's strength (interpretation and explanation) is used where it matters. The system does not ask the model to do arithmetic, and does not ask the calculator to explain itself.

---

## 11. Technology decisions: blueprint vs as-built

The older architecture blueprint proposed a Python stack. The implemented system differs, for documented reasons:

| Question | Blueprint's proposal | Decision taken | Reason |
| --- | --- | --- | --- |
| AI service language | Python (FastAPI) | TypeScript inside NestJS | One stack, one deploy; the repository has no Python anywhere |
| Model | Llama-3-8B / Mistral-7B, local | Hosted via OpenRouter: Qwen 2.5 72B, DeepSeek R1 | Free hosting cannot run a 7B model; no confirmed GPU; synopsis §5.2 allows hosted fallback |
| Output validation | Pydantic | Zod schemas | TypeScript equivalent; same role |
| Vector store | ChromaDB | pgvector on the existing Postgres | One database, no new service to host |
| Embeddings | BAAI/bge-small-en-v1.5 | BAAI/bge-base-en-v1.5 (768d) | Stronger retrieval quality at the same cost (hosted) |
| Market data | yfinance (Python) | yahoo-finance2 (TypeScript) | Same Yahoo source, free, no key; fits the stack |
| News | Finnhub API or RSS | Yahoo Finance news | Same provider as prices; no second key |
| Numerical engine | NumPy / SciPy / QuantLib / pandas | Pure TypeScript | One stack; the math needed (indicators, returns, a small mean-variance solver) does not need a numerical library |

---

## 12. Verification record (23 November 2026)

| Check | Result |
| --- | --- |
| Backend tests | 612/612 (48 suites) |
| Web tests | 68/68 |
| End-to-end tests | 4/4 |
| Type checks | Backend `tsc` and web `tsc` clean |
| Lint and format | Oxlint, ESLint and Prettier clean |
| Evaluation harness | Runs end-to-end without a key; baseline 100.0% grounding |
| Live site (Netlify) | Homepage, health, auth-guard and origin-check responses verified |

What is **not** verified: live model answers, latency and cost (no API key); Google sign-in against a live account; end-to-end persistence on the production database; whether the Phase 0/2/3 migrations are applied in production; the human rubric ratings (not yet collected).

---

## 13. Limitations

1. **Live AI behaviour is unmeasured.** The harness is built and the baseline is measured, but no real model answer has been evaluated. All claims about model quality are pending the API key.
2. **Single price source.** Yahoo Finance is the only market-data provider; there is no fallback, and corporate actions (splits, bonuses) are not adjusted for.
3. **Evaluation scope.** The harness covers the readiness explainer only. Chat and RAG answers need a live database and are not yet measured.
4. **The guardrail checks numbers, not judgement.** A true number can still support a misleading conclusion; only the human rubric addresses that, and it has not yet been collected.
5. **Thresholds are uncalibrated.** The Readiness factor thresholds (6 months of expenses, 30% surplus, and so on) are reasoned choices, not calibrated against real user outcomes.
6. **No voice, receipt or alert features.** The extraction schema exists, but the entry UI is not built; alerts and exports are planned.

---

## 14. Future work

- Configure the OpenRouter key; run the live evaluation; collect the human rubric ratings.
- Extend the evaluation harness to chat and RAG answers.
- Build the expense-extraction entry flow (schema exists; save/review UI needed), then voice and receipt entry.
- Strategy-document features not yet built: "Why Did My Stock Move?" (attribution with visible chain-of-thought), Market Regime Detection, and the What-If Portfolio Simulator.
- Alerts, a second price source, corporate-action adjustments, and scenario stress tests.
- Calibrate the Readiness thresholds against real user feedback once the feature is used.

---

## 15. Reproduction

```bash
# Tests (from the repository root; use node directly — see the repo notes)
cd apps/backend && node --experimental-vm-modules ../../node_modules/jest/bin/jest.js
cd apps/web && node --test test/*.test.mjs

# Evaluation (no key needed for the baseline + fixture paths)
cd apps/backend && node_modules/.bin/nest build
node dist/eval/run-eval.js --mock both
# With a key: OPENROUTER_API_KEY=... node dist/eval/run-eval.js

# Project guide PDF (needs reportlab)
python3 -m venv /tmp/guide-venv && /tmp/guide-venv/bin/pip install reportlab
/tmp/guide-venv/bin/python docs/build_finverse_guide.py
```

---

*Sources: the project source (`apps/backend/src/`, `apps/web/`, `apps/backend/prisma/`), the approved plan (`llm-layer-guardrails-readiness-evaluation-plan.md`), the LLM Integration Strategy document, the synopsis (`Finverse_Ai_Final_Synopsys.pdf`), and the evaluation results (`apps/backend/eval/results/`, `docs/evaluation-writeup.md`). No credentials are recorded in this document.*
