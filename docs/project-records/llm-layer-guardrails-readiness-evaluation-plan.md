# FinVerse AI — LLM Layer + Guardrails + Investment Readiness + Evaluation

**Plan v1 | 19 Nov 2026 | Status: APPROVED 19 Nov ~10:04 IST — Phase 0 in progress**

Decisions (Vivek, 19 Nov ~10:04 IST): hosting = **OpenRouter**; stack, vector
store, market data, baseline, order = "whatever suits best" → recommendations
adopted: TypeScript in NestJS, pgvector on Neon, yahoo-finance2, template
baseline, Phase 0 first. Phase 0 build started 19 Nov on branch
`feat/module-two-core` (subagent; no push until a PAT is provided).

**Phase 0 — BUILT + LOCALLY VERIFIED 19 Nov ~10:30 IST:** 9 commits
(`ce48795`..`1c10651`), 47 files, +7,174/−19. Verification re-run by the
parent agent: backend jest 226/226, web tests 46/46, prettier clean, web
check-types clean, backend oxlint 0 warnings / 0 errors. Merged + pushed
19 Nov ~10:49 IST (`1c10651`); CI failed once on a `clientVersion` type
error in the portfolio spec, fixed in `88caa67` (pushed ~11:14 IST).
**CI GREEN on 88caa67 (~11:17 IST) — PHASE 0 FULLY DONE:** built + pushed
+ CI green + live-verified (/market 200, homepage 200, backend health 200).
Migration decision now covers 3 migrations (2 Module 1 + market) — still
pending; endpoints need it before they work live.

**Phase 1 — BUILT + LOCALLY VERIFIED 19 Nov ~11:45 IST** (branch
`feat/llm-foundation`, head `efafe52`, 4 commits, 34 files, +4,442/−4;
never pushed). Verification RE-RUN by the parent agent: backend jest
310/310, web tests 51/51, backend tsc clean, oxlint 0/0, prettier clean,
web check-types + ESLint clean, nest build + next build OK (AI routes in
build output). **MODEL-AVAILABILITY FINDING (verified live 19 Nov):**
the synopsis's exact model IDs no longer exist on OpenRouter (no
Qwen2.5-7B/14B-Instruct, no DeepSeek-R1-Distill at all) or on Groq
(no Qwen2.5 / R1-Distill in its current docs); OpenRouter has 14 :free
models, none from Qwen or DeepSeek. Defaults are the nearest in-family
IDs, all env-configurable: primary `qwen/qwen-2.5-72b-instruct`
($0.36/M prompt), reasoning `deepseek/deepseek-r1-0528` ($0.57/M
prompt / $2.29/M completion) — paid, but the whole prototype + 20-
scenario eval is well under $1. **DECIDED 19 Nov ~11:53 IST (Vivek):
accept the OpenRouter paid defaults** — other free-provider / local
Ollama options declined for now. Provider/model stays config-only (env
vars + base URL). OpenRouter API key needed from Vivek for live testing
(Render env var, never in chat/repo). **MERGED + PUSHED 19 Nov ~11:54 IST** (main 88caa67..efafe52,
PAT used once + discarded). **CI GREEN 19 Nov ~11:57 IST** (run
44471827856, success) + **LIVE-VERIFIED** (backend + web /api/ai/status
both 401 without auth = route live, homepage + /market 200, backend
health 200). **PHASE 1 FULLY DONE.** Remaining: live smoke test needs
Vivek's OPENROUTER_API_KEY in Render backend env vars + a logged-in
user test.

**LLM Integration Strategy doc received 19 Nov ~11:30 IST** — Vivek's own
research document (`~/workspace/user/files/FinVerse_AI_LLM_Integration_
Strategy.docx`): "Reasoning-Native Financial Intelligence". It is the
standing per-phase reference for the LLM work — integrated as Section 7.
Its core principle ("the LLM reasons, the code calculates") matches this
plan; its feature map (§3) assigns every LLM feature to a phase, and its
§4 adds risks (prompt injection via news, model/version drift), fallback
design, latency UX, and expanded evaluation (latency + cost benchmarking).

Covers synopsis Objectives 3, 4, 5, 6 (§3.2) and methodology §4.4–§4.6. Module 2
(stocks) is Objective 2 — it appears here only as Phase 0 because the LLM layer
and Readiness cannot be built without its deterministic data.

---

## 1. Where we start (verified, 19 Nov 2026)

| Area | State |
|---|---|
| Module 1 (personal finance) | ~70% + all 4 gaps merged; CI green on `da39a3d`; live on Render |
| Module 2 (stocks) | 0% — no market-data service, no holdings tables, no indicators, no portfolio engine |
| LLM layer | 0% — no AI module, no provider, no model calls anywhere in the repo |
| Guardrails | 0% — only input validation exists; no AI-output verification |
| Investment Readiness | 0% — no scoring formula, no cross-module feature |
| Evaluation | 0% — no dataset, no baseline, no metrics |
| Stack | Turborepo: Next.js 16 web + NestJS 12 backend + Prisma 6 + Neon Postgres. **No Python anywhere.** |
| Vector store | None. Blueprint proposes ChromaDB + bge-small; nothing installed. |
| Redis | Declared in docker-compose, no application code uses it. |
| Migrations | Two new tables from the Module 1 gaps (`user_bill_payments`, `user_goal_contributions`) are **still unrun on prod Neon** — migration decision pending since 17 Nov. Every phase below that adds tables makes this more urgent, not less. |
| Prod auth | Backend `BETTER_AUTH_URL` is still `localhost` (parked at Vivek's request) — will break login/session verification in production. Any real-user testing of the AI features needs this fixed first. |

**The one hard dependency:** the LLM layer reasons over deterministic data from
*both* modules, and Readiness is cross-module by definition (cash-flow position
× portfolio risk). Module 2's deterministic core must exist before Phases 1–5
can do their investment-side work. The plan therefore starts with Phase 0.
The alternative — LLM over Module 1 data only, Module 2 later — is noted in
Section 6, decision 6.

---

## 2. Phases

### Phase 0 — Module 2 deterministic core (prerequisite)

*Goal: the numbers the LLM will explain. No AI in this phase — pure math, fully
testable, exactly as the synopsis §4.6 orders it (deterministic core first).*

- **Market data provider** — connect one source (recommendation: `yahoo-finance2`,
  free, no API key, NSE symbols like `RELIANCE.NS` supported; the blueprint's own
  proposal is yfinance). Cache quotes in Postgres with a fetched-at timestamp;
  define stale/missing-data behaviour (show last-known + timestamp, never invent).
- **Schema** — `UserHolding` (symbol, quantity, buy price, buy date),
  `WatchlistItem`, price-history cache table. Migrations + the pending migration
  decision from Section 1 resolved first.
- **Indicators** — SMA, EMA, RSI, MACD from price history (exact formulas,
  unit-tested against known values).
- **Portfolio math** — value, gains/losses, CAGR, XIRR, sector concentration.
- **Optimisation** — Markowitz mean-variance solver + Sharpe ratio (synopsis
  Eq. 4.1–4.2). Pure TypeScript (no NumPy/SciPy — the repo has no Python).
- **UI** — market overview (NIFTY 50 / SENSEX per the module plan), stock search
  + profile, charts, holdings CRUD, portfolio dashboard.
- **Acceptance:** indicators match reference values; portfolio math verified
  against hand-computed cases; every number on screen traceable to a stored
  price + a formula. CI green, live-verified.

### Phase 1 — LLM foundation (Obj 3, 4)

*Goal: the model can answer questions about the user's real data, and every
number it uses comes from the deterministic layer — never from the model.*

- **Provider + models** — hosted inference via OpenRouter or Groq free tier
  (recommendation, Section 6.1). Primary: **Qwen2.5-7B/14B-Instruct**
  (insights, chat, NL-to-screener-filter, extraction). Deep reasoning:
  **DeepSeek-R1-Distill-7B/14B** (Readiness explanation, price-move attribution).
  OpenAI-compatible API, called from a new NestJS `ai` module. API key in Render
  env vars only — never in the repo.
- **Function calling / tool use** — the model gets typed tools and decides which
  to call: `getPortfolioSummary`, `getBudgetStatus`, `getTransactions`,
  `getCategorySpending` (strategy doc §3.3), `getStockQuote`,
  `getStockFundamentals`, `getGoalProgress`. Tools read the
  deterministic layer; the model never computes a number itself.
- **Structured output** — every LLM response is JSON matching a Zod schema
  (the TypeScript equivalent of the blueprint's Pydantic validation): claims
  separated from evidence, each claim carrying the source it cites.
- **Bounded first features** (per the project guide §13, stage 4): finance
  insights ("why did I overspend on food this month?"), then stock explanations.
  Chat UI on the dashboard; every answer shows its evidence citations.
- **Safety rails** — per-user rate limits, request timeouts, cost caps on the
  provider account, no financial advice wording (decision support, not
  buy/sell recommendations), no user data in prompts beyond what the tools
  returned for that user. **Strategy doc additions (§4.3, §4.5, §4.7):**
  prompt templates must instruct the model to ignore any instructions that
  appear inside retrieved/external text (prompt-injection guard — news
  arrives in Phase 2, the discipline starts now); every LLM feature falls
  back to displaying the raw computed metrics without the narrative when
  the model is unavailable or returns invalid output (never fail outright);
  reasoning-heavy calls show a loading/reasoning-in-progress indicator;
  identical queries are cached briefly; the heavy reasoning model is
  reserved for features that need it.
- **Acceptance:** the model answers 10 scripted questions using only tool
  results; a deliberately unanswerable question ("what will RELIANCE do
  tomorrow?") gets an honest refusal, not a prediction. CI green.

### Phase 2 — RAG (Obj 3, §4.4)

*Goal: explanations grounded in retrieved evidence, not the model's memory.*

- **Vector store** — pgvector on the existing Neon Postgres (recommendation,
  Section 6.3). One database, no new service.
- **Embeddings** — bge-small (the blueprint's choice) via a hosted embeddings
  endpoint; store embeddings alongside source rows.
- **What gets indexed** — market news items (Finnhub free tier or RSS feeds),
  company profile text, the user's own transaction notes/descriptions.
  Retrieval is always user-scoped: a user retrieves only their own records
  plus public market content.
- **Pipeline** — ingest → chunk → embed → store; query → retrieve top-k →
  inject into prompt with source labels → answer cites sources.
- **Acceptance:** an explanation about a news event cites the retrieved article
  (title + date); a question with no relevant retrieved context says so
  instead of answering from memory.

### Phase 3 — Guardrails (Obj 4, §4.4)

*Goal: every claim checked against source data before the user sees it.*

- **Claim extraction** — parse the structured output's claims (each claim already
  carries its cited source from Phase 1).
- **Deterministic verification** — for every numeric claim, re-fetch the value
  from the deterministic layer and compare (exact match for money, small
  tolerance for percentages/ratios). For every cited source, confirm the
  source exists and was actually retrieved.
- **Failure handling** — one retry with a correction prompt; if it still fails,
  fall back to a template-generated answer built only from verified numbers
  (never show an unverified claim). Log every check pass/fail for the
  evaluation in Phase 5.
- **Acceptance:** a test suite feeds the guardrail deliberately corrupted
  outputs (wrong amounts, invented tickers, fake citations) — 100% caught.
  Guardrail pass rate becomes the factual-grounding metric.

### Phase 4 — Investment Readiness (Obj 5)

*Goal: the cross-module assessment — cash-flow position × portfolio risk,
with a documented formula and an explained verdict.*

- **Deterministic score** — a documented, auditable formula from both modules,
  e.g. emergency-fund months (profile), debt-to-income (profile), monthly
  surplus (profile), portfolio concentration (holdings), portfolio volatility
  (price history). Score bands (e.g. Not ready / Building / Ready) with
  published thresholds — the formula is code, not a model output.
- **LLM explanation** — DeepSeek-R1-Distill generates the explanation of *why*
  the score is what it is, with per-factor evidence citations, passed through
  the Phase 3 guardrail. The model's visible chain-of-thought is used for the
  explanation, never for the score.
- **UI** — Readiness card on the dashboard: score, band, factor breakdown
  (each factor with its number + source), the explanation, and what would
  move the score (e.g. "3 more months of emergency fund").
- **Acceptance:** the score is reproducible from the same inputs (same data →
  same score, always); the explanation cites every factor it mentions;
  guardrail passes on all scripted scenarios.

### Phase 5 — Evaluation (Obj 6)

*Goal: the measurable research contribution — numbers for the report, not
adjectives.*

- **Scenario dataset** — ~20 scripted scenarios (seeded profiles + portfolios
  covering: healthy saver, over-spender, concentrated portfolio, diversified
  portfolio, high debt, no emergency fund, volatile holdings, etc.).
  Deterministic and reproducible; no real user data, no privacy issues.
- **Baseline** — template-based explanations (rule-generated text from the same
  numbers). Directly comparable to the LLM output on the same scenarios.
  (FinBERT sentiment baseline is optional extra credit — only if time permits.)
- **Metrics**
  1. *Factual grounding* — guardrail pass rate on LLM claims vs baseline
     (baseline is 100% by construction; the question is how close the LLM gets).
  2. *Self-consistency* — same prompt 5 times, agreement rate on the key
     conclusions.
  3. *Explanation quality* — human rubric (clarity, evidence use, actionability),
     rated by the team on a sample of outputs, LLM vs baseline, blind.
  4. *Latency + cost benchmarking* (strategy doc §4.4) — measured response
     times and API costs per model size, reported alongside the quality
     metrics; strengthens the model-selection argument.
- **Deliverable** — a results table + short write-up for the major-project
  report, with the honest numbers (including failures).
- **Acceptance:** all three metrics measured on all 20 scenarios for both
  systems; results reproducible by re-running the eval script.

### Phase 6 — Documentation

- Project guide Edition 1.2: new chapters for the market module, AI layer,
  guardrails, Readiness, and evaluation (the guide's §16 already reserves
  these chapter slots).
- Architecture + methodology write-up suitable for the report submission
  (synopsis Expected Outcomes, last bullet).
- README updated: the "does not provide an AI adviser" line replaced with
  what the AI layer actually does.

---

## 3. Sequencing and dependencies

```
Phase 0 (Module 2 deterministic core)
   └─▶ Phase 1 (LLM foundation) ──▶ Phase 2 (RAG)
                                        └─▶ Phase 3 (Guardrails)
                                               └─▶ Phase 4 (Readiness)
                                                      └─▶ Phase 5 (Evaluation)
                                                             └─▶ Phase 6 (Docs)
```

Phases 1–2 can overlap slightly (RAG needs the Phase 1 prompt plumbing).
Phase 3 must come before Phase 4 (Readiness explanations go through the
guardrail). Phase 5 needs the finished system + baseline. No phase starts
until the previous phase's acceptance criteria pass and CI is green.

**Preconditions before Phase 0 starts:**
1. Migration decision (one-off vs durable build-command fix) — the Phase 0
   tables join the two already-unrun Module 1 tables.
2. `BETTER_AUTH_URL` localhost fix — needed for any real-user testing.

---

## 4. What this plan deliberately does NOT include

- **NL/voice/receipt expense entry UI** (Obj 1 remainder) — separate workstream,
  guide §13 stage 4. But the strategy doc (§3.3) designs it as ONE shared
  structured-extraction pipeline (same prompt + schema across all three
  modalities, OCR pass for receipts) — so Phase 1 builds its structured-output
  capability to serve that pipeline later; the entry UI itself is not in
  this plan.
- **Tax & Compliance module** — out of scope per the synopsis.
- **Real brokerage / order execution** — never in scope; decision support only.
- **FinBERT as a required baseline** — optional only (Section 6.5).
- **Local GPU inference as the default** — see decision 1.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Hosted free-tier rate limits / model availability changes | Pick models available on both OpenRouter and Groq; provider is one config value; eval scenarios are small |
| Market-data provider gaps (NSE coverage, delays) | yfinance covers NSE; show fetched-at timestamps; never present stale data as live |
| LLM invents figures despite tools | Guardrail (Phase 3) is the defence; template fallback guarantees the user never sees an unverified number |
| Prompt injection via ingested news content (strategy doc §4.5) | Treat article text as data to summarise, never as instructions; prompt templates explicitly instruct the model to ignore instructions inside retrieved text |
| Model/version drift (strategy doc §4.5) | Pin exact model versions for every evaluation/demo and document them in the report so results are reproducible |
| Scope creep (chat → full assistant → trading) | Bounded features per phase; every new capability needs an acceptance test before it ships |
| Team bandwidth (only Sarthak has committed so far) | Phases are separable — one person can own Phase 0 while another owns Phase 1's prompt/tool design |

---

## 6. Decisions needed from Vivek

| # | Decision | Recommendation | Alternative |
|---|---|---|---|
| 1 | **Model hosting** | Hosted free tier (OpenRouter or Groq) — Render free tier cannot run a 7B model; laptop GPU unknown; synopsis §5.2 explicitly allows hosted fallback | Local Ollama on a GPU machine (needs 12–24 GB VRAM per synopsis §5.1) |
| 2 | **Language/stack for AI** | TypeScript inside NestJS — one stack, one deploy; synopsis allows "FastAPI or Node.js/Express (to be finalised)" | Python FastAPI microservice (matches synopsis §5.2's Python line, but adds a second stack + second Render service) |
| 3 | **Vector store** | pgvector on existing Neon Postgres — one database, no new service | ChromaDB (blueprint's proposal — separate service to host) |
| 4 | **Market data** | `yahoo-finance2` (free, no key, NSE support) | Alpha Vantage free tier (25 req/day — too small for a screener) or a paid provider |
| 5 | **Evaluation baseline** | Template-based (cheap, deterministic, directly comparable) | + FinBERT sentiment baseline as extra credit if time permits |
| 6 | **Order** | Phase 0 first (Module 2 core), then LLM — Readiness is cross-module by definition; building the LLM layer twice wastes effort | LLM over Module 1 data only first, Module 2 later (visible AI sooner, but Readiness waits) |

Say "recommendations ok" to approve all six as recommended, or name the ones
you want changed.

---

## 7. LLM Integration Strategy document — per-phase reference

Source: `~/workspace/user/files/FinVerse_AI_LLM_Integration_Strategy.docx`
(Vivek's own research, received 19 Nov ~11:30 IST). Standing instruction:
use its knowledge in EVERY phase. Its core principle — **"the LLM reasons,
the code calculates"** — is the same as this plan's Section 1; its §1
ML-vs-LLM argument + comparison table is viva/report material (Phase 6).

### 7.1 Feature map (§3) → phases

| Strategy doc feature | Model | Phase |
|---|---|---|
| AI Financial Chatbot + AI Investment Chatbot (§3.3) — tools `get_category_spending`, `get_portfolio_holdings`, `get_budget_status` | Qwen2.5 | **1** |
| AI Stock Analysis (§3.1) — analyst synthesis from computed metrics + retrieved headlines; claims separated from evidence | Qwen2.5 | **1** |
| Smart Expense Entry / Voice / Receipt Scanner (§3.3) — ONE shared structured-extraction pipeline, JSON-mode output, user confirms before commit | Qwen2.5 | **1** (capability) / later (entry UI) |
| Smart Stock Screener (§3.1) — NL → filter-condition object via function calling | Qwen2.5 | **2** |
| AI Financial News & Sentiment (§3.1) — consolidated narrative across multiple retrieved articles, not per-article score averaging | Qwen2.5 | **2** (needs RAG) |
| Why Did My Stock Move? (§3.1) — attribution with VISIBLE chain-of-thought shown to the user | DeepSeek-R1-Distill | **4** |
| Market Regime Detection (§3.1) — regime label + explicit confidence from signal agreement/disagreement | DeepSeek-R1-Distill | **4** |
| Investment Readiness Score + AI Portfolio Health Score (§3.2) — deterministic sub-scores, LLM writes the personalised prioritised explanation | DeepSeek-R1-Distill | **4** |
| What-If Portfolio Simulator (§3.2) — LLM ranks/explains per-holding shock contributions (computed numerically first) | DeepSeek-R1-Distill | **4** |

### 7.2 Cross-cutting rules from §4 (apply in every phase)

- **Fallback design (§4.7):** every LLM feature falls back to raw computed
  metrics without narrative when the model is unavailable or invalid.
- **Prompt-injection guard (§4.5):** retrieved/external text is data, never
  instructions; prompt templates say so explicitly.
- **Version pinning (§4.5):** exact model versions pinned + documented for
  every evaluation/demo (reproducibility).
- **Latency (§4.3):** reasoning-in-progress indicator, brief caching of
  identical queries, heavy model only where its explanation justifies it.
- **Disclaimer (§4.5):** every LLM output carries the decision-support-not-
  advice disclaimer — more important with fluent LLM text than with bare
  scores, because a well-written explanation feels authoritative.
- **QwQ (§2.5):** Qwen's reasoning model is the named alternative to
  R1-Distill — optional Phase 5 side-by-side benchmark if time permits.
- **LoRA fine-tuning (§4.6):** explicitly future work only, not in scope.

### 7.3 Sequencing confirmation (§4.8)

The doc's recommended sequence — (1) deterministic core + template
explanations, (2) primary model for extraction + chatbots, (3) reasoning
model for explanation-heavy features, (4) guardrails + self-consistency
LAST once outputs are stable — matches this plan's phase order. One
note: our Phase 3 (guardrails) sits before Phase 4 (Readiness) so that
Readiness explanations pass through the guardrail; that is consistent
with "guardrails after the reasoning outputs exist".

### 7.4 Privacy — honest trade-off (§4.1)

The doc's privacy argument (open weights can be self-hosted, so sensitive
financial data never leaves your system) is strongest for LOCAL inference.
Our hosted-OpenRouter choice (decision 1) means user data DOES go to the
provider for inference. This is a documented trade-off: Render free tier
cannot run a 7B model, and the architecture preserves migration to
self-hosting later (same models, same prompts, endpoint change only).
Phase 5 evaluation uses seeded scenarios, never real user data.
