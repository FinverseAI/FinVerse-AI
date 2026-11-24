# FinVerse

A personal-finance workspace for people budgeting in Indian rupees. Set a monthly income and category allocation, record transactions, track bill due dates, and maintain savings goals.

## What works

- Google sign-in with account-scoped profiles, goals, transactions, and bills.
- Four-step onboarding: name, income/payday, budget percentages, goals.
- Saved budget percentages, exact paise allocation, and current-month budget spending.
- Recorded monthly cash flow, weekly/monthly/custom spending analysis, and search.
- Bill reminders with overdue states and an informational auto-pay flag.
- Profile and goal editing, loading/error/empty states, and keyboard-accessible dialogs.
- Stock intelligence: Yahoo Finance quotes and history (cached, stale-marked), indicators (SMA/EMA/RSI/MACD), holdings, watchlists, portfolio math (CAGR/XIRR, concentration) and mean-variance optimization.
- AI layer: chat, stock/news/readiness explanations and a natural-language stock screener, backed by retrieval (pgvector) and a guardrail that re-checks every number against the computed evidence. The Investment Readiness score (0–100) combines cash flow and portfolio risk; an evaluation harness measures the AI layer's grounding, consistency, quality, latency and cost.

Records are entered manually. FinVerse does not connect bank accounts or execute payments. The AI layer explains the user's own numbers and market data — it does not give personalised investment advice. Savings goals store targets and deadlines, and contributions to individual goals are tracked. Monthly plan figures and recorded activity are shown separately.

## Stack and structure

This npm/Turborepo monorepo uses Next.js 16 App Router, React 19, Tailwind CSS 4, NestJS 12, Better Auth, Prisma 6, and PostgreSQL.

| Location                     | Responsibility                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web/app/(module-one)`  | Landing, auth, onboarding, and dashboard routes                                        |
| `apps/web/app/(module-two)`  | Market overview and stock detail routes                                                |
| `apps/web/auth`              | Better Auth, session/profile guards, authentication UI                                 |
| `apps/web/lib`               | Profile contracts, budget calculations, same-origin API forwarding, environment checks |
| `apps/backend/src/profile`   | Validated profile/goals writes in a database transaction                               |
| `apps/backend/src/market`    | Market data, holdings, watchlists, portfolio math                                      |
| `apps/backend/src/ai`        | LLM provider, tools, prompts, guardrail, indicators                                    |
| `apps/backend/src/rag`       | Retrieval (embeddings, chunking, news, screener)                                       |
| `apps/backend/src/readiness` | Investment Readiness score formula and endpoint                                        |
| `apps/backend/src/eval`      | Evaluation harness: scenarios, baseline, metrics, rating pack                          |
| `apps/backend/src/activity`  | Account-scoped transactions and bill reminders                                         |
| `apps/backend/prisma`        | Schema and migration history                                                           |
| `packages`                   | Shared lint and TypeScript configuration                                               |
| `scripts/measure-bundle.mjs` | Reproducible emitted-client-asset measurements                                         |

The browser calls Next.js `/api/*` routes. Next forwards cookies to NestJS, which verifies the session with Better Auth and derives the user ID server-side. Both applications must use the **same PostgreSQL database and schema**. Writes require the configured web origin. Financial responses are private and uncached.

## Local setup

Use Node.js 24 or later and npm 11. Install dependencies from the repository root and create any missing environment files.

```powershell
npm ci
if (!(Test-Path apps/web/.env)) { Copy-Item apps/web/.env.example apps/web/.env }
if (!(Test-Path apps/backend/.env)) { Copy-Item apps/backend/.env.example apps/backend/.env }
```

Neon hosts the PostgreSQL database. In the Neon Console, select your development branch and database and open **Connect**. Copy the pooled connection string into `DATABASE_URL` in both apps. Turn off connection pooling in the dialog and copy the direct connection string into `DIRECT_URL` in `apps/backend/.env` for Prisma migrations.

Set a random secret of at least 32 characters in `apps/web/.env`. For example, generate one locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Configure Google OAuth credentials in the web environment. The local callback is `http://localhost:3000/api/auth/callback/google`. Sign-in availability is derived from the configured server credentials; there is no separate public enable flag.

```powershell
npm run db:generate --workspace backend
npm run db:migrate --workspace backend
npm run dev
```

Open `http://localhost:3000`. NestJS listens on port 3001 by default. Restart both applications after changing environment files.

## Environment

| Variable                                   | Application    | Purpose                                                                                                 |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | Both           | Pooled Neon URL for the same branch, database, and schema                                               |
| `DIRECT_URL`                               | Backend/Prisma | Direct Neon URL for migrations on that branch and database                                              |
| `BETTER_AUTH_URL`                          | Both           | Browser-facing web origin; HTTPS for deployed hosts                                                     |
| `BETTER_AUTH_SECRET`                       | Web            | Random secret, at least 32 characters; required for production builds/runtime or enabled authentication |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Web            | Google OAuth credentials                                                                                |
| `BACKEND_URL`                              | Web            | Server-to-server address reachable by Next.js                                                           |
| `PORT`                                     | Backend        | Listening port; defaults to 3001                                                                        |

Production requires explicit service URLs and an auth secret. Secrets remain server-side. Do not commit `.env` files. If profile loading fails after login, check shared database settings, pending migrations, backend logs, and whether NestJS can reach the web auth endpoint.

## Quality checks

```powershell
npm run lint
npm run check-types
npm test
npm run format:check
npm run build
npm run bundle:report
```

`npm test` runs backend validation/service/session tests, HTTP smoke tests with mocked persistence, and frontend calculation/request regressions. It does not require a live database or a Google account. ESLint includes TS/TSX; TypeScript checks unused local declarations. Backend lint includes promise handling.

For an optional database integration check against a disposable, migrated local database:

```powershell
cd apps/backend
node --env-file=.env test/activity-persistence.cjs
```

This verifies activity persistence and account isolation inside a rolled-back transaction. Do not run it against production. CI runs the standard checks without a live database or provider credentials. The CI auth secret is generated for each run.

## Running a release

1. Supply production environment variables to both services. Register the production Google callback and confirm the public HTTPS origin.
2. Back up the database and apply reviewed migrations with `npm run db:migrate --workspace backend`. Never use a development reset against a release database.
3. Build with `npm run build`, then run `npm run start --workspace web` and `npm run start:prod --workspace backend` under your deployment process manager.
4. Verify `/api/health` on the backend and perform a real-account smoke test: sign in, complete onboarding, save a budget, add a transaction/bill, reload, and verify another account cannot see them.

The health route reports process liveness, not database readiness. Before public launch, configure backups and restore testing, monitoring, request throttling at the ingress, and a privacy/deletion policy. Transactions and bill lists currently load all records; add pagination when real account sizes warrant it. Concurrent profile edits use last-write-wins semantics.

### Render deployment

Create separate Node web services for the backend and frontend. For both services, leave **Root Directory** empty so npm runs from the repository root and can resolve the workspaces.

| Render setting | Backend service | Frontend service |
| --- | --- | --- |
| Build Command | `npm ci --include=dev && npm run db:generate --workspace backend && npm run db:migrate --workspace backend && npm run build --workspace backend` | `npm ci --include=dev && npm run db:generate --workspace backend && npm run build --workspace web` |
| Start Command | `npm run start:prod --workspace backend` | `npm run start --workspace web -- --hostname 0.0.0.0` |
| Health Check Path | `/api/health` | `/` |

Set each service's environment variables from the Environment table above in Render. Use the frontend's public HTTPS origin for `BETTER_AUTH_URL` on both services, and the backend's reachable URL for `BACKEND_URL` on the frontend. Both services need the same database; the backend migration command also needs `DIRECT_URL`. Supply the frontend auth secret before building. Let Render supply `PORT`.

If deployment reports **Could not find a production build in the '.next' directory**, compare the Build Command and Start Command in **Settings → Build & Deploy**. Building only `backend` and then starting `web` produces this error. For that backend service, keep the backend Build Command above and change Start Command to `npm run start:prod --workspace backend`, then redeploy. For a frontend service, use the frontend command pair so `next build` creates `.next` before `next start`. Changes to this README do not update existing Render dashboard settings.

## Design and review

Design tokens live in `apps/web/app/globals.css`. Coral is the primary accent; warning/error colors are semantic. Glass is limited to cards, navigation, and dialogs, with opaque defaults and reduced-motion support.

See [the production review](docs/production-review.md) for per-file bug fixes, before/after measurements, and verification limits. The existing [project guide](docs/finverse-project-guide.md), `ONBOARDING.md`, and `DASHBOARD_SOURCE.md` describe earlier snapshots; use the current code and this README for setup.

### Database pool timeouts

Both runtime Prisma clients default to five connections per process, a 15-second pool wait, and a 20-second connection timeout. Explicit parameters in `DATABASE_URL` take precedence. Use the provider's pooled URL for both applications and the direct URL for migrations. Budget total connections across every web/backend process and deployment replica.

After changing database settings or updating the Prisma client configuration, stop and restart both development servers (`npm run dev`). Hot reload reuses the existing client and its old connection pool. A pool timeout can also indicate a provider/network outage or slow queries; increasing the pool size alone can exhaust the database's connection budget.
