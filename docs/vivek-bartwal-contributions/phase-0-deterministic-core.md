# Phase 0 — Module 2 Deterministic Core

## Metadata

| Field      | Value                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Phase      | Phase 0 — Module 2 deterministic core (prerequisite for the LLM layer)                                                  |
| Date       | 19 November 2026                                                                                                        |
| Author     | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                      |
| Team       | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881) |
| Guide      | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                       |
| Repository | github.com/FinverseAI/FinVerse-AI (public)                                                                              |
| Branch     | `feat/module-two-core` (merged to `main` by fast-forward)                                                               |
| Commits    | `ce48795`..`1c10651` (9 commits) + CI fix `88caa67`                                                                     |
| Scope      | 47 files, +7,174 / −19 lines (fix: 1 file, +4)                                                                          |
| Status     | **Done — built, pushed, CI green, live-verified** (19 November 2026, ~11:17 IST)                                        |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 19 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6, did
the Render dashboard and deployment work myself, and verified every result
independently before it was called done.

---

## 1. Overview — what this phase is and why it exists

FinVerse AI is a unified AI financial-intelligence platform. Module 1 is the
personal-finance dashboard (income, expenses, budgets, savings goals, bills);
Module 2 is stock and investment intelligence. At the start of 19 November
2026, Module 1 existed and worked — its four remaining gaps (transaction
edit/delete, bill payment history, goal contributions, CSV export) had been
merged to `main` on 17 November — but Module 2 was at 0%: no market-data
service, no holdings tables, no indicators, no portfolio engine, and no market
page of any kind. The route `/market` returned 404.

Phase 0 built Module 2's deterministic core: the market data, the mathematics
and the portfolio engine that every later phase reasons about. There is no AI
in this phase at all, and that is deliberate. The synopsis (§4.6) orders the
work deterministic core first, LLM second, guardrails third, and the approved
plan follows that order. The reason is architectural, not merely sequential:
the LLM layer of Phases 1 and 2 is only allowed to _interpret_ numbers — it
must never compute one. For that rule to mean anything, the numbers must
already exist somewhere the model cannot touch: a stored price plus a formula,
computed by code, tested against published reference values, and traceable end
to end. Phase 0 is that somewhere.

The phase maps to synopsis Objective 2 (stock/investment intelligence) and to
methodology §4.6. It also satisfies the prerequisite stated in the approved
plan's Section 1: the LLM layer reasons over deterministic data from _both_
modules, and the Investment Readiness assessment of Phase 4 is cross-module by
definition (cash-flow position × portfolio risk). Without Module 2, Phase 1
could only have answered questions about budgets and transactions, and Phase 4
could not have been built at all. The alternative order — LLM over Module 1
data first, Module 2 later — was considered in the plan (Section 6, decision 6)
and rejected: it would have shown AI sooner but meant building the LLM layer
twice, and Readiness would have waited. I approved Phase 0 first at 10:04 IST
on 19 November, together with the rest of the plan.

In one sentence: **Phase 0 is the ground truth layer. Every figure the LLM
explains in Phases 1 and 2 originates here, from a stored price and a formula —
never from a model's memory.**

### What existed before this phase

| Area                        | State at the start of 19 November 2026                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Module 1 (personal finance) | ~70% complete; all 4 gaps merged 17 Nov (`22fee32`); CI green on `da39a3d` (19 Nov ~09:32 IST); live on Render              |
| Module 2 (stocks)           | 0% — no market-data service, no holdings tables, no indicators, no portfolio engine, no `/market` route                     |
| LLM layer                   | 0% — no AI module, no provider, no model calls anywhere in the repo                                                         |
| Database                    | Neon Postgres via Prisma 6; two Module 1 tables (`user_bill_payments`, `user_goal_contributions`) still unrun on production |
| Stack                       | Turborepo monorepo: Next.js 16 web + NestJS 12 backend + Prisma 6 + Neon Postgres. **No Python anywhere.**                  |
| Hosting                     | Render free tier: backend `finverse-ai-r050.onrender.com`, web `finverse-web.onrender.com`                                  |

---

## 2. Objectives and acceptance criteria

The objectives below are taken verbatim in substance from the approved plan
(Phase 0 section). Each one is marked with whether it was met, and the evidence
for the verdict.

| #   | Objective (from the plan)                                                                                                               | Met?    | Evidence                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Market data provider connected (recommended: `yahoo-finance2`, free, no API key, NSE symbols supported)                                 | **Yes** | `YahooFinanceProvider` in `apps/backend/src/market/market.provider.ts`; NSE symbols such as `RELIANCE.NS` and indices `^NSEI` / `^BSESN` supported                                            |
| 2   | Quotes cached in Postgres with a fetched-at timestamp; stale/missing-data behaviour defined (show last-known + timestamp, never invent) | **Yes** | `MarketQuote` / `MarketHistory` tables; 15-minute quote TTL, 24-hour history TTL; every response carries `fetchedAt` and a `stale` flag; provider failure returns last-known or an honest 503 |
| 3   | Schema: `UserHolding`, `WatchlistItem`, price-history cache table                                                                       | **Yes** | Migration `20261119120000_add_market_module`: `user_holdings`, `watchlist_items`, `market_quotes`, `market_history`                                                                           |
| 4   | Indicators SMA, EMA, RSI, MACD from price history (exact formulas, unit-tested against known values)                                    | **Yes** | `apps/web/lib/indicators.ts`; RSI 55.55 on the Investopedia example (see §7)                                                                                                                  |
| 5   | Portfolio math: value, gains/losses, CAGR, XIRR, sector concentration                                                                   | **Yes** | `apps/web/lib/portfolio.ts` (CAGR, XIRR) + `PortfolioService` (valuation in integer paise, sector weights); XIRR 0.373362535 on the standard Excel example                                    |
| 6   | Optimisation: Markowitz mean-variance solver + Sharpe ratio (synopsis Eq. 4.1–4.2), pure TypeScript                                     | **Yes** | `apps/web/lib/optimization.ts`; Sharpe exactly 6.0 on the reference case                                                                                                                      |
| 7   | UI: market overview (NIFTY 50 / SENSEX), stock search + profile, charts, holdings CRUD, portfolio dashboard                             | **Yes** | `/market` route with overview, search, profile pages, holdings CRUD, watchlist, portfolio dashboard, optimiser and hand-rolled SVG price charts                                               |
| 8   | Acceptance: indicators match reference values                                                                                           | **Yes** | §7.1                                                                                                                                                                                          |
| 9   | Acceptance: portfolio math verified against hand-computed cases                                                                         | **Yes** | §7.1                                                                                                                                                                                          |
| 10  | Acceptance: every number on screen traceable to a stored price + a formula                                                              | **Yes** | Every quote/history response carries `fetchedAt` and `stale`; the UI shows the source timestamp with the price; no number is rendered without its provenance                                  |
| 11  | Acceptance: CI green                                                                                                                    | **Yes** | After one fix (`88caa67`); CI green ~11:17 IST (§8)                                                                                                                                           |
| 12  | Acceptance: live-verified                                                                                                               | **Yes** | `/market` 404 → 200 at ~10:51 IST; homepage 200; backend health 200 (§9)                                                                                                                      |

Two plan preconditions deserve a note. The plan listed the migration decision
(one-off vs durable build-command fix) and the `BETTER_AUTH_URL` localhost fix
as preconditions before Phase 0. The migration decision was taken the same
morning (11:23 IST — the durable option; see §8.2 and the deployment section
of the daily report) and the migrations were applied at ~12:55 IST, after this
phase's code was already live. The `BETTER_AUTH_URL` fix remains parked at my
request: it affects login and session verification in production, and I chose
not to open that thread while the migration and Phase 1 work were in flight.
Neither precondition blocked Phase 0's build or its verification, but the
migration timing meant the holdings, watchlist and market-cache endpoints
could not work live until the tables existed at ~12:55 IST — a gap between
"code live" and "feature usable" that Section 9 records honestly.

---

## 3. Architecture — how Phase 0 fits the system

### 3.1 Where the code lives

The repository is a Turborepo monorepo. Phase 0 touched both applications and
the shared database schema:

```
FinVerse-AI/
├── apps/
│   ├── backend/                 NestJS 12 (API, port 3001 locally)
│   │   ├── prisma/
│   │   │   ├── schema.prisma            + UserHolding, WatchlistItem,
│   │   │   │                              MarketQuote, MarketHistory
│   │   │   └── migrations/
│   │   │       └── 20261119120000_add_market_module/
│   │   └── src/market/                  NEW NestJS module
│   │       ├── market.module.ts
│   │       ├── market.provider.ts       Yahoo Finance behind an interface
│   │       ├── market.service.ts        quotes, history, search, profile,
│   │       │                              overview (cache + stale rules)
│   │       ├── portfolio.service.ts     holdings, watchlist, valuation
│   │       ├── market.controller.ts     13 endpoints, all session-guarded
│   │       └── market.validation.ts     symbols, ranges, holdings, prices
│   └── web/                     Next.js 16 (port 3000 locally)
│       ├── app/(module-two)/market/     NEW route group: /market,
│       │   │                              /market/stock/[symbol]
│       │   └── ... (page, shell, sections, charts, forms)
│       ├── app/api/market/...           API forwarders to the backend
│       ├── app/api/holdings/...         API forwarders to the backend
│       ├── app/api/watchlist/...        API forwarders to the backend
│       ├── app/api/portfolio/...        API forwarders to the backend
│       └── lib/
│           ├── indicators.ts            SMA, EMA, RSI, MACD (pure)
│           ├── portfolio.ts             CAGR, XIRR (pure)
│           ├── optimization.ts          Markowitz, Sharpe (pure)
│           └── market.ts                shared types + formatting
└── package-lock.json            + yahoo-finance2 dependency
```

### 3.2 The data flow, in words

There are two kinds of data in this phase, and they flow through different
paths by design.

**Live market data (backend-owned).** The browser never talks to Yahoo
Finance. It calls a Next.js API forwarder (`/api/market/quote/[symbol]`,
for example), which forwards the request to the NestJS backend with the
user's session. The backend's `MarketService` first checks the Postgres
cache: a quote row fresher than 15 minutes is served immediately. Otherwise
the `YahooFinanceProvider` fetches a fresh quote, the service upserts it
into `market_quotes`, and the response goes back with `fetchedAt` and
`stale: false`. If Yahoo is unreachable, the service returns the last-known
cached price marked `stale: true`; if there is no cached price at all, it
answers 503 with a plain message. A price is never invented, never
estimated, and never presented without its timestamp. History works the
same way with a 24-hour TTL, except that bars are immutable once a trading
day closes, so the service keeps cached rows and only fetches missing days
— today's still-moving bar is always refetched.

**Mathematics (computed where it is used).** In this phase the indicator,
return and optimisation mathematics lives in the web application's `lib/`
as pure functions with no I/O. The stock-profile page fetches price history
from the backend and computes SMA, EMA, RSI and MACD in the browser; the
optimiser section computes log returns, annualised means and covariance,
and the Markowitz portfolios in the browser. This placement was a
deliberate Phase 0 choice (the web UI needed the numbers immediately, and
pure functions are the easiest code to test against reference values), and
it created a known follow-on: the LLM tools of Phase 1 need the same
mathematics server-side, so Phase 1 ports the indicators to the backend
byte-identically (`apps/backend/src/ai/indicators.ts`). The two copies are
tested against the same reference values, and the Phase 1 test suite
asserts they agree.

**User-owned data (owner-scoped everywhere).** Holdings and watchlist rows
carry a `user_id` foreign key to `User`. Every query in `PortfolioService`
filters by the session user id, and every update/delete uses `updateMany` /
`deleteMany` with `{ id, user_id }` so a user can never touch another
user's row even if they guess its id. The unique constraint
`(user_id, symbol)` on both tables means one holding and one watchlist
entry per symbol per user; a duplicate insert surfaces as a 409 Conflict
with a readable message, not a database error.

### 3.3 Request flow diagram

```
Browser (/market)
    │  Next.js API forwarder (session attached)
    ▼
NestJS backend — MarketController (@UseGuards(SessionGuard))
    │
    ├─► MarketService ──► Prisma cache (market_quotes / market_history)
    │        │                    ▲ (fresh → serve)
    │        │ miss / stale       │ (fetch → upsert)
    │        ▼                    │
    │   YahooFinanceProvider ──► Yahoo Finance (yahoo-finance2)
    │
    └─► PortfolioService ──► Prisma (user_holdings / watchlist_items)
              │                    + live quotes via MarketService
              ▼
        Valuation in integer paise → totals, sectors, unavailable list

Browser-side math (lib/):
  history bars ──► indicators.ts (SMA/EMA/RSI/MACD)
              ──► portfolio.ts (CAGR, XIRR)
              ──► optimization.ts (Markowitz, Sharpe, frontier)
```

---

## 4. What was built — module by module

### 4.1 Market data provider (`market.provider.ts`)

The provider is a narrow TypeScript interface, `MarketDataProvider`, with
five operations — `quote`, `history`, `search`, `profile`, `news` — and one
implementation, `YahooFinanceProvider`, built on `yahoo-finance2`. (The
`news` operation was added to the interface in Phase 0's provider file and
is exercised by Phase 2's news ingestion; Phase 0 itself uses the other
four.) The interface exists so that services and tests never touch the
Yahoo client directly: every test in this phase runs against a mock
provider, and a future provider swap means writing one new class, not
rewriting the services.

Three defensive habits run through the implementation and are worth
recording because they shape the whole phase's attitude to external data:

1. **Every value is validated before it is trusted.** The helpers `finite`
   and `text` reject non-finite numbers and blank strings. A quote with no
   usable price throws ("No usable price returned") instead of returning a
   zero or a `NaN` downstream.
2. **Dividend and split events are skipped in history.** Yahoo's historical
   endpoint returns corporate-action rows that carry no OHLC data; the
   provider drops any row without a date and four finite prices, then sorts
   the surviving bars ascending by date.
3. **Search returns tradeable instruments only.** Yahoo search results
   include web links and other non-quote items; the provider keeps only
   results with a symbol, capped at 10.

The provider throws on any failure. It does not decide what the user sees —
that is the service's job (§4.2). This separation (provider reports failure,
service decides the fallback) is what makes the stale-data behaviour
auditable: there is exactly one place where "show the old price" can happen.

Currency defaults to INR when Yahoo does not report one, which matches the
product's India-first framing and the NSE symbols the plan targets.

### 4.2 Market service (`market.service.ts`) — caching and stale rules

`MarketService` is the heart of the phase. Its rules:

| Concern                                  | Rule                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote TTL                                | `QUOTE_TTL_MS` = 15 minutes. A cached quote fresher than this is served without calling Yahoo.                                                                            |
| History TTL                              | `HISTORY_TTL_MS` = 24 hours. History is refetched when the newest cached bar was fetched longer ago, or when the cache does not cover the requested range.                |
| Provider down, cache present             | Return the last-known value marked `stale: true`, with its original `fetchedAt`.                                                                                          |
| Provider down, no cache                  | Throw `ServiceUnavailableException` (503) with a plain message. No price is invented.                                                                                     |
| History bars                             | Immutable once a trading day closes: cached rows are kept, only missing days are fetched; today's bar is deleted and refetched every time, because it is still moving.    |
| Empty history after a successful refresh | An honest empty list (e.g. a newly listed symbol), not an error.                                                                                                          |
| Profile fundamentals                     | Fetched live and allowed to fail independently: if the fundamentals call fails, the quote is still returned with `fundamentals: null` and `fundamentalsAvailable: false`. |
| Batch quotes                             | `quotes()` uses `Promise.allSettled`: symbols that fail are listed under `unavailable` instead of failing the whole call.                                                 |

The overview endpoint (`GET /api/market/overview`) returns NIFTY 50
(`^NSEI`) and SENSEX (`^BSESN`) plus live quotes for the user's watchlist,
in one call. An index with no price at all still appears in the response
with `price: null` and its display name, so the UI can render the row
honestly instead of hiding it.

Response shapes carry provenance everywhere: every quote response includes
`fetchedAt` and `stale`; every history response includes `fetchedAt` (the
newest bar's fetch time) and `stale`. The UI is required to show the
timestamp with the price (see §4.7), which is how acceptance criterion 10
("every number traceable to a stored price + a formula") is met in practice
rather than only in principle.

### 4.3 Portfolio service (`portfolio.service.ts`) — exact money

All portfolio money is computed in **integer paise**. Quantities carry up
to four decimals, so a holding's value is computed as quantity-units
(×10⁴) times price-paise (×10²), divided by 10⁴, rounded once to the
nearest paise:

```text
valuePaise(quantity, price) =
  round( round(quantity × 10⁴) × round(price × 100) / 10⁴ )
```

The point of this discipline is that floating-point money drifts: adding
rupee floats across dozens of holdings accumulates rounding error that no
user can explain and no test can pin down. Integer paise makes every total
exact and every test deterministic. Totals (value, invested, gain/loss,
gain/loss %) are accumulated in paise and converted to rupees only at the
presentation boundary (divide by 100).

The valuation rules are as strict as the market service's:

- Holdings whose price cannot be fetched (provider down and nothing
  cached) are listed under `unavailable` and **excluded from the totals**
  — never valued at a stale or invented price. Each such holding is still
  returned with `priced: false`, its invested value, and nulls for the
  current figures, so the user can see exactly what is missing.
- Sector weights come from the holding's stored sector, falling back to
  the quote's sector, then `"Unknown"`. Weights are computed from priced
  holdings only and sorted by value descending.
- The summary carries `asOf` (the newest quote timestamp among priced
  holdings) and a `stale` flag (true if any priced holding's quote was
  stale).

Holdings CRUD and watchlist CRUD are owner-scoped as described in §3.2.
Duplicate symbols surface as 409 Conflict: the service catches Prisma's
`P2002` unique-constraint error and rethrows a readable message ("You
already track this symbol. Edit the holding to update it."). Updates use
`updateMany` with `{ id, user_id }` and then re-read the row, so an update
to a holding that no longer exists (or belongs to someone else) is a 404,
never a silent no-op and never a leak.

### 4.4 Endpoints (`market.controller.ts`)

All thirteen endpoints sit under `/api`, behind the `SessionGuard` (401
without a session), and all send `Cache-Control: private, no-store` —
financial data must never be cached by a shared proxy.

| Method & path                            | Purpose                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `GET /api/market/overview`               | NIFTY 50 + SENSEX + watchlist quotes                               |
| `GET /api/market/search?q=`              | Symbol search (top 10 tradeable results)                           |
| `GET /api/market/quote/:symbol`          | One quote, cached/stale rules apply                                |
| `GET /api/market/history/:symbol?range=` | Daily OHLC bars; ranges `1mo`, `3mo`, `6mo`, `1y`, `5y`            |
| `GET /api/market/profile/:symbol`        | Quote + fundamentals (fundamentals may fail independently)         |
| `GET /api/holdings`                      | The user's holdings                                                |
| `POST /api/holdings`                     | Add a holding (409 on duplicate symbol)                            |
| `PUT /api/holdings/:id`                  | Update a holding (404 if missing/not yours)                        |
| `DELETE /api/holdings/:id`               | Remove a holding                                                   |
| `GET /api/watchlist`                     | The user's watchlist                                               |
| `POST /api/watchlist`                    | Add a watchlist item (409 on duplicate)                            |
| `DELETE /api/watchlist/:id`              | Remove a watchlist item                                            |
| `GET /api/portfolio/summary`             | Portfolio valued at current prices, with sectors and `unavailable` |

### 4.5 Validation (`market.validation.ts`)

Validation is hand-written (no validation library on this path) and
fail-fast with `BadRequestException` messages the UI can show directly:

- **Symbols** match `/^[A-Z0-9.^=-]{1,20}$/` after trimming and
  upper-casing — the punctuation Yahoo uses for indices (`^NSEI`),
  exchanges (`RELIANCE.NS`), share classes (`BRK-B`) and currency pairs
  (`USDINR=X`).
- **History ranges** are the five values `1mo` / `3mo` / `6mo` / `1y` /
  `5y` (30 / 90 / 180 / 365 / 1825 days). An invalid range falls back to
  `1y` rather than erroring.
- **Prices** must be positive, at most two decimal places, at most
  ₹10,00,00,000. **Quantities** must be positive, at most four decimal
  places, at most 10⁹. **Buy dates** must be real `YYYY-MM-DD` dates,
  not in the future.
- **Search queries** are capped at 100 characters; names at 120, sectors
  at 80.

### 4.6 Schema and migration

Migration `20261119120000_add_market_module` adds four tables:

| Table             | Purpose                             | Key columns & constraints                                                                                                                                                                                   |
| ----------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_holdings`   | One row per holding per user        | `user_id` FK → `User` (cascade delete), `symbol` VARCHAR(20), `quantity` DECIMAL(12,4), `buy_price` DECIMAL(12,2), `buy_date` DATE; CHECK `quantity > 0`, CHECK `buy_price > 0`; UNIQUE `(user_id, symbol)` |
| `watchlist_items` | One row per watched symbol per user | `user_id` FK → `User` (cascade delete), `symbol` VARCHAR(20), optional `name`; UNIQUE `(user_id, symbol)`                                                                                                   |
| `market_quotes`   | Quote cache, one row per symbol     | `symbol` PK, `price` DECIMAL(14,4), `previous_close` nullable, `currency`, `sector`, `fetched_at`; CHECK `price > 0`                                                                                        |
| `market_history`  | Daily OHLC bars                     | `symbol`, `date` DATE, `open/high/low/close` DECIMAL(14,4), `volume` BIGINT nullable, `fetched_at`; UNIQUE `(symbol, date)`                                                                                 |

The constraints do real work: the CHECK constraints make a negative
quantity or a zero price unrepresentable at the database level, not just
rejected by the API; the unique constraints are what the 409 Conflict
behaviour is built on; the cascade deletes mean removing a user removes
their holdings and watchlist with them. Prices are stored as
`DECIMAL(14,4)` — four decimal places — because the provider can return
fractional prices and the paise math of §4.3 rounds once, at the end, not
at storage time.

The migration is additive only (new tables, no changes to existing ones),
which is why it could be applied to production with `prisma migrate deploy`
without touching existing data — relevant to the deployment story in §9.

### 4.7 Web mathematics libraries

The three pure-function libraries in `apps/web/lib/` are the most
testable code in the phase, and the reference-value verification in §7 is
aimed at them.

**Indicators (`indicators.ts`)** — SMA, EMA, RSI, MACD, computed from
closing prices. Every function returns an array aligned with its input:
entries before the indicator can be computed are `null`, so index `i` of
the result always describes the same bar as index `i` of the input. The
formulas follow the standard conventions:

- **SMA**: the mean of the last `period` closes (sliding window).
- **EMA**: smoothing factor `k = 2 / (period + 1)`, seeded with the simple
  average of the first `period` closes — the convention most charting
  platforms use.
- **RSI**: Wilder's RSI, default period 14. The first value is the plain
  average of gains and losses over the first `period` changes; later
  values use Wilder's smoothing
  (`average = (previous average × (period − 1) + current gain or loss) / period`).
  A flat market (no gains and no losses) reads 50; a market with gains and
  no losses reads 100. These edge cases are handled explicitly, not left
  to divide-by-zero.
- **MACD**: the MACD line is EMA(12) − EMA(26) by default; the signal line
  is the 9-period EMA of the MACD line, seeded with the simple average of
  its first 9 values; the histogram is MACD − signal. Rows are `null`
  until all three values exist. The fast period must be shorter than the
  slow period, enforced with a `RangeError`.

**Portfolio returns (`portfolio.ts`)** — CAGR and XIRR:

- **CAGR**: `(end / start)^(1 / years) − 1`, with a `cagrFromDates`
  variant that measures the holding period in 365-day years. Returns
  `null` when the inputs cannot define a rate (non-positive start,
  negative end, non-positive period). The doc comment is explicit that
  CAGR applies to a single sum held over a period and cannot handle money
  added or withdrawn along the way.
- **XIRR**: the annual rate at which the net present value of dated cash
  flows is zero, discounting each flow by the actual days since the first
  flow over a 365-day year — the same definition Microsoft Excel's XIRR
  uses. Solved with Newton–Raphson from a 10% guess (Excel's default),
  with a bisection fallback over a widening bracket if Newton fails to
  converge. Returns `null` when there is no rate to find (fewer than two
  flows, all flows on one side of zero, or no convergence). The NPV
  tolerance scales with the size of the flows, so an absolute tolerance
  cannot become unreachable for large portfolios.

**Optimisation (`optimization.ts`)** — Markowitz mean-variance
optimisation and the Sharpe ratio (synopsis Eq. 4.1), in pure TypeScript
because the repository has no Python and therefore no NumPy/SciPy:

- `logReturns` computes ln(close[i] / close[i−1]); non-positive prices
  throw.
- `returnsStats` annualises means and the sample covariance matrix from
  aligned per-asset return series (default 252 trading periods per year).
  Misaligned or too-short series return `null`.
- `sharpeRatio` is excess return per unit of risk; it returns `null` at
  zero volatility (a riskless portfolio has no Sharpe ratio).
- The linear solver is Gaussian elimination with partial pivoting, and
  returns `null` when the matrix is singular (a pivot collapses below
  10⁻¹²).
- `maxSharpeWeights` (tangency portfolio, weights proportional to
  Σ⁻¹(μ − rf·1)) and `minVarianceWeights` (weights proportional to
  Σ⁻¹·1) are both **long-only**: negative weights from the unconstrained
  solution are clipped to zero and the rest renormalised, and that
  clipping is documented on each result. A singular covariance matrix —
  too little history, or perfectly correlated assets — yields `null`
  instead of a fabricated allocation.
- `efficientFrontier` sweeps target returns from the minimum-variance
  return up to the highest asset mean (12 points by default), solving
  each point exactly via the KKT system and then clipping to long-only.
  Each point reports its **actual** (post-clipping) return and volatility,
  not the target, so the plotted curve is honest about the approximation.

**Shared market types (`market.ts`)** — the TypeScript types that mirror
the backend market responses exactly, plus formatting helpers
(`formatPrice`, `formatPercent`, `formatFetchedAt`, `formatCompact`). The
file's header states the display rule the whole UI follows: a price is
only ever shown with its source timestamp, and a null price means the
market is unavailable, never zero.

### 4.8 Web UI — the `/market` route group

The route group `app/(module-two)/market/` adds the market pages. The
structure follows the existing Module 1 dashboard conventions (the same
`PanelHeading`, `MiniStat` and `Icon` components), so the new module looks
like part of the same product rather than a second app.

| File                                            | What it renders                                                                                                                                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page.tsx` + `market-shell.tsx` + `market.tsx`  | The `/market` page shell: indices, watchlist, search, and the sections below                                                                                                                                                  |
| `portfolio.tsx`                                 | Portfolio dashboard: totals, per-holding valuation, sector weights, `unavailable` holdings shown explicitly                                                                                                                   |
| `holdings.tsx` + `holding-form.tsx`             | Holdings list with create/edit/delete, and the holding form (symbol, quantity, buy price, buy date)                                                                                                                           |
| `optimizer.tsx`                                 | Markowitz optimiser: max-Sharpe and min-variance suggestions, efficient-frontier chart, current-vs-suggested comparison; requires at least 30 days of history (`MIN_DAYS = 30`)                                               |
| `price-chart.tsx`                               | Hand-rolled SVG price charts (no charting library in the repo): one shared geometry (720-wide viewBox), hover by nearest trading day, tooltip showing the exact values behind the pixel                                       |
| `stock/[symbol]/page.tsx` + `stock-profile.tsx` | Stock profile: quote, fundamentals (sector, market cap, P/E, dividend yield, 52-week range, description), price chart, and indicators computed in-browser (SMA 20/50, RSI 14, MACD 12/26/9) with a plain-language RSI reading |
| `error.tsx` / `loading.tsx` (both levels)       | Route-level error and loading states, per the Next.js App Router conventions                                                                                                                                                  |

The stock-profile page is where the indicator library meets the user: it
fetches 3 months of history bars from the backend and computes the
indicators in the browser. The RSI reading helper translates the number
into words (overbought/oversold/neutral bands), but the number itself is
always shown alongside — the words explain, they do not replace.

Ten API forwarders (`app/api/market/...`, `app/api/holdings/...`,
`app/api/watchlist/...`, `app/api/portfolio/...`) proxy the browser to the
NestJS backend with the session attached, so the browser never calls the
backend directly and never sees the backend's URL. The dashboard
navigation (`navigation.tsx`) gained the market link, and
`profile-guard.ts` was touched to cover the new routes.

---

## 5. Decisions taken

| #   | Decision                                                                      | Options considered                                                             | Why this one                                                                                                                                                                   | Decided by                                                                      |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 1   | Phase 0 first, before any LLM work                                            | LLM over Module 1 data first (visible AI sooner); Module 2 later               | Readiness is cross-module by definition; building the LLM layer twice wastes effort; the synopsis orders deterministic core first (§4.6)                                       | Me, 19 Nov ~10:04 IST (plan approval)                                           |
| 2   | Market data: `yahoo-finance2`                                                 | Alpha Vantage free tier (25 req/day — too small for a screener); paid provider | Free, no API key, NSE symbols supported, covers quotes + history + search + profile in one client                                                                              | Me (plan recommendation adopted, "whatever suits best")                         |
| 3   | Cache quotes 15 min, history 24 h                                             | No cache (every request hits Yahoo); longer TTLs                               | 15 min keeps quotes fresh enough for a dashboard without hammering a free provider; history bars are immutable once a day closes, so 24 h is safe and cheap                    | Implementation decision, per plan                                               |
| 4   | Stale data shown with a flag; never invent a price                            | Fail the whole page when Yahoo is down; show a spinner forever                 | A dashboard that goes blank when a free provider hiccups is unusable; a clearly-labelled stale price with its timestamp is honest and useful                                   | Implementation decision, per plan ("show last-known + timestamp, never invent") |
| 5   | Money in integer paise                                                        | Rupee floats throughout                                                        | Floats drift across holdings; integer paise makes every total exact and every test deterministic                                                                               | Implementation decision                                                         |
| 6   | Pure TypeScript for all maths (no Python)                                     | Python FastAPI microservice for the optimiser                                  | One stack, one deploy; the repo has no Python, and a second service doubles the Render footprint and the failure modes                                                         | Me (plan decision 2, "whatever suits best")                                     |
| 7   | Provider behind a narrow interface                                            | Call `yahoo-finance2` directly from services                                   | Tests run against a mock provider; a future provider swap is one new class                                                                                                     | Implementation decision                                                         |
| 8   | Indicators in the web `lib/` (browser-side) for this phase                    | Server-side only                                                               | The UI needed the numbers immediately; pure functions are the easiest code to test against reference values. Known follow-on: Phase 1 ports them server-side for the LLM tools | Implementation decision; follow-on recorded in the plan notes                   |
| 9   | Long-only optimiser (clip + renormalise)                                      | Allow short positions (unconstrained tangency)                                 | The product's audience holds long positions; shorts would need margin modelling the synopsis does not ask for. The clipping is documented on each result                       | Implementation decision                                                         |
| 10  | Hand-rolled SVG charts                                                        | Add a charting library                                                         | No charting dependency in the repo; the charts needed are simple (price line + hover tooltip) and a library would add bundle weight for little gain                            | Implementation decision                                                         |
| 11  | Migration: durable fix (add `db:migrate` to the Render backend build command) | One-off manual migration run                                                   | Every future migration then applies automatically on deploy; a one-off run leaves the next migration to be forgotten again. (Decided 11:23 IST; applied ~12:55 IST — see §8.2) | Me, 19 Nov 11:23 IST                                                            |

---

## 6. Verification

Verification was re-run independently by me after the build — not taken
from the builder's report. The rule for this project is that built,
pushed, verified and live are four distinct states, and nothing is called
done from commit state alone.

### 6.1 Tests and reference values

| Suite                                 | Result                                                                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend Jest (`apps/backend`)         | **226 / 226 passed** (33 suites at Phase 2's count; Phase 0's market specs are `market.http.spec.ts`, `market.validation.spec.ts`, `portfolio.http.spec.ts`)                                                                        |
| Web tests (`apps/web`, `node --test`) | **46 / 46 passed** (`indicators.test.mjs`, `portfolio-math.test.mjs`, `optimization.test.mjs` plus existing suites)                                                                                                                 |
| End-to-end (`test:e2e`)               | Passed in CI as part of the full `npm test` gate (see §6.3). Not re-run locally for this phase — a gap the Phase 2 CI failure later made into a standing rule (always run the full root `npm test`, including e2e, before pushing). |

The mathematics was checked against published reference values, not only
against itself:

| Check        | Reference                                                                                        | Result                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| XIRR         | Standard Excel example — Excel returns **0.373362535**                                           | Matched to within 0.0001 (`portfolio-math.test.mjs`)                                |
| RSI          | Investopedia example — averaging a 0.8% gain and a 0.8% loss over 14 periods gives RSI **55.55** | Matched to within 0.01 (`indicators.test.mjs`)                                      |
| Sharpe ratio | Closed-form two-asset case — portfolio mean 0.0857, volatility 0.014286, Sharpe **exactly 6.0**  | Matched (`optimization.test.mjs`)                                                   |
| Markowitz    | Closed-form two-asset solution                                                                   | `maxSharpeWeights` / `minVarianceWeights` / `efficientFrontier` verified against it |

### 6.2 Static checks and builds

| Check                                   | Result                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| Backend type-check (`tsc --noEmit`)     | Clean (after the §8.1 fix)                                     |
| Backend lint (`oxlint`)                 | **0 warnings, 0 errors**                                       |
| Prettier (`format:check`)               | Clean                                                          |
| Web type-check (`check-types`)          | Clean                                                          |
| Web lint (ESLint)                       | Clean                                                          |
| NestJS production build (`nest build`)  | OK                                                             |
| Next.js production build (`next build`) | OK, `/market` and `/market/stock/[symbol]` in the route output |

### 6.3 CI

| Run                       | Commit    | Result                                                     |
| ------------------------- | --------- | ---------------------------------------------------------- |
| `44464368085`             | `1c10651` | **Failed** — step 8 (`check-types`), one type error (§8.1) |
| (run number not recorded) | `88caa67` | **Passed** — green at ~11:17 IST; Phase 0 closed           |

The CI workflow (`Quality checks`) runs on pushes to `main` and on pull
requests: `npm ci`, `db:generate`, `lint`, `check-types`, `npm test`
(backend unit + backend e2e + web), `format:check`, `build`,
`bundle:report`. It does not run on branch pushes, which is why the
Phase 0 branch was verified locally before merging.

---

## 7. Problems faced and fixes

### 7.1 CI failure: the `clientVersion` type error (run `44464368085`)

**What happened.** Phase 0 was merged and pushed at ~10:49 IST. At ~10:53
IST, CI failed on run `44464368085` at step 8 (`check-types`) with exactly
one error: the portfolio test constructed a
`PrismaClientKnownRequestError` with only `{ code: 'P2002' }`, while the
real Prisma 6 client's `KnownErrorParams` also requires `clientVersion`.

**Root cause.** The development VM cannot reach the Prisma CDN
(`prisma generate` fails with `ECONNRESET`), so the repo is developed
against a hand-written stub Prisma client in gitignored
`node_modules/.prisma/client`. The stub's `PrismaClientKnownRequestError`
constructor did not require `clientVersion`, so the test passed locally
and failed in CI, where `db:generate` produces the real client. This is
the stub/real-client divergence class of bug: anything the stub models
loosely, CI will catch.

**Fix (`88caa67`, committed 11:08 IST, pushed 11:14 IST).** One file
changed (+4 lines): the test now constructs the error with
`clientVersion: '6.16.3'`, with a comment explaining why. The stub's
constructor signature was also tightened to match the real client, so
this class of error is caught locally from now on instead of in CI. CI
was green at ~11:17 IST.

**Lesson recorded.** The stub is a necessary workaround, not a
replacement for the real client: when a test constructs a Prisma error,
it must construct it the way the real client requires. The tighter stub
makes that enforceable.

### 7.2 The migration gap (not a Phase 0 bug, but Phase 0's tables were in it)

Phase 0's migration (`20261119120000_add_market_module`) joined two
Module 1 migrations (`20261117130000_add_bill_payments`,
`20261117131000_add_goal_contributions`) that had been waiting to run on
production Neon since 17 November. Nothing ran migrations in production
automatically: the backend's build command was `nest build`, and the
`db:migrate` script existed but was never called. Until the tables
existed, the holdings, watchlist and market-cache endpoints could not
work live — the code was deployed, but the feature was not usable. This
is the built-vs-live distinction the project tracks explicitly.

The fix was a deployment decision, not a code change, and it belongs to
the day's deployment story rather than to this phase alone: at 11:23 IST
I chose the durable option — add `npm run db:migrate --workspace backend`
to the Render backend build command, after `db:generate` and before the
build — so every future migration applies automatically on deploy. The
first attempt failed at 12:02 IST because `DIRECT_URL` was not set on
the backend service (the schema declares both `DATABASE_URL` and
`DIRECT_URL`; the backend runs on the former alone, but migrations need
the direct connection). After the build command was corrected and
`DIRECT_URL` was in place, a manual deploy succeeded at ~12:55 IST, and
because the build steps are chained with `&&`, that success is itself the
proof the migrations applied: the same chain had failed the whole build
at 12:02 when the migration could not run. The full saga — including a
backend suspension found at 12:10 IST and a web crash-loop the same
morning — is recorded in the daily report for 19 November 2026 and in
the Phase 2 document's deployment section, since the Phase 2 migration
applied through the same route.

One honest caveat: the migration tables themselves have not been
inspected directly (that needs a logged-in session against production,
which I have not had). The evidence for "applied" is the successful
`&&`-chained deploy plus the live route checks afterwards (§9). The
deploy-log line ("migrations applied") remains an optional extra
confirmation.

---

## 8. Deployment

| Event                   | Time (IST) | Detail                                                                                                                        |
| ----------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 merged + pushed | ~10:49     | `main` `da39a3d`..`1c10651`; 9 commits, 47 files, +7,174 / −19                                                                |
| `/market` live          | ~10:51     | Moved from 404 to 200 on `finverse-web.onrender.com`                                                                          |
| CI failure              | ~10:53     | Run `44464368085`, step 8 `check-types` (§7.1)                                                                                |
| Fix pushed              | ~11:14     | `88caa67` (1 file, +4)                                                                                                        |
| CI green                | ~11:17     | Phase 0 fully done                                                                                                            |
| Migrations applied      | ~12:55     | Manual backend deploy with the corrected build command; holdings/watchlist/market-cache endpoints usable live from this point |

Live services (Render free tier):

- Backend: `https://finverse-ai-r050.onrender.com` — `/api/health` 200,
  `/api/market/overview` 401 without a session (route live, authentication
  required), `/api/holdings` 401.
- Web: `https://finverse-web.onrender.com` — homepage 200, `/market` 200
  (verified at ~10:51 IST and again at ~12:55 IST after the migration
  deploy).

Render auto-deploys on push to `main`. The Phase 0 push triggered both
service deploys; the backend deploy at ~10:51 IST served the new market
routes, and the web deploy served the new `/market` pages.

---

## 9. What is still open or unverified

Stated plainly, because a contribution log that hides its gaps is not
useful to a guide or an examiner:

1. **Migration tables not directly inspected.** The tables exist by the
   evidence in §7.2, but no one has listed them or written a row to them
   through a logged-in session. A logged-in test (add a holding, add a
   bill payment, add a goal contribution, and see each save) is still the
   direct confirmation.
2. **No real-user data yet.** Every holdings and watchlist row in
   production today would be a test row. The valuation, sector and
   optimiser behaviour under a real, messy portfolio (dozens of holdings,
   corporate actions, delisted symbols) is untested.
3. **Yahoo coverage limits.** Yahoo Finance covers NSE well, but the
   provider has no contractual uptime, no rate-limit guarantee, and
   delayed quotes. The stale-data rules (§4.2) are the mitigation, and
   the UI always shows the fetched-at timestamp — but a day when Yahoo is
   down all day is a day of stale prices, and the product must be honest
   about that.
4. **Mathematics lives in the web `lib/` only.** The LLM tools of Phase 1
   need the indicators server-side. Phase 1 ports them
   (`apps/backend/src/ai/indicators.ts`); until then, any server-side
   consumer would have to duplicate the formulas.
5. **The `BETTER_AUTH_URL` localhost misconfiguration** (backend
   `BETTER_AUTH_URL` on Render still points at `localhost`) will break
   session verification and login in production. It is parked at my
   request and blocks comfortable real-user testing of everything built
   on top of this phase.

---

## 10. Lessons learned

1. **Deterministic first is not just an ordering preference — it is what
   makes the later phases testable.** Because every Phase 0 number comes
   from a stored price plus a formula, Phase 1's tools can be tested
   against known values and Phase 3's guardrail will have something
   authoritative to check claims against. If the LLM had come first, its
   outputs would have had no ground truth to stand on.
2. **A stub is a liability you manage, not a client you trust.** The
   `clientVersion` failure (§7.1) passed locally for exactly one reason:
   the local Prisma stub modelled the real client loosely. Tightening the
   stub after the failure was the right fix; the deeper lesson is to treat
   every stub divergence as a future CI failure and close it when found.
3. **Built, pushed, verified and live are four states, not one.** Phase 0
   was _built_ at ~10:30, _pushed_ at ~10:49, _CI-green_ at ~11:17, and
   only _fully usable live_ at ~12:55 when the migrations applied. The
   report that calls the phase done at the first of those times is wrong
   in a way that matters to users.
4. **Live checks must read the response body, not just the status code.**
   This lesson was learned twice on 19 November — first in the morning,
   when a check that read only the first CSS chunk wrongly reported the
   landing transitions as undeployed (the markers were in the second
   chunk), and again in the afternoon, when the web service returned 200
   while serving the wrong service entirely (see the Phase 2 document).
   A 200 proves transport; only the body proves the right service
   answered.
5. **Honest emptiness beats invented data.** Every "no data" path in this
   phase returns an explicit empty or unavailable state — never a zero,
   never a guessed price, never a fabricated allocation. That discipline
   is what the guardrail phase will be able to build on: a system that
   never invents numbers is a system whose claims can be checked.

---

## 11. Appendix

### 11.1 Commit table

Times are IST, converted from the commit timestamps in the repository.
Files and lines are the per-commit diff.

| Time      | Hash      | Message                                                                            | Change                              |
| --------- | --------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| 10:07     | `ce48795` | feat(market): add yahoo-finance2 dependency for market data                        | 2 files, +341 / −14                 |
| 10:08     | `0c201f8` | feat(market): schema and migration for holdings, watchlist and market cache        | 2 files, +113                       |
| 10:13     | `7b53329` | feat(market): Yahoo Finance provider and market validation                         | 3 files, +470                       |
| 10:13     | `e493029` | feat(market): market endpoints, holdings, watchlist and portfolio summary          | 7 files, +1,717                     |
| 10:16     | `29c986e` | feat(web): indicators, portfolio math and Markowitz optimisation                   | 6 files, +1,059                     |
| 10:18     | `bdf070e` | feat(web): market API forwarders and shared market types                           | 12 files, +317 / −2                 |
| 10:25     | `c5895cd` | feat(web): market overview, search and stock profile UI                            | 14 files, +2,048 / −45              |
| 10:28     | `215e799` | feat(web): holdings CRUD and portfolio dashboard UI                                | 5 files, +1,214 / −13               |
| 10:30     | `1c10651` | style(web): apply prettier formatting to market UI and math libs                   | 16 files, +145 / −195               |
| 11:08     | `88caa67` | fix(market): pass clientVersion to PrismaClientKnownRequestError in portfolio spec | 1 file, +4                          |
| **Total** |           | **10 commits**                                                                     | **47 files, +7,174 / −19 (+4 fix)** |

The range total (47 files, +7,174 / −19) differs slightly from the sum of
the per-commit rows because merge and formatting commits overlap files
counted in more than one row.

### 11.2 Full file list (`ce48795^..1c10651`)

**Backend** (`apps/backend/`):

- `package.json` (yahoo-finance2 dependency)
- `prisma/schema.prisma` (UserHolding, WatchlistItem, MarketQuote, MarketHistory)
- `prisma/migrations/20261119120000_add_market_module/migration.sql`
- `src/app.module.ts` (MarketModule registered)
- `src/market/market.controller.ts`
- `src/market/market.http.spec.ts`
- `src/market/market.module.ts`
- `src/market/market.provider.ts`
- `src/market/market.service.ts`
- `src/market/market.validation.spec.ts`
- `src/market/market.validation.ts`
- `src/market/portfolio.http.spec.ts`
- `src/market/portfolio.service.ts`

**Web** (`apps/web/`):

- `app/(module-one)/dashboard/navigation.tsx` (market link)
- `app/(module-two)/market/error.tsx`
- `app/(module-two)/market/holding-form.tsx`
- `app/(module-two)/market/holdings.tsx`
- `app/(module-two)/market/loading.tsx`
- `app/(module-two)/market/market-shell.tsx`
- `app/(module-two)/market/market.tsx`
- `app/(module-two)/market/optimizer.tsx`
- `app/(module-two)/market/page.tsx`
- `app/(module-two)/market/portfolio.tsx`
- `app/(module-two)/market/price-chart.tsx`
- `app/(module-two)/market/stock/[symbol]/error.tsx`
- `app/(module-two)/market/stock/[symbol]/loading.tsx`
- `app/(module-two)/market/stock/[symbol]/page.tsx`
- `app/(module-two)/market/stock/[symbol]/stock-profile.tsx`
- `app/api/holdings/[id]/route.ts`
- `app/api/holdings/route.ts`
- `app/api/market/history/[symbol]/route.ts`
- `app/api/market/overview/route.ts`
- `app/api/market/profile/[symbol]/route.ts`
- `app/api/market/quote/[symbol]/route.ts`
- `app/api/market/search/route.ts`
- `app/api/portfolio/summary/route.ts`
- `app/api/watchlist/[id]/route.ts`
- `app/api/watchlist/route.ts`
- `auth/profile-guard.ts`
- `lib/indicators.ts`
- `lib/market.ts`
- `lib/optimization.ts`
- `lib/portfolio.ts`
- `test/indicators.test.mjs`
- `test/optimization.test.mjs`
- `test/portfolio-math.test.mjs`

**Root:** `package-lock.json`

### 11.3 Sources

- Git repository `github.com/FinverseAI/FinVerse-AI`, `main` at `ce9edaa`
  (this phase: `ce48795`..`1c10651` + `88caa67`).
- Approved plan: `llm-layer-guardrails-readiness-evaluation-plan.md`
  (Plan v1, approved 19 November 2026), Phase 0 section and Section 6
  decisions.
- Daily Report — 19 November 2026 (FinVerse AI project files).
- Synopsis: `Finverse_Ai_Final_Synopsys.pdf`, Objectives 2 and 3,
  methodology §4.6, Eq. 4.1–4.2.
