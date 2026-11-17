# FinVerse AI

## The project, explained

A living guide to what exists, how it works, and what comes next.

**B.Tech major project | Edition 1.1 | 15 November 2026**

Personal finance + stock market and investment intelligence

Prepared for teachers, friends, recruiters and new teammates. Based on the current project files and the supplied project planning documents.

> TODAY: A personal-finance foundation with sign-in, saved profiles, goals, transactions, bills and spending analysis is implemented in the source. Stock intelligence and the language-model features remain planned.

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
| Stock Market & Investment Intelligence | Understand stocks, market news, holdings and investment risk. | Described in the module plan; implementation was not found in the current source. |

The long-term connection is useful: investment information could be interpreted alongside someone's savings, debt and monthly capacity to save. This connection is an intended capability, not a working feature today. [S1]

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
| Budgets | Start with the saved onboarding allocation; compare matching recorded expenses with category limits. |
| Goals | Save a name, target amount, deadline and priority; manage the goal list through the financial-profile editor. |
| Transactions | Add an income or expense with a description, amount, category and date; browse and search the saved records. |
| Bills | Add a bill with amount, due date and auto-pay label; list, search and remove saved bills. |
| Spending analysis | View expense totals, category shares and bars for weekly, monthly or custom date ranges. |
| Comparisons | Compare elapsed days with the previous month or week and see a simple month-end spending estimate. |

Transactions and bills have loading, empty and error states. The interface waits for a successful save before adding a new record to its displayed list. These details help users distinguish an empty account from a failed connection. [S6, S7]

Amounts are presented in Indian rupees with Indian digit grouping. The values come from user entry and stored records; a connected bank feed was not found. The screen's account report is a summary of the saved financial plan. [S7]

> A useful distinction: the profile describes the user's plan, while transactions describe the activity the user has actually entered. They are separate sources of information today.

---

# 03 | Personal finance: important boundaries

## What the numbers actually mean

The top summary cards and Expense Breakdown use the saved financial profile and budget allocation. Recent Transactions and Spending Analysis use recorded transactions. Adding a food expense changes the transaction-based analysis and matching budget spending, but it does not automatically rewrite the profile's income, planned expenses or current savings. [S7]

The Balance Breakdown panel has month controls, but it currently displays a no-history message and the current plan. It does not reconstruct historical bank balances. Savings goals have targets and deadlines, but the interface explicitly says progress is not tracked yet.

## Setup contains defaults, not a full assessment

The first-time setup asks only a small number of questions. It sets employment to salaried, current savings to zero, investment experience to none, risk tolerance to low and emergency-fund months to zero. These are software defaults, not conclusions about the person. The fuller financial-profile editor can update these details later. [S5]

Setup counts Rent plus Bills & Utilities as fixed expenses. It uses the Investments allocation as the monthly savings target and treats the rest as variable expenses. Because the entire income is allocated, the initial calculated surplus is zero. This is how the setup is currently translated into the profile, not evidence that the user has no real spare money.

| Boundary | What remains incomplete |
| --- | --- |
| Budget edits | The onboarding split is stored, but the separate Manage budgets dialog changes limits only in the current page state. Those edits reset on reload. |
| Category matching | Setup offers 12 budget categories; transaction entry accepts 8 categories. Some labels are mapped, but categories such as Groceries and Health have no direct transaction option. |
| Profile consistency | The full editor can change expense totals while preserving an older budget split. Profile totals and allocation-based views can therefore diverge. |
| Record maintenance | Transaction add/list is implemented; transaction edit/delete was not found. Bills support add/list/delete, but not editing or payment history. |
| Bills and reminders | Due-soon and overdue labels exist. Auto-pay is stored information; payment execution, recurring generation and reminder delivery were not found. |
| Reports and AI | The report is an on-screen summary. PDF/CSV/Excel exports, conversational entry, voice, receipt reading and AI chat are planned. |

These boundaries are reasons to call Module 1 a working foundation rather than a finished finance product. They also give the team a concrete list of integration work. [S5-S7]

---

# 04 | Stock intelligence: the planned module

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

# 05 | How the parts fit together

The **frontend** is the screen a person uses. The **backend** is the service that checks requests and applies the application's rules. A **database** stores records so they survive a reload. An **API** is an agreed way for software parts to ask each other for information or actions.

:::diagram architecture

## Reading the diagram

Next.js serves the website and also provides server-side forwarding routes. For finance operations, the browser calls those routes; they pass the request to NestJS. NestJS checks the session, validates the information and uses Prisma to read or write PostgreSQL. Prisma is the application's bridge between code and database tables. [S3-S6]

Sign-in takes a separate path. Better Auth runs inside the Next.js application and accesses the same PostgreSQL database through Prisma. NestJS asks Better Auth to verify the session before accepting protected requests. A session is a temporary record that keeps someone signed in. This means finance operations and sign-in share data storage, but have different entry points. [S4]

Think of the frontend as the reception desk, NestJS as the office staff checking a form, and PostgreSQL as the filing cabinet. Better Auth checks the visitor's identity. The browser does not receive direct access to the cabinet.

## Where Redis and AI fit

Redis is declared in Docker Compose, but no application connection or job worker was found. A cache is a fast temporary store; simply defining Redis does not mean requests use one. The Python/AI layer is described in the blueprint, but no AI service or link to it exists in the reviewed source. Dashed boxes show these boundaries, not working connections. [S2, S3]

For local development, the web application uses port 3000, NestJS uses 3001, PostgreSQL is mapped to 5432 and Redis to 6379. A port is a numbered doorway to a service on a computer. These are development settings, not evidence of public hosting.

---

# 06 | Follow one expense from start to finish

## The implemented route: add a food expense

Imagine an authenticated user who has completed setup and spent **INR 500 on food on 15 November 2026**. This is an illustrative input traced through actual code, not a transaction written to a real account for this guide. [S6, S7]

| Step | What happens |
| --- | --- |
| 1. Enter | The user opens Add transaction and enters Food purchase, Expense, 500, Food & Dining and the date. The current route is a form, not a chat box. |
| 2. Send | The browser converts an expense to a negative amount, -500, and sends the structured fields to /api/transactions. Structured means separately labelled fields. |
| 3. Forward | The Next.js server checks that the write comes from the expected website and forwards it, with the session cookie, to NestJS. A cookie is a small browser-held value used here to identify the session. |
| 4. Check identity | NestJS asks Better Auth to confirm the session and obtains the user ID from that verified response. The submitted form does not choose the owner. |
| 5. Check the record | The backend checks the description, accepted category, nonzero amount, two-decimal precision and valid calendar date. Invalid input is rejected. |
| 6. Store | Prisma creates a UserTransaction row in PostgreSQL with the signed amount, date, category, description and authenticated user's ID. |
| 7. Show the result | The saved record returns to the browser. It is added to the transaction list; relevant expense totals, charts and matching current-month budget spending are recalculated. |
| 8. Reload | A later visit requests that user's saved transactions from the backend again. Persistence depends on the configured database and applied migrations being available. |

If this were the only expense in the selected period, its total would be INR 500 and Food & Dining would account for 100% of that period's recorded spending. Profile-based savings and monthly-plan cards would remain unchanged.

If saving fails, an error is displayed instead of claiming the record was saved. The source has no duplicate-prevention key for transaction creation: retrying after an uncertain network result could require reconciliation. This differs from the explicit repeated-onboarding protection.

## The planned route: "I spent 500 on food"

The documents propose letting AI extract the amount, category, date and merchant from ordinary text. Voice would first be transcribed; a receipt would first be read. Those extraction services and their connection to the saving route have not been built. The current implementation cannot interpret this sentence as an expense command. [S1, S2]

---

# 07 | Where the data lives

PostgreSQL is the implemented **relational database**: it stores linked tables, like organized spreadsheets whose rows refer to each other. The user ID connects a person to their profile, goals, transactions, bills, sessions and provider accounts. The schema permits one financial profile and many of each other user-owned record. [S8]

| Record | Stored information | Connection and purpose |
| --- | --- | --- |
| User | ID, name, unique email, verification state, optional image and timestamps. | Central identity for the account. |
| Session / Account / Verification | Session expiry and token; provider-linked identity and optional tokens; verification identifiers and values. | Support sign-in. Sessions and provider accounts link to User; verification uses an identifier. |
| UserFinancialProfile | Income, planned expenses, debt, savings, savings target, investment preferences, emergency-fund range, payday, budget split and completion status. | One row per user; feeds the financial plan. |
| UserGoal | Name, target amount, target date and priority. | Many goals per user; no saved-contribution field yet. |
| UserTransaction | Description, category, signed amount, date and creation time. | Many records per user; supplies transaction analysis. |
| UserBill | Name, amount, due date, auto-pay flag and creation time. | Many bills per user; supplies the bills list. |

## Why this structure makes sense

The files implement relationships, ownership filters, fixed-precision money fields and grouped profile saves. These are useful reasons for a relational design, although a separate database-selection decision document was not found. Profile and goals are saved together in one database transaction: either the whole change succeeds or it is rolled back. [S5, S8]

Money is stored with two decimal places. Profile amounts are returned as decimal strings; activity amounts are converted to numbers for the website. Spending calculations commonly use whole paise before converting back to rupees, reducing rounding drift. The budget split is a JSON field, a labelled data object, inside PostgreSQL; it is not a separate database.

Docker Compose gives PostgreSQL a named data volume so its files can outlive a container replacement. Redis also has a volume declaration, but its use by the application and any data written to it are not established. [S3]

**Vector storage:** a vector store finds text with similar meaning using numerical representations. ChromaDB is proposed in the older blueprint for retrieving tax documents, with bge-small embeddings creating those representations. No vector store, document import pipeline or link from it to user records exists here. Stock, holdings, chat-history and receipt tables were also not found. [S2, S8]

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
| Vector store: proposed only | Would help find relevant reference passages by meaning. ChromaDB is named for tax-document retrieval in the older blueprint; no working connection to this account data exists. |

No implemented storage for uploaded receipts, voice recordings, stock-price history, investment holdings or chat transcripts was found. Storage location and retention for these future inputs are not established. [S2, S3, S8]

---

# 08 | Calculations and the planned AI layer

A **language model** generates and interprets text. A **deterministic calculation** follows fixed rules and gives the same answer for the same inputs. FinVerse's current calculations do not call a language model. The documents propose using a model to understand requests and explain evidence while ordinary code handles financial math. [S1, S2, S7]

| Job | Method and current status |
| --- | --- |
| Monthly surplus | Implemented arithmetic: income + other income - fixed expenses - variable expenses - savings target. |
| Category budget allocation | Implemented percentage calculation using whole paise, distributing leftover paise so the allocation stays exact. |
| Spending totals and shares | Implemented date filtering, addition and division using recorded expenses. |
| Month-end spending estimate | Implemented projection: spending so far / elapsed days x days in the month. It is an extrapolation, not an AI prediction. |
| Stock indicators and returns | Planned formula-based work: price indicators, portfolio value, gains/losses and return measures. No implementation found. |
| Portfolio optimization and stress tests | Planned mathematical work to explore allocations or scenarios. A simulation may use random samples; it is still a numerical model rather than generated prose. |
| Expense interpretation and stock explanations | Planned language-model work: extract fields, interpret screening requests, summarize news and explain numerical results. |

## What protects accuracy today?

The implemented protections are ordinary software checks: signed-in ownership, permitted fields, valid dates, money precision, budget percentages totalling 100 and expenses plus savings target not exceeding income. Empty history is labelled instead of filled with invented values. These checks protect stored inputs; they are not an AI-answer verification system. [S4-S8]

## What the blueprint proposes

The planned pipeline validates the model's structured output with Pydantic, checks financial numbers against Python calculations or market data, and retries or replaces inconsistent output. For tax questions it proposes **retrieval-augmented generation (RAG)**: finding relevant source passages before asking the model to answer. This is like giving an assistant the correct reference pages before asking for an explanation. [S2]

None of those model guardrails, retrieval steps or numerical cross-checkers is implemented in this working copy. The blueprint's phrases such as "100% verified" and "hallucination-free" are aspirations, not demonstrated guarantees. Accuracy benchmarks, evaluation datasets, model choice and operational limits remain unverified.

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

## The future: calculating and explaining investments

| Planned job | How to explain the distinction |
| --- | --- |
| Portfolio value and returns | Ordinary financial code would calculate values from holdings and prices. No holdings engine exists in the current source. |
| Price indicators | Formulas would summarize trends or momentum in price history. The module plan names these, but implementation was not found. |
| News and stock explanation | A language model would turn supplied facts and calculations into readable text. It must not invent a price or treat a possible cause as proven. |
| Accuracy checks | The blueprint proposes checking structured fields and numerical claims against reference data and calculations. These AI checks are still planned. |

A calculator and an explainer have different jobs. The project already has some calculator-like finance logic; its proposed AI explainer has not yet been connected. No evidence currently establishes the accuracy of future AI answers.

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
| Whisper Base or Tiny | Converts spoken expense entries into text. |
| EasyOCR or Tesseract | Reads printed text from receipts and other images; OCR means optical character recognition. |
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

---

# 12 | Progress and evidence today

## Implemented foundation versus remaining work

| State | What the evidence supports |
| --- | --- |
| Implemented in source | Landing and Google-auth flows; profile-based route protection; onboarding; profile and goal saving/editing; transaction add/list/search; bill add/list/delete; spending analysis; user-scoped backend checks; database schemas and migrations. |
| Partial / integration work | Persistent budget management; alignment of budget and transaction categories; connection of transactions to all summary cards; historical balance views; goal contribution tracking; fuller record editing and reporting. |
| Configured, not connected | Redis is in Compose, with no consuming application integration found. |
| Planned | Conversational expense entry, voice, receipts, AI chat, market research, holdings and portfolio calculations, news interpretation, alerts and exports. |
| Later scope | Tax/compliance in the module roadmap; small-business finance in the older blueprint. |

"In progress" here means partially implemented or present as local working-copy changes. No issue tracker, assigned owner or delivery schedule was supplied to establish who is currently working on each item.

## Verification record

| Check | Result on 15 November 2026 |
| --- | --- |
| Spending calculation tests, rerun for this revision | 6 of 6 passed, covering dates, category matching, period totals, comparisons and longer-range aggregation. |
| Earlier edition: backend checks | The earlier guide records 75 passing tests and 13 HTTP tests blocked by local connection permission errors. These backend results were not rerun for this revision. |
| Current source and configuration review | Reviewed handlers, guards, forms, calculations, schema, migrations, manifests and relevant project documents. |
| Live user journey and deployed service | Not verified for this edition. Google login, database migration state and end-to-end persistence were not tested against a live account. |

The earlier backend checks use mocked dependencies for several cases; passing them is not proof that the real database and sign-in provider are connected. A database-persistence test script exists, but was not run. Full production builds were not rerun for this documentation task. [S9]

## Which snapshot does this describe?

The reviewed repository was based on Git commit **00703fe**, plus the local changes present on the review date. Several activity, onboarding and dashboard files were uncommitted. Application code was inspected without modifying it to prepare this guide.

Older notes contain earlier behavior. In particular, DASHBOARD_SOURCE.md embeds a mock dashboard; ONBOARDING.md predates parts of the current onboarding and saved activity flow. Those notes remain useful history, but current source determines this edition's feature claims. [S10]

---

# 13 | What comes next, and what is undecided

The module document recommends building a strong core before advanced research features. The sequence below translates its priorities and the current gaps into a suggested implementation order. It is a documentation recommendation, not an approved schedule or a claim that work has started. [S1]

| Suggested stage | Concrete outcome to explain in the next edition |
| --- | --- |
| 1. Complete the finance loop | Make budget changes persist, align category choices and decide how actual activity should affect the financial plan and summary cards. |
| 2. Verify the full journey | Demonstrate sign-in, setup, saved changes after reload, user separation and clear recovery from failed requests with the real services. |
| 3. Finish core records and reports | Add the planned record maintenance, goal contributions, reminders and exports; define whether bills create transactions. |
| 4. Introduce bounded AI entry | Build text-to-expense extraction with field checks and a defined review/save flow, then add voice and receipt entry. |
| 5. Build the market foundation | Connect a selected market source; add stock search, profiles, charts, watchlists and holdings with clear data timestamps. |
| 6. Add researched intelligence | Add evidence-based explanations, portfolio risk and numerical models; evaluate them before adding cross-module scores and advanced simulations. |

## Questions the reviewed material does not settle

**Money definitions:** Is "current savings" a manually maintained snapshot or a balance derived from transactions? How should a monthly plan reconcile with actual spending? Should unpaid bills affect forecasts, totals or only reminders?

**Investment data:** Which provider covers the required Indian instruments, corporate actions, fundamentals and news? What refresh rate and usage terms apply? How are missing, delayed and adjusted prices handled?

**AI behavior:** Which model will be used, on what hardware, with what response time? Does the user confirm an extracted transaction before saving? How are unsupported questions and conflicting evidence handled?

**Storage and operations:** Where will uploaded receipts and voice recordings live, for how long, and with what deletion process? What are the production hosting, backups and monitoring arrangements? How will any vector records connect to users and source documents?

**Research claims:** How will health, readiness and risk scores be defined and tested? Which benchmarks will measure extraction correctness, numeric consistency and evidence quality? No results proving those future capabilities were found.

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
| S6 | apps/backend/src/activity/; apps/web/lib/activity-server.ts; apps/web/app/api/transactions/ and api/bills/; dashboard/use-activity.ts. Transaction and bill request paths and account ownership. |
| S7 | apps/web/app/(module-one)/dashboard/: dashboard.tsx, summary and breakdown cards, planning-cards.tsx, ui.tsx, recent-transactions.tsx, upcoming-bills.tsx, spending-analysis.tsx and spending-data.ts. Screen behavior, limits and calculations. |
| S8 | apps/backend/prisma/schema.prisma and migrations, including the onboarding-budget and dashboard-activity additions; src/prisma/. Actual data models and connection lifecycle. |
| S9 | Backend auth/profile/activity test files; apps/web/test/spending-data.test.mjs; backend/test/activity-persistence.cjs; test results from this review. Verification coverage and limits. |
| S10 | README.md, ONBOARDING.md and DASHBOARD_SOURCE.md. Supporting project notes, checked against newer source where they differ. |

## What this review did not assume

The existence of source files was not treated as proof of deployment, applied migrations, production readiness or active use. No private database records or secret configuration values were needed for the explanation. No AI service, portfolio schema or vector pipeline was inferred from a proposed folder name or from the project's name.

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

## Where future chapters belong

Add chapters for persistent budgets and reconciled balances, AI expense entry, voice and receipts, market-data ingestion, stock research, portfolio calculations and AI evaluation as those capabilities are implemented. These are candidate chapter topics derived from the roadmap; they are not completion claims.

When something changes, update its explanation, source key and evidence date together. Keep this edition's progress record in the history so the team can see how the project developed.

> The goal of this document is shared understanding: any teammate should be able to explain what FinVerse does today, follow where the information goes, and identify what the team is building next.
