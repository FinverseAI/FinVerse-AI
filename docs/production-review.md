# Production quality review

Reviewed the existing working tree, including the in-progress onboarding and activity features. Existing user edits and generated project-guide artifacts are preserved. No database migration or deployment was performed.

## Phase 1 — baseline

Next.js App Router and React provide the interface; Tailwind provides styles. Better Auth owns Google sign-in in the web app. Same-origin route handlers forward profile and activity requests to NestJS. NestJS verifies sessions with Better Auth and scopes Prisma/PostgreSQL queries to the authenticated account. React state holds fetched activity and form drafts. There is no bank synchronization, payment execution, AI adviser, or per-goal savings ledger.

Structural findings: duplicate API proxies; dialogs and primitives mixed in one file; eagerly bundled profile forms; local-only budget editing; mismatched transaction/budget categories; starter assets and service; broken test scripts; lint omitted TypeScript files; missing backend build-cache outputs; environment defaults unsuitable for deployment.

Baseline: build passed outside the sandbox (worker spawn is blocked inside it); web lint passed but did not cover TS/TSX; backend lint failed on the unhandled bootstrap promise; backend test script could not resolve Jest.

| Metric                              |    Before |     After |
| ----------------------------------- | --------: | --------: |
| Emitted client JS bytes             | 1,020,115 | 1,049,462 |
| Emitted CSS bytes                   |    53,705 |    40,052 |
| Client JS gzip bytes                |   319,908 |   331,882 |
| CSS gzip bytes                      |    11,522 |     8,302 |
| Unique direct external dependencies |        48 |        42 |
| Lockfile package entries            |     1,001 |       853 |

Combined emitted JS/CSS: 1,073,820 -> 1,089,514 bytes (+1.46%). Combined gzip: 331,430 -> 340,184 bytes (+2.64%). CSS shrank; JavaScript grew modestly with the new persisted editor and recovery paths. Lazy loading moves editor code out of the initial dashboard path but does not guarantee a smaller total emitted bundle.

Measure with `node scripts/measure-bundle.mjs` after `npm run build`. These are all emitted client assets, including lazy chunks and framework code, not a single page's transferred bytes. Gzip sizes sum independently compressed assets.

## Phase 2 - cleanup and performance

Removed seven unused template SVGs, the Hello World service, redundant landing/auth wrapper components, unused React-library configuration, inactive sidebar preview controls, unused icon paths, duplicated API forwarding, and decorative CSS. Existing generated guide PDFs and working files were retained.

Removed six distinct direct dependencies: `@nestjs/mau`, `source-map-support`, `ts-loader`, `tsconfig-paths`, `eslint-plugin-only-warn`, and `@babel/preset-typescript`. Framework-owned transitive dependencies remain where required. Removed the unused Nest cloud-deploy shortcut and the unrelated postinstall skill-sync hook.

Split primitives, dialogs, modal behavior, and budget editing into focused files. The profile editor and dashboard dialogs load on demand. Currency formatters are cached, and budget/spending derivations are memoized so unrelated search changes do not repeat transaction scans. The OAuth avatar has explicit dimensions and lazy loading through Next Image. No new dependency was added.

## Phase 3 - bugs and edge cases

Paths beginning with `dashboard/` are under `apps/web/app/(module-one)/dashboard/`; `onboarding/` is the adjacent route directory.

| File(s)                                                                                         | Cause                                                                                                                                             | Fix                                                                                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard/dashboard.tsx`, `dashboard/budget-editor.tsx`                                        | Manage budgets changed only React state; refresh lost edits.                                                                                      | Persist the agreed percentage model through the profile API and update dashboard state from the saved response.                        |
| `apps/backend/src/profile/profile.validation.ts`, `onboarding/financial-profile-form.tsx`       | The category split and manually edited expense totals could describe different plans.                                                             | Derive fixed/variable expenses and the savings target from the allocation on both client and server; recalculate when income changes.  |
| `apps/web/lib/onboarding.ts`                                                                    | Remainder allocation assigned phantom paise when the split did not total 100%.                                                                    | Distribute rounding remainders only for complete allocations; test zero allocation and exact totals.                                   |
| `apps/web/lib/profile.ts`                                                                       | Legacy nullable payday/split fields were sent to validation as explicit null values.                                                              | Omit absent optional onboarding fields from update requests.                                                                           |
| `dashboard/data.ts`, `apps/backend/src/activity/activity.validation.ts`                         | Several saved budget categories were unavailable for transaction entry.                                                                           | Accept groceries, health, travel, education, and investments, retaining legacy category aliases.                                       |
| `dashboard/balance-breakdown-card.tsx`, `dashboard/spending-data.ts`                            | The balance card always claimed there was no history, even with saved transactions; month arrows wrapped without changing year.                   | Calculate recorded monthly cash flow from transactions and navigate year/month together. Keep current-plan amounts separately labeled. |
| `dashboard/planning-cards.tsx`                                                                  | Loading or failed transaction requests looked like zero spending and healthy budgets. Exactly 100% was called over budget.                        | Show loading/retry states and label exact exhaustion as fully used.                                                                    |
| `dashboard/use-activity.ts`                                                                     | Malformed JSON/null error responses exposed parsing failures; reads continued after unmount; repeated deletion depended on matching message text. | Friendly typed API errors, abortable reads, array validation, and status-based 404 handling.                                           |
| `dashboard/modal.tsx`, `dashboard/dashboard.tsx`                                                | Profile dialogs could close during a pending save; a hard-coded title ID could collide.                                                           | Block dismissal while saving and generate unique accessible title IDs. Preserve native focus trapping and restoration.                 |
| `dashboard/navigation.tsx`                                                                      | Profile popup did not dismiss with Escape, outside clicks, or focus departure; errors were not announced.                                         | Add dismissal and focus handling plus an alert role. Remove the false unread-notification indicator.                                   |
| `apps/web/auth/profile-error.tsx`                                                               | Retrying only reset the error boundary and could reuse failed server data.                                                                        | Use this installed Next.js version's `retry` callback to refetch the segment.                                                          |
| `dashboard/recent-transactions.tsx`, `dashboard/upcoming-bills.tsx`, `apps/web/app/globals.css` | Fixed card heights and very small text were fragile with long content and zoom.                                                                   | Use minimum heights, shared text sizes, wrapping, scrollable tables/dialogs, and visible focus indicators.                             |
| `apps/backend/src/main.ts`, `apps/backend/src/config/environment.ts`                            | Startup promise rejection was unhandled; port/CORS were hard-coded; failed listening could leave resources open.                                  | Handle startup failures, close the app after listen failure, validate configuration, and enable shutdown hooks.                        |
| `apps/web/auth/server.ts`, `apps/web/auth/auth-form.tsx`                                        | Production could use a known fallback secret with no provider configured; the public enable flag could disagree with server credentials.          | Require a production secret and derive provider availability server-side.                                                              |
| `apps/web/lib/api-server.ts`, `apps/web/lib/request-body.ts`                                    | Duplicate proxies differed in error handling and read arbitrarily large bodies.                                                                   | Shared forwarding with origin/content-type checks, bounded bodies, abort/timeout handling, and sanitized upstream errors.              |
| `packages/eslint-config/base.js`, test scripts, starter tests                                   | ESLint omitted TS/TSX; tests referenced a nonexistent local Jest path and removed Hello World API.                                                | Include typed source, use the hoisted Jest executable, repair tests, and fail lint on warnings.                                        |
| `turbo.json`                                                                                    | Backend build output was not cached and environment inputs were undeclared.                                                                       | Declare `dist/**` and relevant environment inputs.                                                                                     |

## Phase 4 - restrained UI refinement

One coral accent, navy surfaces, semantic warning/error colors, and shared color, blur, radius, spacing, typography, and motion tokens. Removed gradient backdrops, glows, texture overlays, and tilted preview effects. Glass is limited to cards, navigation, and dialogs. Opaque defaults work without backdrop-filter. Reduced-motion preferences disable transitions and animation.

Calculated contrast for normal text, muted text, and accent text exceeds 4.5:1 against the intended surfaces, including the lightest tested glass composite (minimum 5.41:1). Interactive border contrast was raised separately. This is a palette check, not a claim of a completed browser accessibility audit.

## Phase 5 - landing page

Replaced vague promises with copy for people managing monthly budgets in INR. The page follows hero, problem, how it works, features, product credibility, and CTA. Repeated primary CTAs use the same destination and label. Sample budget numbers are explicitly illustrative and add up. The page distinguishes manual records, reminders, estimates, and untracked goal contributions; no invented users or testimonials. Added meaningful metadata and canonical/social tags.

## Phase 6 - operational polish

Added environment examples and production checks, branded SVG/ICO icons, consistent 404/root/global error screens, robots and private-route noindex metadata, a reproducible bundle report, formatting configuration, warning-free lint gates, backend type checking, and a CI workflow. The README documents setup, architecture, migration commands, release checks, and current limitations. No live environment files were changed.

## Verification

- Build and lint were run at each phase boundary. The initial backend lint failure was repaired during cleanup. Final lint has zero errors and warnings.
- Final `npm run build`, `npm run check-types`, and `npm run format:check` passed.
- `npm test`: 102 backend tests, 2 HTTP smoke tests, and 14 frontend regressions passed (118 total). Persistence is mocked in the ordinary backend tests.
- Live local HTTP checks passed for landing, login, custom 404, robots, and SVG icon. The unauthenticated dashboard emitted Next.js's supported streaming redirect to login, without private dashboard content.
- Existing database integration tooling was preserved but not run. No live database migration, Google sign-in, account mutation, deployment, commit, or push was performed.
- Visual browser QA could not be completed: the browser access host was unavailable, and native Brave inspection failed twice because its window was minimized. No screenshot-based or mobile-browser acceptance is claimed.
- CI was added locally; it has not run on GitHub.

## Release work still required

Perform a real Google sign-in and two-account database smoke test in a disposable staging environment, including onboarding, budget saves, profile income changes, transactions, bills, reload persistence, and isolation. Check desktop/mobile layouts, keyboard focus, zoom, and reduced motion in a working browser. Configure monitoring, database backup/restore testing, ingress throttling, and privacy/account-deletion procedures before public launch.

Activity lists currently fetch all records; pagination should precede large account histories. Profile edits use last-write-wins semantics; optimistic concurrency is recommended before collaborative or frequent multi-tab editing. The health route is liveness-only; add deployment-specific database readiness probes. Deferred work requires product/deployment decisions and was not silently implemented.

## Follow-up: session pool timeout and glass visibility

Both apps use the same pooled Neon database. A read-only probe connected successfully. The reported automatic Prisma pool limit was 17 per client; the runtime configuration now defaults to 5 connections per process, a 15-second pool wait, and a 20-second connection timeout, preserving explicit URL settings. Web Prisma reuse now applies in production as well as development, and repeated session reads within one React server render are deduplicated. Session verification still checks the database; cookie-cache bypass remains enabled.

Thirty concurrent read-only `session.findFirst()` lookups completed successfully against the configured database in approximately 5.1 seconds. This confirms the configured connection works under that test load; it does not prove the earlier pool exhaustion's exact cause or rule out future provider/network outages. Restart both development servers to replace the previously initialized clients and pools. Pool behavior follows [Prisma 6 connection guidance](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool).

Glass panels previously used roughly 91% opacity against a uniform backdrop. Cards now use a more transparent tinted surface, a static directional background wash, reflective edge highlights, inset shading, and increased blur/saturation. Navigation and dialogs share these tokens; opaque browser fallbacks remain. The browser access host remains unavailable, so visual browser acceptance is still pending.

Follow-up checks: production build, lint, formatting, 104 backend tests, 2 HTTP smoke tests, and 16 frontend regressions passed (122 total). No database records or live environment files were changed.
