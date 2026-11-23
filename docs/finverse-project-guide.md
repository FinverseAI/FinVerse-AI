# FinVerse AI

## The project, explained

A living guide to what exists, how it works, and what comes next.

**B.Tech major project | Edition 1.3 | 23 November 2026**

Personal finance + stock market and investment intelligence

Prepared for teachers, friends, recruiters and new teammates. Based on the current project files and the supplied project planning documents.

> TODAY: The personal-finance foundation is implemented, and the stock module and the language-model layer are now implemented too: market data, holdings and portfolio math (§04A), an AI assistant with tools and structured answers (§08B), a guardrail that checks every claim (§08C), a cross-module Investment Readiness score (§08D), and an evaluation harness (§12A). The remaining Module 1 integration work is also built: plain-words, voice and receipt expense entry, bill payments that record their expense transaction, in-app bill reminders, PDF and Excel exports, and monthly balance history (§02, §03, §06). Live model calls still need the OpenRouter API key, which is not yet configured — without it the AI endpoints answer with the raw computed numbers and no narrative, and expense extraction falls back to a local matcher.

This is a description of the reviewed working copy, including changes not yet committed to Git. It is not a claim that every feature has passed a live demonstration or is deployed publicly.

---

# 01 | Start here

## What problem does FinVerse solve?

Managing money often means keeping several separate pictures in your head: what you earn, what you spend, what you owe, what you are saving for, and how your investments are doing. The project proposes bringing these pictures together in one place. [S1]

Think of FinVerse as a financial notebook with a dashboard. The notebook records your information; the dashboard makes patterns easier to see. The planned AI assistant would explain the information in everyday language. The stock module would add market and portfolio research to the same workspace.

The intended audience is people managing personal money and people who want to understand stocks and their investments. The platform is a decision-support project. The reviewed files do not implement a brokerage account or real stock-order execution.

## Two modules, one long-term idea

| Module | Purpose | Position today |
| --- | --- | --- |
| Personal Finance Dashboard | Organize income, spending, budgets, savings goals and bills. | Core records and several dashboard views are implemented; some features remain partial. |
| Stock Market & Investment Intelligence | Understand stocks, market news, holdings and investment risk. | Implemented (§04A): market data, indicators, holdings, watchlists, portfolio math, optimization, news and screener. |

The long-term connection is now a working feature: the Investment Readiness score (§08D) combines cash-flow position (emergency fund, debt, surplus) with portfolio risk (concentration, volatility) into one documented 0–100 score, explained by the AI layer through the guardrail. [S1, S11]

## How to read this guide

**Implemented** means relevant application code exists. **Partial** means there is a useful piece but an important part is missing. **Planned** means it appears in a planning document but has no matching implementation here. **Not established** means the reviewed material cannot settle the question.

Sections 02-04 explain the user experience. Sections 05-08 explain the architecture, data and AI. Sections 09-11 catalogue the technology. Sections 12-16 cover progress, next steps, terminology, sources and future additions.

**Evidence rule:** current executable source takes precedence over older screenshots, embedded code copies and aspirational language. Source keys such as [S1] are explained in Section 15. No external product claims or web research were used.

---

# 02 | Personal finance: what is built

## Getting into your own workspace

The website includes a landing page, Google sign-in screens and a protected dashboard. A protected page checks who is signed in before showing personal information. Google authentication is wired through Better Auth, the sign-in library; using it requires the corresponding configuration. Live Google sign-in was not re-verified for this guide. [S3, S4]

A new user is sent through four setup screens: **name, monthly income and payday, budget split, and savings goals**. The budget percentages must add up to 100%, and at least one goal is required. A returning user with a completed profile goes to the dashboard. [S5]

| Area | What the current code lets a user do |
| --- | --- |
| Financial profile | Save and later edit income, planned expenses, current savings, monthly savings target, debt information and investing preferences. |
| Overview cards | See current savings, monthly income, savings target and calculated monthly surplus from the saved profile. |
| Budgets | Start with the saved onboarding allocation; compare matching recorded expenses with category limits; change the allocation in the Manage budgets dialog, which saves to the profile. |
| Goals | Save a name, target amount, deadline and priority; manage the goal list through the financial-profile editor; add savings towards a goal and view the contribution history. |
| Transactions | Add an income or expense with a description, amount, category and date; browse, search, edit and remove the saved records. |
| Expense entry | Add an expense in plain words, by speaking it, or by photographing a receipt; review what was understood before saving (§06). |
| Bills | Add a bill with amount, due date and auto-pay label; list, search, edit and remove saved bills; record payments and view each bill's payment history. |
| Notifications | See in-app reminders for bills that are overdue, due today, or due within the next week, with a count on the bell icon. |
| Spending analysis | View expense totals, category shares and bars for weekly, monthly or custom date ranges. |
| Comparisons | Compare elapsed days with the previous month or week and see a simple month-end spending estimate. |
| Reports and exports | View the account report as an on-screen summary of the saved plan; export transactions as CSV, PDF, or Excel. |

Transactions and bills have loading, empty and error states. The interface waits for a successful save before adding a new record to its displayed list. These details help users distinguish an empty account from a failed connection. [S6, S7]

Amounts are presented in Indian rupees with Indian digit grouping. The values come from user entry and stored records; a connected bank feed was not found. The screen's account report is a summary of the saved financial plan. [S7]

> A useful distinction: the profile describes the user's plan, while transactions describe the activity the user has actually entered. They are separate sources of information today.

---

# 03 | Personal finance: important boundaries

## What the numbers actually mean

The top summary cards and Expense Breakdown use the saved financial profile and budget allocation. Recent Transactions and Spending Analysis use recorded transactions. Adding a food expense changes the transaction-based analysis and matching budget spending, but it does not automatically rewrite the profile's income, planned expenses or current savings. [S7]

The Balance Breakdown panel has month controls and reconstructs a monthly history from the user's own recorded transactions: for each month it shows income, expenses, the month's net change, and a running balance carried forward from the first recorded month. The panel says plainly that this is computed from entered transactions, starting at zero — it is not a bank balance, and months before the first transaction are not shown. [S7]

Savings goals have targets and deadlines, and progress is tracked: adding savings towards a goal updates its saved amount and progress bar, and each goal keeps a contribution history that can be reviewed and corrected. [S7]

## Setup contains defaults, not a full assessment

The first-time setup asks only a small number of questions. It sets employment to salaried, current savings to zero, investment experience to none, risk tolerance to low and emergency-fund months to zero. These are software defaults, not conclusions about the person. The fuller financial-profile editor can update these details later. [S5]

Setup counts Rent plus Bills & Utilities as fixed expenses. It uses the Investments allocation as the monthly savings target and treats the rest as variable expenses. Because the entire income is allocated, the initial calculated surplus is zero. This is how the setup is currently translated into the profile, not evidence that the user has no real spare money.

## Boundaries fixed since the first edition

The first edition of this guide listed six boundaries. Five are now closed by implemented code; the table below records what changed and when.

| Boundary | What changed |
| --- | --- |
| Budget edits | The Manage budgets dialog now saves the new allocation to the profile (PUT), so edits survive a reload. |
| Profile consistency | The budget split is the single source of truth: whenever a split exists (in the request or already stored), the server recomputes fixed expenses, variable expenses and the savings target from income × split, so totals and allocation views cannot diverge. The profile form also keeps those three fields read-only while a split exists. |
| Category matching | Transaction entry now offers the same 12 categories as setup, plus Income. Older records keep their labels; legacy labels (Housing, Transportation, Utilities, Other) are mapped to the canonical ones on display and on save. |
| Record maintenance | Transaction edit and delete are implemented, with a confirm step before removal. Bills support editing, payment recording and a per-bill payment history. |
| Bills and reminders | In-app reminders exist: overdue bills and bills due within the next week appear in the notification centre, with a count on the bell. No email is sent. |
| Reports and AI | Transactions export as CSV, PDF, and Excel. Conversational expense entry (plain words, voice, receipt) and AI chat are implemented (§06, §08B). |

## What remains incomplete

| Boundary | What remains incomplete |
| --- | --- |
| Bills and payments | Auto-pay is stored information; payment execution, recurring bill generation and automatic payment of a bill were not found. Recording a payment is a manual record, and it creates the matching expense transaction (§13). |
| Reports | The account report is an on-screen summary of the saved plan; it is not exportable as a document. Transaction exports are separate (§02). |
| Money definitions | Whether unpaid bills should affect forecasts and totals, and how a monthly plan should reconcile with actual spending, are still open questions (§13). |

These remaining boundaries are reasons to call Module 1 a working foundation rather than a finished finance product. They also give the team a concrete list of integration work. [S5-S7]

---

# 04 | Stock intelligence: the planned module

> Edition 1.2 note: the plan described in this chapter is now implemented. Section 04A describes what was built; this chapter is kept as the record of the original plan.

The second module is a detailed product plan, not an implemented part of this working copy. No stock pages, market-data service, holdings tables or portfolio calculation engine were found. The following describes what the planning document intends users to do. [S1]

| Planned area | In everyday words |
| --- | --- |
| Market overview | See indices such as NIFTY 50 and SENSEX, gainers, losers, trading activity and how sectors are performing. An index summarizes a group of stocks. |
| Stock search and profiles | Find a company and inspect its price, business results, debt, valuation and ownership information where data is available. |
| Charts and indicators | Explore price history and calculated signals about trends or momentum. These are mathematical descriptions, not guarantees about future prices. |
| Watchlists and alerts | Keep lists of companies to follow and flag relevant price, news or company changes. |
| Company research | Compare companies and combine financial facts, price signals, news and risks into readable explanations. |
| Stock screener | Filter companies by conditions such as debt or profit growth; eventually express those conditions in ordinary language. |
| Portfolio tracker | Record holdings, quantities and purchase prices; calculate value, gains, losses, returns and the spread across sectors. A portfolio is someone's collection of investments. |
| Portfolio risk | Explain whether too much of a portfolio depends on one company, sector or kind of asset. |

## Advanced ideas in the roadmap

The plan also includes investment chat, company-event calendars, corporate actions, beginner explanations and a personalized market feed. Research-oriented extensions include portfolio health scoring, allocation optimization, what-if stress tests, paper trading with pretend money, market-condition classification and explanations of stock price moves. [S1]

An investment-readiness assessment would connect savings, emergency funds, debt and surplus to portfolio risk. Its scoring method and validation have not been implemented. The plan asks for documented assumptions and evidence rather than unexplained buy/sell predictions.

The older blueprint names market and news tools, but no functioning provider integration or verified data coverage was found. Update frequency, licensing, stale-data handling, missing-data behavior and score formulas are not established in the implementation. [S2]

**Scope note:** the later module plan places Tax & Compliance in a future phase. The older blueprint also includes small-business finance. Neither is part of the implemented personal-finance core. Module numbers in those two documents refer to different groupings.

---

# 04A | Stock intelligence: what is built

*Feature and date: the market module (Phase 0 of the LLM-layer plan), built 19 November 2026. [S11]*

The plan in Section 04 is now implemented: market data, stock pages, holdings, watchlists, portfolio math and optimization all exist in the source, with tests. The module's rule is the same as the rest of the project: **the code calculates, and the numbers are traceable to a stored price plus a formula.**

## Market data: where prices come from

Prices come from Yahoo Finance through the `yahoo-finance2` library (free, no API key), covering NSE symbols such as `RELIANCE.NS` and indices such as `^NSEI` (NIFTY 50). Quotes are cached in PostgreSQL (`market_quotes`) for 15 minutes and price history (`market_history`) for 24 hours; each cached row carries a fetched-at timestamp. When the cache is stale or Yahoo cannot be reached, the API returns the last-known price **marked stale** — a price is never invented, and stale data is never presented as live. A symbol with no price at all returns a 503, not a guess.

## What the module calculates

| Calculation | What it means | Where it lives |
| --- | --- | --- |
| SMA, EMA, RSI, MACD | Trend and momentum summaries from price history (moving averages, a 0–100 momentum index, a trend-following signal). | `apps/backend/src/ai/indicators.ts` (shared with the AI layer) |
| Portfolio value, gains/losses | Holdings valued at current prices; total invested vs current value; gains in rupees and percent. | `apps/backend/src/market/portfolio.service.ts` |
| CAGR, XIRR | Annualized returns: CAGR for a single holding period, XIRR for irregular cash flows. | Same |
| Sector concentration | The largest holding's and each sector's share of the portfolio by value. | Same |
| Markowitz optimization + Sharpe ratio | The allocation that maximizes return for a given risk (mean-variance solver), and return per unit of risk. Pure TypeScript — the repository has no Python. | `apps/web/lib/optimization.ts` |

Every indicator is unit-tested against known reference values (for example RSI 55.55 on the reference series); portfolio math is verified against hand-computed cases. The formulas are code, not model output, and the AI layer (§08B) explains them without recomputing them.

## What a user can do

| Area | What the current code lets a user do |
| --- | --- |
| Market overview | See NIFTY 50 / SENSEX and a stock list with prices and changes (`/market`). |
| Stock search and profile | Find a company and inspect its price, previous close, change, 52-week range, P/E, market cap, dividend yield and technicals (`/market/stock/[symbol]`). |
| Charts | Price history charts from the stored history table. |
| Holdings | Record holdings (symbol, quantity, buy price, buy date), list them, and see the valued portfolio with gains and sector weights. |
| Watchlist | Keep a list of symbols to follow. |
| Portfolio dashboard | Total value, invested amount, gains/losses, concentration, and the optimization view. |
| Screener | Filter the stock universe by conditions (see §08B for the natural-language version). |

## Start-to-finish example: adding a holding

A signed-in user records 10 shares of RELIANCE bought at ₹1,400 on 3 November 2026. The backend validates the symbol, quantity, price and date, stores a `UserHolding` row tied to the user's ID, and the portfolio view values it at the latest cached quote (or fetches a fresh one): 10 × ₹1,377.50 = ₹13,775 current value against ₹14,000 invested, a loss of ₹225 (−1.61%). If Yahoo is unreachable, the last-known price is shown marked stale; if no price exists, the holding is listed as unpriced and excluded from the totals rather than valued at zero.

## Data and ownership

Holdings and watchlist items are user-owned rows (one holding per user per symbol). Quotes and price history are public market data, shared across users. The AI layer reads holdings only for the signed-in user (§08B).

## Evidence and limits

Backend market tests cover the provider (cached/stale/error paths), the service, and the HTTP routes; the indicator and portfolio-math specs pin reference values. Limits: Yahoo is the only price source (no fallback provider); corporate actions (splits, bonuses) are not adjusted for; the screener universe is the seeded stock list, not the whole NSE; no alerts exist yet. Migrations for the market tables (`20261119120000_add_market_module`) are recorded in the repository; whether they are applied on the production database is a deployment step, not something this guide can verify from source.

## Technology decision

`yahoo-finance2` was chosen over Alpha Vantage (25 requests/day is too small for a screener) and over paid providers (the project budget is ₹0). TypeScript was chosen over the blueprint's Python (NumPy/SciPy) because the repository has no Python anywhere — one stack, one deploy.

## Status and next step

Implemented. Next: alerts, a second price source for resilience, and corporate-action adjustments.

---

# 05 | How the parts fit together

The **frontend** is the screen a person uses. The **backend** is the service that checks requests and applies the application's rules. A **database** stores records so they survive a reload. An **API** is an agreed way for software parts to ask each other for information or actions.

:::diagram architecture

## Reading the diagram

Next.js serves the website and also provides server-side forwarding routes. For finance operations, the browser calls those routes; they pass the request to NestJS. NestJS checks the session, validates the information and uses Prisma to read or write PostgreSQL. Prisma is the application's bridge between code and database tables. [S3-S6]

Sign-in takes a separate path. Better Auth runs inside the Next.js application and accesses the same PostgreSQL database through Prisma. NestJS asks Better Auth to verify the session before accepting protected requests. A session is a temporary record that keeps someone signed in. This means finance operations and sign-in share data storage, but have different entry points. [S4]

Think of the frontend as the reception desk, NestJS as the office staff checking a form, and PostgreSQL as the filing cabinet. Better Auth checks the visitor's identity. The browser does not receive direct access to the cabinet.

## Where Redis and AI fit

Redis is declared in Docker Compose, but no application connection or job worker was found. A cache is a fast temporary store; simply defining Redis does not mean requests use one. The AI layer now exists (§08B), but it is TypeScript inside the NestJS backend — not the Python service the older blueprint imagined — and it calls a hosted model over HTTPS, using the same PostgreSQL database for its check log and retrieval store. No separate AI service or vector database exists. [S2, S3, S11]

For local development, the web application uses port 3000, NestJS uses 3001, PostgreSQL is mapped to 5432 and Redis to 6379. A port is a numbered doorway to a service on a computer. These are development settings, not evidence of public hosting.

---

# 06 | Follow one expense from start to finish

## The implemented route: add a food expense

Imagine an authenticated user who has completed setup and spent **INR 500 on food on 15 November 2026**. This is an illustrative input traced through actual code, not a transaction written to a real account for this guide. [S6, S7]

| Step | What happens |
| --- | --- |
| 1. Enter | The user opens Add transaction and enters Food purchase, Expense, 500, Food & Dining and the date. A plain-words route exists as well — see below. |
| 2. Send | The browser converts an expense to a negative amount, -500, and sends the structured fields to /api/transactions. Structured means separately labelled fields. |
| 3. Forward | The Next.js server checks that the write comes from the expected website and forwards it, with the session cookie, to NestJS. A cookie is a small browser-held value used here to identify the session. |
| 4. Check identity | NestJS asks Better Auth to confirm the session and obtains the user ID from that verified response. The submitted form does not choose the owner. |
| 5. Check the record | The backend checks the description, accepted category, nonzero amount, two-decimal precision and valid calendar date. Invalid input is rejected. |
| 6. Store | Prisma creates a UserTransaction row in PostgreSQL with the signed amount, date, category, description and authenticated user's ID. |
| 7. Show the result | The saved record returns to the browser. It is added to the transaction list; relevant expense totals, charts and matching current-month budget spending are recalculated. |
| 8. Reload | A later visit requests that user's saved transactions from the backend again. Persistence depends on the configured database and applied migrations being available. |

If this were the only expense in the selected period, its total would be INR 500 and Food & Dining would account for 100% of that period's recorded spending. Profile-based savings and monthly-plan cards would remain unchanged.

If saving fails, an error is displayed instead of claiming the record was saved. The source has no duplicate-prevention key for transaction creation: retrying after an uncertain network result could require reconciliation. This differs from the explicit repeated-onboarding protection.

## The plain-words route: "I spent 500 on food"

The documents propose letting AI extract the amount, category, date and merchant from ordinary text — and that route is now built. The user types the sentence, speaks it, or photographs a receipt. Voice is transcribed in the browser; a receipt is read in the browser, and the photo never leaves the device. The text is then understood in one of two ways: by the reasoning model when the API key is configured, or by a local matcher on the server when it is not. Either way the extracted amount, category, date and merchant are shown in a review dialog, and nothing is saved until the user confirms it. Saving then follows exactly the same route as the form above, from step 2 onwards. [S1, S2, S6, S11]

---

# 07 | Where the data lives

PostgreSQL is the implemented **relational database**: it stores linked tables, like organized spreadsheets whose rows refer to each other. The user ID connects a person to their profile, goals, transactions, bills, sessions and provider accounts. The schema permits one financial profile and many of each other user-owned record. [S8]

| Record | Stored information | Connection and purpose |
| --- | --- | --- |
| User | ID, name, unique email, verification state, optional image and timestamps. | Central identity for the account. |
| Session / Account / Verification | Session expiry and token; provider-linked identity and optional tokens; verification identifiers and values. | Support sign-in. Sessions and provider accounts link to User; verification uses an identifier. |
| UserFinancialProfile | Income, planned expenses, debt, savings, savings target, investment preferences, emergency-fund range, payday, budget split and completion status. | One row per user; feeds the financial plan. |
| UserGoal | Name, target amount, target date and priority. | Many goals per user; contributions are a separate table (below). |
| UserGoalContribution | Amount, date and optional note. | Many per goal; deleting a goal removes its contributions. |
| UserTransaction | Description, category, signed amount, date and creation time. | Many records per user; supplies transaction analysis and (read-only) the AI layer. |
| UserBill | Name, amount, due date, auto-pay flag and creation time. | Many bills per user; supplies the bills list. |
| UserBillPayment | Amount and month paid. | One payment per bill per month; paying a bill does not create a transaction (a current inconsistency; §07A). |
| UserHolding | Symbol, quantity, buy price, buy date, optional name and sector. | One holding per user per symbol; valued at the latest price. |
| WatchlistItem | Symbol and optional name. | One row per user per symbol. |
| MarketQuote | Latest price, previous close, currency, sector and fetched-at time. | One row per symbol; public market data, shared across users. |
| MarketHistory | Daily open/high/low/close/volume, with a fetched-at time. | One row per symbol per date; public market data. |
| RagDocument | A chunk of retrievable text (news, company profile, or a user's transaction note) with a 768-number embedding, source, symbol and publication date. | Public chunks have no owner; user-note chunks are user-scoped and retrieved only for their owner. |
| GuardrailCheck | One claim the guardrail verified: claimed vs expected value, check type, verdict, feature and request ID. | User-scoped; the evaluation's grounding metric is computed from this table. |

## Why this structure makes sense

The files implement relationships, ownership filters, fixed-precision money fields and grouped profile saves. These are useful reasons for a relational design, although a separate database-selection decision document was not found. Profile and goals are saved together in one database transaction: either the whole change succeeds or it is rolled back. [S5, S8]

Money is stored with two decimal places. Profile amounts are returned as decimal strings; activity amounts are converted to numbers for the website. Spending calculations commonly use whole paise before converting back to rupees, reducing rounding drift. The budget split is a JSON field, a labelled data object, inside PostgreSQL; it is not a separate database.

Docker Compose gives PostgreSQL a named data volume so its files can outlive a container replacement. Redis also has a volume declaration, but its use by the application and any data written to it are not established. [S3]

**Vector storage:** a vector store finds text with similar meaning using numerical representations. The older blueprint proposed ChromaDB with bge-small embeddings for tax-document retrieval. The implemented store is different: **pgvector inside the same PostgreSQL database**, with 768-number embeddings from `baai/bge-base-en-v1.5` stored in the `rag_documents` table (§08B). News, company profiles and the user's own transaction notes are chunked and indexed; retrieval always scopes to public content plus the signed-in user's own records, so one user can never retrieve another user's notes. No chat-history or receipt tables exist. [S2, S8, S11]

---

# 07A | How the stored records connect

## One account is the link

Think of each user ID as a folder number. A saved expense, bill or goal carries that number, so the backend can ask for the records belonging to the signed-in person. It gets the identity from the verified session, rather than trusting an account number typed into the form. [S4, S6, S8]

:::diagram storage

All three branches above are inside PostgreSQL. The bottom row explains how the records are used; it does not represent extra databases. Verification records also exist for sign-in support, using their own identifier rather than a direct User relationship.

## A concrete storage example

An expense for INR 500 has its own record ID and the owner's user ID. Its amount is stored as -500.00, alongside Food & Dining, a description and a date. Another person's INR 500 expense is a separate record with a different owner. Listing transactions filters by the verified user's ID. [S6, S8]

The database defines linked-record deletion rules: if a User is deleted through the database, related records are configured to be removed too. A user-facing account deletion workflow was not found. Database structure and available buttons are separate things.

## Three kinds of storage, three different jobs

| Store | What it means for FinVerse today |
| --- | --- |
| PostgreSQL: implemented | Keeps exact, linked account and finance records. It is the source used by the finance screens. |
| Redis: configured only | A possible fast store or work queue foundation. No consuming application code was found, so it is not part of the current expense path. |
| Vector store: implemented as pgvector | Finds relevant passages by meaning inside PostgreSQL (`rag_documents`, 768-number embeddings). Used for news, company profiles and the user's own transaction notes. |

Implemented storage now exists for stock-price history and investment holdings (see §07). No implemented storage for uploaded receipts, voice recordings or chat transcripts was found. Storage location and retention for these future inputs are not established. [S2, S3, S8, S11]

---

# 08 | Calculations and the AI layer

A **language model** generates and interprets text. A **deterministic calculation** follows fixed rules and gives the same answer for the same inputs. FinVerse's calculations do not call a language model: the model understands requests and explains evidence while ordinary code handles financial math. [S1, S2, S7, S11]

| Job | Method and current status |
| --- | --- |
| Monthly surplus | Implemented arithmetic: income + other income - fixed expenses - variable expenses - savings target. |
| Category budget allocation | Implemented percentage calculation using whole paise, distributing leftover paise so the allocation stays exact. |
| Spending totals and shares | Implemented date filtering, addition and division using recorded expenses. |
| Month-end spending estimate | Implemented projection: spending so far / elapsed days x days in the month. It is an extrapolation, not an AI prediction. |
| Stock indicators and returns | Implemented formula-based work (§04A): SMA/EMA/RSI/MACD, portfolio value, gains/losses, CAGR and XIRR. |
| Portfolio optimization and stress tests | Implemented mean-variance optimization (Markowitz) and Sharpe ratio in TypeScript; scenario stress tests are not yet built. |
| Expense interpretation and stock explanations | Implemented language-model work (§08B): structured extraction, screening requests, news summaries and explanations of numerical results, all behind the guardrail (§08C). |

## What protects accuracy today?

The implemented protections are ordinary software checks: signed-in ownership, permitted fields, valid dates, money precision, budget percentages totalling 100 and expenses plus savings target not exceeding income. Empty history is labelled instead of filled with invented values. On top of those, the AI layer has its own verification system: the **guardrail** (§08C) re-checks every number in a model's answer against the deterministic evidence before the answer reaches the user, and replaces a failed answer with a rule-written template. [S4-S8, S11]

## What the blueprint proposed — and what was built instead

The planned pipeline validates the model's structured output, checks financial numbers against calculations or market data, and retries or replaces inconsistent output. For tax questions it proposes **retrieval-augmented generation (RAG)**: finding relevant source passages before asking the model to answer. This is like giving an assistant the correct reference pages before asking for an explanation. [S2]

Most of that pipeline now exists, but built differently from the blueprint: TypeScript instead of Python, Zod instead of Pydantic, pgvector instead of ChromaDB, and hosted models via OpenRouter instead of local open models (§08B, §11). RAG is implemented for news, company profiles and the user's own transaction notes — not for tax documents, which remain out of scope. The blueprint's phrases such as "100% verified" and "hallucination-free" remain aspirations, not demonstrated guarantees: the guardrail catches wrong numbers (verified by a corrupted-output test suite, §08C), but it cannot prove that prose is true. Accuracy benchmarks now exist (§12A) for the readiness explainer; the other features are not yet measured. [S11, S12]

---

# 08A | Understand the numbers with examples

These examples use invented amounts to explain formulas visible in the project. They are not a user's records or measured investment results. [S7]

## The plan: how much is left unallocated?

Suppose the saved profile contains monthly income of INR 30,000, other income of INR 2,000, fixed expenses of INR 10,000, variable expenses of INR 8,000 and a savings target of INR 5,000.

> Monthly surplus = 30,000 + 2,000 - 10,000 - 8,000 - 5,000 = INR 9,000.

This is money left in the entered plan. It is not a bank balance. The current code does not automatically change these profile fields when a transaction is added.

## The record: what did I spend?

If the selected period contains a food expense of INR 500 and a transport expense of INR 300, spending totals INR 800. Food contributes 62.5% and transport 37.5%. An income record of INR 2,000 does not count as an expense. The implementation identifies expenses by negative amounts.

If a matching food budget is INR 3,000, that INR 500 expense counts as INR 500 of current-month food spending. The category must match directly or through one of the implemented label mappings. This explains why consistent categories matter.

## The estimate: what if spending continues at this pace?

If recorded spending is INR 6,000 by day 15 of a 30-day month, the dashboard's estimate is INR 12,000: 6,000 divided by 15, multiplied by 30. It assumes the same average daily pace. A one-off purchase or missing expense can change its usefulness. No language model is involved.

## The future — now implemented: calculating and explaining investments

| Job | How to explain the distinction |
| --- | --- |
| Portfolio value and returns | Ordinary financial code calculates values from holdings and prices (§04A). |
| Price indicators | Formulas summarize trends or momentum in price history (§04A). |
| News and stock explanation | A language model turns supplied facts and calculations into readable text (§08B). It must not invent a price or treat a possible cause as proven — the guardrail (§08C) checks every number it states. |
| Accuracy checks | The guardrail checks structured fields and numerical claims against reference data and calculations (§08C), and the evaluation harness (§12A) measures how well it works. |

A calculator and an explainer have different jobs. The project now has both: calculator-like finance logic and a connected AI explainer. What is not yet proven is the accuracy of live AI answers — the evaluation (§12A) measures the baseline and the guardrail's sensitivity, but live model metrics await the API key.

---

# 08B | The AI layer: how the assistant works

*Feature and date: the LLM foundation, retrieval, screening and news (Phases 1–2 of the LLM-layer plan), built 19 November 2026. [S11]*

## The core rule: the LLM reasons, the code calculates

The assistant never computes a number itself. When a user asks a question, deterministic code fetches the facts first (the user's profile, their transactions, a stock's price and indicators, retrieved news passages) and hands them to the model as **evidence**. The model writes prose that explains the evidence, and the guardrail (§08C) checks every number in that prose against the evidence before it is shown. If the model invents a number, the answer is replaced — not shown with a warning.

## Which models, and where they run

The models are hosted by **OpenRouter** (an API that serves many models behind one key) and called over HTTPS from the NestJS backend. There is no model running on the user's machine and no Python service. The pinned models are:

| Role | Model | What it does |
| --- | --- | --- |
| Primary | `qwen/qwen-2.5-72b-instruct` | Chat, explanations, extraction, screening interpretation. |
| Reasoning | `deepseek/deepseek-r1-0528` | Multi-step analysis where the model shows its working (the reasoning is stripped before the answer is shown). |
| Embeddings | `baai/bge-base-en-v1.5` | Turns text into 768-number meaning-vectors for retrieval. |

These model IDs were verified against the live OpenRouter catalogue on 19 November 2026; the synopsis's original IDs no longer exist. Prices (Qwen $0.36/$0.40, R1 $0.571/$2.286 per million prompt/completion tokens, as of 23 November 2026) are recorded in the evaluation config for cost benchmarking. The API key comes from an environment variable, never from the source; without it the AI endpoints answer with the raw computed numbers and no narrative (a 503 for chat, where there is nothing to show without a model).

## Tools: what the model may ask for

The model cannot touch the database directly. It can only call nine typed **tools** — small, owner-scoped functions that return facts:

| Tool | What it returns |
| --- | --- |
| `getUserProfile` | The signed-in user's financial profile (income, expenses, savings, debt, risk tolerance). |
| `getTransactions` | The user's transactions for a period, with category and amount. |
| `getBudget` | The user's monthly budget and category splits. |
| `getGoals` | The user's goals and contributions. |
| `getQuote` | A stock's latest price, change and previous close. |
| `getHistory` | Price history for a symbol. |
| `getIndicators` | SMA/EMA/RSI/MACD for a symbol. |
| `getPortfolioSummary` | The user's holdings valued at current prices, with gains and concentration. |
| `searchKnowledge` | Relevant passages from the retrieval store (news, company profiles, the user's own notes). |

Every tool result is scoped to the signed-in user; a tool call for another user's data is impossible by construction, not by trust. The model may also ask for a **reasoning** pass (DeepSeek R1) for complex questions, and every model reply is parsed as structured JSON against a Zod schema: a summary, claims (each a number with its unit and source), and citations. A reply that does not match the schema is retried once, then replaced by a template.

## What the assistant can do

| Feature | Endpoint | What happens |
| --- | --- | --- |
| Chat | `POST /ai/chat` | Free-form questions; the model picks tools, reads the evidence, and answers with cited claims. |
| Explain a stock | `POST /ai/explain-stock` | Price, indicators and profile facts → a plain-language explanation of what the numbers say (and do not say). |
| Explain the news | `POST /ai/explain-news` | Retrieved news passages → a summary with sentiment, with each claim tied to a passage. |
| Screen stocks | `POST /ai/screen` | A natural-language request ("large-cap, low P/E") → structured conditions → the screener runs them against the stock list. |
| Explain Readiness | `POST /ai/explain-readiness` | The computed Readiness score and its five factors → a plain-language explanation (§08D). |
| Status | `GET /ai/status` | Whether the model key is configured and which models are pinned. |

## Retrieval: how the assistant finds the right passages

RAG (**retrieval-augmented generation**) means the model answers from retrieved passages, not from memory. News articles, company profiles and the user's transaction notes are split into chunks, embedded with `bge-base-en-v1.5`, and stored in PostgreSQL's pgvector extension. A question is embedded the same way, and the closest passages are fetched and passed to the model with their source. Retrieval is scoped to public content plus the signed-in user's own records. News is cached (time-to-live in the RAG config) and fetched in small batches so Yahoo is not hammered. [S11]

## Safety rails

Per-user rate limits, a 30-second model timeout, a cost cap per request, and a refusal path for questions the evidence cannot answer ("I don't have that information") — the model is instructed never to guess. The assistant explains numbers; it does not give personalised investment advice, connect bank accounts, or execute payments.

## Evidence and limits

The AI module has the largest test suite in the backend: provider, tools, prompts, cache, rate limits, RAG retrieval and chunking, and HTTP routes are all covered, with the model mocked so tests need no API key. The live behaviour — real model answers, real latency and cost — is **not yet measured**, because the OpenRouter key is not configured (§12A). The evaluation harness is built for the key's arrival: one command, no code changes.

## Status and next step

Implemented. Next: configure the key, run the live evaluation, and add the planned expense-extraction entry flow (the extraction schema exists; the save/review UI does not).

---

# 08C | Guardrails: checking every claim

*Feature and date: the verification engine (Phase 3 of the LLM-layer plan), built 21 November 2026. [S11]*

A **guardrail** is a check that runs after the model writes, before the user reads. FinVerse's guardrail does not judge style or tone — it re-checks numbers.

## How a claim is verified

Every model answer is structured: a summary plus **claims** — each claim is one number, its unit, and the source it came from (for example, "RSI 55.55, from the indicators tool"). The guardrail compares each claim against the deterministic evidence that was handed to the model:

| Check | Tolerance | Example |
| --- | --- | --- |
| Money amounts | Exact to the paise (₹0.01) | A claim of ₹1,377.50 must match the quote exactly. |
| Percentages and ratios | ±0.1 | A claim of 62.5% passes if the evidence says 62.45–62.55%. |
| Scores | Exact | A Readiness score of 100 must be exactly 100. |
| Source existence | The claimed source must be in the evidence | A claim citing "the news" fails if no news passage was retrieved. |
| Citation match | Cited passages must exist | A citation to passage #3 fails if only two passages were retrieved. |

A claim that passes every check is logged as passed; a claim that fails is logged with the claimed and expected values. **Every check is written to the `guardrail_checks` table** — pass or fail — so the evaluation (§12A) can compute the guardrail pass rate from real data instead of estimating it.

## What happens when a claim fails

The answer is not shown with the wrong number. The pipeline retries the model once with the failure pointed out; if the retry also fails, the user gets a **template answer** — rule-written prose that states the computed numbers directly, with no model involvement. The user always gets a correct answer, even if it is plainer than a model would write.

## How the guardrail is tested

A **corrupted-output suite** (22 tests) feeds the guardrail deliberately wrong answers — inflated scores, shifted percentages, invented prices, phantom citations — and requires it to catch every one. The evaluation (§12A) goes further: a labelled fixture model (`mock/corrupt`) raises the Readiness score by 7 in both its values and its prose, so the error is internally consistent and only the guardrail can catch it. In the no-key evaluation run it caught exactly one check per scenario — the score value check — and rejected all 19 corrupted answers.

## What the guardrail cannot do

It checks numbers against evidence; it cannot check whether prose is fair, complete or well-judged, and it cannot detect a true number used to support a misleading conclusion. Those qualities are what the human rubric in the evaluation (§12A) is for.

## Status and next step

Implemented. Next: extend the check set (for example, checking that a stated trend direction matches the indicator values) and add the guardrail to the remaining AI features as they are measured.

---

# 08D | Investment Readiness: the cross-module score

*Feature and date: the readiness score (Phase 4 of the LLM-layer plan), built 21 November 2026. [S11]*

## The idea

Module 1 knows the user's cash flow; Module 2 knows their portfolio. **Investment Readiness** is the first feature that uses both: a single 0–100 score answering "how ready is this person to invest, given their cash flow *and* their portfolio risk?" The score is a deterministic formula — the same inputs always give the same score — and the AI layer only explains it.

## The formula

Five factors, each scored 0–100 and weighted:

| Factor | Weight | What it measures | Full marks | Zero marks |
| --- | --- | --- | --- | --- |
| Emergency fund | 25 | Months of expenses covered by savings | ≥ 6 months | 0 months |
| Debt-to-income | 20 | Monthly debt payments ÷ monthly income | ≤ 10% | ≥ 50% |
| Surplus | 25 | Monthly surplus ÷ monthly income | ≥ 30% | ≤ 0% |
| Concentration | 15 | Largest holding's share of the portfolio | ≤ 20% | ≥ 80% |
| Volatility | 15 | Portfolio volatility (annualized) | ≤ 10% | ≥ 40% |

Each factor scales linearly between its full-marks and zero-marks thresholds. The bands are: **Ready** 80–100, **Building** 50–79, **Not ready** 0–49.

## Missing data is rescaled, not invented

A user without a portfolio has no concentration or volatility. Instead of scoring those factors zero — which would punish someone for not yet investing — the formula **rescales**: the weights of the available factors are stretched to fill 100 (so cash-flow factors carry the whole score). A user with no data at all gets no score, labelled "unavailable", rather than a misleading zero.

## Worked example

A healthy saver (from the evaluation scenarios, §12A): ₹80,000/month income, ₹30,000/month expenses, ₹3,60,000 in savings (12 months of expenses), no debt, and a diversified portfolio. Emergency fund: 12 months → 100. Debt-to-income: 0% → 100. Surplus: ₹50,000 ÷ ₹80,000 = 62.5% → 100. Concentration and volatility both score 100. **Score: 100 — Ready.** By contrast, a single-stock gambler (one holding, high debt, no savings) scores 28 — Not ready. Both scores are hand-computed in the evaluation and pinned by tests, so the formula cannot drift silently.

## How the score is explained

`POST /ai/explain-readiness` runs the formula, then asks the model to explain the result in plain language: which factors help, which hurt, and what would move the score. The explanation passes through the guardrail (§08C) — the model must state the score and each factor value exactly as computed. If the key is not configured, the endpoint returns the score, the band and the factor breakdown with no narrative.

## Status and next step

Implemented, with the formula pinned by tests and the evaluation harness (§12A). The dashboard card is built. Next: calibrate the thresholds against real user feedback once the feature is used.

---

# 09 | Technology used in the application

Versions below are declarations in the project files, not claims about the latest releases. A leading ^ permits compatible updates. These tools have identifiable roles in the current source or configuration. [S3-S8]

| Tool | Declared version | One-line role |
| --- | --- | --- |
| Next.js | 16.3.8 | Serves website pages, handles routes and forwards finance requests on the server. |
| React | 19.2.8 | Builds interactive screen components and keeps the displayed state in sync. |
| React DOM | 19.2.8 | Connects React components to browser page elements. |
| TypeScript | 7.0.2 root/web; ^6.0.2 backend | Adds checks for the shape of data and code before the application runs. |
| Tailwind CSS | ^4.3.4 | Provides styling utilities used to build the interface. |
| PostCSS / Tailwind PostCSS integration | Integration ^4.3.4 | Processes the application's CSS styling during the web build. |
| Geist / Geist Mono | Local font assets | Provide the website's regular and monospaced typography. |
| Better Auth | ^1.7.18 | Manages Google sign-in and sessions inside the Next.js application. |
| Better Auth Prisma adapter | ^1.7.18 declared package | Lets authentication data use Prisma and PostgreSQL; source imports the adapter through Better Auth. |
| NestJS core / common / Express adapter | ^12.0.1 | Organizes backend services and exposes finance endpoints through its Express adapter. |
| NestJS Config | ^12.0.1 | Loads server configuration such as service addresses and database settings. |
| Prisma / Prisma Client | ^6.16.3 | Define data models and give application code a typed route to PostgreSQL. |
| PostgreSQL | Docker image 17 | Stores account and personal-finance records in linked tables. |
| pgvector | Postgres extension | Stores 768-number embeddings in the `rag_documents` table for retrieval; accessed through raw SQL, not the typed Prisma client. |
| yahoo-finance2 | ^4.0.6 | Fetches quotes, history, profiles and news from Yahoo Finance; free, no API key. |
| jsPDF | ^4.2.1 | Builds the PDF transaction export in the browser; no server round-trip. |
| SheetJS (xlsx) | ^0.18.5 | Builds the Excel transaction export in the browser; no server round-trip. |
| Tesseract.js | ^7.0.0 | Reads printed text from receipt photos in the browser; the photo never leaves the device. |
| Web Speech API | Built-in (browser) | Transcribes spoken expense entries in the browser; no audio is stored. |
| Zod | ^4.6.7 | Validates model outputs and request data against schemas (the structured-answer checker). |
| Node.js | Engine requirement >=24 | Runs the JavaScript-based web and backend tools and services. |
| Browser Fetch API | Built-in | Sends requests between the browser and server; server Fetch is also used for forwarding and session checks. |

## Interface choices visible in the source

The dashboard uses custom React components, shared CSS, inline SVG graphics and native dialog elements. SVG is a scalable drawing format used for icons and visual elements. A separate charting package, shadcn/ui or Framer Motion dependency was not found in the current application manifests.

Google is the sign-in provider configured by the code. A Google client ID, secret and public enable flag are required for that path; their private values are deliberately omitted here. Their presence in configuration does not substitute for a live sign-in test.

---

# 10 | Development and infrastructure tools

These tools help the team run, organize, build or check the project. A **monorepo** is one repository containing several related applications and shared packages. A **build** prepares source code for execution or deployment. [S3]

| Tool or package | Role and evidence status |
| --- | --- |
| npm | Installs dependencies and runs project commands; the root declares npm 11.20.0. |
| Turborepo (^2.11.10) | Coordinates development, build, lint and type-check commands across workspaces. |
| Git | Tracks source changes; this guide includes the current uncommitted working-copy changes. |
| Docker / Docker Compose | Define local PostgreSQL and Redis containers and their volumes. A container is a packaged service environment. |
| Redis (image 8) | Declared local fast-store service; no Redis client integration or queue worker was found. |
| Shared ESLint config / shared TypeScript config | Reuse checking rules across the repository's applications. |
| ESLint (web 10.9.1) | Flags web-source issues and rule violations. This kind of checking is called linting. |
| Oxlint / oxlint-tsgolint | Provide backend linting, including checks that use TypeScript information. |
| Prettier | Formats source files consistently; root declares 3.9.6, backend ^3.4.2. |
| Nest CLI / Schematics | Start, build and generate NestJS project structures during development. |
| Jest / Nest testing / ts-jest | Run backend checks and prepare TypeScript tests for Jest. |
| Supertest | Exercises backend request handlers in HTTP tests. HTTP is the request/response protocol used by the web. |
| Node test runner | Runs the spending-calculation tests in apps/web/test. |
| Type definitions (@types packages) | Describe library interfaces so TypeScript can check Node, React, Express, Jest and Supertest usage. |
| ts-node / ts-loader / tsconfig-paths | Support executing, building and resolving TypeScript during development. |
| Webpack | Selected explicitly by the web application's Next.js dev and build commands. |
| reflect-metadata / RxJS / source-map-support | Support Nest's runtime metadata, reactive utilities and readable debugging traces. |
| Babel TypeScript preset / Nest MAU | Listed development dependencies; a distinct product feature using them was not established. |

## Where a teammate looks

**apps/web** contains screens, authentication and forwarding routes. **apps/backend** contains business rules, protected endpoints and Prisma database definitions. **packages** contains shared checking configuration. **docker-compose.yml** defines the local data services. No services/ai implementation or packages/shared business-data package was found in the reviewed file inventory.

Local startup is documented in ONBOARDING.md. Public hosting, automated deployment, backup procedures and production monitoring are not established by the reviewed files. A deploy command in a package manifest is not evidence that a deployment exists.

---

# 11 | Proposed technology: not installed features

The older architecture blueprint lists the following candidates. They explain the intended AI design, but none should be presented as a working integration merely because it appears in that document. Alternatives separated by "or" remain alternatives in the evidence. [S2]

| Proposed tool | Intended role in plain words |
| --- | --- |
| Python | Runs the proposed AI services and financial calculation engines. |
| Llama-3-8B-Instruct or Mistral-7B-Instruct | Candidate open models for interpreting requests and generating explanations. |
| LangGraph | Coordinates the steps and specialist components handling a request. |
| Pydantic | Checks that extracted fields and model outputs follow expected data rules. |
| Whisper Base or Tiny | Converts spoken expense entries into text. **Not used:** voice entry uses the browser's built-in Web Speech API instead (§09). |
| EasyOCR or Tesseract | Reads printed text from receipts and other images; OCR means optical character recognition. **Tesseract is now implemented** as Tesseract.js, running in the browser (§09). |
| NumPy | Handles numerical arrays and mathematical calculations. |
| SciPy / scipy.optimize | Supports simulations and constrained numerical optimization. |
| pandas | Organizes and processes tables of financial data. |
| QuantLib | Provides financial modelling tools proposed for market analysis. |
| yfinance | Proposed route for historical and current market-price information. Working coverage and timeliness are not verified here. |
| Finnhub API or RSS news feeds | Proposed sources of market news; RSS is a standard feed of published updates. |
| ChromaDB | Stores meaning-based representations of reference text for retrieval. |
| BAAI/bge-small-en-v1.5 | Turns reference passages into embeddings: number lists representing meaning for similarity search. |
| LangChain or LlamaIndex | Helps assemble the proposed document-retrieval and answer-generation process. |
| PyPDF2 | Extracts content from PDF reference documents in the older plan. |
| SQLite or Redis | Proposed storage for interaction state in the older design; current authentication uses PostgreSQL instead. |
| scikit-learn / Isolation Forest | Proposed unusual-transaction detection for the older small-business module, outside the current two-module core. |

## Decisions that remain open

A Python web-service framework, final model, model-hosting setup and background-job system are not implemented in the reviewed source. FastAPI and BullMQ were not found there. The documents' list of candidate tools is not an installation record or a tested capacity plan.

The older document describes a local, open-source AI ambition while also naming external market/news sources. Therefore, completely offline operation and independence from all outside services cannot be claimed. The current implemented sign-in path itself uses Google.

## Decisions made since Edition 1.1 (23 November 2026)

Several of the blueprint's open questions now have answers — mostly different from the blueprint's candidates, because the repository has no Python anywhere and the budget is ₹0:

| Question | Blueprint's candidate | Decision taken |
| --- | --- | --- |
| AI service language | Python (FastAPI) | TypeScript inside the NestJS backend — one stack, one deploy. |
| Model | Llama-3-8B / Mistral-7B, local | Hosted via OpenRouter: Qwen 2.5 72B (primary), DeepSeek R1 (reasoning). The synopsis's model IDs no longer exist; the current IDs were verified against the live catalogue on 19 November 2026. |
| Output validation | Pydantic | Zod schemas (TypeScript). |
| Vector store | ChromaDB | pgvector inside the existing PostgreSQL database. |
| Embeddings | BAAI/bge-small-en-v1.5 | BAAI/bge-base-en-v1.5 (768 dimensions), via OpenRouter. |
| Market data | yfinance (Python) | yahoo-finance2 (TypeScript), same Yahoo source, free, no key. |
| News | Finnhub API or RSS | Yahoo Finance news, via the same provider. |
| Numerical engine | NumPy / SciPy / QuantLib / pandas | Pure TypeScript (indicators, portfolio math, optimization). |

Still open: a background-job system and a second price source. Voice input and receipt OCR are implemented (§06, §09). [S11]

---

# 12 | Progress and evidence today

## Implemented foundation versus remaining work

| State | What the evidence supports |
| --- | --- |
| Implemented in source | Landing and Google-auth flows; profile-based route protection; onboarding; profile and goal saving/editing; transaction add/list/search/edit/delete; bill add/list/edit/delete with payment recording and payment history; spending analysis; user-scoped backend checks; database schemas and migrations. **Since Edition 1.1:** market module (quotes, history, indicators, holdings, watchlists, portfolio math, optimization); AI layer (chat, stock/news/readiness explanations, screener, RAG retrieval); guardrail verification engine; Investment Readiness score and dashboard card; evaluation harness. **Since Edition 1.2:** persistent budget management; 12-category alignment with legacy mapping; plain-words, voice and receipt expense entry with a confirm-before-save review; bill payments that create their matching expense transaction; in-app bill reminders; CSV, PDF and Excel transaction exports; monthly balance history reconstructed from transactions. |
| Partial / integration work | Connection of transactions to all summary cards (profile cards still show the saved plan, not recorded activity); profile consistency between expense totals and the budget split; export of the account report as a document. |
| Configured, not connected | Redis is in Compose, with no consuming application integration found. The OpenRouter API key is not configured, so live model calls are not yet possible (§12A). |
| Planned | Scenario stress tests; recurring bill generation; payment execution. |
| Later scope | Tax/compliance in the module roadmap; small-business finance in the older blueprint. |

"In progress" here means partially implemented or present as local working-copy changes. No issue tracker, assigned owner or delivery schedule was supplied to establish who is currently working on each item.

## Verification record

| Check | Result on 23 November 2026 |
| --- | --- |
| Backend tests | 648 of 648 passed (48 suites), covering the finance core, market module, AI layer, guardrails, readiness and the evaluation harness. |
| Web tests | 92 of 92 passed (spending calculations, exports, expense extraction, receipt reading, notifications and related checks). |
| End-to-end tests | 5 of 5 passed. |
| Type checks and lint | Backend `tsc`, Oxlint, Prettier, web `tsc` and ESLint all clean. |
| Evaluation harness (no API key) | Baseline grounding 100.0% (19/19 answers, 1,355/1,355 checks); corrupted-output fixture caught on every answer (0/19 passed) — see §12A. |
| Live user journey and deployed service | The public site (Netlify, `https://finverseaii.netlify.app`) was checked on 23 November 2026: homepage, health, auth-guard and origin-check responses all behaved as expected. Google login and end-to-end persistence against a live account were not tested. |

The earlier backend checks use mocked dependencies for several cases; passing them is not proof that the real database and sign-in provider are connected. A database-persistence test script exists, but was not run. [S9, S12]

## Which snapshot does this describe?

The reviewed repository was based on Git commit **`629c037`** (the savings-snapshot label), which includes the Module 1 integration work of 23 November 2026: category alignment, PDF/Excel exports, balance history, plain-words/voice/receipt expense entry, bill-payment transactions, the notification centre, and the UI audit fixes — ten commits on top of the Phase 6 documentation (`8f3293c`), plus the Edition 1.3 guide changes in this edition.

Older notes contain earlier behavior. In particular, DASHBOARD_SOURCE.md embeds a mock dashboard; ONBOARDING.md predates parts of the current onboarding and saved activity flow. Those notes remain useful history, but current source determines this edition's feature claims. [S10]

---

# 12A | Evaluation: measuring the AI layer

*Feature and date: the evaluation harness (Phase 5 of the LLM-layer plan), built 23 November 2026. [S12]*

## Why measure, and what is measured

A model that sounds confident is not the same as a model that is right. The evaluation harness measures four things, using 20 scripted scenarios — seeded fictional profiles and portfolios (a healthy saver, an over-spender, a concentrated portfolio, a high-debt household, a single-stock gambler, and so on). All scenarios use invented data; no real user data is involved. Every scenario's expected score is hand-computed from the formula and pinned by a test, so the harness cannot silently drift.

| Metric | What it measures | How |
| --- | --- | --- |
| Factual grounding | Do the model's numbers match the computed evidence? | The guardrail pass rate: the fraction of answers (and of individual checks) that pass verification. Computed from the `guardrail_checks` table. |
| Self-consistency | Does the model reach the same conclusions when asked the same question five times? | Pairwise agreement on the extracted conclusions: the quoted score, the named band, and the set of factors mentioned. |
| Explanation quality | Is the explanation clear, evidence-based and actionable? | A human rubric (1–5 on clarity, evidence use, actionability) applied to a **blind rating pack**: model and baseline outputs shuffled under opaque labels, so the rater does not know which is which. The ratings are a human step and have not yet been collected. |
| Latency and cost | How long does an answer take, and what does it cost? | Measured per model from real API usage (token counts × the pinned price table). Cost is reported as null when the provider does not report usage — never estimated. |

## The baseline: what "good" is compared against

The **template baseline** is a rule-written explanation generated from the same numbers the model sees — no model involved. It is the comparison point: the model's explanations must be at least as accurate as the template, and the rating pack tests whether they are clearer or more actionable. If the model cannot beat a template on grounding, it should not be shown to users at all.

## What the first run measured (23 November 2026, no API key)

The OpenRouter key is not configured, so the harness ran end-to-end **without live model calls**: the baseline was fully measured, and two labelled fixture models exercised the runner's mechanics. No fixture number is presented as a real measurement.

| Path | Grounding (answers) | Grounding (checks) | Meaning |
| --- | --- | --- | --- |
| Template baseline | 100.0% (19/19) | 100.0% (1,355/1,355) | The template states the computed numbers exactly. |
| Fixture model, correct | 100.0% (19/19) | 100.0% | The runner and guardrail handle a correct model answer. |
| Fixture model, corrupt | 0.0% (0/19) | 98.6% (1,340/1,359) | The corrupt fixture raises the score by 7 in both values and prose; the guardrail caught exactly one check per scenario — the score value — and rejected every answer. |
| Live LLM (Qwen / R1) | **Pending key** | **Pending key** | Not measured. The harness detects the missing key, skips live calls, and reports "pending key" — it never fails and never fabricates outputs. |

Baseline latency was 0.39–5.25 ms per scenario (mean 1.51 ms) — the template is pure arithmetic. One scenario (no data at all) correctly produced no score, labelled "unavailable". The full results table and the report-ready write-up are in `docs/evaluation-writeup.md`; the raw results are in `apps/backend/eval/results/`.

## What is still to be measured

Live grounding, self-consistency, latency and cost for both models — one command (`node dist/eval/run-eval.js`) once the key is configured, with no code changes. The human rubric ratings, from the blind rating pack in `apps/backend/eval/rating-pack/`. The harness currently covers the readiness explainer only; chat and RAG answers need a live database and are future work.

## Status and next step

Implemented. Next: configure the key, run the live evaluation, collect the human ratings, and extend the harness to the remaining AI features.

---

# 13 | What comes next, and what is undecided

The module document recommends building a strong core before advanced research features. The sequence below translates its priorities and the current gaps into a suggested implementation order. It is a documentation recommendation, not an approved schedule or a claim that work has started. [S1]

| Suggested stage | Concrete outcome to explain in the next edition |
| --- | --- |
| 1. Complete the finance loop | **Done in part:** budget changes persist and category choices are aligned. Still open: how actual activity should affect the financial plan and summary cards (profile cards still show the saved plan). |
| 2. Verify the full journey | Demonstrate sign-in, setup, saved changes after reload, user separation and clear recovery from failed requests with the real services. |
| 3. Finish core records and reports | **Done:** record maintenance (transaction and bill editing, payment history), in-app reminders, and CSV/PDF/Excel exports are built. Bills do create transactions when paid (decision below). Still open: exporting the account report itself. |
| 4. Introduce bounded AI entry | **Done:** text-to-expense extraction with a confirm-before-save review flow, plus voice and receipt entry, are built (§06). |
| 5. Build the market foundation | **Done (§04A).** Next: alerts, a second price source, corporate-action adjustments. |
| 6. Add researched intelligence | **Done (§08B–§08D, §12A).** Next: configure the API key, run the live evaluation, collect human ratings. |

## Team decisions made 23 November 2026

Four open questions from the integration plan were decided by the team on 23 November 2026 and are implemented in the code as described:

| Decision | Chosen option |
| --- | --- |
| Receipt storage | No upload at all. Receipts are read in the browser (Tesseract.js); the photo never leaves the user's device, nothing is stored server-side, and no retention policy is needed. |
| Reminders | In-app only. Due-soon and overdue bills appear in the notification centre; no email is sent and no email service is used. |
| Bills and transactions | Paying a bill creates a matching expense transaction (same amount, the bill's name and paid date, category "Bills & Utilities"), written in the same database transaction as the payment — either both land or neither does. Removing a payment record later does not remove the transaction it created, and the interface says so. |
| Current savings | Stays a user-entered snapshot from the financial profile; it is not derived from transactions. The dashboard labels it as a snapshot the user updates. |

## Team decisions made 24 November 2026

The four remaining open questions from the integration plan were decided on 24 November 2026 and are implemented in the code as described:

| Decision | Chosen option |
| --- | --- |
| Profile consistency | The budget split is the single source of truth. Whenever a split exists — sent with the save or already stored — the server recomputes fixed expenses, variable expenses and the savings target from monthly income × split, so the totals can never silently diverge from the allocation. A save that omits the split inherits the stored one; a save that sends a new split replaces it. |

## Questions the reviewed material does not settle

**Money definitions:** "Current savings" is a manually maintained snapshot from the financial profile, not a balance derived from transactions (team decision, 23 November 2026). How a monthly plan should reconcile with actual spending, and whether unpaid bills should affect forecasts and totals or only reminders, are still open.

**Investment data:** Yahoo Finance is the provider (free, no key); quotes are cached 15 minutes, history 24 hours, and stale prices are marked, never invented (§04A). Corporate actions are not yet adjusted for; the refresh rate and usage terms of any second provider are undecided.

**AI behavior:** Hosted models via OpenRouter (Qwen 2.5 72B primary, DeepSeek R1 reasoning); the model timeout is 30 seconds, and unsupported questions get a refusal, not a guess (§08B). An extracted transaction is always confirmed by the user in a review dialog before saving (§06).

**Storage and operations:** Receipt photos and voice are never uploaded: receipts are read in the browser and voice is transcribed in the browser, so there is no receipt or audio storage at all (team decision, 23 November 2026). Reminders are in-app only — no email is sent. Production hosting is Netlify (`https://finverseaii.netlify.app`, backend as a Netlify Function); backups and monitoring arrangements are not established. Vector records live in PostgreSQL (pgvector) and connect to users via `user_id`, scoped at retrieval (§07, §08B).

**Research claims:** The Readiness score is defined (§08D) and tested; the evaluation harness (§12A) measures grounding, self-consistency, explanation quality, latency and cost for the readiness explainer. Extraction correctness and evidence quality for chat/RAG are not yet benchmarked, and live model results await the API key.

As decisions are made, record the chosen option and its evidence. Replace "not decided" only when the project files support a concrete answer.

---

# 14 | Short glossary

| Term | Plain meaning |
| --- | --- |
| Frontend | The screens and controls a person uses. |
| Backend | The service that checks requests and applies the application's rules. |
| API / endpoint | A way for software parts to communicate; an endpoint is one specific address for an operation. |
| Database / relational database | Persistent storage; a relational database keeps related information in linked tables. |
| Schema / migration | A description of the data structure; a migration is a recorded change to that structure. |
| Authentication / authorization | Checking who someone is / checking what that person may access or change. |
| Session / cookie | A temporary signed-in state / a small value kept by the browser and sent with requests. |
| Persistence | Keeping data after the page closes or reloads. |
| Database transaction | A group of database changes that all succeed together or are all cancelled. This is different from a recorded money transaction. |
| Cache / queue | A fast temporary store / a waiting list of work for a background process. Redis is configured here, but application use was not found. |
| JSON | A text format for labelled fields and values exchanged between software parts. |
| LLM / language model | An AI model that interprets and generates language. |
| RAG | Retrieving relevant source information before generating an answer. |
| Embedding / vector store | Numbers representing meaning / a store that uses those numbers to find related content. |
| OCR / speech-to-text | Turning text in an image into readable text / turning speech into text. |
| Guardrail / hallucination | A check intended to constrain or validate AI output / a plausible but unsupported or incorrect generated claim. |
| Template baseline | A rule-written explanation generated from the same numbers the model sees, used as the comparison point in evaluation. |
| Self-consistency | Whether a model reaches the same conclusions when asked the same question several times. |
| Factual grounding | Whether a model's numbers match the computed evidence, measured by the guardrail pass rate. |
| Portfolio / diversification | A collection of investments / spreading exposure so it does not depend on only one holding or sector. |
| Fundamental / technical analysis | Studying a company's business and finances / studying price and trading patterns. |
| Sentiment | Whether a piece of news or text expresses a positive, negative or neutral outlook. |
| Return / volatility | How much an investment's value has changed / how widely its value fluctuates. |
| Optimization / stress test | Searching for an allocation under stated goals and limits / exploring what might happen in an adverse scenario. |
| Monorepo / container | One repository for related applications / a packaged environment for running a service. |

Definitions explain terms used in this guide. They do not imply that every corresponding feature is implemented.

---

# 15 | Source map and review boundaries

This guide is grounded in the following material. Paths are relative to the finverse-main repository unless a PDF is named. Source keys keep future updates traceable without explaining code line by line.

| Key | Material reviewed and what it supports |
| --- | --- |
| S1 | FinVerse_AI_Project_Module_Documentation(2).pdf, 12 pages, uploaded 29 October 2026. Product scope, proposed personal-finance and stock features, priorities and later tax module. |
| S2 | Major Project Doc (1)(1).pdf, 7 pages. Earlier architecture/research blueprint: model candidates, specialist engines, numeric guardrails, vector retrieval and the broader small-business scope. |
| S3 | Root, web and backend package.json; turbo.json; docker-compose.yml; shared configuration; backend main.ts and app.module.ts. Application structure, versions, local services and ports. |
| S4 | apps/web/auth/server.ts, client.ts, auth-form.tsx and profile-guard.ts; web auth route; apps/backend/src/auth/session.guard.ts. Sign-in structure, access checks and session verification. |
| S5 | apps/web/app/(module-one)/onboarding/; apps/web/lib/profile.ts, onboarding.ts and profile-server.ts; web onboarding/profile routes; apps/backend/src/profile/. Setup, defaults, editable fields, validation and saves. |
| S6 | apps/backend/src/activity/; apps/web/lib/activity-server.ts; apps/web/app/api/transactions/, api/bills/ and api/ai/extract-expense/; dashboard/use-activity.ts. Transaction and bill request paths, account ownership, and the expense-extraction endpoint. |
| S7 | apps/web/app/(module-one)/dashboard/: dashboard.tsx, summary and breakdown cards, planning-cards.tsx, ui.tsx, recent-transactions.tsx, upcoming-bills.tsx, spending-analysis.tsx, spending-data.ts, expense-entry.tsx and dashboard-dialog.tsx; apps/web/lib/notifications.ts, receipt-ocr.ts, export-pdf.ts and export-xlsx.ts. Screen behavior, limits and calculations. |
| S8 | apps/backend/prisma/schema.prisma and migrations, including the market-module, RAG-documents and guardrail-checks additions; src/prisma/. Actual data models and connection lifecycle. |
| S9 | Backend auth/profile/activity test files; apps/web/test/spending-data.test.mjs; backend/test/activity-persistence.cjs; test results from this review. Verification coverage and limits. |
| S10 | README.md, ONBOARDING.md and DASHBOARD_SOURCE.md. Supporting project notes, checked against newer source where they differ. |
| S11 | apps/backend/src/market/, src/ai/, src/rag/, src/readiness/; apps/web/lib/indicators.ts, optimization.ts, portfolio.ts, market.ts; apps/web/app/(module-two)/. Market module, AI layer, guardrails, readiness score and retrieval implementation. |
| S12 | apps/backend/src/eval/; apps/backend/eval/results/; docs/evaluation-writeup.md; docs/vivek-bartwal-contributions/phase-5-evaluation.md. Evaluation harness, measured results and the blind rating pack. |

## What this review did not assume

The existence of source files was not treated as proof of deployment, applied migrations, production readiness or active use. No private database records or secret configuration values were needed for the explanation.

The planning PDFs use ambitious present-tense descriptions in places. This guide treats them as design intent unless executable code supplies evidence of implementation. Source review is a snapshot; later commits or local edits may change the conclusions.

---

# 16 | Keep the guide growing

## A living project record

This edition is a baseline. Add a new feature chapter when a meaningful part of FinVerse is built, and update the existing status tables so new readers do not mistake an old limitation for the current state. Keep the section IDs stable even when page numbers change.

The editable source for this guide is **docs/finverse-project-guide.md**. The companion generator, **docs/build_finverse_guide.py**, rebuilds the PDF from that source. Explicit page breaks separate chapters; diagrams are generated as sharp vector drawings. This makes it possible to add pages while retaining the design.

## Use the same questions for every new feature

| Field | What to record |
| --- | --- |
| Feature and date | Name the capability and the date it became part of the reviewed project. |
| Problem and user action | Explain why it exists and what the user can now do in ordinary language. |
| Start-to-finish example | Follow one input through the screens, checks, storage and final output. |
| Data and ownership | State what is stored, where it lives and how it is tied to the right account. |
| Calculation or AI | Identify fixed formulas separately from generated interpretation; document validation. |
| Evidence and limits | Name relevant files, checks actually run and incomplete cases. |
| Technology decision | Explain any added tool, why it was chosen and whether the previous design changed. |
| Status and next step | Mark implemented, partial or planned; give a concrete remaining task. |

## Edition history

| Edition | Date | Change |
| --- | --- | --- |
| 1.0 | 15 November 2026 | Initial guide to the finance foundation, storage, stack and planned modules. |
| 1.1 | 15 November 2026 | Rechecked core source; added contents, a data relationship diagram and worked calculation examples; rebuilt and visually reviewed the PDF. |
| 1.2 | 23 November 2026 | Added chapters 04A (market module), 08B (AI layer), 08C (guardrails), 08D (Readiness), 12A (evaluation); updated status tables, technology list, progress record and open questions; corrected the README's AI claim; rebuilt the PDF. |
| 1.3 | 23 November 2026 | Refreshed §02, §03, §06, §12 and §13 for the Module 1 integration work: category alignment, PDF/Excel exports, balance history, plain-words/voice/receipt expense entry, bill-payment transactions, in-app reminders; recorded the four team decisions of 23 November 2026. |

## Where future chapters belong

Add chapters for reconciled balances as those capabilities are implemented. Persistent budgets, AI expense entry, voice and receipts, alerts and exports are now built and are covered in §02, §03 and §06 rather than in their own chapters. Market-data ingestion, stock research, portfolio calculations and AI evaluation now have chapters (04A, 08B–08D, 12A). These are candidate chapter topics derived from the roadmap; they are not completion claims.

When something changes, update its explanation, source key and evidence date together. Keep this edition's progress record in the history so the team can see how the project developed.

> The goal of this document is shared understanding: any teammate should be able to explain what FinVerse does today, follow where the information goes, and identify what the team is building next.
