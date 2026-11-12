# Financial onboarding

FinVerse uses the existing Next.js Better Auth session, NestJS backend, Prisma, and PostgreSQL. The backend verifies the signed session cookie with the existing Better Auth `/api/auth/get-session` endpoint. User IDs and completion flags are never accepted from request bodies.

## Setup and migration

Start PostgreSQL first. For the repository's Docker Compose setup, start Docker Desktop, then run `docker compose up -d postgres` from the repository root.

Ensure `DATABASE_URL` in `apps/backend/.env` and `apps/web/.env` points to the same PostgreSQL database. Keep the existing Better Auth secret and Google OAuth settings in `apps/web/.env`.

Set these server-only URLs when using addresses other than the defaults:

| Application | Variable          | Default                 |
| ----------- | ----------------- | ----------------------- |
| Backend     | `BETTER_AUTH_URL` | `http://localhost:3000` |
| Web         | `BETTER_AUTH_URL` | `http://localhost:3000` |
| Web         | `BACKEND_URL`     | `http://localhost:3001` |

`BETTER_AUTH_URL` must match the browser's public web origin in both applications. Backend authentication requires network access to that application's auth endpoint. The web application's `BACKEND_URL` must reach NestJS.

From the repository root, run:

```powershell
cd apps/backend
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
cd ../..
```

Running from `apps/backend` lets Prisma load its existing `.env`. The new migration is `apps/backend/prisma/migrations/20261112000000_add_financial_onboarding/migration.sql`. `migrate deploy` also applies any earlier pending migrations; it does not reset the database.

Start both applications from the repository root:

```powershell
npm run dev
```

The backend's `dev` script lets Turbo start NestJS alongside Next.js. PostgreSQL must already be running. If `/api/profile` returns `503`, check that the backend is listening on port 3001 and that `BACKEND_URL` points to it.

Alternatively, run the applications in separate terminals from the repository root:

```powershell
npm run start:dev --workspace backend
```

```powershell
npm run dev --workspace web
```

## API behavior

The browser uses same-origin `/api/onboarding` and `/api/profile` forwarding routes. NestJS owns validation and database writes. Writes require the matching web `Origin`; all routes require a valid Better Auth session cookie. Responses are private and not cached.

- `POST /api/onboarding`: saves the complete profile and goal list in one transaction and sets completion server-side. Returns `201`. Repeated completion returns `409` without changing data.
- `GET /api/profile`: returns `{ profile, goals, onboarding_completed }`. A user with no profile receives `{ profile: null, goals: [], onboarding_completed: false }`.
- `PUT /api/profile`: replaces the completed profile's editable fields and full goal list transactionally, returning `200`. Goal IDs are regenerated on replacement. A user who has not completed onboarding receives `404`.

POST and PUT accept the same flat object:

```json
{
  "employment_type": "salaried",
  "monthly_income": "60000.00",
  "other_monthly_income": null,
  "fixed_expenses": "20000.00",
  "variable_expenses": "10000.00",
  "existing_debt_total": null,
  "current_savings": "100000.00",
  "monthly_savings_target": "10000.00",
  "investment_experience": "beginner",
  "risk_tolerance": "medium",
  "already_investing": false,
  "invested_amount": null,
  "emergency_fund_months": "1-3",
  "goals": [
    {
      "name": "Emergency fund",
      "target_amount": "180000.00",
      "target_date": "2027-12-31",
      "priority": "high"
    }
  ]
}
```

Money is returned as decimal strings and stored as `NUMERIC(12,2)`. Inputs must be nonnegative, have at most two decimal places, and fit the database precision. Goal targets must be positive. Submit between 1 and 50 goals. Dates must be real calendar dates; past dates remain valid for overdue goals.

Fixed and variable expenses plus the savings target cannot exceed monthly income plus other monthly income. Outstanding debt is informational: monthly EMI payments belong in fixed expenses and are not deducted twice. Current savings are not assigned to individual goals automatically. Monthly surplus is calculated using integer cents in the frontend.

Validation errors return `400` with `{ message, errors }`, where `errors` maps field paths such as `goals.0.target_amount` to messages. Invalid sessions return `401`, invalid write origins return `403`, and auth/network outages return `503`.

## Frontend behavior

Dashboard, onboarding, login, and sign-up route entry points check the session and saved profile. Incomplete users are redirected to `/onboarding`; completed users to `/dashboard`. The dashboard never renders for an unauthenticated or incomplete user, including direct URL visits and reloads.

The four-step form validates each step, preserves inputs when navigating back or retrying a failed save, and disables repeat submission while saving. The dashboard's **Edit financial profile** and **Add goal** actions reuse the form and persist through PUT. Income, expenses, savings, target, goals, and surplus come from the backend. Unavailable historical data and per-goal saved amounts use empty states. The existing transaction and category-budget preview features remain separate from the saved financial profile.

## Files

- Database: `apps/backend/prisma/schema.prisma` and the new SQL migration.
- Backend: `apps/backend/src/auth/session.guard.ts`, `src/profile/`, and `src/app.module.ts`.
- API and shared data: `apps/web/lib/profile.ts`, `profile-server.ts`, and `app/api/{onboarding,profile}/route.ts`.
- Guard and states: `apps/web/auth/profile-{guard,error,loading}` and route-level loading/error files.
- Form: `apps/web/app/(module-one)/onboarding/`.
- Integration: existing dashboard components, `main.tsx`, and login/sign-up route entry points.
- Tests: backend auth/profile `*.spec.ts` files.

## Verification

```powershell
npm run build --workspace backend
npm run check-types --workspace web
npm run lint --workspace web
npm run build --workspace web
cd apps/backend
node --experimental-vm-modules ../../node_modules/jest/bin/jest.js --runInBand src/profile src/auth
npx oxlint --type-aware src/auth/ src/profile/ src/app.module.ts
```

The direct Jest command accounts for the repository's hoisted dependencies. Its existing `npm test` script points to a missing workspace-local Jest path. The repository also has an unrelated starter controller test calling the removed `getHello()` method and a backend lint failure for the existing unawaited `bootstrap()` call in `src/main.ts`.

After migration, verify with two authenticated users: a new user is redirected to onboarding; invalid budgets remain on the form; completing all four steps opens the dashboard; reload retains the values; editing persists; a second user cannot see the first user's profile; repeated POST returns `409`.
