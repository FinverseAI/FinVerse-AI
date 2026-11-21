# FinVerse — Sample UI (Vivek_frontend)

A complete, static sample UI for **FinVerse AI** — the unified financial
intelligence platform (B.Tech major project, Team CSE27-079, Graphic Era
Hill University). It shows what the **complete** project's UI could look
like, covering the full synopsis: Module 1 (personal finance), Module 2
(stock & investment intelligence), and the AI reasoning layer.

This is a **static demo**: plain HTML/CSS/JS, no build step, no backend,
no real authentication. All data is realistic Indian demo data (₹, NSE).
"Log in" and "Start your plan" open the dashboard demo.

## Design

Styled from the "Your money. Made clear." mockup: warm cream ground,
deep forest green, gold accent, Fraunces serif display type with Inter
for UI text. Charts use Chart.js in the same green palette.

## Concept preview badge

Pages marked **Concept preview** show the planned vision from the
synopsis — features not built yet in the real app (Phase 4). Unmarked
pages show features that already exist in the app:

| | Pages |
|---|---|
| Built (no badge) | Dashboard, Transactions, Budget, Bills, Goals, Market, Stock detail, Portfolio, Watchlist, Smart Screener, Optimizer, Ask FinVerse AI, News & Sentiment, Profile & Risk, Settings |
| Concept preview | Reports, Why Did My Stock Move?, Market Regime, What-If Simulator, Investment Readiness |

## Pages

| Page | File | What it shows |
|---|---|---|
| Landing | `index.html` | Hero, dashboard preview, How it works, Features, About, CTA |
| Dashboard | `app/dashboard.html` | November overview, month switcher, donut + bar charts |
| Transactions | `app/transactions.html` | Search/filter, add modal, plain-words entry, CSV export |
| Budget | `app/budget.html` | Category budgets, progress bars, edit modal |
| Bills | `app/bills.html` | Upcoming/paid bills, mark-paid toggle, add modal |
| Goals | `app/goals.html` | Progress bars, contributions, new-goal modal |
| Reports | `app/reports.html` | Monthly report per month, summary download *(concept)* |
| Market | `app/market.html` | Indices, gainers/losers, sortable 15-stock table |
| Stock detail | `app/stock.html` | Price chart, indicators, AI explanation panel |
| Portfolio | `app/portfolio.html` | Holdings, XIRR/CAGR, allocation donut |
| Watchlist | `app/watchlist.html` | Watched stocks, notes, price alerts |
| Smart Screener | `app/screener.html` | Deterministic filters + plain-words filter box |
| Optimizer | `app/optimizer.html` | Markowitz efficient frontier, Sharpe comparison |
| Ask FinVerse AI | `app/ai-chat.html` | Rule-based chat with citations + guardrail note |
| News & Sentiment | `app/news.html` | Sentiment filters, scored news cards |
| Why Did My Stock Move? | `app/why-moved.html` | Visible chain-of-thought attribution *(concept)* |
| Market Regime | `app/regime.html` | Regime signals + history *(concept)* |
| What-If Simulator | `app/simulator.html` | SIP projections, Bull/Base/Bear scenarios *(concept)* |
| Investment Readiness | `app/readiness.html` | Score, factors, improvement checklist *(concept)* |
| Profile & Risk | `app/onboarding.html` | Profile form + risk-profile quiz |
| Settings | `app/settings.html` | Preferences, notifications, AI info, data export |

## Preview locally

```bash
cd Vivek_frontend
python3 -m http.server 8000
# open http://localhost:8000
```

It also works opened directly from disk (`file://`), except the
Google Fonts / Chart.js CDNs need internet.

## Structure

```
Vivek_frontend/
├── index.html            Landing page
├── app/                  In-app pages (20)
├── assets/
│   ├── css/main.css      Design system (tokens, shell, components)
│   └── js/
│       ├── data.js       Shared demo data (₹, NSE)
│       ├── common.js     Sidebar/topbar injection, nav, helpers
│       └── <page>.js     One script per page
└── README.md
```

## Deployment

`.github/workflows/pages-vivek-frontend.yml` deploys this folder to
GitHub Pages on every push to `main` that touches it (or manually via
**Run workflow**). Live URL once enabled:

**https://finverseai.github.io/FinVerse-AI/**

Note: GitHub Pages must be enabled once in the repo settings
(Settings → Pages → Source: **GitHub Actions**). The existing CI
(`Quality checks`) is unaffected — its lint/format/test/build globs
only cover `apps/**`, `packages/**`, `scripts/*.mjs` and a few named
files, so this folder is never scanned.
