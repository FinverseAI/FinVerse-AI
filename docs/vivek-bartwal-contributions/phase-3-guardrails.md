# Phase 3 — Guardrails

## Metadata

| Field           | Value                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase           | Phase 3 — Guardrails: deterministic verification of LLM claims (synopsis Objective 4, §4.4)                                                                                                                                                                                                    |
| Date            | 21 November 2026                                                                                                                                                                                                                                                                               |
| Author          | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                                                                                                                                                                                             |
| Team            | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881)                                                                                                                                                                        |
| Guide           | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                                                                                                                                                                                              |
| Repository      | github.com/FinverseAI/FinVerse-AI (public)                                                                                                                                                                                                                                                     |
| Branch          | `feat/phase-3-guardrails` (merged to `main` by fast-forward)                                                                                                                                                                                                                                   |
| Commits         | `67b5f87`..`e4995f3` (8 commits)                                                                                                                                                                                                                                                               |
| Scope           | 20 files, +3,691 / −12 lines                                                                                                                                                                                                                                                                   |
| Status          | **Built and merged — NOT pushed, CI not run, live verification pending** (21 November 2026, ~14:48 IST)                                                                                                                                                                                        |
| Standing caveat | No model answer has been verified through the guardrail against a live model call yet, and no check row has been written to prod Neon. How often a real model trips the guardrail awaits the OpenRouter key and a deploy (§10). `main` has also diverged from the remote since the merge (§9). |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 21 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6,
and verified every result independently before it was called done. The push
itself is still pending at the time of writing, and this document says so
plainly rather than implying it.

---

## 1. Overview — what this phase is and why it exists

Phase 1 gave the system a voice that could explain numbers the code had
already computed, and Phase 2 gave it the ability to look things up. Both
phases trusted the model's structured output: the model returned claims
with cited sources, and the system rendered them. That trust was the
hole. A language model can return perfectly shaped JSON containing a
wrong number — a budget figure copied from the wrong field, a P/E ratio
from memory instead of the tool result, a news citation for an article
that was never retrieved. The shape is right and the content is wrong,
and nothing in Phases 1 or 2 would notice.

Phase 3 closes that hole with a deterministic guardrail: **every claim
in every model answer is re-checked against the deterministic layer
before the user sees it.** A claim whose numbers do not match the tool
result, whose source was never called, or whose citation was never
retrieved is caught; the model gets exactly one chance to fix it with a
correction prompt naming the failed claims and their correct values;
and if it still fails, the user gets a template answer built only from
verified numbers — never the unverified text. Every check is logged to
the database, because the guardrail pass rate is the project's
factual-grounding metric for Phase 5.

The phase maps to synopsis Objective 4 (the guardrail layer) and
methodology §4.4, and to the LLM Integration Strategy's central
principle: **"the LLM reasons, the code calculates."** Phases 1 and 2
built the reasoning side; Phase 3 is the enforcement of the other half
— the code does not merely calculate, it double-checks. It is also the
phase the plan explicitly sequences before Phase 4: Readiness
explanations will go through this guardrail, so the guardrail had to
exist and be proven first.

In one sentence: **Phase 3 makes it impossible for the user to see an
unverified number — every claim is checked against the evidence of its
own request, wrong claims get one correction, and a twice-failed answer
is replaced by a template built from verified numbers only.**

### What existed before this phase

| Area                                    | State at the start of Phase 3 (21 Nov, ~14:19 IST)                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Module 1 + Phase 0 (deterministic core) | Done, CI green, live                                                                                          |
| Phase 1 (LLM foundation)                | Done, CI green, live — 7 tools, structured output, chat + explain-stock, fallback                             |
| Phase 2 (RAG)                           | Done, CI green, live — 9 tools, screener, news & sentiment, explain-news                                      |
| Guardrail                               | 0% — model answers rendered as returned; the only verification was Zod schema validation (shape, not content) |
| Check logging                           | None — no record of what the model claimed or whether it was right                                            |
| Template fallback                       | None — the only fallback was Phase 1's raw-metrics fallback (numbers without prose)                           |
| Sample UI (`Vivek_frontend/`)           | Committed the same morning (`1f22aff`), unpushed — the Phase 3 branch was cut from it                         |

---

## 2. Objectives and acceptance criteria

The objectives below are from the approved plan (Phase 3 section). One
design detail differs from the plan's wording — verification runs
against the evidence the model was shown, rather than a re-fetch — and
is recorded as a decision in §6.2.

| #   | Objective (from the plan)                                                                                                                                    | Met?            | Evidence                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------- |
| 1   | Claim extraction — parse the structured output's claims (each already carries its cited source from Phase 1)                                                 | **Yes**         | `verifyAnswer` reads `AiAnswer.claims` directly; no new extraction step was needed (§4.2) |
| 2   | Deterministic verification — every numeric claim compared against the deterministic layer (exact match for money, small tolerance for percentages/ratios)    | **Yes**         | Field-name matching, money exact to the paise, %/ratios ±0.1 (§4.2, §4.3)                 |
| 3   | For every cited source, confirm the source exists and was actually retrieved                                                                                 | **Yes**         | Source checks + citation checks (§4.2, §4.5)                                              |
| 4   | Failure handling — one retry with a correction prompt; if it still fails, template fallback built only from verified numbers; never show an unverified claim | **Yes**         | `guardedAnswer`: one retry, then one of four template builders (§4.6, §4.7)               |
| 5   | Log every check pass/fail for the Phase 5 evaluation                                                                                                         | **Yes**         | `guardrail_checks` table + `passRate` query (§4.8)                                        |
| 6   | Acceptance: a test suite feeds the guardrail deliberately corrupted outputs (wrong amounts, invented tickers, fake citations) — **100% caught**              | **Yes**         | Corrupted-output suite: **22/22 caught** (§7.1)                                           |
| 7   | Acceptance: guardrail pass rate becomes the factual-grounding metric                                                                                         | **Yes (wired)** | `passRate` — overall and per feature; Phase 5 consumes it (§4.8)                          |
| 8   | Acceptance: CI green                                                                                                                                         | **Not yet**     | Merged locally but unpushed; no CI run exists (§7.3)                                      |
| 9   | Acceptance: live-verified                                                                                                                                    | **Not yet**     | No deploy, no OpenRouter key (§7.4, §10)                                                  |

---

## 3. Architecture — how Phase 3 fits the system

### 3.1 Where the code lives

```
FinVerse-AI/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma                       GuardrailCheck model
│   │   │   └── migrations/
│   │   │       └── 20261121140000_add_guardrail_checks/migration.sql
│   │   └── src/
│   │       └── ai/                                 (Phase 1/2 module, extended)
│   │           ├── ai.guardrail.ts                 NEW — the pure verification
│   │           │                                   engine (1,049 lines)
│   │           ├── ai.guardrail.service.ts         NEW — verify + fail-open logging
│   │           ├── ai.guardrail.repository.ts      NEW — check log + passRate
│   │           ├── ai.guardrail-templates.ts       NEW — 4 template builders
│   │           ├── ai.guardrail.spec.ts            NEW — 45 tests (incl. the
│   │           │                                   21-case corrupted suite)
│   │           ├── ai.guardrail-flow.spec.ts       NEW — 5 flow tests
│   │           ├── ai.guardrail-templates.spec.ts  NEW — 13 template tests
│   │           ├── ai.guardrail.repository.spec.ts NEW — 5 repository tests
│   │           ├── ai.service.ts                   + guardedAnswer on all four
│   │           │                                   LLM paths; verification state
│   │           │                                   on every response
│   │           ├── ai.prompts.ts                   + guardrailCorrectionPrompt
│   │           ├── ai.module.ts                    GuardrailService +
│   │           │                                   GuardrailCheckRepository
│   │           ├── ai.service.spec.ts              (expectations updated)
│   │           ├── ai.http.spec.ts                 +1 test (template on double
│   │           │                                   failure, at the HTTP layer)
│   │           ├── ai.prompts.spec.ts              +2 tests (correction prompt)
│   │           └── ai.rag.spec.ts                  (expectations updated)
│   └── web/
│       ├── app/(module-one)/dashboard/ai-chat.tsx  + VerificationNote component
│       ├── lib/ai.ts                               VerificationState type +
│       │                                           response validation
│       └── test/ai.test.mjs                        +1 test (verification state)
```

Two things about this tree are worth noting. First, the guardrail is
entirely inside the existing `ai` module — no new NestJS module, no new
controller, no new endpoint. The guardrail is a layer the AI service
calls, not a service the user calls. Second, the verification engine
(`ai.guardrail.ts`) is pure: no I/O, no database access, no model
calls. Persistence lives one layer out, in the service and repository.
That separation is what makes the corrupted-output suite fast and
deterministic — it tests a function, not a system.

### 3.2 The guarded answer, end to end

```
Model returns a structured answer (AiAnswer: prose + claims + evidence)
    │
    ▼
guardedAnswer (ai.service.ts) — runs on ALL FOUR LLM paths
    │  refused? ──yes──▶ return as-is, verification: refused
    │                    (a refusal has no claims to check)
    ▼
GuardrailService.verify(answer, context, attempt = 1)
    │  verifyAnswer (pure): every claim checked against the evidence
    │  of THIS request — the tool results the model was shown, the
    │  chunks actually retrieved, the screen that actually ran.
    │  Every check row is logged to guardrail_checks (fail-open).
    ▼
All checks pass? ──yes──▶ return the model answer,
    │                          verification: verified (N checks passed)
    no
    ▼
ONE retry: the same messages + the model's answer +
guardrailCorrectionPrompt(failures) — names each failed claim,
why it failed, and the correct value (capped at 8 failures).
    │
    ▼
GuardrailService.verify(retry, context, attempt = 2)
    │
    ▼
All checks pass? ──yes──▶ return the retry,
    │                          verification: verified (N checks passed)
    no
    ▼
Template fallback: one of four builders (chat / explain-stock /
explain-news / screen) generates an answer from the verified
numbers only. verification: template (with the failed counts).
    │
    ▼
The user NEVER sees the twice-failed model text.
```

Three properties of this flow matter most. **The guardrail checks
against the evidence of the request, not against a fresh fetch**
(§6.2). **The retry is a correction, not a repetition** — the prompt
names the failures and the correct values. And **the template is the
floor, not the ceiling** — it guarantees the user always gets something
true, which is what makes "never show an unverified claim" a property
of the system rather than a hope about the model.

---

## 4. What was built — module by module

### 4.1 Schema and migration (`20261121140000_add_guardrail_checks`)

One new table, `guardrail_checks`, added to the Prisma schema as
`GuardrailCheck`:

| Column        | Type             | Purpose                                                                               |
| ------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `id`          | `TEXT` (cuid)    | Primary key                                                                           |
| `request_id`  | `TEXT`           | Groups all checks of one answer                                                       |
| `user_id`     | `TEXT`           | Owner of the request. FK to `User(id)`, `ON DELETE CASCADE`                           |
| `feature`     | `TEXT`           | Which LLM path: `'chat'`, `'explain-stock'`, `'explain-news'`, `'screen'`             |
| `attempt`     | `INTEGER`        | 1 = first answer, 2 = retry — so Phase 5 can measure whether the retry fixes anything |
| `claim_text`  | `TEXT`           | The claim that was checked                                                            |
| `source_tool` | `TEXT`           | The tool the claim cited                                                              |
| `check_type`  | `TEXT`           | `'source'`, `'value'`, `'text'` or `'citation'`                                       |
| `expected`    | `TEXT`, nullable | The verified value as text                                                            |
| `actual`      | `TEXT`, nullable | The claimed value as text                                                             |
| `verdict`     | `TEXT`           | `'pass'` or `'fail'`                                                                  |
| `created_at`  | `TIMESTAMP`      | When the check ran                                                                    |

Indexes on `user_id`, `feature` and `request_id` — the three ways Phase
5 will query the table (per-user, per-feature pass rates, and
reconstructing one answer's checks).

Unlike the Phase 2 RAG migration, this one has no intentional drift:
the table has no vector column, so the typed Prisma client works
directly and `prisma migrate diff` stays clean. The migration applies
through the deploy's `prisma migrate deploy` step — with one new
uncertainty recorded in §9: the remote has since moved toward Netlify
Functions, and the application path needs re-confirming once the
team's deployment decision settles.

### 4.2 The verification engine (`ai.guardrail.ts`, 1,049 lines)

`verifyAnswer(answer, context)` takes a parsed structured answer and a
`GuardrailContext` — the evidence collected during the request — and
returns a `GuardrailResult`: `passed`, every check row, the failures,
and the pass/fail counts. It is pure: no I/O, no database, no
re-fetching.

**The context** carries the `requestId`, `userId` and `feature`, plus
`toolResults` (a map from tool name to the results that tool returned),
`chunks` (the chunks actually retrieved, normalised to
`GuardrailChunk`), and `screen` (the deterministic screen response,
screen path only). Two normalisers build the chunk list:
`chunksFromRetrieved` for raw retrieval and `chunksFromToolResults`
for `searchKnowledge` results (truncated content — the model only ever
saw the truncated text in chat, so the guardrail checks against the
same text).

**The four check types.** Every claim produces one or more check rows:

| Check type | What it proves                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `source`   | The cited tool is a real citation tool (one of the 9 in `CITATION_TOOLS`) **and** it actually ran in this request |
| `value`    | Every numeric value in the claim matches the tool result, by field name, within the tolerance for its kind        |
| `text`     | Every significant number in the claim's prose agrees with the claim's own declared values (§4.4)                  |
| `citation` | For knowledge claims, the cited title/date/symbol matches a chunk actually retrieved (§4.5)                       |

**Field-name matching is the engine's central idea.** A numeric value
is never checked by asking "does this number appear anywhere in the
tool result?" — it is checked by field name: the claim's `totalSpent`
is compared against the tool result's `totalSpent`, and only that.
That is what catches swapped numbers. If the model states the budgeted
figure as the spent figure, the number _does_ appear in the tool
result — under `totalBudgeted` — so a "number appears somewhere" check
would pass it. Field-name matching fails it, with the detail:
`'totalSpent' was 10000 but the tool result says 8200.`

**Scoped elements catch swaps of a different kind.** Tool results
contain arrays — budget categories, holdings, goals, screened stocks —
and the engine flattens them into named elements (identified by `name`,
`symbol`, `category` or `title`). When a claim names an element, its
numbers are checked against **that element only**, so attributing
Food's spending to Transport fails even though both numbers exist in
the result. An exact identifier match wins; a unique prefix match is
accepted; an ambiguous prefix does not scope at all. Unscoped claims
fall back to the global scalars, so an honest unscoped claim can still
pass.

**Aliases, with a deliberate absence.** The model plausibly uses labels
that differ from the tool's field names — `pe` for `trailingPE`,
`change` for `changePercent`, `rsi` for `rsi14`, `52weekhigh` for
`fiftyTwoWeekHigh`. `KEY_ALIASES` maps these, but only when the literal
key is **not** in the evidence — an alias can never override a real
field. And `'total'` is deliberately absent: it is ambiguous between
totals, and guessing which total the model meant would reintroduce
exactly the swap the engine exists to catch.

**What is not checked.** Booleans and nulls carry no verifiable
substance and are skipped. A claim with no verifiable values at all
fails outright rather than passing vacuously. And a refusal skips
verification entirely and returns `passed: true` with zero checks.

### 4.3 Tolerances — exact money, ±0.1 for the rest

| Kind                                                 | Tolerance                                             | Why                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money (₹ amounts)                                    | **Exact, to the paise** (`MONEY_TOLERANCE_PAISE = 0`) | The tools return rupee values rounded to 2 decimals and the model is instructed to copy them exactly, so any difference is a real error. A ₹1 error on ₹8,200 is a wrong number, not a rounding artefact. The corrupted suite pins this with a one-paise error case. |
| Percentages, ratios, index values (RSI, P/E, yields) | **±0.1 absolute points** (`PERCENT_TOLERANCE = 0.1`)  | The tools round these to 2 decimals and the model legitimately restates them to 1 decimal (55.55 → 55.6). 0.1 absorbs that restatement while still catching a genuinely wrong figure (55.55 → 56.5 fails).                                                           |

The kind of a field is decided by its name (`kindOfKey`): anything
containing `percent`, `pct`, `ratio` or `yield`, the exact keys
`rsi`/`rsi14`/`pe`, and anything containing `trailingpe`/`forwardpe`
is a percentage-kind field; everything else is money. That works
because the tool layer's field names are stable and controlled by this
project. One more tolerance lives in the text-number matcher: prose
numbers are compared with `±0.1` widened by a relative term (`1e-9`
of the magnitude) for very large numbers, so float noise at 1e13 does
not fail a correct market-cap restatement ("17.6 lakh crore").

The tolerances are exported constants, not environment variables:
they are correctness policy, not configuration. Changing them changes
what "verified" means, so they belong in code review, not in a
dashboard.

### 4.4 Numbers in the prose — the check the user actually reads

The claims are structured data; the user reads the prose. A model
could file perfect claims and then write an answer that contradicts
them — or smuggle in a number no claim cites. Phase 3 checks the prose
too, at two levels (a separate commit, `984a9e2`, because it is a
separate idea from claim verification).

**`extractTextNumbers`** finds the significant numbers in free text:
rupee amounts (₹/Rs/INR, with Indian grouping — `1,20,000`),
percentages, decimals, and integers of 3+ digits. It expands Indian
units (`lakh`, `crore`, `thousand`, `lakh crore`) to their literal
values, handles negative amounts, and strips ISO dates first. What it
skips matters as much: bare small integers (counts, periods, "RSI
(14)", "20-day") and years (1900–2100) are labels, not values.

**Claim text** is checked against the claim's **own declared values**
(or the element it is about) — never against the whole tool result.
This is the same swap trap as §4.2, in prose form: "spent ₹10,000"
would match the budgeted figure if the whole result were searched. A
number in the prose that is not in the claim's values is unsupported —
and the retry teaches the model to cite it.

**Answer text** is checked against the union of all declared values,
scoped elements and cited articles, with `claimIndex: -1` marking
answer-level checks. An unclaimed number in the prose the user reads is
a failure even when every claim checks out.

### 4.5 News and screen claims are scoped to what was retrieved

The two Phase 2 paths need different evidence, and the engine treats
them as separate cases rather than forcing them through the tool path.

**`searchKnowledge` claims** are verified against the retrieved
chunks, not against numeric fields. The citation must match a chunk
actually retrieved: the title (substring match in either direction,
both sides at least 10 normalised characters), the date (compared by
day), and the symbol (compared ignoring the exchange suffix —
`RELIANCE` matches `RELIANCE.NS`). Any number in the claim must appear
in the matched chunk's content, because the article is the number's
source. When the claim names no title, date or symbol, the engine
falls back to content matching on any long string value.

**`screenStocks` claims** are verified against the deterministic screen
— and only against the **matched rows**, never the filters. The screen
is flattened into elements (one per matched stock, identified by
symbol) plus count scalars (`matchCount`, `count`, `matches`,
`universe`). A claim about a stock outside the universe fails because
no element exists for it; a claim citing the screener when no screen
ran fails at the source check. The citation name is `screenStocks`
(the name the screen path reports in `toolsUsed`), distinct from the
tool's registry name `applyScreenerFilters` — the guardrail judges
citations, and the citation is what the answer claims its source to be.

### 4.6 The correction prompt and the one retry

`guardrailCorrectionPrompt` (in `ai.prompts.ts`) builds the retry
prompt from the failed check rows: each failed claim with why it
failed and the correct value, then an instruction to reply with only
the JSON object using the correct values — and to drop any claim it
cannot support. Three details matter. The prompt names the failed
claims **and the correct values** — the model is not asked to
re-derive anything. It is capped at 8 failures, so one bad answer
cannot flood the prompt. And its last instruction gives the model an
honourable exit: a shorter correct answer beats a longer answer that
fails verification again.

The retry is one round trip: the original messages, plus the model's
failed answer as an assistant message, plus the correction prompt as a
user message, verified with `attempt: 2`. There is no third attempt —
two failures mean the model cannot fix this answer, and the template
takes over.

Two boundaries are preserved from Phase 1. **Refusals skip the whole
flow**: a refused answer returns immediately with verification status
`refused`. And **malformed JSON keeps the existing behaviour**:
`structuredAnswer` throws `AiUnverifiableError` and the caller falls
back to raw computed metrics. The template applies only to valid JSON
that fails verification — a parse failure is a different fault with a
different fallback.

### 4.7 Template fallback — verified numbers, in prose

`ai.guardrail-templates.ts` (377 lines) holds four builders, one per
LLM path. Every builder is pure and defensive: unknown input shapes
degrade to fewer sentences, never to invented numbers.

| Builder                | Input                                           | Output                                                                                                                                                      |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chatTemplate`         | The snapshot metrics (budget, goals, portfolio) | Budget spent/budgeted/remaining, over-budget categories, goals saved/target with per-goal progress (top 4), portfolio value/invested/gain-loss              |
| `explainStockTemplate` | Symbol + computed fundamentals                  | Price with previous close and change, technicals (RSI, SMA-20/50, 1-month change), fundamentals (P/E, 52-week range) — each section degrading independently |
| `explainNewsTemplate`  | Symbol + retrieved chunks                       | The retrieved articles by title and date (top 5); "No recent news was found" when there are none                                                            |
| `screenTemplate`       | The deterministic screen                        | The match count, then the top 3 matched stocks with price, RSI and 1-month change                                                                           |

Two structural rules keep template output verifiable **by
construction**:

1. **The answer is the claim texts joined** — so every number in the
   prose is in some claim's values. (The news template prefixes "Recent
   news for {symbol}: " before the joined claims; the prefix carries
   no numbers.)
2. **Every value in every claim is copied verbatim from the evidence
   with the tool's own field names** — so the guardrail would pass this
   output if it were re-checked.

Rule 2 is pinned by tests: each builder's spec includes an invariant
test that runs its own output back through `verifyAnswer` against the
same evidence and asserts it passes (§7.1). The template is provably
verifiable, which is what lets the system serve it without a second
verification pass. The builders also know what they cannot state
exactly: a market cap in crores would be a rounded restatement in
prose, so the explain-stock template states the P/E and the 52-week
range in prose while the market cap (and dividend yield) ride in the
claim's evidence values only. Signed values keep their sign with the
number (`+₹5,000`, `−0.78%`) so the text matches the declared value.

### 4.8 Check logging and the Phase 5 metric

`GuardrailCheckRepository` persists the check log with a single
`createMany` per verification (skipped when there are no checks — a
refusal logs nothing), writing the context (request, user, feature,
attempt) with every row's claim, tool, type, expected, actual and
verdict. `passRate(feature?)` is the Phase 5 query: total checks,
passed, failed, and the rate — overall, or scoped to one feature. It
returns `rate: null` when nothing has been logged yet, rather than 0,
because "no data" and "everything failed" are different facts.

`GuardrailService` — the injectable seam between the AI service and
the pure engine — wraps verification with **fail-open logging**: the
check rows are metrics, not the verdict. If the database write fails,
the service logs a warning (so a metrics gap is visible instead of
silent) and returns the verification result anyway. A database outage
must never fail an answer the guardrail already verified — or one it
already rejected. The verdict is computed in memory; the log is a
record of it, and a missing record must not change the outcome.

### 4.9 Wiring into all four LLM paths

`guardedAnswer` is called from all four LLM paths in `AiService`. Each
path builds its own guardrail context from the evidence it already
has, and supplies its own template builder:

| Path            | Method                                     | Context built from                                                                                  | Template on double failure        |
| --------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------- |
| Chat            | `chat` → `chatWithModel`                   | Tool results collected during the tool loop (per tool name) + chunks from `searchKnowledge` results | `chatTemplate` (snapshot metrics) |
| Explain a stock | `explainStock` → `explainWithModel`        | The computed fundamentals, under `getStockFundamentals` + retrieved profile chunks                  | `explainStockTemplate`            |
| Explain news    | `explainNews` → `explainNewsWithModel`     | Retrieved chunks for the symbol                                                                     | `explainNewsTemplate`             |
| NL screener     | `screenByQuery` → `screenByQueryWithModel` | The deterministic screen response                                                                   | `screenTemplate`                  |

The chat path is the only one where the context is assembled during a
tool loop: each tool result is recorded by tool name as the loop runs,
so the context holds exactly the data the model was shown. The explain
paths build their context from the single computation they already
performed. In every path, the guardrail never re-fetches data itself.

Every AI response now includes a `verification` state:

| Status        | Meaning                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| `verified`    | Every claim checked out — with `checksPassed` / `checksFailed` counts                   |
| `template`    | The model answer failed verification twice; the summary was built from verified numbers |
| `refused`     | The model declined (no checks run)                                                      |
| `unavailable` | No model answer at all (raw-metrics fallback)                                           |

When the answer is a template, the response's `model` field is `null` —
the answer was not produced by a model. No new endpoint was added: the
guardrail is a layer inside the existing four endpoints, not a fifth
one.

### 4.10 The web UI — the user sees the check

The chat UI gained a `VerificationNote` component (`ai-chat.tsx`),
rendered under every answer:

- **Verified answers** show a green line: "✓ Verified against your
  data (N checks passed)" — the count comes from the response, so the
  user sees how much was checked, not just that something was.
- **Template answers** show a note box: "The AI's explanation didn't
  pass verification, so this summary was generated from your verified
  numbers instead." The system tells the user what happened rather
  than silently substituting a duller answer.
- **Refusals and raw-metrics fallbacks** show no note — there is
  nothing to report.

`lib/ai.ts` gained the `VerificationState` type and validation: the
response validator now requires a well-formed verification object,
so a backend that forgot to verify would fail validation on the
frontend rather than render an answer with an unknown verification
state.

---

## 5. Configuration

Phase 3 adds **no new environment variable and no new secret**. The
guardrail needs no provider, no key and no endpoint — it is pure
computation over evidence the system already holds. The only
configuration-like values are the two tolerance constants, deliberately
constants in code (§4.3), not environment variables.

| Value                       | Where             | Purpose                                                    |
| --------------------------- | ----------------- | ---------------------------------------------------------- |
| `MONEY_TOLERANCE_PAISE = 0` | `ai.guardrail.ts` | Money must match exactly, to the paise                     |
| `PERCENT_TOLERANCE = 0.1`   | `ai.guardrail.ts` | Percentages, ratios and index values: ±0.1 absolute points |
| `CITATION_TOOLS` (9 tools)  | `ai.guardrail.ts` | The tools a claim may legitimately cite                    |

The deployment story therefore does not change: the same Render
backend environment, the same key, the same build command. The only
deployment artefact is the migration (§4.1).

---

## 6. Decisions taken

| #   | Decision                                                                                                           | Options considered                                  | Why this one                                                                                                                           | Decided by                                              |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Verification runs against the **evidence the model was shown**, not a re-fetch                                     | Re-fetch every value (the plan's wording)           | A re-fetch can return different numbers than the model saw; judging the model against numbers it never saw fails honest answers (§6.2) | Implementation decision, plan wording refined           |
| 2   | Money **exact to the paise**; percentages/ratios **±0.1**                                                          | A uniform tolerance; exact everywhere               | Money is copied, so any difference is an error; percentages are legitimately restated to 1 decimal (§4.3)                              | Per plan                                                |
| 3   | Values matched **by field name**, never by "the number appears somewhere"                                          | Number-presence matching                            | Presence matching cannot catch swapped numbers — both numbers are real (§4.2)                                                          | Implementation decision, test-pinned                    |
| 4   | Claims **scoped to the named element** (category/symbol/goal)                                                      | Check against the whole tool result                 | Whole-result checking cannot catch category or symbol swaps (§4.2)                                                                     | Implementation decision, test-pinned                    |
| 5   | **The prose is checked too** — claim text and answer text, not just structured values                              | Check only the structured values                    | The user reads the prose, not the claims (§4.4)                                                                                        | Implementation decision                                 |
| 6   | Check log in a **database table** (`guardrail_checks`)                                                             | Application logs only                               | Phase 5 needs to query the pass rate; logs cannot be queried that way (§4.8)                                                           | Per plan (Phase 5 metric)                               |
| 7   | Logging is **fail-open** — a failed write never fails the answer                                                   | Fail-closed (a logging failure fails the request)   | The check rows are metrics, not the verdict (§4.8)                                                                                     | Implementation decision                                 |
| 8   | Double failure → **template fallback**, not a refusal                                                              | Refuse after the second failure                     | The system can answer truthfully from verified numbers; refusing wastes a working deterministic layer (§6.3)                           | Per plan                                                |
| 9   | **One retry**, with a correction prompt naming failures and correct values (capped at 8)                           | Unlimited retries; a bare "try again" prompt        | One correction fixes a copying error; more rounds burn tokens and latency for diminishing returns                                      | Per plan (one retry); cap is an implementation decision |
| 10  | **Refusals skip verification**                                                                                     | Verify refusals and count them                      | A refusal has no claims to check; counting it would corrupt the Phase 5 pass rate (§4.2)                                               | Implementation decision                                 |
| 11  | **Malformed JSON keeps the raw-metrics fallback**; the template applies only to valid JSON that fails verification | Template for all failures, including parse failures | A parse failure and a verification failure are different faults (§4.6)                                                                 | Implementation decision                                 |
| 12  | The verification state is **surfaced in the UI** (verified/template, with counts)                                  | Verify silently and show nothing                    | The user deserves to know whether the answer was checked (§4.10)                                                                       | Implementation decision                                 |
| 13  | Tolerances are **constants in code**, not environment variables                                                    | Configurable tolerances via env vars                | They define what "verified" means; changing them belongs in code review (§5)                                                           | Implementation decision                                 |

### 6.2 Verifying against shown evidence, not a re-fetch

The plan's wording says: "for every numeric claim, re-fetch the value
from the deterministic layer and compare." The implementation compares
against the tool results collected during the request instead of
re-fetching. The difference is small and the reason is worth recording,
because it is the one place Phase 3 refined the plan rather than
following it literally.

A re-fetch answers a different question than the one the guardrail
should ask. The guardrail's question is: _did the model faithfully
report the evidence it was given?_ A re-fetch asks: _does the model's
claim match the current state of the world?_ Those agree when the data
is static, but they diverge for live data: a stock price can move
between the tool call and the verification, and a re-fetch would then
fail an honest answer that correctly reported the price the model was
shown. Worse, a re-fetch reintroduces the failure modes the
deterministic layer already solved — cache misses, provider errors,
latency — inside a verification step that should be pure and instant.

Verifying against the collected evidence also makes the check
reproducible: the same answer against the same evidence always yields
the same verdict, which is what makes the corrupted-output suite
deterministic. The plan's acceptance criterion is still met: the
evidence _is_ the deterministic layer's output for this request,
captured at the moment the model saw it. The deviation is in mechanism,
not in meaning, and the mechanism is the more correct one.

### 6.3 Template fallback instead of refusal

The plan already specifies the template fallback, so this decision is
recorded here for its reasoning rather than its novelty. After two
failed verifications, the system knows three things: the question, the
verified numbers that answer it, and that the model cannot be trusted
with those numbers right now. Refusing would discard the second fact
along with the third. The template keeps it: the user gets the numbers
in plain prose, with a note saying the AI's explanation did not pass
verification. Withholding an answer the system has does not make the
user safer, only less informed — the honest behaviour is to show the
verified numbers and say how they were produced.

---

## 7. Verification

Verification was re-run independently by me after the build — not taken
from the builder's report — following the standing rule earned in Phase
2: the full root suite, including e2e, before any merge is called done.

### 7.1 Tests

| Suite                                 | Result                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| Backend Jest (`apps/backend`)         | **513 / 513 passed** (442 existing + 71 new, 37 suites) |
| Web tests (`apps/web`, `node --test`) | **63 / 63 passed** (62 existing + 1 new)                |
| End-to-end (`test:e2e`)               | **3 / 3 passed**                                        |

The 71 new backend tests break down as follows (counts measured from
the spec files at `e4995f3`):

| Spec file                         | Tests  | What it pins down                                                                                                                                  |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai.guardrail.spec.ts`            | 45     | The engine: 13 legitimate pass, 21 corrupted caught, 3 answer-prose checks, 5 extraction cases, 3 chunk normalisers                                |
| `ai.guardrail-templates.spec.ts`  | 13     | The four builders — content, degradation, and the verification invariant (each template's output passes `verifyAnswer`)                            |
| `ai.guardrail.repository.spec.ts` | 5      | Check logging (persist all rows, skip empty writes) and `passRate` (overall, per-feature, null when empty)                                         |
| `ai.guardrail-flow.spec.ts`       | 5      | Retry-then-verified, double-failure-then-template, refusals skip verification, explain-stock verification, corrupted citation reaches the template |
| `ai.http.spec.ts` (+1)            | 1      | The template answer at the HTTP layer, when the guardrail fails twice                                                                              |
| `ai.prompts.spec.ts` (+2)         | 2      | The correction prompt names failed claims and correct values, and caps at 8 failures                                                               |
| **Total new (backend)**           | **71** |                                                                                                                                                    |
| `ai.test.mjs` (+1, web)           | 1      | The response validator accepts and validates all four verification states                                                                          |

**The corrupted-output suite — 22/22 caught (100%).** The plan's
acceptance criterion, met exactly. Twenty-one cases run at the engine
level, and one runs at the flow level (a corrupted citation caught
end-to-end, through retry, reaching the template):

| #   | Corrupted output                                           | What catches it                                                    |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | A wrong amount                                             | Value check                                                        |
| 2   | A swapped number (budgeted stated as spent)                | Field-name matching (§4.2)                                         |
| 3   | A swapped number in the claim text                         | Claim-text check (§4.4)                                            |
| 4   | A category swap (Food spending attributed to Transport)    | Scoped-element matching (§4.2)                                     |
| 5   | An invented ticker                                         | The symbol is not in the tool result                               |
| 6   | A claim citing a tool that was never called                | Source check                                                       |
| 7   | A claim citing an invented tool                            | Source check: not in `CITATION_TOOLS`                              |
| 8   | A fake news citation (invented title)                      | Citation check: no chunk matches                                   |
| 9   | A real title with a wrong date                             | Citation check: date mismatch                                      |
| 10  | A news claim when nothing was retrieved                    | Source check: empty chunk list                                     |
| 11  | A number the article never stated                          | Value check against chunk content                                  |
| 12  | A wrong screener metric                                    | Value check against the screened row                               |
| 13  | A screener claim about a stock outside the universe        | No element exists for the symbol                                   |
| 14  | A screener claim with no screen in the request             | Source check: no screen in context                                 |
| 15  | A one-paise money error                                    | Money is exact (§4.3)                                              |
| 16  | A percentage outside the ±0.1 tolerance                    | Percentage tolerance (§4.3)                                        |
| 17  | An RSI outside the ±0.1 tolerance                          | Index-value tolerance (§4.3)                                       |
| 18  | A claim with no verifiable values at all                   | Fails outright (§4.2)                                              |
| 19  | A value the tool never returned                            | Value check: field absent                                          |
| 20  | A non-refused answer with no claims                        | Fails: nothing to verify                                           |
| 21  | One bad claim among good ones                              | The whole answer fails — the user reads the answer, not the claims |
| 22  | (Flow level) A citation of a tool never called, end to end | Caught, retry fails, template served — never the unverified text   |

The suite also proves the guardrail does not over-fire: 13 legitimate
answers pass, including a 1-decimal restatement of a percentage and of
a P/E ratio (the tolerance working as intended), a market-cap claim
written in lakh crore (the unit expansion working), period labels,
years and counts in prose (the extraction skips working), a news claim
citing the retrieved title and date, and a refusal passing with zero
checks.

As in Phases 1 and 2, all tests use mocked providers and a mocked
`PrismaService` — no test calls a real model, no test writes to a real
database, and no test contains an API key. The repository tests
therefore prove the _logging logic_, not that the SQL executes against
Neon — that is an open item (§10).

### 7.2 Static checks and builds

| Check                                   | Result                   |
| --------------------------------------- | ------------------------ |
| Backend type-check (`tsc --noEmit`)     | Clean                    |
| Backend lint (`oxlint`)                 | **0 warnings, 0 errors** |
| Prettier (`format:check`)               | Clean                    |
| Web type-check (`check-types`)          | Clean                    |
| Web lint (ESLint)                       | Clean (0 warnings)       |
| NestJS production build (`nest build`)  | OK                       |
| Next.js production build (`next build`) | OK                       |

### 7.3 CI — not run yet

There is no CI run for this phase. CI runs on pushes to `main` (and on
pull requests), and Phase 3 has not been pushed. The local verification
above is the same gate CI runs, so the push is expected to pass — but
"expected to pass" is not "passed", and this document does not claim
otherwise.

### 7.4 Live verification — pending

Nothing in this phase has been verified live. The guardrail has never
run against a real model call (no OpenRouter key yet), no check row has
been written to prod Neon (no deploy yet), and the verification badge
has never been seen in a live browser session. What the tests prove is
that the engine catches the 22 corrupted outputs and passes the 13
legitimate ones; what they cannot prove is how often a real model
trips the guardrail, whether the correction prompt fixes it, or what
the real pass rate looks like. Those are the smoke test in §10.

---

## 8. Problems faced and fixes

None. This phase is the first in the project where the build passed
every gate cleanly on the first verification run: 513 backend tests,
3 e2e, 63 web, all static checks and both builds green, with no CI
failure, no defect and no rework. That is worth recording plainly
rather than inventing incidents to fill the section — a clean build is
a fact about the phase, and about the verification discipline that
produced it.

Two details qualify the clean record honestly. First, the final commit
(`e4995f3`, ~14:41 IST) is a style commit: it fixed an oxlint warning
and prettier formatting across 8 files (+77 / −109 lines). That is
normal finishing work, not a defect — both were caught by the local
gate before the merge, which is what the gate is for. Second, the
Phase 2 lesson was applied rather than re-learned: the full root suite,
including e2e, was run before the merge, so the class of bug that broke
Phase 2's first CI run (a wiring defect invisible to unit tests) was
checked for here and not found.

---

## 9. Deployment

| Event                    | Time (IST)  | Detail                                                                            |
| ------------------------ | ----------- | --------------------------------------------------------------------------------- |
| Phase 3 built            | 14:19–14:41 | 8 commits, branch `feat/phase-3-guardrails`, head `e4995f3`                       |
| Phase 3 locally verified | ~14:48      | Backend 513/513, e2e 3/3, web 63/63, static checks + builds clean (§7)            |
| Phase 3 merged to `main` | ~14:48      | Fast-forward, `main` `1f22aff`..`e4995f3`; branch deleted                         |
| **Push**                 | **Pending** | Not pushed at the time of writing — a PAT is needed, and see the divergence below |
| CI                       | Not run     | No run exists until the push lands (§7.3)                                         |
| Live verification        | Not done    | No deploy, no OpenRouter key (§7.4, §10)                                          |

**The divergence (found while writing this document, ~15:00 IST).**
While verifying the remote state for this section, I found that `main`
on the remote has moved past the point this work was based on. Four
commits landed on the remote between 11:04 and 12:30 IST on 21
November, from my teammates (Sarthak Thapliyal and Vidish Bijalwan):

| Time (IST) | Hash      | Message                                                      |
| ---------- | --------- | ------------------------------------------------------------ |
| 11:04      | `42de48c` | chore: configure local setup for Neon                        |
| 12:11      | `dd3c87c` | feat: run NestJS backend as a Netlify Function (drop Render) |
| 12:20      | `dcfb1e3` | fix: make Netlify function bundling work (drop Render)       |
| 12:30      | `003c1a3` | fix(web): join BACKEND_URL path instead of discarding it     |

Local `main` and remote `main` have therefore diverged: 9 commits
local-only (the sample UI `1f22aff` + the 8 Phase 3 commits) and 4
commits remote-only. The push cannot be a fast-forward; it needs a
pull and merge (or a rebase) first, and that reconciliation is part of
the push, not a separate task.

The remote commits also change the deployment story this document was
written against. Two of them say "drop Render": the backend is being
moved to Netlify Functions. If that move stands, the Render build
command — including the `db:migrate` step that has applied every
migration since 19 November — will no longer run, and the
`guardrail_checks` migration will need a different application path
(a Netlify build step, a manual `prisma migrate deploy`, or a
migration run from a developer machine). The migration itself does
not change; the mechanism that applies it does. This document records
the Render path as the path that existed when Phase 3 was built, and
flags the Netlify move as the open question in §10 — the team's
deployment decision, not this phase's code, will settle it. The web
service dashboard fault (§10 of the Phase 2 document) is likewise
affected: if Render is dropped, the fault disappears with the
platform, but that is the team's call to confirm, not mine to declare.

**Migration behaviour (as designed).** When the push lands and a
deploy runs on the Render backend, the build command's `db:migrate`
step will apply `20261121140000_add_guardrail_checks` to Neon, and the
`&&` chain means a failed migration fails the whole build — a green
deploy is the evidence the migration applied, as in Phases 0 and 2.
If the deploy runs on Netlify instead, the equivalent step must exist
there before the first guarded request, or the check logging will fail
open (verified answers, an empty log, and warnings in the logs).
Fail-open logging (§4.8) is what makes that a metrics gap rather than
an outage.

Live services (Render free tier, as of writing): the backend
(`finverse-ai-r050.onrender.com`) still serves the Phase 2 code
(`ce9edaa`); the guardrail is not deployed. The web service still
serves the backend instead of the website (the dashboard fault from
19 November).

---

## 10. What is still open or unverified

1. **The push, and the divergence.** Phase 3 is merged locally but not
   pushed, and `main` has diverged from the remote (§9). The push
   needs a classic PAT (the standing rule: used once via stdin, then
   discarded) and a pull-and-merge or rebase against the four
   remote-only commits first. Until the push lands, there is no CI run
   and no deploy.
2. **CI has not run on this phase.** The local gate is the same suite
   CI runs, and it passed — but CI is the project's record, and it
   does not exist yet for `e4995f3`.
3. **No real model answer has been verified.** The corrupted-output
   suite proves the engine catches bad outputs, but the behaviour that
   matters most — how often a real model trips the guardrail, whether
   the correction prompt fixes it, what the real pass rate is — is
   entirely unmeasured. The live smoke test needs the OpenRouter API
   key in the backend environment (Sarthak Thapliyal was to provide it
   by the evening of 19 November; as of writing I do not have
   confirmation that it has been provided) plus a logged-in user, and
   must check: a chat answer showing "✓ Verified against your data",
   a wrong model answer being corrected by the retry, a double failure
   producing the template answer with its note, and check rows
   appearing in `guardrail_checks`.
4. **The check-log SQL has never executed against a real database.**
   The repository tests mock `PrismaService`. The `createMany` call
   and the `passRate` counts are typed Prisma, so the risk is low —
   but the first real write is still the smoke test, not the suite.
   If the migration has not applied by then, the fail-open logging
   will swallow the writes; the smoke test must check the table, not
   just the answers.
5. **The migration's application path is uncertain.** The Render build
   chain's `db:migrate` step has applied every migration so far, but
   the remote commits say the backend is moving to Netlify Functions
   (§9). Until the team's deployment decision settles, nobody can say
   which mechanism will apply `20261121140000_add_guardrail_checks`.
6. **The verification badge has never been seen in a live browser
   session.** Build-, type- and lint-verified, but no one has opened
   the dashboard chat logged in and watched the "✓ Verified" line or
   the template note render. Part of the smoke test.
7. **The `BETTER_AUTH_URL` localhost misconfiguration** (parked at my
   request) will break session verification and login in production,
   and it blocks comfortable real-user testing — the smoke test needs
   a logged-in user, and login depends on this fix. If the backend
   moves to Netlify, the variable needs setting there too.
8. **The web service dashboard fault** (found 19 November ~14:10 IST)
   may be moot if Render is dropped — but until the team confirms the
   move, the fault stands: the web service serves the backend instead
   of the website, and the chat UI cannot be reached in production.
9. **The correction prompt's real-world effectiveness is unknown.**
   The retry is tested with a mocked provider that returns a corrected
   answer on demand. Whether a real model actually fixes its claims
   when told the correct values is an empirical question the smoke
   test and Phase 5 will answer. The `attempt` column exists so Phase
   5 can measure it.

---

## 11. Lessons learned

1. **Check the prose, not just the claims.** The structured output is
   the machine-readable half of an answer; the user reads the other
   half. A guardrail that only checks claims would pass an answer
   whose sentences contradict its own evidence. Phase 3's prose
   checking (§4.4) exists because the thing being protected is the
   user's understanding, not the JSON.
2. **Judge the model against what it was shown.** The re-fetch
   question (§6.2) generalises: any verification that re-derives its
   evidence can disagree with the evidence the model used, and the
   disagreement punishes honest answers. Capture the evidence at the
   moment of use, and verify against the capture.
3. **A fallback must be provably correct, not probably correct.** The
   template invariant tests — each template's output run back through
   `verifyAnswer` — prove the floor rather than asserting it. Any
   future fallback in this project should carry the same kind of test:
   generate the fallback, verify it, assert it passes.
4. **Metrics are not the verdict.** Fail-open logging (§4.8) is a
   small decision with a large blast radius in the other direction: if
   logging were fail-closed, a database outage would take down every
   AI answer in the product. Separating "the thing" from "the record
   of the thing" is the right default for any observability feature.
5. **A clean build is earned by the gate, not by luck.** Phase 3
   passed every check on the first verification run, and the reason is
   visible in the history: the Phase 2 lesson (run the full suite,
   including e2e, before merging) was applied from the start, and the
   phase's own structure — a pure engine, tested as a function —
   made the suite fast enough to run often. The absence of a §8
   incident is the payoff of the §8 incident in Phase 2.
6. **Record the divergence the moment you find it.** The remote moved
   while this phase was being built, and I found it only because the
   deployment section of this document required checking the remote
   state. If the push had been attempted without that check, it would
   have failed with a non-fast-forward error and cost a round trip.
   Checking the remote before pushing — like running the full suite
   before merging — is now part of the routine.

---

## 12. Appendix

### 12.1 Commit table

Times are IST, converted from the commit timestamps in the repository.
Files and lines are the per-commit diff.

| Time      | Hash      | Message                                                        | Change                     |
| --------- | --------- | -------------------------------------------------------------- | -------------------------- |
| 14:19     | `67b5f87` | feat(phase-3): add guardrail_checks table for check logging    | 2 files, +55               |
| 14:22     | `f285fea` | feat(phase-3): deterministic claim verification engine         | 2 files, +1,754            |
| 14:22     | `8bd4556` | feat(phase-3): persist guardrail checks + correction prompt    | 5 files, +301              |
| 14:24     | `984a9e2` | feat(phase-3): also verify numbers in the answer prose         | 2 files, +132 / −34        |
| 14:26     | `4927093` | feat(phase-3): template fallback answers from verified numbers | 2 files, +731              |
| 14:31     | `9bc97e1` | feat(phase-3): wire the guardrail into every LLM answer path   | 6 files, +686 / −12        |
| 14:35     | `0b3d4e3` | feat(phase-3): surface verification state in the AI chat       | 3 files, +98               |
| 14:41     | `e4995f3` | style(phase-3): fix oxlint warning and prettier formatting     | 8 files, +77 / −109        |
| **Total** |           | **8 commits**                                                  | **20 files, +3,691 / −12** |

The range total (20 files, +3,691 / −12) is the diff total for
`1f22aff..e4995f3` and is exact; it differs from the sum of the
per-commit rows because later commits touch files created by earlier
ones (most visibly the style commit `e4995f3`). The branch was cut
from `main` at `1f22aff` and merged back by fast-forward at ~14:48
IST; the branch was deleted after the merge.

### 12.2 Full file list (`1f22aff..e4995f3`)

**Backend** (`apps/backend/`):

- `prisma/schema.prisma` (GuardrailCheck model)
- `prisma/migrations/20261121140000_add_guardrail_checks/migration.sql`
- `src/ai/ai.guardrail-flow.spec.ts` (5 tests)
- `src/ai/ai.guardrail-templates.spec.ts` (13 tests)
- `src/ai/ai.guardrail-templates.ts`
- `src/ai/ai.guardrail.repository.spec.ts` (5 tests)
- `src/ai/ai.guardrail.repository.ts`
- `src/ai/ai.guardrail.service.ts`
- `src/ai/ai.guardrail.spec.ts` (45 tests)
- `src/ai/ai.guardrail.ts`
- `src/ai/ai.http.spec.ts` (+1 test)
- `src/ai/ai.module.ts`
- `src/ai/ai.prompts.spec.ts` (+2 tests)
- `src/ai/ai.prompts.ts`
- `src/ai/ai.rag.spec.ts`
- `src/ai/ai.service.spec.ts`
- `src/ai/ai.service.ts`

**Web** (`apps/web/`):

- `app/(module-one)/dashboard/ai-chat.tsx` (VerificationNote component)
- `lib/ai.ts` (VerificationState type + validation)
- `test/ai.test.mjs` (+1 test)

### 12.3 Sources

- Git repository `github.com/FinverseAI/FinVerse-AI`, `main` at
  `e4995f3` (this phase: `67b5f87`..`e4995f3`); remote `main` at
  `003c1a3` at the time of writing (§9).
- Approved plan: `llm-layer-guardrails-readiness-evaluation-plan.md`
  (Plan v1, approved 19 November 2026), Phase 3 section, and
  Section 3 sequencing (Phase 3 before Phase 4).
- LLM Integration Strategy document (`FinVerse_AI_LLM_Integration_
Strategy.docx`, my own research): §4.4 (latency), §4.5
  (prompt-injection guard), §4.7 (fallback design); the governing
  principle "the LLM reasons, the code calculates".
- Daily Report — 19 November 2026 (FinVerse AI project files).
- Synopsis: `Finverse_Ai_Final_Synopsys.pdf`, Objective 4,
  methodology §4.4.
