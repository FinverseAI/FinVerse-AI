# Personal Finance UI

Dashboard and landing page use the supplied screenshot's dark blue-black surfaces, mint accents, purple savings, cyan utilities, and amber budget warnings. React functional components, hooks, TypeScript, and Tailwind CSS 4 run inside the existing Next.js app. No new libraries, routes, authentication, or backend were added. Nothing was committed, pushed, or published.

## Run

From the repository root with Node.js 24+ and npm:

~~~powershell
npm install # Only if dependencies are missing
npm run dev --workspace web
~~~

Landing page: http://localhost:3000/
Authentication page: http://localhost:3000/auth
Dashboard: http://localhost:3000/dashboard
Reuse the existing local server if port 3000 is already in use.

~~~powershell
npm run check-types --workspace web
npm run build --workspace web
~~~

## Folder structure

~~~text
apps/web/
  app/
    globals.css                  # One shared theme
    layout.tsx                   # Existing local Geist fonts
    fonts/
    (module-one)/
      landing-page.tsx
      dashboard/
        balance-breakdown-card.tsx
        data.ts
        expense-breakdown-card.tsx
        dashboard.tsx
        navigation.tsx
        page.tsx
        planning-cards.tsx
        summary-cards.tsx
        ui.tsx
  postcss.config.mjs
  package.json
  next.config.js
  tsconfig.json
packages/typescript-config/
  base.json
  nextjs.json
~~~

The dashboard remains 9 files. Authentication adds auth-page.tsx plus a minimal auth/page.tsx route:

- page.tsx: existing page entry and metadata.
- dashboard.tsx: dashboard layout and temporary React state.
- data.ts: mock data, landing preview data, types, and shared INR formatter.
- navigation.tsx: header and sidebar.
- summary-cards.tsx: available balance and summary cards.
- balance-breakdown-card.tsx: chart panel, legend, and SVG chart.
- expense-breakdown-card.tsx: spending categories.
- planning-cards.tsx: budgets and savings goals.
- ui.tsx: icons, shared stat/progress helpers, dialogs, and transaction list.
- auth-page.tsx: Google sign-up/login interface, ready to connect to Better Auth.
- auth/page.tsx: minimal /auth route entry.

## Shared palette

All colours for both pages are defined in the --color-dash-* variables in apps/web/app/globals.css. There is no separate landing-page palette.

| Role | Hex |
| --- | --- |
| Background | #080D13 |
| Sidebar | #060B11 |
| Card surface | #0E141C |
| Raised surface | #151B24 |
| Progress track | #171F29 |
| Border | #242D38 |
| Text | #E2E8F0 |
| Muted text / expense chart | #84909E |
| Mint accent | #3DDDB1 |
| Savings / entertainment purple | #A78BFA |
| Utilities cyan | #42B9DF |
| Budget warning amber | #F4C44F |
| Over-budget red | #F87171 |
| Mint glow with alpha | #3DDDB10D |

## Currency and behaviour

- All amounts use Indian rupees and Intl.NumberFormat with en-IN / INR, including chart tooltips, summaries, budgets, goals, reports, transactions, and the landing preview.
- The formatter supports Indian lakh/crore grouping. For example, 123456.78 displays as ₹1,23,456.78.
- Existing numeric amounts are treated as illustrative INR mock values; no foreign-exchange conversion is applied.
- Forms label amounts in rupees. Data remains replaceable in data.ts.
- Header/chart month controls select a point in the 2024 chart. Summary cards retain the February snapshot. Legend controls toggle chart series.
- Search filters the mock transaction list. Added transactions update the available balance and matching budgets. Other historical summary figures remain illustrative snapshots.
- Budget limits and savings goals can be edited through in-page dialogs. Reports and notifications also use dialogs.
- Local edits reset on refresh. There is no persistence or backend.
- The layout remains responsive; the landing layout is retained with the shared screenshot theme.

## Verification

- TypeScript: passed.
- Production build and static rendering: passed.
- Landing and dashboard HTTP checks: 200, rupee values present, no dollar amounts.
- Indian lakh grouping and negative currency formatting: passed.
- Visual browser QA remains unverified because browser access was unavailable in this session.

## Full source

Complete source follows. Existing binary fonts remain in apps/web/app/fonts/.

### apps/web/app/(module-one)/dashboard/balance-breakdown-card.tsx

~~~tsx
import { useState } from "react";

import { chartStats, money, months, monthlyTrends } from "./data";

import { Icon, MiniStat, PanelHeading } from "./ui";

export default function BalanceBreakdownCard({
  month,
  onMonth,
}: {
  month: number;
  onMonth: (month: number) => void;
}) {
  const [visible, setVisible] = useState({
    income: true,
    savings: true,
    expenses: true,
  });
  return (
    <article id="balance" className="dash-panel flex min-w-0 flex-col p-4">
      <PanelHeading icon="pie" title="Balance Breakdown">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-3 font-mono text-[8px] tracking-[0.1em] text-dash-muted uppercase">
            {(["income", "savings", "expenses"] as const).map((key) => (
              <button
                key={key}
                aria-pressed={visible[key]}
                onClick={() =>
                  setVisible((current) => ({
                    ...current,
                    [key]: !current[key],
                  }))
                }
                className={`flex items-center gap-1.5 uppercase ${visible[key] ? "" : "opacity-40"}`}
              >
                <span
                  className={`h-0.5 w-4 ${key === "income" ? "bg-dash-accent" : key === "savings" ? "bg-dash-purple" : "bg-dash-muted"}`}
                />
                {key}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="dash-icon-button size-7"
              aria-label="Previous chart month"
              onClick={() => onMonth((month + 11) % 12)}
            >
              <Icon name="left" className="size-3" />
            </button>
            <span className="w-[102px] text-center font-mono text-[10px]">
              {months[month]} 2024
            </span>
            <button
              className="dash-icon-button size-7"
              aria-label="Next chart month"
              onClick={() => onMonth((month + 1) % 12)}
            >
              <Icon name="right" className="size-3" />
            </button>
            <span className="dash-badge text-dash-accent">+8.2%</span>
          </div>
        </div>
      </PanelHeading>
      <Chart month={month} onMonth={onMonth} visible={visible} />
      <div className="mt-auto grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
        {chartStats.map((stat) => (
          <MiniStat key={stat.label} {...stat} />
        ))}
      </div>
    </article>
  );
}

type Series = "income" | "savings" | "expenses";
const series: Series[] = ["income", "savings", "expenses"];
const colors = {
  income: "var(--color-dash-accent)",
  savings: "var(--color-dash-purple)",
  expenses: "var(--color-dash-muted)",
};
const x = (index: number) => 12 + index * (1076 / 11);
const y = (value: number) => 194 - value / 40;

function Chart({
  month,
  onMonth,
  visible,
}: {
  month: number;
  onMonth: (month: number) => void;
  visible: Record<Series, boolean>;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const selected = hover ?? month;
  const point = monthlyTrends[selected]!;
  const path = (key: Series) =>
    monthlyTrends
      .map((item, index) => `${index ? "L" : "M"}${x(index)} ${y(item[key])}`)
      .join(" ");

  return (
    <div className="relative mt-5 min-w-0" onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-dash-border bg-dash-raised px-3 py-2 font-mono text-[10px] shadow-lg"
          style={{
            left: `${Math.min(72, Math.max(0, (selected / 11) * 100 - 8))}%`,
          }}
        >
          <p className="mb-1 font-semibold">{months[selected]} 2024</p>
          {series
            .filter((key) => visible[key])
            .map((key) => (
              <p
                key={key}
                style={{ color: colors[key] }}
                className="capitalize"
              >
                {key}: {money(point[key])}
              </p>
            ))}
        </div>
      )}
      <svg
        viewBox="0 0 1100 205"
        preserveAspectRatio="none"
        className="h-[190px] w-full sm:h-[202px]"
        role="img"
        aria-label="2024 monthly income, savings, and expenses. Use the month buttons below to inspect values."
      >
        <defs>
          <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--color-dash-accent)" stopOpacity=".2" />
            <stop
              offset="1"
              stopColor="var(--color-dash-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[46, 94, 142].map((position) => (
          <line
            key={position}
            x1="12"
            x2="1088"
            y1={position}
            y2={position}
            stroke="var(--color-dash-border)"
            strokeDasharray="5 9"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {visible.income && (
          <path
            d={`${path("income")} L1088 200 L12 200 Z`}
            fill="url(#income-fill)"
          />
        )}
        {series
          .filter((key) => visible[key])
          .map((key) => (
            <path
              key={key}
              d={path(key)}
              fill="none"
              stroke={colors[key]}
              strokeWidth={key === "income" ? 2 : 1.5}
              strokeDasharray={key === "expenses" ? "9 7" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {series
          .filter(
            (key) => visible[key] && (key !== "savings" || hover !== null),
          )
          .map((key) => (
            <ellipse
              key={key}
              cx={x(selected)}
              cy={y(point[key])}
              rx="5"
              ry="3"
              fill={colors[key]}
              stroke="var(--color-dash-surface)"
              strokeWidth="2"
            />
          ))}
        {monthlyTrends.map((item, index) => (
          <rect
            key={index}
            x={x(index) - 49}
            y="0"
            width="98"
            height="205"
            fill="transparent"
            onMouseEnter={() => setHover(index)}
            onClick={() => onMonth(index)}
          >
            <title>
              {months[index]}: income {money(item.income)}, savings{" "}
              {money(item.savings)}, expenses {money(item.expenses)}
            </title>
          </rect>
        ))}
      </svg>
      <div className="flex justify-between gap-0.5 font-mono text-[8px] text-dash-muted">
        {months.map((name, index) => (
          <button
            key={name}
            onClick={() => onMonth(index)}
            onFocus={() => setHover(index)}
            onBlur={() => setHover(null)}
            aria-label={`${name}: income ${money(monthlyTrends[index]!.income)}, savings ${money(monthlyTrends[index]!.savings)}, expenses ${money(monthlyTrends[index]!.expenses)}`}
            aria-pressed={month === index}
            className={`rounded py-2 hover:text-dash-text ${month === index ? "text-dash-accent" : ""}`}
          >
            {name.slice(0, 3)}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {months[month]}: income {money(monthlyTrends[month]!.income)}, savings{" "}
        {money(monthlyTrends[month]!.savings)}, expenses{" "}
        {money(monthlyTrends[month]!.expenses)}.
      </p>
    </div>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/dashboard.tsx

~~~tsx
"use client";

import { useState } from "react";
import {
  initialBudgets,
  initialGoals,
  initialTransactions,
  type Transaction,
} from "./data";
import { Header, Sidebar } from "./navigation";
import SummaryCards from "./summary-cards";
import BalanceBreakdownCard from "./balance-breakdown-card";
import ExpenseBreakdownCard from "./expense-breakdown-card";
import PlanningCards from "./planning-cards";
import { DashboardDialog, type DialogKind } from "./ui";

export default function Dashboard() {
  const [month, setMonth] = useState(0);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [goals, setGoals] = useState(initialGoals);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [adjustment, setAdjustment] = useState(0);

  function addTransaction(transaction: Transaction) {
    setTransactions((current) => [transaction, ...current]);
    setAdjustment((current) => current + transaction.amount);
    if (transaction.amount < 0)
      setBudgets((current) =>
        current.map((budget) =>
          budget.name === transaction.category
            ? { ...budget, spent: budget.spent - transaction.amount }
            : budget,
        ),
      );
  }
  return (
    <div
      id="overview"
      className="dashboard min-h-screen bg-dash-bg font-sans text-dash-text"
    >
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-20 focus:z-50 focus:rounded-lg focus:bg-dash-accent focus:p-3 focus:text-dash-bg"
      >
        Skip to dashboard
      </a>
      <Sidebar
        onTransactions={() => setDialog("transactions")}
        onReport={() => setDialog("report")}
      />
      <div className="sm:pl-[60px]">
        <Header
          month={month}
          onMonth={setMonth}
          query={query}
          onQuery={setQuery}
          onSearch={() => setDialog("transactions")}
          onTransactions={() => setDialog("transactions")}
          onAdd={() => setDialog("transaction")}
          onNotifications={() => setDialog("notifications")}
          onReport={() => setDialog("report")}
        />
        <main id="dashboard-content" className="space-y-4 p-4 sm:p-5">
          <SummaryCards
            onReport={() => setDialog("report")}
            adjustment={adjustment}
          />
          <section
            aria-label="Financial breakdown"
            className="grid gap-4 xl:grid-cols-[minmax(0,2.03fr)_minmax(0,1fr)]"
          >
            <BalanceBreakdownCard month={month} onMonth={setMonth} />
            <ExpenseBreakdownCard />
          </section>
          <PlanningCards
            budgets={budgets}
            goals={goals}
            onManage={() => setDialog("budgets")}
            onAdd={() => setDialog("goal")}
          />
        </main>
      </div>
      {dialog && (
        <DashboardDialog
          kind={dialog}
          onClose={() => setDialog(null)}
          budgets={budgets}
          transactions={transactions}
          query={query}
          onQuery={setQuery}
          adjustment={adjustment}
          onTransaction={addTransaction}
          onBudgets={setBudgets}
          onGoal={(goal) => setGoals((current) => [...current, goal])}
        />
      )}
    </div>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/data.ts

~~~ts
export type Tone = "accent" | "blue" | "purple" | "warning" | "red" | "muted";
export type Budget = { name: string; spent: number; limit: number };
export type Goal = {
  name: string;
  saved: number;
  target: number;
  deadline: string;
};
export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
};

export const money = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export const account = { balance: 15930.2, change: 12.4, lastDigits: "4821" };
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const balanceTrend = [22, 31, 19, 37, 28, 43, 34, 49, 40, 55, 46, 64];
export const monthlyTrends = [
  { income: 3600, savings: 620, expenses: 2400 },
  { income: 4450, savings: 1160, expenses: 2670 },
  { income: 4100, savings: 940, expenses: 2540 },
  { income: 5050, savings: 1380, expenses: 3020 },
  { income: 4830, savings: 1400, expenses: 2780 },
  { income: 5400, savings: 1500, expenses: 3280 },
  { income: 5180, savings: 1830, expenses: 2680 },
  { income: 5770, savings: 1620, expenses: 3490 },
  { income: 4950, savings: 1400, expenses: 2910 },
  { income: 5290, savings: 1510, expenses: 3150 },
  { income: 4700, savings: 1070, expenses: 3010 },
  { income: 6430, savings: 2070, expenses: 3670 },
];
export const summaryCards = [
  {
    label: "Monthly income",
    value: 5738.28,
    change: "+12.2%",
    tone: "accent" as Tone,
    percent: 76.4,
    details: [
      { label: "Salary", value: 4200 },
      { label: "Freelance", value: 1538 },
    ],
  },
  {
    label: "Savings",
    value: 4228.4,
    change: "-1.4%",
    tone: "purple" as Tone,
    percent: 47.2,
    details: [
      { label: "Saved", value: 1240 },
      { label: "Target", value: 2400 },
    ],
  },
  {
    label: "Cash flow",
    value: 13958,
    change: "+12.2%",
    tone: "accent" as Tone,
    percent: 58.7,
    details: [
      { label: "Inflow", value: 8438 },
      { label: "Outflow", value: 4480 },
    ],
  },
];
export const chartStats = [
  { label: "Avg income", value: money(4421) },
  { label: "Avg expense", value: money(2439) },
  { label: "Total saved", value: money(7443.74, 2) },
  { label: "Net change", value: "+" + money(2453) },
];
export const expenses = [
  { name: "Housing", amount: 1850, percent: 38, tone: "accent" as Tone },
  { name: "Food & Dining", amount: 1240, percent: 26, tone: "accent" as Tone },
  { name: "Shopping", amount: 820, percent: 17, tone: "accent" as Tone },
  { name: "Utilities", amount: 540, percent: 11, tone: "blue" as Tone },
  { name: "Entertainment", amount: 390, percent: 8, tone: "purple" as Tone },
  { name: "Other", amount: 98, percent: 2, tone: "muted" as Tone },
];
export const expenseStats = [
  { label: "Last month spending", value: money(5421) },
  { label: "Current week", value: money(1482) },
  { label: "Remaining budget", value: money(2450) },
];
export const initialBudgets: Budget[] = [
  { name: "Food & Dining", spent: 492, limit: 600 },
  { name: "Transportation", spent: 246, limit: 380 },
  { name: "Shopping", spent: 552, limit: 600 },
];
export const initialGoals: Goal[] = [
  { name: "Emergency Fund", saved: 7800, target: 10000, deadline: "2024-06" },
  { name: "Super Vacation", saved: 2700, target: 5000, deadline: "2024-07" },
  { name: "Retirement Fund", saved: 13600, target: 20000, deadline: "2024-12" },
];
export const initialTransactions: Transaction[] = [
  {
    id: "1",
    name: "Monthly salary",
    category: "Income",
    amount: 4200,
    date: "2024-02-01",
  },
  {
    id: "2",
    name: "Apartment rent",
    category: "Housing",
    amount: -1850,
    date: "2024-02-02",
  },
  {
    id: "3",
    name: "Weekly groceries",
    category: "Food & Dining",
    amount: -92,
    date: "2024-02-04",
  },
  {
    id: "4",
    name: "Design project",
    category: "Income",
    amount: 1538,
    date: "2024-02-06",
  },
];
export const notifications = [
  "Shopping has reached 92% of its budget.",
  "Your emergency fund is 78% of the way there.",
];

export const landingPreview = {
  income: 68400,
  expenses: 31260,
  savings: 18900,
  budgets: [
    { name: "Food", spent: 5200, limit: 8000, color: "bg-dash-accent" },
    { name: "Transport", spent: 2100, limit: 4000, color: "bg-dash-accent" },
    { name: "Shopping", spent: 4600, limit: 6000, color: "bg-dash-warning" },
  ],
};
~~~

### apps/web/app/(module-one)/dashboard/expense-breakdown-card.tsx

~~~tsx
import { expenses, expenseStats, money } from "./data";

import { MiniStat, PanelHeading, ProgressBar } from "./ui";

export default function ExpenseBreakdownCard() {
  return (
    <article id="expenses" className="dash-panel flex flex-col p-4">
      <PanelHeading icon="filter" title="Expense Breakdown">
        <p className="font-mono text-[10px] text-dash-muted">
          Feb, 2024 ·{" "}
          <span className="text-dash-text">
            {money(expenses.reduce((total, item) => total + item.amount, 0))}
          </span>
        </p>
      </PanelHeading>
      <div className="mt-3 space-y-3">
        {expenses.map((category) => (
          <div key={category.name}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
              <span>{category.name}</span>
              <span className="font-mono text-[10px] text-dash-muted">
                {money(category.amount)} · {category.percent}%
              </span>
            </div>
            <ProgressBar
              label={`${category.name}: ${category.percent}% of expenses`}
              value={(category.percent / 42) * 100}
              tone={category.tone}
            />
          </div>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-7">
        {expenseStats.map((stat) => (
          <MiniStat key={stat.label} {...stat} />
        ))}
      </div>
    </article>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/navigation.tsx

~~~tsx
import { Icon, type IconName } from "./ui";

import { months } from "./data";

type HeaderProps = {
  month: number;
  onMonth: (month: number) => void;
  query: string;
  onQuery: (query: string) => void;
  onSearch: () => void;
  onAdd: () => void;
  onNotifications: () => void;
  onReport: () => void;
  onTransactions: () => void;
};
export function Header({
  month,
  onMonth,
  query,
  onQuery,
  onSearch,
  onAdd,
  onNotifications,
  onReport,
  onTransactions,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[54px] flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-dash-border bg-dash-bg/95 px-5 py-2 backdrop-blur-xl max-sm:px-4">
      <div className="flex items-center gap-6">
        <h1 className="whitespace-nowrap text-[13px] font-semibold">
          Personal Finance
        </h1>
        <nav
          aria-label="Dashboard navigation"
          className="hidden items-center gap-1 text-[11px] text-dash-muted min-[1200px]:flex"
        >
          <a
            href="#overview"
            aria-current="page"
            className="rounded-lg bg-dash-accent/15 px-3 py-2 text-dash-accent"
          >
            Dashboard
          </a>
          <button className="dash-nav" onClick={onTransactions}>
            Transactions
          </button>
          <a className="dash-nav" href="#balance">
            Analytics
          </a>
          <a className="dash-nav" href="#expenses">
            Insights
          </a>
          <button className="dash-nav" onClick={onReport}>
            Reports
          </button>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
        <label className="relative">
          <span className="sr-only">Chart month</span>
          <select
            value={month}
            onChange={(event) => onMonth(Number(event.target.value))}
            className="dash-input h-8 appearance-none py-0 pr-7 font-mono text-[10px] text-dash-muted"
          >
            {months.map((name, index) => (
              <option key={name} value={index}>
                {name.slice(0, 3)} 2024
              </option>
            ))}
          </select>
          <Icon
            name="down"
            className="pointer-events-none absolute right-2 top-2.5 size-3 text-dash-muted"
          />
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
          className="hidden h-8 w-48 items-center gap-2 rounded-lg border border-dash-border bg-dash-surface px-2.5 md:flex"
        >
          <Icon name="search" className="size-4 shrink-0 text-dash-muted" />
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className="min-w-0 w-full bg-transparent text-[11px] outline-none placeholder:text-dash-muted"
          />
        </form>
        <button
          className="dash-icon-button md:hidden"
          aria-label="Search transactions"
          onClick={onTransactions}
        >
          <Icon name="search" />
        </button>
        <button
          className="dash-icon-button relative"
          aria-label="Notifications"
          onClick={onNotifications}
        >
          <Icon name="bell" />
          <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-dash-accent" />
        </button>
        <button
          className="dash-primary h-8 gap-1.5 px-3 max-sm:ml-auto"
          onClick={onAdd}
        >
          <Icon name="plus" className="size-3.5" />
          Add Transaction
        </button>
      </div>
    </header>
  );
}

const items: { label: string; icon: IconName; target?: string }[] = [
  { label: "Dashboard", icon: "grid", target: "overview" },
  { label: "Transactions", icon: "card" },
  { label: "Analytics", icon: "chart", target: "balance" },
  { label: "Insights", icon: "bulb", target: "expenses" },
  { label: "Planning", icon: "wallet", target: "planning" },
  { label: "Reports", icon: "file" },
];
export function Sidebar({
  onTransactions,
  onReport,
}: {
  onTransactions: () => void;
  onReport: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col items-center border-r border-dash-border bg-dash-sidebar py-3 sm:flex">
      <a
        href="#overview"
        aria-label="Personal Finance dashboard"
        className="grid size-9 place-items-center rounded-[11px] border border-dash-accent/40 bg-dash-accent/10 font-mono text-sm font-semibold text-dash-accent"
      >
        PF
      </a>
      <nav aria-label="Sidebar" className="mt-6 flex flex-col gap-1">
        {items.map((item, index) => {
          const className = `grid size-9 place-items-center rounded-[10px] transition-colors ${index === 0 ? "bg-dash-accent/15 text-dash-accent" : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"}`;
          return item.target ? (
            <a
              key={item.label}
              href={`#${item.target}`}
              title={item.label}
              aria-label={item.label}
              className={className}
            >
              <Icon name={item.icon} />
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              title={item.label}
              aria-label={item.label}
              className={className}
              onClick={
                item.label === "Transactions" ? onTransactions : onReport
              }
            >
              <Icon name={item.icon} />
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-5 text-dash-muted">
        <span title="Settings — dashboard preview" aria-label="Settings">
          <Icon name="settings" />
        </span>
        <span
          title="Personal account"
          className="grid size-9 place-items-center rounded-full border border-dash-border"
        >
          <Icon name="user" className="size-8" />
        </span>
      </div>
    </aside>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/page.tsx

~~~tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Main from "../main";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  description: "Your balance, spending, budgets, and savings at a glance.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const googleAuthConfigured =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET);

  if (googleAuthConfigured) {
    const { auth } = await import("../../../lib/auth");
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) redirect("/auth");
  }

  return <Main screen="dashboard" />;
}
~~~

### apps/web/app/(module-one)/dashboard/planning-cards.tsx

~~~tsx
import { money, type Budget, type Goal } from "./data";

import { PanelHeading, ProgressBar } from "./ui";

export default function PlanningCards({
  budgets,
  goals,
  onManage,
  onAdd,
}: {
  budgets: Budget[];
  goals: Goal[];
  onManage: () => void;
  onAdd: () => void;
}) {
  return (
    <section
      id="planning"
      aria-label="Budgets and savings"
      className="grid gap-4 lg:grid-cols-2"
    >
      <BudgetCard budgets={budgets} onManage={onManage} />
      <SavingsCard goals={goals} onAdd={onAdd} />
    </section>
  );
}

function BudgetCard({
  budgets,
  onManage,
}: {
  budgets: Budget[];
  onManage: () => void;
}) {
  return (
    <article className="dash-panel p-5">
      <PanelHeading icon="target" title="Budget Status">
        <button className="dash-small-button" onClick={onManage}>
          Manage budgets
        </button>
      </PanelHeading>
      <div className="mt-3 space-y-5">
        {budgets.map((budget) => {
          const percent = (budget.spent / budget.limit) * 100;
          const tone =
            percent >= 100 ? "red" : percent >= 90 ? "warning" : "accent";
          return (
            <div key={budget.name}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span>{budget.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-dash-muted">
                    {money(budget.spent)} / {money(budget.limit)}
                  </span>
                  <span data-tone={tone} className="dash-badge">
                    {percent >= 100
                      ? "Over budget"
                      : percent >= 90
                        ? "Watch"
                        : "On track"}
                  </span>
                </div>
              </div>
              <ProgressBar
                value={percent}
                label={`${budget.name} budget used`}
                tone={tone}
              />
              <p className="mt-1.5 font-mono text-[9px] text-dash-muted">
                {money(Math.abs(budget.limit - budget.spent))}{" "}
                {percent > 100 ? "over budget" : "left to spend"}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SavingsCard({ goals, onAdd }: { goals: Goal[]; onAdd: () => void }) {
  return (
    <article className="dash-panel p-5">
      <PanelHeading icon="pig" title="Savings Progress">
        <button
          className="dash-small-button border-dash-accent/40 bg-dash-accent/10 text-dash-accent"
          onClick={onAdd}
        >
          + Add goal
        </button>
      </PanelHeading>
      <div className="mt-3 space-y-5">
        {goals.map((goal, index) => {
          const percent = Math.round((goal.saved / goal.target) * 100);
          const deadline = new Date(
            `${goal.deadline}-01T12:00:00`,
          ).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
          return (
            <div key={`${goal.name}-${index}`}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span>{goal.name}</span>
                <span className="font-mono text-xs font-semibold text-dash-accent">
                  {percent}%
                </span>
              </div>
              <ProgressBar
                tone="accent"
                value={percent}
                label={`${goal.name} savings progress`}
              />
              <div className="mt-1.5 flex flex-wrap justify-between gap-1 font-mono text-[9px] text-dash-muted">
                <span>
                  Target {money(goal.target)} · {deadline}
                </span>
                <span>{money(goal.saved)} saved</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/summary-cards.tsx

~~~tsx
import { account, balanceTrend, money, summaryCards } from "./data";

import { Icon, MiniStat, ProgressBar } from "./ui";

export default function SummaryCards({
  onReport,
  adjustment,
}: {
  onReport: () => void;
  adjustment: number;
}) {
  return (
    <section
      aria-label="Account overview"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <BalanceCard onReport={onReport} adjustment={adjustment} />
      {summaryCards.map((card) => (
        <StatCard key={card.label} card={card} />
      ))}
    </section>
  );
}

function BalanceCard({
  onReport,
  adjustment,
}: {
  onReport: () => void;
  adjustment: number;
}) {
  const line = balanceTrend
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${index * (400 / (balanceTrend.length - 1))} ${76 - value}`,
    )
    .join(" ");
  return (
    <article className="dash-panel dash-highlight flex h-[226px] flex-col p-4">
      <div className="flex items-center justify-between">
        <h2 className="dash-eyebrow">Available balance</h2>
        <Icon name="arrow" className="size-3.5 text-dash-accent" />
      </div>
      <p className="mt-2 font-mono text-[26px] leading-8 font-semibold tracking-[-0.04em]">
        {money(account.balance + adjustment, 2)}
      </p>
      <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-dash-accent">
        <Icon name="trend" className="size-3" />+{account.change}% vs last month
      </p>
      <svg
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        className="my-2 h-[72px] w-full"
        role="img"
        aria-label="Available balance is trending upward"
      >
        <defs>
          <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--color-dash-accent)" stopOpacity=".28" />
            <stop
              offset="1"
              stopColor="var(--color-dash-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path d={`${line} L400 80 L0 80 Z`} fill="url(#balance-fill)" />
        <path
          d={line}
          stroke="var(--color-dash-accent)"
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-auto flex items-center justify-between">
        <span className="rounded-lg border border-dash-border bg-dash-raised px-2 py-1 font-mono text-[10px] text-dash-muted">
          •••• {account.lastDigits}
        </span>
        <button
          className="dash-small-button border-dash-accent/40 bg-dash-accent/10 text-dash-accent"
          onClick={onReport}
        >
          View report
        </button>
      </div>
    </article>
  );
}

function StatCard({ card }: { card: (typeof summaryCards)[number] }) {
  return (
    <article className="dash-panel h-[226px] p-4">
      <div className="flex items-center justify-between">
        <h2 className="dash-eyebrow">{card.label}</h2>
        <span data-tone={card.tone} className="dash-badge">
          {card.change}
        </span>
      </div>
      <p className="mt-2 font-mono text-[22px] font-semibold tracking-[-0.04em]">
        {money(card.value, 2)}
      </p>
      <div className="mb-3 mt-3 grid grid-cols-2 gap-2">
        {card.details.map((detail) => (
          <MiniStat
            key={detail.label}
            label={detail.label}
            value={money(detail.value)}
          />
        ))}
      </div>
      <ProgressBar
        value={card.percent}
        label={`${card.label} progress`}
        tone={card.tone}
      />
      <div className="mt-3 flex items-center justify-between">
        <p data-tone={card.tone} className="font-mono text-lg font-medium">
          {card.percent}%
        </p>
        <span className="flex items-center gap-1 font-mono text-[9px] text-dash-muted">
          <Icon name="calendar" className="size-3" />
          February
        </span>
      </div>
    </article>
  );
}
~~~

### apps/web/app/(module-one)/dashboard/ui.tsx

~~~tsx
import { useEffect, useRef, type ReactNode } from "react";

import {
  account,
  chartStats,
  expenses,
  money,
  notifications,
  type Tone,
  type Budget,
  type Goal,
  type Transaction,
} from "./data";

const paths = {
  grid: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z",
  card: "M3 5h18v14H3z M3 10h18",
  chart: "M4 3v18h17 M8 16v-5 M13 16V6 M18 16V9",
  bulb: "M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2",
  wallet: "M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7 M21 12h-5v4h5",
  file: "M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8",
  settings:
    "m10 3 4 0 1 3 3 1 3 2-1 4-3 1-1 3-4 1-2-3-3-1-1-4 3-2 1-3z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  user: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 18c1-5 13-5 14 0",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l5 5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  plus: "M12 5v14 M5 12h14",
  arrow: "M6 18 18 6 M7 6h11v11",
  trend: "m3 17 6-6 4 4 8-10 M15 5h6v6",
  pie: "M12 3v9h9 M9 3.5A9 9 0 1 0 20.5 15 M15 3.5a9 9 0 0 1 5.5 5.5H15z",
  filter: "M3 5h18 M6 12h12 M10 19h4",
  target:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
  pig: "M5 8 4 4l5 2c4-2 9 0 10 4h3v5h-3l-2 5h-3v-3H9v3H6l-2-5c-3-1-3-5-1-5 M15 9h.01 M10 3h4",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  down: "m7 10 5 5 5-5",
  close: "m6 6 12 12 M6 18 18 6",
};
export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[11px] border border-dash-border/60 bg-dash-raised px-3 py-2.5">
      <p className="font-mono text-[8px] leading-4 tracking-[0.13em] text-dash-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xs font-medium text-dash-text">
        {value}
      </p>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "accent",
}: {
  value: number;
  label: string;
  tone?: Tone;
}) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-dash-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-current transition-[width] duration-300 motion-reduce:transition-none"
        data-tone={tone}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PanelHeading({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
        <Icon name={icon} className="size-4 text-dash-accent" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export type DialogKind =
  | "transaction"
  | "transactions"
  | "budgets"
  | "goal"
  | "report"
  | "notifications";
const titles: Record<DialogKind, string> = {
  transaction: "Add transaction",
  transactions: "Transactions",
  budgets: "Manage budgets",
  goal: "Add savings goal",
  report: "Account report",
  notifications: "Notifications",
};
type DialogProps = {
  kind: DialogKind;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  query: string;
  onQuery: (query: string) => void;
  adjustment: number;
  onTransaction: (transaction: Transaction) => void;
  onBudgets: (budgets: Budget[]) => void;
  onGoal: (goal: Goal) => void;
};
export function DashboardDialog({
  kind,
  onClose,
  budgets,
  transactions,
  query,
  onQuery,
  adjustment,
  onTransaction,
  onBudgets,
  onGoal,
}: DialogProps) {
  return (
    <Modal title={titles[kind]} onClose={onClose}>
      {kind === "transaction" && (
        <form
          className="dash-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const amount = Number(form.get("amount"));
            onTransaction({
              id: crypto.randomUUID(),
              name: String(form.get("name")).trim(),
              category: String(form.get("category")),
              amount: form.get("type") === "expense" ? -amount : amount,
              date: String(form.get("date")),
            });
            onClose();
          }}
        >
          <label>
            Description
            <input
              className="dash-input"
              name="name"
              required
              maxLength={80}
              pattern=".*\S.*"
              placeholder="e.g. Weekly groceries"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Type
              <select className="dash-input" name="type">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                className="dash-input"
                name="amount"
                type="number"
                required
                min="0.01"
                max="100000000"
                step="0.01"
                placeholder="0.00"
              />
            </label>
          </div>
          <label>
            Category
            <select className="dash-input" name="category">
              {[
                "Income",
                ...expenses.map((item) => item.name),
                "Transportation",
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              className="dash-input"
              name="date"
              type="date"
              required
              defaultValue="2024-02-07"
            />
          </label>
          <p className="text-[11px] text-dash-muted">
            Saved in this preview session. Refreshing resets the demo.
          </p>
          <button className="dash-primary h-10">Add transaction</button>
        </form>
      )}
      {kind === "transactions" && (
        <TransactionTable
          transactions={transactions}
          query={query}
          onQuery={onQuery}
        />
      )}
      {kind === "budgets" && (
        <form
          className="dash-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onBudgets(
              budgets.map((budget, index) => ({
                ...budget,
                limit: Number(form.get(`budget-${index}`)),
              })),
            );
            onClose();
          }}
        >
          {budgets.map((budget, index) => (
            <label key={budget.name}>
              {budget.name} monthly limit (₹)
              <input
                className="dash-input"
                name={`budget-${index}`}
                type="number"
                min="1"
                max="100000000"
                step="0.01"
                required
                defaultValue={budget.limit}
              />
            </label>
          ))}
          <button className="dash-primary h-10">Save budgets</button>
        </form>
      )}
      {kind === "goal" && (
        <form
          className="dash-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onGoal({
              name: String(form.get("name")).trim(),
              target: Number(form.get("target")),
              saved: Number(form.get("saved")),
              deadline: String(form.get("deadline")),
            });
            onClose();
          }}
        >
          <label>
            Goal name
            <input
              className="dash-input"
              name="name"
              required
              maxLength={60}
              pattern=".*\S.*"
              placeholder="e.g. New home"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Target (₹)
              <input
                className="dash-input"
                name="target"
                type="number"
                min="1"
                max="100000000"
                step="0.01"
                required
              />
            </label>
            <label>
              Already saved (₹)
              <input
                className="dash-input"
                name="saved"
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                required
                defaultValue="0"
              />
            </label>
          </div>
          <label>
            Target month
            <input
              className="dash-input"
              name="deadline"
              type="month"
              min="2024-01"
              max="2099-12"
              required
              defaultValue="2024-12"
            />
          </label>
          <button className="dash-primary h-10">Add goal</button>
        </form>
      )}
      {kind === "report" && (
        <div>
          <p className="mb-4 text-xs text-dash-muted">
            February 2024 · Personal account •••• {account.lastDigits}
          </p>
          <div className="mb-4">
            <MiniStat
              label="Available balance"
              value={money(account.balance + adjustment, 2)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {chartStats.map((stat) => (
              <MiniStat key={stat.label} {...stat} />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-dash-muted">
            Illustrative report using the dashboard’s mock data.
          </p>
        </div>
      )}
      {kind === "notifications" && (
        <ul className="space-y-3">
          {notifications.map((message) => (
            <li
              key={message}
              className="rounded-xl border border-dash-border bg-dash-raised p-4 text-sm"
            >
              {message}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      className="dashboard fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-dash-border bg-dash-surface p-5 text-dash-text shadow-2xl backdrop:bg-dash-sidebar/80 backdrop:backdrop-blur-sm"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className="dash-icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TransactionTable({
  transactions,
  query,
  onQuery,
}: {
  transactions: Transaction[];
  query: string;
  onQuery: (query: string) => void;
}) {
  const filtered = transactions.filter((item) =>
    `${item.name} ${item.category} ${item.date}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div>
      <label className="block text-xs text-dash-muted">
        Search transactions
        <input
          className="dash-input mt-2 w-full"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Name, category, or date"
        />
      </label>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Mock account transactions</caption>
          <thead className="text-[10px] text-dash-muted">
            <tr>
              <th className="pb-3 font-normal">Transaction</th>
              <th className="pb-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-dash-border">
                <td className="py-3">
                  {item.name}
                  <span className="mt-1 block text-[10px] text-dash-muted">
                    {item.category} · {item.date}
                  </span>
                </td>
                <td
                  className={`py-3 text-right font-mono ${item.amount > 0 ? "text-dash-accent" : "text-dash-text"}`}
                >
                  {item.amount > 0 ? "+" : ""}
                  {money(item.amount, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="py-8 text-center text-sm text-dash-muted">
            No transactions match your search.
          </p>
        )}
      </div>
    </div>
  );
}
~~~

### apps/web/app/(module-one)/auth-page.tsx

~~~tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.19-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.91A6.01 6.01 0 0 1 6.1 12c0-.66.12-1.3.31-1.91V7.5H3.07A10 10 0 0 0 2 12c0 1.61.38 3.13 1.07 4.5l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 2.96 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.34 2.59C7.2 7.73 9.4 5.97 12 5.97Z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  const googleAuthEnabled =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  async function signInWithGoogle() {
    setSignInError("");
    setIsSigningIn(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (error) {
      setSignInError(error.message ?? "Unable to start Google sign-in.");
      setIsSigningIn(false);
    }
  }

  return (
    <main className="landing-page grid min-h-screen place-items-center bg-dash-bg px-5 py-10 text-dash-text">
      <section className="w-full max-w-[430px]">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em]"
        >
          <span className="grid size-9 place-items-center rounded-[11px] border border-dash-accent/50 bg-dash-accent/10 font-mono text-sm text-dash-accent">
            F
          </span>
          FinVerse
        </Link>

        <div className="dash-panel dash-highlight p-7 sm:p-8">
          <p className="font-mono text-[10px] tracking-[0.16em] text-dash-accent uppercase">
            Personal finance
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
            Create your account or log in.
          </h1>
          <p className="mt-3 text-sm leading-6 text-dash-muted">
            Use your Google account to securely continue to your personal
            finance workspace.
          </p>

          <button
            className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-dash-border bg-dash-raised text-sm font-medium text-dash-text transition-colors enabled:hover:border-dash-accent/60 enabled:hover:bg-dash-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!googleAuthEnabled || isSigningIn}
            onClick={signInWithGoogle}
          >
            <GoogleMark />
            {isSigningIn ? "Connecting to Google…" : "Continue with Google"}
          </button>

          {signInError ? (
            <p className="mt-4 text-center text-xs leading-5 text-dash-red">
              {signInError}
            </p>
          ) : (
            <p className="mt-4 text-center text-xs leading-5 text-dash-muted">
              {googleAuthEnabled
                ? "Continue securely with your Google account."
                : "Google sign-in will be enabled after the OAuth credentials are connected."}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-dash-muted">
          <Link className="text-dash-accent hover:underline" href="/">
            ← Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
~~~

### apps/web/app/(module-one)/auth/page.tsx

~~~tsx
import type { Metadata } from "next";
import Main from "../main";

export const metadata: Metadata = {
  title: "Sign up or log in | FinVerse",
  description: "Create a FinVerse account or log in with Google.",
};

export default function AuthRoute() {
  return <Main screen="auth" />;
}
~~~

### apps/web/app/(module-one)/landing-page.tsx

~~~tsx
import Link from "next/link";
import { landingPreview, money } from "./dashboard/data";

const features = [
  {
    number: "01",
    title: "Track with clarity",
    description:
      "Keep income, expenses, categories, and recurring bills together in one simple view.",
  },
  {
    number: "02",
    title: "Plan with purpose",
    description:
      "Create practical budgets and savings goals, then follow progress month by month.",
  },
  {
    number: "03",
    title: "Understand the story",
    description:
      "Turn day-to-day transactions into useful trends, comparisons, and financial insights.",
  },
];

const steps = [
  ["Add", "Record income and expenses in a few clear fields."],
  ["Review", "See cash flow, spending categories, and upcoming bills."],
  ["Improve", "Use budgets and insights to make the next month better."],
];

export default function LandingPage() {
  return (
    <main className="landing-page min-h-screen bg-dash-bg text-dash-text selection:bg-dash-accent selection:text-dash-bg">
      <header className="mx-auto flex min-h-19 w-[calc(100%_-_3rem)] max-w-[1180px] items-center justify-between border-b border-dash-border max-md:w-[calc(100%_-_2rem)]">
        <a
          className="inline-flex items-center gap-2.5 font-[650] tracking-[-0.02em]"
          href="#top"
          aria-label="FinVerse home"
        >
          <span className="grid size-8.5 place-items-center rounded-[10px] border border-dash-accent/55 bg-dash-accent/10 text-dash-accent">
            F
          </span>
          <span>FinVerse</span>
        </a>

        <nav
          className="flex gap-8 text-sm text-dash-muted max-md:hidden"
          aria-label="Main navigation"
        >
          <a
            className="transition-colors hover:text-dash-text"
            href="#features"
          >
            Features
          </a>
          <a
            className="transition-colors hover:text-dash-text"
            href="#how-it-works"
          >
            How it works
          </a>
          <a className="transition-colors hover:text-dash-text" href="#roadmap">
            Roadmap
          </a>
        </nav>

        <Link
          className="rounded-full border border-dash-accent/30 bg-dash-accent/5 px-3 py-2 text-xs text-dash-accent transition-colors hover:bg-dash-accent hover:text-dash-bg max-md:px-2.5 max-md:py-1.5 max-md:text-[10px]"
          href="/auth"
        >
          Log in →
        </Link>
      </header>

      <section
        className="mx-auto grid w-[calc(100%_-_3rem)] max-w-[1180px] grid-cols-[minmax(0,0.88fr)_minmax(540px,1.12fr)] items-center gap-[70px] py-24 pb-27 max-[1000px]:grid-cols-1 max-[1000px]:pt-19 max-md:w-[calc(100%_-_2rem)] max-md:gap-12 max-md:py-16 max-md:pb-20"
        id="top"
      >
        <div className="max-w-[760px]">
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
            <span className="h-px w-5.5 bg-current" /> Personal finance, made
            clear
          </p>
          <h1 className="mt-5.5 max-w-[650px] text-[clamp(46px,5.3vw,76px)] leading-[0.98] font-[620] tracking-[-0.06em] max-md:text-[clamp(42px,13vw,64px)]">
            Know where your money goes.{" "}
            <em className="block text-dash-accent not-italic">
              Plan what comes next.
            </em>
          </h1>
          <p className="mt-7 max-w-[590px] text-[17px] leading-7.5 text-dash-muted max-md:text-[15px]">
            FinVerse is a personal finance workspace being built to help you
            track spending, manage budgets, grow savings, and understand your
            financial habits without the clutter.
          </p>
          <div className="mt-8.5 flex items-center gap-3 max-md:flex-col max-md:items-stretch">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-5.5 rounded-[11px] bg-dash-accent px-5 text-sm font-[620] text-dash-bg transition hover:-translate-y-0.5 hover:bg-dash-accent/85 motion-reduce:transition-none"
              href="/auth"
            >
              Sign up <span aria-hidden="true">→</span>
            </Link>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-[11px] border border-dash-border px-5 text-sm font-[620] text-dash-text transition-colors hover:border-dash-accent/40 motion-reduce:transition-none"
              href="#features"
            >
              Explore features
            </a>
          </div>
          <p className="mt-4.5 text-xs text-dash-muted">
            Free to start · Sign up with Google when it is connected
          </p>
        </div>

        <div
          className="relative rounded-[22px] border border-dash-border bg-dash-bg p-3.5 dash-highlight min-[1001px]:[transform:perspective(1200px)_rotateY(-2deg)_rotateX(1deg)] max-[1000px]:max-w-[720px] max-md:p-2.5"
          aria-label="FinVerse dashboard preview"
        >
          <div className="flex h-12 items-center justify-between px-2 text-xs text-dash-text">
            <div className="flex items-center gap-2">
              <span className="grid size-6.5 place-items-center rounded-lg border border-dash-accent/55 bg-dash-accent/10 text-[11px] text-dash-accent">
                F
              </span>
              <span>Overview</span>
            </div>
            <span className="rounded-lg border border-dash-border px-2.5 py-1.5 text-dash-muted">
              November 2026
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Monthly income
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.income)}
              </strong>
              <small className="text-[9px] text-dash-accent">
                +8.4% this month
              </small>
            </article>
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Monthly expenses
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.expenses)}
              </strong>
              <small className="text-[9px] text-dash-red">46% of income</small>
            </article>
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Saved this month
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.savings)}
              </strong>
              <small className="text-[9px] text-dash-accent">On track</small>
            </article>
          </div>

          <div className="mt-2 grid grid-cols-[1.1fr_0.9fr] gap-2 max-md:grid-cols-1">
            <div className="min-h-57.5 rounded-xl border border-dash-border bg-dash-surface p-4">
              <div className="flex items-center justify-between text-[11px] text-dash-text">
                <span>Cash flow</span>
                <small className="text-[10px] text-dash-muted">
                  Last 6 months
                </small>
              </div>
              <div className="mt-5 flex h-33 items-end justify-between gap-2.5 border-b border-dash-border landing-chart-grid px-2">
                <span className="h-[38%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[54%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[46%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[70%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[61%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[86%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
              </div>
              <div className="mt-2 flex justify-between text-[8px] text-dash-muted">
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
              </div>
            </div>

            <div className="min-h-57.5 rounded-xl border border-dash-border bg-dash-surface p-4">
              <div className="flex items-center justify-between text-[11px] text-dash-text">
                <span>Budget status</span>
                <small className="text-[10px] text-dash-muted">November</small>
              </div>
              {landingPreview.budgets.map(({ name, spent, limit, color }) => (
                <div className="mt-5.5" key={name}>
                  <div className="mb-2 flex justify-between text-[9px] text-dash-text">
                    <span>{name}</span>
                    <small className="text-dash-muted">
                      {money(spent)} / {money(limit)}
                    </small>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-dash-track">
                    <span
                      className={`block h-full rounded-full ${color}`}
                      style={{ width: (spent / limit) * 100 + "%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-dash-border bg-dash-sidebar px-[max(1.5rem,calc((100%_-_1180px)/2))] py-26 max-md:py-20"
        id="features"
      >
        <div className="max-w-[650px]">
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
            <span className="h-px w-5.5 bg-current" /> One place for the
            essentials
          </p>
          <h2 className="mt-4 text-[clamp(34px,4vw,52px)] leading-[1.08] font-[580] tracking-[-0.045em]">
            A calmer way to manage everyday money.
          </h2>
          <p className="mt-4.5 leading-7 text-dash-muted">
            Start with reliable records and useful summaries. Add intelligence
            only where it genuinely helps.
          </p>
        </div>
        <div className="mt-15 grid grid-cols-3 gap-3.5 max-md:mt-10.5 max-md:grid-cols-1">
          {features.map((feature) => (
            <article
              className="flex min-h-62.5 flex-col justify-end rounded-2xl border border-dash-border bg-dash-surface p-7 max-md:min-h-55"
              key={feature.number}
            >
              <span className="mb-auto font-mono text-[11px] text-dash-accent">
                {feature.number}
              </span>
              <h3 className="mt-14 text-[21px] font-[570]">{feature.title}</h3>
              <p className="mt-3.5 text-sm leading-6.5 text-dash-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mx-auto grid w-[calc(100%_-_3rem)] max-w-[1180px] grid-cols-[0.8fr_1.2fr] gap-22.5 py-27.5 max-[1000px]:grid-cols-1 max-[1000px]:gap-12.5 max-md:w-[calc(100%_-_2rem)] max-md:py-21.5"
        id="how-it-works"
      >
        <div className="max-w-[450px]">
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
            <span className="h-px w-5.5 bg-current" /> A simple routine
          </p>
          <h2 className="mt-4 text-[clamp(34px,4vw,52px)] leading-[1.08] font-[580] tracking-[-0.045em]">
            From transaction to useful context.
          </h2>
        </div>
        <div className="border-t border-dash-border">
          {steps.map(([title, description], index) => (
            <article
              className="grid grid-cols-[54px_1fr] border-b border-dash-border py-6.5"
              key={title}
            >
              <span className="font-mono text-[11px] text-dash-accent">
                0{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-[560]">{title}</h3>
                <p className="mt-2 text-sm leading-6.5 text-dash-muted">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mx-auto mb-6 w-[calc(100%_-_3rem)] max-w-[1180px] rounded-[20px] border border-dash-border bg-dash-surface p-13.5 max-md:w-[calc(100%_-_2rem)] max-md:p-8 max-md:px-6"
        id="roadmap"
      >
        <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
          <span className="h-px w-5.5 bg-current" /> Building in focused stages
        </p>
        <h2 className="mt-4 max-w-[650px] text-[clamp(30px,3.6vw,46px)] leading-[1.08] font-[580] tracking-[-0.045em]">
          The foundation first. Smarter features next.
        </h2>
        <div className="mt-10.5 grid grid-cols-3 gap-2 max-md:grid-cols-1">
          <span className="rounded-[10px] border border-dash-accent/35 bg-dash-accent/8 p-4 text-[13px] text-dash-accent">
            <b className="mr-2.5 font-mono text-[10px] text-dash-accent">01</b>{" "}
            Landing page
          </span>
          <span className="rounded-[10px] border border-dash-border p-4 text-[13px] text-dash-muted">
            <b className="mr-2.5 font-mono text-[10px] text-dash-muted">02</b>{" "}
            Personal dashboard
          </span>
          <span className="rounded-[10px] border border-dash-border p-4 text-[13px] text-dash-muted">
            <b className="mr-2.5 font-mono text-[10px] text-dash-muted">03</b>{" "}
            Smart finance tools
          </span>
        </div>
      </section>

      <footer className="mx-auto flex min-h-27.5 w-[calc(100%_-_3rem)] max-w-[1180px] items-center justify-between text-xs text-dash-muted max-md:w-[calc(100%_-_2rem)] max-md:flex-col max-md:items-start max-md:gap-4.5 max-md:py-7">
        <a
          className="inline-flex items-center gap-2.5 font-[650] tracking-[-0.02em] text-dash-text"
          href="#top"
        >
          <span className="grid size-8.5 place-items-center rounded-[10px] border border-dash-accent/55 bg-dash-accent/10 text-dash-accent">
            F
          </span>
          <span>FinVerse</span>
        </a>
        <p>Built as a final-year B.Tech CSE (AI/ML) major project.</p>
        <span>Module 1 · Personal Finance</span>
      </footer>
    </main>
  );
}
~~~

### apps/web/app/(module-one)/main.tsx

~~~tsx
import LandingPage from "./landing-page";
import Dashboard from "./dashboard/dashboard";
import AuthPage from "./auth-page";

type AppScreen = "landing" | "dashboard" | "auth";

export default function Main({ screen = "landing" }: { screen?: AppScreen }) {
  if (screen === "dashboard") return <Dashboard />;
  if (screen === "auth") return <AuthPage />;

  return <LandingPage />;
}
~~~

### apps/web/app/(module-one)/page.tsx

~~~tsx
import Main from "./main";

export default function HomePage() {
  return <Main screen="landing" />;
}
~~~

### apps/web/app/(module-one)/dashboard/page.tsx

~~~tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Main from "../main";

export const metadata: Metadata = {
  title: "Dashboard | Personal Finance",
  description: "Your balance, spending, budgets, and savings at a glance.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const googleAuthConfigured =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET);

  if (googleAuthConfigured) {
    const { auth } = await import("../../../lib/auth");
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) redirect("/auth");
  }

  return <Main screen="dashboard" />;
}
~~~

### apps/web/app/api/auth/[...all]/route.ts

~~~ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
~~~

### apps/web/lib/auth.ts

~~~ts
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = prismaGlobal.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (googleClientId && googleClientSecret && !betterAuthSecret) {
  throw new Error(
    "BETTER_AUTH_SECRET is required when Google authentication is configured.",
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // This fallback keeps the unconfigured local UI buildable. It must never be
  // used once a provider is enabled; the check above enforces that.
  secret:
    betterAuthSecret ??
    "finverse-local-auth-placeholder-do-not-use-in-production-2026",
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [nextCookies()],
});
~~~

### apps/web/lib/auth-client.ts

~~~ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
~~~

### apps/web/.env.example

~~~example
# Use the same PostgreSQL database as apps/backend.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/finverse"

# Generate a unique, high-entropy value before production.
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Create these in Google Cloud Console. Keep them server-only.
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Set to true only after the two Google values above are present. The dashboard
# will then redirect unauthenticated visitors to /auth.
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="false"
~~~

### apps/web/app/globals.css

~~~css
@import "tailwindcss";

@theme {
  --color-dash-bg: #080d13;
  --color-dash-sidebar: #060b11;
  --color-dash-surface: #0e141c;
  --color-dash-raised: #151b24;
  --color-dash-track: #171f29;
  --color-dash-border: #242d38;
  --color-dash-text: #e2e8f0;
  --color-dash-muted: #84909e;
  --color-dash-accent: #3dddb1;
  --color-dash-blue: #42b9df;
  --color-dash-purple: #a78bfa;
  --color-dash-warning: #f4c44f;
  --color-dash-red: #f87171;
  --color-dash-shadow: #00000033;
  --color-dash-glow: #3dddb10d;
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

html {
  scroll-behavior: smooth;
  color-scheme: dark;
}

body {
  background: var(--color-dash-bg);
  color: var(--color-dash-text);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@layer base {
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
}

@layer components {
  .dash-panel {
    @apply min-w-0 rounded-[15px] border border-dash-border bg-dash-surface;
  }
  .dash-highlight {
    border-color: color-mix(in srgb, var(--color-dash-accent) 40%, transparent);
    box-shadow: 0 0 24px var(--color-dash-glow);
  }
  .landing-chart-grid {
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 43px,
      var(--color-dash-border) 44px
    );
  }
  .dash-eyebrow {
    @apply font-mono text-[9px] tracking-[0.22em] text-dash-muted uppercase;
  }
  .dash-badge {
    @apply rounded-lg px-2 py-1 font-mono text-[8px] leading-none font-medium tracking-[0.1em] uppercase;
    background: color-mix(in srgb, currentColor 11%, transparent);
  }
  .dash-small-button {
    @apply inline-flex min-h-6 items-center justify-center rounded-lg border border-dash-border px-2.5 py-1 font-mono text-[8px] tracking-[0.1em] text-dash-muted uppercase transition-colors hover:bg-dash-raised hover:text-dash-text;
  }
  .dash-icon-button {
    @apply flex size-8 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-dash-surface text-dash-muted transition-colors hover:bg-dash-raised hover:text-dash-text;
  }
  .dash-primary {
    @apply inline-flex items-center justify-center rounded-lg bg-dash-accent px-4 text-[11px] font-semibold text-dash-bg transition-colors hover:bg-dash-accent/85;
  }
  .dash-input {
    @apply min-w-0 rounded-lg border border-dash-border bg-dash-raised px-3 py-2 text-xs text-dash-text placeholder:text-dash-muted;
  }
  .dash-nav {
    @apply rounded-lg px-3 py-2 transition-colors hover:bg-dash-raised hover:text-dash-text;
  }
  .dash-form {
    @apply flex flex-col gap-4;
  }
  .dash-form label {
    @apply flex min-w-0 flex-col gap-2 text-xs text-dash-muted;
  }
}

.dashboard {
  color-scheme: dark;
  font-variant-numeric: tabular-nums;
  scrollbar-color: var(--color-dash-border) var(--color-dash-bg);
}
.dashboard [data-tone="accent"] {
  color: var(--color-dash-accent);
}
.dashboard [data-tone="blue"] {
  color: var(--color-dash-blue);
}
.dashboard [data-tone="purple"] {
  color: var(--color-dash-purple);
}
.dashboard [data-tone="warning"] {
  color: var(--color-dash-warning);
}
.dashboard [data-tone="red"] {
  color: var(--color-dash-red);
}
.dashboard [data-tone="muted"] {
  color: var(--color-dash-muted);
}
.dashboard :is(button, select, a) {
  cursor: pointer;
}
:is(.dashboard, .landing-page) :is(button, a, input, select):focus-visible {
  outline: 2px solid var(--color-dash-accent);
  outline-offset: 4px;
}
.dashboard ::selection {
  background: var(--color-dash-accent);
  color: var(--color-dash-bg);
}
.dashboard [id] {
  scroll-margin-top: 100px;
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
~~~

### apps/web/app/layout.tsx

~~~tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "FinVerse | Personal Finance, Made Clear",
  description:
    "Track spending, plan budgets, grow savings, and understand your financial habits with FinVerse.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
~~~

### apps/web/postcss.config.mjs

~~~mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
~~~

### apps/web/package.json

~~~json
{
  "name": "web",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --webpack --port 3000",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint --max-warnings 0",
    "check-types": "next typegen && tsc --noEmit"
  },
  "dependencies": {
    "@better-auth/prisma-adapter": "^1.7.18",
    "better-auth": "^1.7.18",
    "next": "16.3.8",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@babel/preset-typescript": "^8.0.1",
    "@repo/eslint-config": "*",
    "@repo/typescript-config": "*",
    "@tailwindcss/postcss": "^4.3.4",
    "@types/node": "26.4.1",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "eslint": "10.9.1",
    "tailwindcss": "^4.3.4",
    "typescript": "7.0.2"
  }
}
~~~

### apps/web/tsconfig.json

~~~json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "strictNullChecks": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "next-env.d.ts",
    "next.config.js",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
~~~

### apps/web/next.config.js

~~~js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
~~~

### apps/backend/prisma/schema.prisma

~~~prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String  @id @default(cuid())
  name          String?
  email         String  @unique
  password      String?
  emailVerified Boolean @default(false)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  image     String?
  sessions  Session[]
  accounts  Account[]

}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}
~~~

### apps/backend/prisma/migrations/20261106000000_add_better_auth/migration.sql

~~~sql
-- Keep the existing "User" table and extend it for Better Auth.
ALTER TABLE "User" ADD COLUMN "image" TEXT;

CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

ALTER TABLE "session"
ADD CONSTRAINT "session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account"
ADD CONSTRAINT "account_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
~~~

### packages/typescript-config/base.json

~~~json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "incremental": false,
    "isolatedModules": true,
    "lib": ["es2022", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
~~~

### packages/typescript-config/nextjs.json

~~~json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "jsx": "preserve",
    "noEmit": true
  }
}
~~~
