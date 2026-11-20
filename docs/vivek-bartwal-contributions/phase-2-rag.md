# Phase 2 — Retrieval-Augmented Generation (RAG)

## Metadata

| Field           | Value                                                                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase           | Phase 2 — RAG: Smart Stock Screener + News & Sentiment (synopsis Objectives 2 and 4)                                                                                                                                                   |
| Date            | 19 November 2026                                                                                                                                                                                                                       |
| Author          | Vivek Bartwal (B.Tech CSE, GEHU, Roll No. 2319881)                                                                                                                                                                                     |
| Team            | CSE27-079 — Sarthak Thapliyal (2319526), Ayushman Kothari (2318646), Vidish Bijalwan (2319849), Vivek Bartwal (2319881)                                                                                                                |
| Guide           | Dr. Prateek Srivastava, Assistant Professor, GEHU                                                                                                                                                                                      |
| Repository      | github.com/FinverseAI/FinVerse-AI (public)                                                                                                                                                                                             |
| Branch          | `feat/phase-2-rag` (merged to `main` by fast-forward)                                                                                                                                                                                  |
| Commits         | `c694822`..`d80684b` (8 commits) + fix commit `ce9edaa`                                                                                                                                                                                |
| Scope           | 53 files, +6,561 / −22 lines (+1-line fix `ce9edaa`)                                                                                                                                                                                   |
| Status          | **Done — built, pushed, CI green, live-verified** (19 November 2026, ~14:10 IST)                                                                                                                                                       |
| Standing caveat | No real embedding or model call has been made yet. The pgvector index exists on prod Neon (migration applied via the deploy), but no retrieval has run against live data; the live smoke test awaits the OpenRouter API key (see §10). |

All times in this document are IST. All numbers, hashes and run identifiers are
taken from the Git repository, the approved phase plan and the verified work log
for 19 November 2026. Implementation was executed with AI assistance under my
direction; I approved the plan, made the decisions recorded in Section 6
(including the embedding-model substitution and the one-line CI fix),
did the Render dashboard and deployment work myself, and verified every
result independently before it was called done.

---

## 1. Overview — what this phase is and why it exists

Phase 1 gave the system a voice that could explain numbers the code had
already computed. It had two gaps, both visible from the first day. The
voice could only answer about data it already held — a question about
_why_ a stock moved could only be answered from price history, and a
question about past spending only by listing transactions. And it could
not search: there was no way to ask "which stocks match these
conditions?" or "what has been said about this stock lately?" Phase 2
closes both gaps with retrieval-augmented generation: fresh news with
sentiment, company profiles and the user's own transactions become
searchable vectors the model can retrieve and cite — and a deterministic
stock screener answers "which stocks?" with numbers, not with a model's
opinion.

The phase maps to synopsis Objective 2 (stock and investment
intelligence, extended from Phase 0) and Objective 4 (the guardrail
layer's evidence discipline — retrieved claims must cite their source,
and an answer with no retrieved context must refuse rather than invent
one), and to methodology §4.4's RAG design. It delivers the **Smart
Stock Screener** and **News & Sentiment** features.

The phase is also where the project's two most consequential engineering
lessons of the day were learned — the embedding-model substitution (§6.2)
and the DI wiring bug (§8.1) — both recorded in full below.

In one sentence: **Phase 2 teaches the system to look things up — fresh
news with sentiment, company profiles, and the user's own transactions,
all searchable by meaning — and to answer "which stocks?" with a filter
the user can inspect, while refusing to invent context it does not have.**

### What existed before this phase

| Area                                    | State at the start of Phase 2 (19 Nov, ~13:06 IST)                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Module 1 + Phase 0 (deterministic core) | Done, CI green, live                                                                                                        |
| Phase 1 (LLM foundation)                | Done, CI green, live — 7 tools, structured output, chat + explain-stock, fallback                                           |
| RAG                                     | 0% — no embeddings, no vector store, no news ingestion, no screener                                                         |
| Market data                             | Yahoo quotes/history/fundamentals via `MarketService`; the Yahoo client's search endpoint (which carries news) not yet used |
| Database                                | Neon Postgres; `pgvector` available as an extension but not enabled in the schema                                           |

---

## 2. Objectives and acceptance criteria

The objectives below are from the approved plan (Phase 2 section), with
one substitution where the plan's named model was unavailable (§6.2).

| #   | Objective (from the plan)                                                                                                                                                                       | Met?                   | Evidence                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Embedding model `bge-small-en-v1.5` (384d), via OpenRouter with the same key                                                                                                                    | **Substituted**        | `baai/bge-base-en-v1.5` (768d) — the small model is not offered on OpenRouter (verified live). Same key, dimension validated on every call (§6.2)                                       |
| 2   | Vector store: pgvector on Neon, `rag_documents` with `embedding vector(768)`, ivfflat index                                                                                                     | **Yes**                | Migration `20261119130000_add_rag_documents` (§4.1)                                                                                                                                     |
| 3   | Chunking: ~500 characters, 50-character overlap; each chunk carries `source_type`, `source_id`, `symbol`, `title`, `published_at`, `user_id`                                                    | **Yes**                | `chunkText` (500/50, sentence-aware) + typed chunk builders for news, profile and transaction text (§4.2)                                                                               |
| 4   | Retrieval: top 5, minimum similarity 0.35, user-scoped (`user_id IS NULL OR user_id = caller`)                                                                                                  | **Yes**                | `RagRepository.searchSimilar` — cosine similarity, the floor and the user filter both in the SQL (§4.2)                                                                                 |
| 5   | News provider: Yahoo Finance news for a symbol, title + publisher + date only (no article body), 6-hour TTL                                                                                     | **Yes**                | `MarketService` news via the Yahoo search endpoint (10 items); freshness check against `RAG_NEWS_TTL_MS` (§4.3, §4.5)                                                                   |
| 6   | Sentiment: lexicon-based scoring (−1..1), label `positive` / `negative` / `neutral`                                                                                                             | **Yes**                | `scoreSentiment` / `aggregateSentiment` — threshold ±0.2, matched words returned (§4.4)                                                                                                 |
| 7   | Smart Stock Screener: deterministic filters over a curated NSE universe — price, market cap, RSI, P/E, 1-month change, 6 SMA trends, sector; **null metric never passes a constraining filter** | **Yes**                | `RagService.screen` + `passesFilters` (§4.5); the null rule is test-pinned                                                                                                              |
| 8   | News & Sentiment UI: news section on the stock page; screener section on `/market`; NL screener query from the screener                                                                         | **Yes**                | `stock-news.tsx`, `screener.tsx` (with NL query box → `POST /api/ai/screen`), `searchKnowledge` + `applyScreenerFilters` tools (§4.6, §4.7)                                             |
| 9   | Explain-news endpoint: explain a symbol from retrieved news, **refuse deterministically with zero retrieved chunks, never call the model**                                                      | **Yes**                | `POST /api/ai/explain-news` — the no-context branch is a code path, not a prompt instruction (§4.6)                                                                                     |
| 10  | Acceptance: CI green                                                                                                                                                                            | **Yes, after one fix** | Run `44488093404` failed on `d80684b` (DI wiring, §8.1); fix `ce9edaa`; run `44489224691` success, ~14:10 IST                                                                           |
| 11  | Acceptance: live-verified                                                                                                                                                                       | **Yes (routes)**       | `/api/rag/news/RELIANCE`, `/api/rag/screen`, `/api/ai/explain-news`, `/api/ai/screen` all 401 — routes live, auth required (§7.4). Live _retrieval behaviour_ is not covered — see §10. |

---

## 3. Architecture — how Phase 2 fits the system

### 3.1 Where the code lives

```
FinVerse-AI/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma                       RagDocument model
│   │   │   └── migrations/
│   │   │       └── 20261119130000_add_rag_documents/migration.sql
│   │   └── src/
│   │       ├── ai/                                 (Phase 1 module, extended)
│   │       │   ├── ai.service.ts                   + explainNews, screenByQuery,
│   │       │   │                                   retrieved context in explain-stock
│   │       │   ├── ai.tools.ts                     + searchKnowledge,
│   │       │   │                                   + applyScreenerFilters (9 tools)
│   │       │   ├── ai.controller.ts                + explain-news, screen
│   │       │   ├── ai.prompts.ts                   + rule 8, NEWS_EXPLANATION_INTRO
│   │       │   ├── ai.module.ts                    RagModule wired in
│   │       │   └── ai.rag.spec.ts                  11 RAG service tests
│   │       ├── market/
│   │       │   ├── market.provider.ts              + news(symbol) via Yahoo search
│   │       │   └── market.module.ts                + MARKET_DATA_PROVIDER export (ce9edaa)
│   │       └── rag/                                NEW NestJS module
│   │           ├── rag.module.ts / rag.config.ts   wiring, env vars + defaults (768d)
│   │           ├── rag.chunking.ts                 chunkText + chunk builders
│   │           ├── rag.embeddings.ts               OpenRouter embeddings client
│   │           ├── rag.repository.ts               RagRepository (pgvector SQL)
│   │           ├── rag.ingest.ts                   RagIngestService (3 indexers)
│   │           ├── rag.retrieval.ts                RagRetrievalService
│   │           ├── rag.sentiment.ts                lexicon sentiment
│   │           ├── rag.service.ts                  RagService (news + screener)
│   │           ├── rag.validation.ts               screener filters + trends
│   │           ├── rag.prompts.ts                  context/result formatters
│   │           ├── rag.controller.ts               GET news, POST screen
│   │           └── *.spec.ts                       110 RAG tests, 11 spec files
│   └── web/
│       ├── app/(module-two)/market/
│       │   ├── screener.tsx                        screener UI (filters + NL box)
│       │   ├── stock/[symbol]/stock-news.tsx       news list + sentiment + explain
│       │   ├── market-shell.tsx / market.tsx       (screener wired in)
│       │   └── stock/[symbol]/stock-profile.tsx    (news section wired in)
│       ├── app/(module-one)/dashboard/ai-chat.tsx  shared POST helper (Phase 2)
│       ├── app/api/rag/                            news/[symbol], screen forwarders
│       ├── app/api/ai/                             explain-news, screen forwarders
│       ├── lib/rag.ts                              RAG response types + TREND_OPTIONS
│       ├── lib/ai.ts                               (extended for the new responses)
│       └── test/rag.test.mjs                       web RAG tests (11)
```

### 3.2 The RAG pipeline, end to end

```
Yahoo Finance search news for a symbol (10 items)
    │  title + publisher + published date + link (no article body)
    ▼
RagService.newsForSymbol(symbol)          ← the freshness gate
    │  repository.newsFreshness(symbol): count + newest indexed item
    │  stale = none indexed OR newest older than RAG_NEWS_TTL_MS (6 h)
    │  stale → RagIngestService.indexNews(symbol)
    ▼
RagIngestService.indexNews(symbol)
    │  1. Fetch news via the market provider (Yahoo search)
    │  2. Dedup: skip items whose link is already indexed
    │  3. Build chunk text per item: title + "Source: publisher"
    │     + "Published: YYYY-MM-DD"
    │  4. Chunk (500 chars, 50 overlap), embed in batches of 25
    │  5. Upsert rows: source_type='news', symbol, title,
    │     published_at, url, metadata (publisher), user_id NULL
    ▼
rag_documents (Neon, pgvector, ivfflat index)
    │  vector(768), cosine similarity
    │  also holds 'profile' chunks (public) and 'transaction'
    │  chunks (private, user-scoped, cap 200)
    ▼
RagRetrievalService.retrieve(userId, query, { symbol?, sourceType? })
    │  embed the query → repository.searchSimilar:
    │  WHERE (user_id IS NULL OR user_id = caller)
    │    AND symbol / source_type filters
    │    AND similarity >= 0.35
    │  ORDER BY similarity DESC LIMIT 5
    ▼
Three consumers:
  a) searchKnowledge tool — the chat model retrieves context mid-conversation
  b) explain-news — the service retrieves, then calls the primary model
     with the chunks; ZERO chunks → deterministic refusal, no model call
  c) explain-stock — Phase 2 adds retrieved profile context to the
     Phase 1 reasoning-model explanation
```

The pipeline has one property worth stating plainly: **ingestion is
lazy and on demand.** Nothing is ingested on a schedule. The first
request for a symbol's news triggers ingestion for that symbol (when
the freshness gate finds it stale); the 6-hour TTL then suppresses
re-ingestion. That keeps the free-tier database small and the embedding
spend near zero, at the cost of a slower first request for a fresh
symbol — the right trade-off for a prototype with no background-job
infrastructure. The same laziness applies to profiles
(`ensureProfileIndexed`) and to transactions (indexed on demand, most
recent first, capped at 200).

### 3.3 The screener, in one diagram

```
Universe: 15 curated NSE large-caps + the user's holdings + watchlist
    │  evaluated in batches of 5; a symbol that fails to load is
    │  reported as unavailable, not silently dropped
    ▼
RagService.screen(userId, filters)
    │  per symbol: quote + history + profile → price, market cap,
    │  RSI(14), P/E, 1-month change, SMA 20/50 trend
    │  apply filters; a null metric NEVER passes a constraining filter
    │  sort by 1-month change (best first); slice to limit (default 20)
    ▼
Matched symbols, each with its metrics
    │  two entry points:
    │   (a) POST /api/rag/screen — explicit JSON filters (UI form)
    │   (b) POST /api/ai/screen — NL query → the model is forced
    │       to call applyScreenerFilters → filters Zod-validated
    │       → same deterministic screen
    ▼
screener.tsx on /market  /  chat answer citing the screen results
```

The screener's defining property is that **the model never filters**.
In the natural-language path, the model's only job is to translate words
into a filter object ("cheap stocks that are rising" →
`{ maxPrice: ..., trend: 'above-sma20' }`); the actual filtering is the
same deterministic code the UI form calls. If the model extracts
something invalid, the filters fail Zod validation and the user sees all
screened stocks with a plain note ("The criterion could not be turned
into exact filters, so all screened stocks are shown") — never a
hallucinated stock list, and never a bare error. That is the "LLM
reasons, code calculates" rule applied to a search feature.

---

## 4. What was built — module by module

### 4.1 Schema and migration (`20261119130000_add_rag_documents`)

One new table, `rag_documents`, added to the Prisma schema as
`RagDocument`:

| Column                      | Type                    | Purpose                                                                                      |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `id`                        | `TEXT` (cuid)           | Primary key                                                                                  |
| `source_type`               | `TEXT`                  | `'news'`, `'profile'` or `'transaction'`                                                     |
| `source_id`                 | `TEXT`                  | The source's own id (Yahoo identifier / transaction id)                                      |
| `user_id`                   | `TEXT`, nullable        | NULL = shared/public; set = that user's private chunk. FK to `User(id)`, `ON DELETE CASCADE` |
| `symbol`                    | `VARCHAR(20)`, nullable | The stock the chunk is about                                                                 |
| `title`                     | `TEXT`, nullable        | News title / profile name, for citation                                                      |
| `content`                   | `TEXT`                  | The chunk text                                                                               |
| `embedding`                 | `vector(768)`           | The 768-dimensional embedding                                                                |
| `published_at`              | `TIMESTAMP`, nullable   | For citation and TTL                                                                         |
| `url`                       | `TEXT`, nullable        | The news article link                                                                        |
| `metadata`                  | `JSONB`, nullable       | Extra fields — today, the news publisher                                                     |
| `created_at` / `updated_at` | `TIMESTAMP`             | Ingestion / last-update time                                                                 |

Indexes: a unique index on `(source_type, source_id)` (the idempotency
key), indexes on `user_id` and `symbol`, an index on
`(source_type, published_at DESC)` for the news list, and an **ivfflat
index** (`vector_cosine_ops`, 100 lists) for approximate
nearest-neighbour search.

**The intentional Prisma drift.** Prisma has no native vector type, so
the schema declares `embedding` as `Unsupported("vector(768)")` and the
migration SQL is hand-written — including the ivfflat index, which
Prisma cannot express at all. `prisma migrate diff` therefore reports a
difference between the schema and the database. That is expected and
recorded in the migration file itself ("a later `prisma migrate dev`
may report it as drift — keep it") — not a mistake to be "fixed" by
regenerating the migration. The drift also means the hand-written stub
Prisma client used on the development VM (§4.2 of the Phase 0 document)
cannot represent the vector column; RAG queries in tests run against a
mocked `PrismaService`, and the real SQL is exercised only against Neon
(a known testing gap, §10).

The migration was applied to prod Neon through the deploy: the backend
build command runs `prisma migrate deploy` before the build, and the
deploy of `ce9edaa` succeeded — since the build is an `&&` chain, a
failed migration fails the whole build, so a green deploy is the
evidence the migration applied.

### 4.2 Chunking, embeddings and the repository

**`rag.chunking.ts`** — `chunkText` splits text into chunks of at most
500 characters with a 50-character overlap between consecutive chunks.
It is sentence-aware, so a boundary falls at a sentence end wherever
possible, and it never produces an empty chunk; the overlap exists so a
fact straddling a boundary survives in at least one chunk. Three typed
builders produce the text that gets chunked: `buildNewsChunkText`
(title + "Source: publisher" + "Published: YYYY-MM-DD"),
`buildProfileChunkText` (name + sector + industry + the Yahoo
`longBusinessSummary`), and `buildTransactionChunkText` (name, category
and amount). The builders decide what the embedding represents — a news
chunk is a headline with its provenance, so a retrieved chunk carries
its own citation.

**`rag.embeddings.ts`** — the OpenRouter embeddings client, plain
`fetch`, the same discipline as the Phase 1 chat client: a 30 s
timeout, typed errors, and — the detail that matters most — **the
returned dimension is validated on every call against the expected 768**
(`EMBEDDING_DIMENSIONS`). If the provider ever returns a different
dimension, the call fails loudly instead of writing wrong-dimension
vectors into a `vector(768)` column. The client embeds batches
(`embedMany`, up to 25) and single texts (`embedOne`, for queries).

**`rag.repository.ts`** — `RagRepository` is the only file that talks
pgvector SQL:

| Method                                        | Purpose                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `upsertDocuments`                             | Insert a batch, upserting on `(source_type, source_id)` — re-ingestion updates rather than duplicates |
| `searchSimilar`                               | The retrieval query (below)                                                                           |
| `listRecentNews`                              | The newest indexed news for a symbol, most recent first (the UI list)                                 |
| `newsFreshness`                               | Count + newest `published_at` for a symbol — the TTL gate's input                                     |
| `existingSourceIds` / `existingNewsSourceIds` | Which source ids are already indexed — the dedup input                                                |
| `hasPublicSource`                             | Whether a public chunk exists for a source                                                            |
| `deleteStaleNews`                             | Delete news older than a date — the 30-day retention prune                                            |

`searchSimilar` runs one raw query: cosine similarity
(`1 - (embedding <=> $1)`) filtered by the user-scope rule
(`user_id IS NULL OR user_id = $userId`), by symbol and by source type,
with the similarity floor (`>= minSimilarity`) **in the SQL**, ordered
by similarity descending, limited to `topK`. Putting the floor and the
user filter in the query — not in application code after the fact —
means a later feature cannot forget them.

### 4.3 Ingestion (`rag.ingest.ts`)

`RagIngestService` has three indexers, one per source type, plus two
maintenance methods:| Method | What it indexes | Scoping |
|---|---|---|
| `indexNews(symbol)` | Yahoo search news (10 items) for the symbol | Public (`user_id NULL`). Skips items whose link is already indexed; embeds in batches of 25; upserts |
| `indexProfile(symbol)` | The company's profile — name, sector, industry, `longBusinessSummary` | Public. Lets explain-stock retrieve _what the company does_, not just its numbers |
| `indexTransactions(userId)` | The user's own transactions, most recent first, capped at 200 (`MAX_TRANSACTIONS_PER_INGEST`) | **Private** (`user_id` set). Skips transactions already indexed — this is what makes the user-scope filter real rather than future-proofing |
| `ensureProfileIndexed(symbol)` | Indexes a profile on first need, if not already present | Lazy, like news |
| `pruneStaleNews()` | Deletes news older than 30 days (`NEWS_RETENTION_DAYS`) | Keeps the free-tier database bounded |

Every indexer reports an `IngestResult` (`indexed`, `skipped`,
`available`, and a `reason` when unavailable — e.g.
`'embeddings-not-configured'` when no API key is set). An indexer that
cannot run does not throw: it reports unavailability, and the caller
decides what to do. That is the same fail-soft discipline as Phase 1's
fallback — the news list can still show whatever is already indexed
when a refresh cannot run.

**No article body is fetched, stored or sent to the model.** That is
deliberate: full article text raises copyright questions the project
does not need, and a headline plus publisher plus date is enough for
the model to explain _what the news is about_. The news comes from the
Yahoo client's **search** endpoint (`client.search(symbol,
{ newsCount: 10 })`), added to `MarketProvider` in this phase — the
market provider is the single Yahoo boundary, as in Phase 0.

### 4.4 Sentiment (`rag.sentiment.ts`)

`scoreSentiment` is a lexicon scorer, not a model. It counts positive
and negative words from a curated list (gains, growth, surge, record,
beat, upgrade… versus loss, fall, drop, plunge, miss, downgrade…),
matched as whole words, and returns a `score` — `(positive − negative)
/ total`, rounded to 2 decimal places, in [−1, 1] (0 when no words
match) — a `label` (`positive` at score ≥ 0.2, `negative` at ≤ −0.2,
`neutral` between), and the matched words, so the score is explainable,
not just a number.

`aggregateSentiment` combines per-article scores into one overall
reading: the mean score (2dp) plus the counts of positive, negative and
neutral articles, so a "neutral" mean over a polarised set is visible
instead of hiding the disagreement.

A lexicon is the right tool here: it is deterministic (the same headline
always scores the same), free (no model call per headline), and
explainable (the matched words show _why_ a headline scored as it did).
A FinBERT model is the synopsis's optional enhancement, not the default.

### 4.5 The news and screener service (`rag.service.ts`)

`RagService` is the feature service: it owns the two user-facing RAG
features and orchestrates the repository, the ingest service and the
market layer.

**`newsForSymbol(symbol)`** — the freshness gate described in §3.2: it
checks `newsFreshness`, refreshes via `indexNews` when stale (no
indexed news, or the newest item older than the 6-hour TTL), then lists
the 10 most recent indexed articles, scores each one's sentiment, and
aggregates. The response carries the articles (title, publisher, date,
URL, sentiment), the overall aggregate, an `available` flag, a
human-readable `reason` when there is no news, and the fetch time.

**`screenerUniverse(userId)`** — the universe is the 15-symbol curated
list (`DEFAULT_SCREENER_UNIVERSE`: RELIANCE, HDFCBANK, ICICIBANK, INFY,
TCS, SBIN, ITC, HINDUNILVR, LT, BHARTIARTL, KOTAKBANK, AXISBANK,
MARUTI, TITAN, SUNPHARMA) **plus the user's own holdings and watchlist**
symbols, so the user's stocks are always screenable. Holdings/watchlist
fetch failures degrade to an empty list rather than failing the screen.

**`screen(userId, input)`** — validates the filters with
`ScreenFiltersSchema` (a 400 with the first issue's message on invalid
input), resolves the universe (an explicit `symbols` list of at most 20
overrides the default), evaluates each symbol in batches of 5, and
returns the matches. Each evaluation fetches the quote, history and
profile and computes price, market cap, RSI(14), P/E, 1-month change
and the SMA 20/50 trend values; a symbol that fails to load entirely is
reported as `unavailable` rather than silently dropped. Results are
sorted by 1-month change, best first, and sliced to `limit` (default
20).

The filters (from `rag.validation.ts`):

| Filter                             | Type                      | Meaning                                            |
| ---------------------------------- | ------------------------- | -------------------------------------------------- |
| `symbols`                          | string[], max 20          | Screen only these symbols (overrides the universe) |
| `minPrice`, `maxPrice`             | number                    | Price band in ₹                                    |
| `minMarketCapCr`, `maxMarketCapCr` | number                    | Market cap band in ₹ crore                         |
| `minRsi`, `maxRsi`                 | number                    | RSI(14) band, 0–100                                |
| `minPe`, `maxPe`                   | number                    | P/E band                                           |
| `minChange1mo`, `maxChange1mo`     | number                    | 1-month change band, %                             |
| `trend`                            | enum                      | One of the 6 SMA trends (below)                    |
| `sector`                           | string                    | Sector match (from the profile)                    |
| `limit`                            | number (1–50, default 20) | Maximum results                                    |

The six SMA trends (`SCREENER_TRENDS`): `above-sma20`, `below-sma20`,
`above-sma50`, `below-sma50`, `golden-cross` (SMA 20 crossing above
SMA 50), `death-cross` (SMA 20 crossing below SMA 50). A `superRefine`
rule rejects any min/max pair where the minimum exceeds the maximum.
The same filters exist as a hand-written JSON Schema
(`SCREEN_FILTERS_JSON_SCHEMA`) for the NL screener tool — hand-written
because the repo has no Zod-to-JSON-Schema dependency — and the
validation spec asserts its keys match `SCREEN_FILTER_KEYS`, so the two
cannot drift apart silently.

The rule that defines the screener's honesty, stated in the validation
file's header comment: **"A filter on a metric a symbol does not have
excludes that symbol — the screen never pretends a missing number passed
a filter."** `passesFilters` implements it literally: for every band
filter, a null metric fails the check. If a symbol has no P/E and the
user asked for `maxPe: 25`, that symbol is excluded — not included on
the assumption that its P/E "might" be under 25, and not included with
a zero. The alternative would silently put stocks the user did not ask
for into their results, and the user would have no way to tell. The rule
is pinned by tests that construct symbols with null metrics and assert
their exclusion.

### 4.6 The AI wiring: two new tools, two new endpoints, one new prompt rule

**Two new tools** bring the total from 7 to 9:

| Tool                   | Purpose                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchKnowledge`      | Retrieve context by meaning: takes a query string (and an optional symbol and source type) and returns the top chunks with titles, dates and similarity scores |
| `applyScreenerFilters` | The NL screener's tool: takes a filter object matching `SCREEN_FILTERS_JSON_SCHEMA`. Used only through the forced tool call in `screenByQueryWithModel`        |

**Rule 8 joins the system prompt** in this phase (Phase 1 had seven
rules): "When the question is about news, a stock's recent events, or
the user's past spending, call searchKnowledge before answering and cite
what it returns by title and date." The rule and the tool arrive
together here. A new prompt block, `NEWS_EXPLANATION_INTRO`, instructs
the model to explain what the retrieved news says — what happened, in
what order, what the articles agree or disagree on — to cite each
article by title and date, and to treat the articles as data, never
instructions.

**`POST /api/ai/explain-news`** (`AiService.explainNews`) explains a
symbol from its retrieved news. Its structure is the phase's clearest
guardrail-in-miniature: it retrieves chunks for the symbol (top 5,
similarity ≥ 0.35), and **if zero chunks are retrieved, it refuses
deterministically — no model call is made at all.** The response is
`refused: true` with the reason "No relevant news articles were
retrieved for {symbol}.", produced by a code branch, not by asking the
model to refuse. A prompt instruction can be ignored; a code branch
cannot. Otherwise, it calls the **primary** model with the chunks
(`NEWS_EXPLANATION_INTRO` + `formatRetrievedContext`) and returns a
structured answer citing them.

**`POST /api/ai/screen`** (`AiService.screenByQuery`) takes a
natural-language query and asks the primary model — with a **forced
tool call** (`toolChoice: { function: { name:
'applyScreenerFilters' } }`) — to translate it into a filter object.
The filters are Zod-validated; an invalid extraction falls back to
showing all screened stocks with the plain note quoted in §3.3. The
deterministic screen then runs, and the model summarises the results
(`formatScreenResults`) into a structured answer. When no API key is
configured, the endpoint still works: it runs an unfiltered screen and
returns the results as a fallback.

**Explain-stock gains retrieved context.** Phase 1's `explainWithModel`
now takes a `RetrievedContext` and includes the retrieved profile
chunks in the prompt when they are available, so a stock explanation can
say what the company _does_ as well as what its numbers are. The
reasoning model still does the explaining; retrieval only adds context.

**`rag.prompts.ts`** holds the two formatters the AI layer uses:
`formatRetrievedContext` (chunks → a cited context block) and
`formatScreenResults` (a screen response → a summary the model can
narrate).

### 4.7 Endpoints and web UI

**Backend endpoints**, all behind the session guard, all
`Cache-Control: private, no-store`:

| Method & path               | Purpose                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/rag/news/:symbol` | News + sentiment for a symbol (refreshes the index when stale)                         |
| `POST /api/rag/screen`      | Deterministic screener with explicit JSON filters                                      |
| `POST /api/ai/explain-news` | Reasoning over retrieved news (primary model; deterministic refusal with no context)   |
| `POST /api/ai/screen`       | Natural-language screener (forced tool call → deterministic screen → narrated summary) |

**`screener.tsx`** (on `/market`) is the screener's form and results:
price and market-cap bands, RSI and P/E bands, 1-month change band, a
trend selector (the 6 SMA trends, from `TREND_OPTIONS`) and a sector
input, plus a natural-language box that posts to `/api/ai/screen`.

**`stock-news.tsx`** (on the stock detail page) lists the symbol's news
with publisher, date, URL and a sentiment label, shows the overall
sentiment aggregate, and offers an "Explain this news" action that
posts to `/api/ai/explain-news` and renders the structured answer with
its citations — or the deterministic refusal when there is no news to
explain.

**`lib/rag.ts`** holds the shared RAG response types and `TREND_OPTIONS`
(the six trends with human-readable labels). The web forwarders follow
the Phase 1 pattern, with the two AI forwarders using the long timeout
the model calls need. The `ai-chat.tsx` change in this phase is small —
a shared POST helper for AI routes, used by the screener and stock-news
components — because the chat UI itself did not need to change: the new
tools are available to it through the same chat endpoint.

---

## 5. Configuration

| Variable                   | Default                                                       | Purpose                                                         |
| -------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `LLM_EMBEDDING_MODEL`      | `baai/bge-base-en-v1.5`                                       | Embedding model (768d). **Not** `bge-small-en-v1.5` — see §6.2. |
| `LLM_EMBEDDING_BASE_URL`   | Falls back to `LLM_BASE_URL` (`https://openrouter.ai/api/v1`) | Embeddings endpoint (same provider, same key).                  |
| `LLM_EMBEDDING_TIMEOUT_MS` | `30000`                                                       | Per-embedding-call timeout.                                     |
| `RAG_TOP_K`                | `5`                                                           | Retrieved chunks per query.                                     |
| `RAG_MIN_SIMILARITY`       | `0.35`                                                        | Minimum cosine similarity for a chunk to be returned.           |
| `RAG_NEWS_TTL_MS`          | `21600000` (6 h)                                              | How long ingested news counts as fresh.                         |
| `RAG_INGEST_BATCH_SIZE`    | `25`                                                          | Chunks embedded per provider call.                              |
| `OPENROUTER_API_KEY`       | _(unset)_                                                     | The same key as Phase 1 — **no new credential**.                |

No new secret is introduced by this phase. The RAG layer reuses the
Phase 1 key and provider, so the deployment story does not change and
the key-awaiting smoke test (§10) covers both phases at once.

---

## 6. Decisions taken

| #   | Decision                                                                                                 | Options considered                                               | Why this one                                                                                                                                                     | Decided by                                                       |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Vector store: **pgvector on the existing Neon Postgres**                                                 | A separate vector database (Pinecone, Qdrant, Weaviate)          | One database, one connection string, no new service to pay for; pgvector is mature and the scale is small                                                        | Me (plan decision 3)                                             |
| 2   | Embedding model: **substitute `baai/bge-base-en-v1.5` (768d)** for the plan's `bge-small-en-v1.5` (384d) | Other free embedding models; a different provider for embeddings | The small model is not offered on OpenRouter (verified live); the base model is the nearest in-family model; one key, one provider (§6.2 below)                  | Me, 19 Nov ~13:07 IST                                            |
| 3   | News content: **title + publisher + date only, no article body**                                         | Fetch and store full article text                                | Copyright risk avoided; prompt stays small; headlines carry enough for a news explanation                                                                        | Implementation decision, per plan                                |
| 4   | Sentiment: **lexicon, not a model**                                                                      | FinBERT (synopsis optional); an LLM call per headline            | Deterministic, free, explainable; FinBERT stays an optional enhancement                                                                                          | Per plan (synopsis §4.4)                                         |
| 5   | Screener: **deterministic filters; the model only translates NL → filters**                              | Let the model pick stocks directly                               | A model-generated stock list is unauditable and untestable; the deterministic screener is both                                                                   | Per plan + strategy doc ("the LLM reasons, the code calculates") |
| 6   | **Null metric never passes a constraining filter**                                                       | Treat missing metrics as passing, or as zero                     | Missing data must not silently widen results; every result must actually satisfy every filter                                                                    | Implementation decision, test-pinned                             |
| 7   | No-context explain-news: **deterministic refusal in code, no model call**                                | Ask the model to refuse when it has no context                   | A prompt instruction can be ignored; a code branch cannot                                                                                                        | Per plan (acceptance criterion)                                  |
| 8   | Ingestion: **lazy, on demand, with a 6-hour TTL**                                                        | Scheduled background ingestion; pre-load on deploy               | No background-job infrastructure exists on the free tier; lazy ingestion keeps the database small and embedding spend near zero                                  | Implementation decision                                          |
| 9   | Chunking **500 chars / 50 overlap, sentence-aware**                                                      | Fixed-size splits; larger chunks (1000+)                         | Sentence boundaries keep chunks coherent; 500 chars keeps five retrieved chunks small in the prompt                                                              | Per plan                                                         |
| 10  | Retrieval: **top 5, min similarity 0.35, user-scoped in SQL**                                            | Larger top-K; no similarity floor; no user filter                | Five chunks is enough context without flooding the prompt; the floor keeps weak matches out; the user filter is the privacy rule                                 | Per plan                                                         |
| 11  | Index the user's own transactions (private, user-scoped) alongside public news and profiles              | News and profiles only                                           | "What did I spend on food last month?" is a retrieval question — the user's own history should be searchable by meaning, and the user-scope filter makes it safe | Implementation decision                                          |
| 12  | NL screener failure mode: **show all screened stocks with a plain note**                                 | Return a 400 on invalid filter extraction                        | The user still gets something useful (the full screen) and an honest explanation; a bare error would waste a working screener                                    | Implementation decision                                          |

### 6.2 The embedding-model substitution (the Phase 1 lesson, repeated)

The plan named `bge-small-en-v1.5` (384 dimensions) as the embedding
model. When I verified it against the live OpenRouter catalogue on 19
November, it was not offered — the same finding as Phase 1's chat
models, with a sharper consequence: the vector column's dimension is
fixed in the migration (`vector(768)`), so the embedding model's
dimension is a schema decision, not just a configuration value.

The substitute is the nearest in-family model, **`baai/bge-base-en-v1.5`
(768 dimensions)** — same family, same provider, same key — and the
dimension is validated on every embedding call (§4.2), so a future
model change that returns a different dimension fails loudly at the
first call instead of corrupting the index. The schema, the migration,
the config default (`EMBEDDING_DIMENSIONS = 768`) and the tests all
agree on 768.

The lesson from Phase 1 (§10.1 of that document) generalises: **in a
hosted-model project, model identifiers are perishable, and the
architecture must treat them that way.**

---

## 7. Verification

Verification was re-run independently by me after the build — not taken
from the builder's report. This phase is also the one where the
verification process itself failed and was fixed (§8.1).### 7.1 Tests

| Suite                                 | Result                                                     |
| ------------------------------------- | ---------------------------------------------------------- |
| Backend Jest (`apps/backend`)         | **442 / 442 passed** (310 existing + 132 new, 33 suites)   |
| Web tests (`apps/web`, `node --test`) | **62 / 62 passed** (51 existing + 11 new, `rag.test.mjs`)  |
| End-to-end (`test:e2e`)               | **3 / 3 passed** — in the post-fix verification run (§8.1) |

The 132 new backend tests break down as follows (counts measured from
the spec files at `d80684b`):| Spec file | Tests | What it pins down |
|---|---|---|
| `rag.chunking.spec.ts` | 13 | 500/50 boundaries, sentence awareness, the three chunk builders |
| `rag.config.spec.ts` | 4 | Env-var resolution, defaults (768d, top-K 5, 0.35, 6 h TTL, batch 25) |
| `rag.embeddings.spec.ts` | 12 | Batch + single embedding, **dimension validation (768)**, timeouts and errors |
| `rag.http.spec.ts` | 4 | RAG endpoints: 401 without a session, 400 on bad filters |
| `rag.ingest.spec.ts` | 16 | News/profile/transaction indexing, dedup, the 200-transaction cap |
| `rag.prompts.spec.ts` | 9 | Context and screen-result formatting |
| `rag.repository.spec.ts` | 15 | Upsert, similarity search (user filter, floor, top-K), freshness, prune |
| `rag.retrieval.spec.ts` | 6 | Query embedding, retrieval options, failure handling |
| `rag.sentiment.spec.ts` | 9 | Lexicon scoring, the ±0.2 threshold, the three labels, aggregation |
| `rag.service.spec.ts` | 12 | Freshness gate, news + sentiment response, screener universe and filtering |
| `rag.validation.spec.ts` | 10 | Filter schema, min/max pairs, the JSON Schema drift check |
| `ai.rag.spec.ts` | 11 | `searchKnowledge`, explain-news (incl. the zero-chunk refusal), NL screener |
| AI spec additions (`ai.http` +5, `ai.tools` +4, `ai.prompts` +1, `ai.provider` +1) | 11 | The two new endpoints, the two new tools, the new prompt rule, provider changes |
| **Total new** | **132** | |

As in Phase 1, all provider tests use a mocked client — no test calls a
real embedding or chat model, and no test contains an API key. The RAG
repository tests mock `PrismaService`, so the raw pgvector SQL is not
executed in the test suite; it is exercised only against Neon (§10).

### 7.2 Static checks and builds

| Check                                   | Result                               |
| --------------------------------------- | ------------------------------------ |
| Backend type-check (`tsc --noEmit`)     | Clean                                |
| Backend lint (`oxlint`)                 | **0 warnings, 0 errors**             |
| Prettier (`format:check`)               | Clean                                |
| Web type-check (`check-types`)          | Clean                                |
| Web lint (ESLint)                       | Clean (0 warnings)                   |
| NestJS production build (`nest build`)  | OK                                   |
| Next.js production build (`next build`) | OK, 4 new routes in the build output |

### 7.3 CI

| Run           | Commit    | Result                                                     |
| ------------- | --------- | ---------------------------------------------------------- |
| `44488093404` | `d80684b` | **Failed** — step 9 (`npm test`), the DI wiring bug (§8.1) |
| `44489224691` | `ce9edaa` | **Passed** — success, ~14:10 IST                           |

### 7.4 Live verification (~14:10 IST, 19 November 2026)

| Check                                         | Result                              |
| --------------------------------------------- | ----------------------------------- |
| Backend `/api/health`                         | 200                                 |
| Backend `/api/rag/news/RELIANCE` (no session) | **401** — route live, auth required |
| Backend `/api/rag/screen` (no session)        | **401** — route live, auth required |
| Backend `/api/ai/explain-news` (no session)   | **401** — route live, auth required |
| Backend `/api/ai/screen` (no session)         | **401** — route live, auth required |
| Web `/api/rag/news/RELIANCE`                  | 401 — forwarder live                |

As in Phase 1, a 401 without a session is the expected signal for a
session-guarded route. What these checks do _not_ prove is that a
retrieval works against prod Neon, that an embedding call succeeds, or
that the pgvector index answers — those need a logged-in session and the
API key, and they are the smoke test in §10.

---

## 8. Problems faced and fixes

### 8.1 The DI wiring bug — the day's only real defect (CI failure on `d80684b`)

**What happened.** Phase 2 was merged and pushed at ~14:00 IST
(`d80684b`). CI run `44488093404` failed at step 9 (`npm test`).

**Root cause.** `RagIngestService` injects the `MARKET_DATA_PROVIDER`
token — it needs the Yahoo client to fetch news. `MarketModule`
exported `MarketService` and `PortfolioService`, but **not**
`MARKET_DATA_PROVIDER`, so the end-to-end suite could not boot the real
`AppModule`: NestJS failed to resolve the dependency and the
application failed to start.

**Why every unit test passed.** The unit tests mock the provider: the
RAG specs provide a fake `MARKET_DATA_PROVIDER`, so they never ask the
real `MarketModule` for it. The wiring bug is invisible to any test that
mocks the thing that is mis-wired. Only the e2e suite — which boots the
real module graph — could see it, and the e2e suite was not run before
the push.

**The fix.** One line, commit `ce9edaa` (~14:04 IST): add
`MARKET_DATA_PROVIDER` to the `exports` array of `MarketModule`.

**Verification of the fix.** Before pushing `ce9edaa`, I ran the exact
CI command — the full root `npm test` — locally: backend unit 442/442,
e2e 3/3, web 62/62, plus type-check, oxlint and Prettier clean and a
NestJS build. Only then was it pushed (~14:07 IST). CI run `44489224691`
passed at ~14:10 IST, and the live checks in §7.4 followed.

### 8.2 The embedding model was not offered (finding, not a fault)

Described in §6.2. The finding was made before the migration was
written, which is why the schema carries `vector(768)` from the start
rather than needing a second migration to change the dimension.

### 8.3 A note on the shared-IP rate limit

While fetching the failed CI run's job logs on 19 November (~14:01 IST),
GitHub's unauthenticated API returned a 403 — the shared-IP rate limit
(60 requests/hour) had been exhausted. The failure was diagnosed from
the Actions run page's annotations instead, which are readable without
authentication. The practical rule: poll CI no more often than every
120 seconds.

---

## 9. Deployment

| Event                                   | Time (IST)  | Detail                                                                        |
| --------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| Phase 2 built                           | 13:06–13:20 | 8 commits, branch `feat/phase-2-rag`, head `d80684b`                          |
| Phase 2 locally verified                | ~13:55      | Backend 442/442, web 62/62, static checks + builds clean (e2e not run — §8.1) |
| Phase 2 merged + pushed                 | ~14:00      | `main` `efafe52`..`d80684b`; 8 commits, 53 files, +6,561 / −22                |
| CI failed                               | ~14:02      | Run `44488093404`, step 9 (`npm test`)                                        |
| Fix committed                           | ~14:04      | `ce9edaa` — one-line export                                                   |
| Fix verified (full root suite) + pushed | ~14:07      | Backend 442/442, e2e 3/3, web 62/62                                           |
| CI green                                | ~14:10      | Run `44489224691`, success                                                    |
| Live-verified                           | ~14:10      | §7.4                                                                          |

**Migration behaviour.** The deploy of `ce9edaa` ran the backend build
command, which includes `prisma migrate deploy` (added earlier the same
day, ~12:55 IST). The build is an `&&` chain, so a failed migration
fails the whole build; the deploy succeeded, which is the evidence that
migration `20261119130000_add_rag_documents` applied to prod Neon. The
table is empty (ingestion is lazy and no logged-in request has
triggered it yet), and no query has run against the index in production.

Live services (Render free tier):

- Backend: `https://finverse-ai-r050.onrender.com` — `/api/rag/news/*`,
  `/api/rag/screen`, `/api/ai/explain-news`, `/api/ai/screen` live
  behind the session guard.
- Web: `https://finverse-web.onrender.com` — screener on `/market`, news
  section on the stock page (visual check still pending — §10).

---

## 10. What is still open or unverified

1. **No real embedding or model call has been made.** The pgvector
   index exists on prod Neon, but no retrieval has run against live
   data, no news has been ingested, and no embedding has been produced.
   The live smoke test needs the OpenRouter API key in the Render
   backend environment variables (Sarthak Thapliyal was to provide it by
   the evening of 19 November; as of writing I do not have confirmation
   that it has been provided) plus a logged-in user, and must check a
   real embedding call (768 dimensions), pgvector similarity search
   against prod Neon, a screener query, a news explanation citing a real
   title and date, and a no-context answer producing the deterministic
   refusal.
2. **The raw pgvector SQL is untested against a real database.** The
   repository tests mock `PrismaService`. The SQL has never run outside
   Neon, and on Neon it has never run at all — the migration created
   the objects, but no query has executed. The smoke test is the first
   real execution.
3. **The screener and news UI have not been seen in a live browser
   session.** Build-, type- and lint-verified, but no one has opened
   `/market` logged in, run a screener filter, or watched a news
   section render. Part of the smoke test.
4. **Ingestion is lazy with no background job.** The first request for
   a fresh symbol pays the full fetch + chunk + embed + insert cost.
   Acceptable for the prototype; a scheduler is the named improvement
   if usage grows.
5. **The `BETTER_AUTH_URL` localhost misconfiguration** (parked at my
   request) will break session verification and login in production,
   and it blocks comfortable real-user testing — the smoke test needs a
   logged-in user, and login depends on this fix.
6. **The web service dashboard fault** (found 19 November ~14:10 IST,
   still open at the time of writing): the web service on Render is
   serving the NestJS backend instead of the Next.js website, because
   its build/start commands point at the backend. Until it is fixed,
   the `/market` screener and stock-page news UI cannot be reached in
   production, even though the code is deployed and the backend routes
   are live. The fix is a dashboard change (build command ending with
   `npm run build --workspace web`, start command
   `npm run start --workspace web`, then a manual deploy), not a code
   change.

---

## 11. Lessons learned

1. **Run the full suite, including e2e, before every push.** The
   `d80684b` failure is the cleanest possible demonstration: 442 unit
   tests passed, and the application could not start. Unit tests mock
   the boundaries; the e2e suite is the only test that exercises the
   real wiring. The rule is now standing, and the Phase 2 document is
   where it was earned.
2. **Model identifiers are perishable — check them live, at build
   time, every time.** Phase 1 (chat models) and Phase 2 (embedding
   model) both found the plan's named models unavailable on the same
   day. The check is cheap; the cost of skipping it grows with how deep
   the identifier is embedded — in Phase 2 it reached the database
   schema.
3. **Refusals that matter should be code, not prompts.** The
   zero-chunk explain-news refusal is a branch in `AiService`, not an
   instruction to the model. A prompt can be ignored or overridden by
   retrieved text; a branch cannot. Phase 3's guardrail will extend
   this principle to claim verification.
4. **The model translates; the code decides.** The natural-language
   screener is the clearest application of "the LLM reasons, the code
   calculates" in the project so far. The model turns words into a
   filter object; the deterministic screener does the filtering. The
   result is a feature that is both natural to use and auditable.
5. **Missing data is a decision, not an absence.** The null-metric rule
   is a one-line policy with outsized consequences: it is the difference
   between a screener the user can trust and one that silently widens
   its own results. Every feature that filters on computed data needs an
   explicit missing-data policy, pinned by a test, before it ships.

---

## 12. Appendix

### 12.1 Commit table

Times are IST, converted from the commit timestamps in the repository.
Files and lines are the per-commit diff.

| Time      | Hash      | Message                                                                                     | Change                     |
| --------- | --------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| 13:06     | `c694822` | feat(rag): pgvector schema + migration for RAG documents                                    | 2 files, +75               |
| 13:07     | `e1f0e25` | feat(rag): OpenRouter embeddings client + RAG config                                        | 4 files, +450              |
| 13:08     | `d925d7e` | feat(rag): chunking, lexicon sentiment + pgvector repository                                | 6 files, +1,014            |
| 13:09     | `1ce028b` | feat(rag): Yahoo news provider + ingestion and retrieval pipeline                           | 6 files, +855              |
| 13:11     | `290ad9b` | feat(rag): news & sentiment + smart stock screener services and endpoints                   | 8 files, +1,018 / −1       |
| 13:16     | `5da97f1` | feat(phase-2): wire RAG into the AI layer — searchKnowledge tool, explain-news, NL screener | 31 files, +1,866 / −140    |
| 13:19     | `60d9c8e` | feat(phase-2): web UI — smart screener + news & sentiment on the stock page                 | 13 files, +1,405 / −1      |
| 13:20     | `d80684b` | style(rag): prettier formatting in rag.ingest.ts                                            | 1 file, +1 / −3            |
| **Total** |           | **8 commits**                                                                               | **53 files, +6,561 / −22** |
| 14:04     | `ce9edaa` | fix(market): export MARKET_DATA_PROVIDER so RagModule can inject it                         | 1 file, +1 / −1            |

The range total (53 files, +6,561 / −22) is the diff total for
`c694822^..d80684b` and is exact; it differs from the sum of the
per-commit rows because later commits touch files created by earlier
ones. The fix commit `ce9edaa` landed after the merge, directly on
`main`.

### 12.2 Full file list (`c694822^..d80684b`)

**Backend** (`apps/backend/`):

- `prisma/schema.prisma` (RagDocument model)
- `prisma/migrations/20261119130000_add_rag_documents/migration.sql`
- `src/ai/ai.controller.ts` (explain-news, screen endpoints)
- `src/ai/ai.http.spec.ts` (+5 tests)
- `src/ai/ai.module.ts` (RagModule wired in)
- `src/ai/ai.prompts.spec.ts` (+1 test)
- `src/ai/ai.prompts.ts` (rule 8, NEWS_EXPLANATION_INTRO)
- `src/ai/ai.provider.spec.ts` (+1 test)
- `src/ai/ai.provider.ts`
- `src/ai/ai.rag.spec.ts` (11 tests)
- `src/ai/ai.service.spec.ts`
- `src/ai/ai.service.ts` (explainNews, screenByQuery, retrieved context in explain-stock)
- `src/ai/ai.tools.spec.ts` (+4 tests)
- `src/ai/ai.tools.ts` (searchKnowledge, applyScreenerFilters)
- `src/ai/ai.validation.ts`
- `src/app.module.ts` (RagModule registered)
- `src/market/market.provider.ts` (news via Yahoo search)
- `src/rag/rag.chunking.spec.ts`
- `src/rag/rag.chunking.ts`
- `src/rag/rag.config.spec.ts`
- `src/rag/rag.config.ts`
- `src/rag/rag.controller.ts`
- `src/rag/rag.embeddings.spec.ts`
- `src/rag/rag.embeddings.ts`
- `src/rag/rag.http.spec.ts`
- `src/rag/rag.ingest.spec.ts`
- `src/rag/rag.ingest.ts`
- `src/rag/rag.module.ts`
- `src/rag/rag.prompts.spec.ts`
- `src/rag/rag.prompts.ts`
- `src/rag/rag.repository.spec.ts`
- `src/rag/rag.repository.ts`
- `src/rag/rag.retrieval.spec.ts`
- `src/rag/rag.retrieval.ts`
- `src/rag/rag.sentiment.spec.ts`
- `src/rag/rag.sentiment.ts`
- `src/rag/rag.service.spec.ts`
- `src/rag/rag.service.ts`
- `src/rag/rag.validation.spec.ts`
- `src/rag/rag.validation.ts`

**Web** (`apps/web/`):

- `app/(module-one)/dashboard/ai-chat.tsx` (shared AI POST helper)
- `app/(module-two)/market/market-shell.tsx`
- `app/(module-two)/market/market.tsx`
- `app/(module-two)/market/screener.tsx`
- `app/(module-two)/market/stock/[symbol]/stock-news.tsx`
- `app/(module-two)/market/stock/[symbol]/stock-profile.tsx`
- `app/api/ai/explain-news/route.ts`
- `app/api/ai/screen/route.ts`
- `app/api/rag/news/[symbol]/route.ts`
- `app/api/rag/screen/route.ts`
- `lib/ai.ts`
- `lib/rag.ts`
- `test/rag.test.mjs` (11 tests)

**Fix (separate commit `ce9edaa`):**

- `apps/backend/src/market/market.module.ts` (one line: export `MARKET_DATA_PROVIDER`)

### 12.3 Sources

- Git repository `github.com/FinverseAI/FinVerse-AI`, `main` at `ce9edaa`
  (this phase: `c694822`..`d80684b`, fix `ce9edaa`).
- Approved plan: `llm-layer-guardrails-readiness-evaluation-plan.md`
  (Plan v1, approved 19 November 2026), Phase 2 section, Section 6
  decision 3, and Section 7 (LLM Integration Strategy document).
- LLM Integration Strategy document (`FinVerse_AI_LLM_Integration_
Strategy.docx`, my own research): §3.3 (tools), §4.3 (latency),
  §4.5 (prompt-injection guard), §4.7 (fallback design).
- Daily Report — 19 November 2026 (FinVerse AI project files).
- Synopsis: `Finverse_Ai_Final_Synopsys.pdf`, Objectives 2 and 4,
  methodology §4.4.
