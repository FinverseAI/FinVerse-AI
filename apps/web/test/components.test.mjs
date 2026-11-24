import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  bills,
  budgets,
  currentMonth,
  fakeActivity,
  historyBars,
  historyDates,
  macdValues,
  portfolioSummary,
  rsiValues,
  stubGoals,
  stubProfile,
  stubProfileData,
  stubUser,
  transactions,
  valuedHoldings,
} from "./fixtures.mjs";
import { money } from "../app/(module-one)/dashboard/data.ts";

await register("./tsx-loader.mjs", import.meta.url);

const dash = "../app/(module-one)/dashboard";
const { Icon, MiniStat, PanelHeading, ProgressBar } = await import(
  `${dash}/ui.tsx`
);
const SummaryCards = (await import(`${dash}/summary-cards.tsx`)).default;
const RecentTransactions = (await import(`${dash}/recent-transactions.tsx`))
  .default;
const { ActivityEmpty, ActivityError } = await import(
  `${dash}/recent-transactions.tsx`
);
const BalanceBreakdownCard = (
  await import(`${dash}/balance-breakdown-card.tsx`)
).default;
const ExpenseBreakdownCard = (
  await import(`${dash}/expense-breakdown-card.tsx`)
).default;
const SpendingAnalysis = (await import(`${dash}/spending-analysis.tsx`))
  .default;
const UpcomingBills = (await import(`${dash}/upcoming-bills.tsx`)).default;
const ReadinessCard = (await import(`${dash}/readiness-card.tsx`)).default;
const PlanningCards = (await import(`${dash}/planning-cards.tsx`)).default;
const BudgetEditor = (await import(`${dash}/budget-editor.tsx`)).default;
const { Modal } = await import(`${dash}/modal.tsx`);
const { Header, ProfileMenu, Sidebar } = await import(`${dash}/navigation.tsx`);
const { DashboardDialog, TransactionForm } = await import(
  `${dash}/dashboard-dialog.tsx`
);
const ExpenseEntry = (await import(`${dash}/expense-entry.tsx`)).default;
const AiChat = (await import(`${dash}/ai-chat.tsx`)).default;
const { ReasoningIndicator, VerificationNote, aiErrorMessage } = await import(
  `${dash}/ai-chat.tsx`
);
const { ActivityApiError } = await import(`${dash}/use-activity.ts`);
const Dashboard = (await import(`${dash}/dashboard.tsx`)).default;
const FinancialProfileForm = (
  await import("../app/(module-one)/onboarding/financial-profile-form.tsx")
).default;
const BudgetFields = (
  await import("../app/(module-one)/onboarding/budget-fields.tsx")
).default;
const OnboardingForm = (
  await import("../app/(module-one)/onboarding/onboarding-form.tsx")
).default;
const AuthForm = (await import("../auth/auth-form.tsx")).default;
const LandingPage = (await import("../app/(module-one)/landing-page.tsx"))
  .default;
const LandingMotion = (await import("../app/(module-one)/landing-motion.tsx"))
  .default;
const ProfileLoading = (await import("../auth/profile-loading.tsx")).default;
const ProfileError = (await import("../auth/profile-error.tsx")).default;
const { MarketShell } =
  await import("../app/(module-two)/market/market-shell.tsx");
const { PortfolioSection } =
  await import("../app/(module-two)/market/portfolio.tsx");
const { HoldingsSection } =
  await import("../app/(module-two)/market/holdings.tsx");
const { OptimizerSection } =
  await import("../app/(module-two)/market/optimizer.tsx");
const { ScreenerSection } =
  await import("../app/(module-two)/market/screener.tsx");
const { MacdChart, PriceChart, RsiChart } =
  await import("../app/(module-two)/market/price-chart.tsx");
const { HoldingForm } =
  await import("../app/(module-two)/market/holding-form.tsx");
const { StockNewsSection } =
  await import("../app/(module-two)/market/stock/[symbol]/stock-news.tsx");
const StockProfile = (
  await import("../app/(module-two)/market/stock/[symbol]/stock-profile.tsx")
).default;
const Market = (await import("../app/(module-two)/market/market.tsx")).default;

const noop = () => {};
const asyncNoop = async () => {};

function render(element) {
  // React inserts <!-- --> comment nodes around interpolated text in SSR
  // output; strip them so assertions read the text a user sees.
  return renderToString(element).replaceAll("<!-- -->", "");
}

test("ui primitives render their content", () => {
  const icon = render(createElement(Icon, { name: "pie" }));
  assert.match(icon, /<svg/);
  const stat = render(
    createElement(MiniStat, { label: "After tax", value: "₹85,000" }),
  );
  assert.match(stat, /After tax/);
  assert.match(stat, /₹85,000/);
  const bar = render(createElement(ProgressBar, { value: 75, tone: "accent" }));
  assert.match(bar, /75%/);
  const heading = render(
    createElement(
      PanelHeading,
      { icon: "pie", title: "Test Panel" },
      "child content",
    ),
  );
  assert.match(heading, /Test Panel/);
  assert.match(heading, /child content/);
});

test("SummaryCards shows income, expenses and savings from the profile", () => {
  const html = render(
    createElement(SummaryCards, { onReport: noop, profile: stubProfile }),
  );
  assert.match(html, /Monthly income/);
  assert.match(
    html,
    new RegExp(money(90000).replace(/[₹,]/g, (c) => `\\${c}`)),
  );
  assert.match(html, /Savings target/);
  assert.match(html, /Monthly surplus/);
  assert.match(html, /Current savings/);
});

test("RecentTransactions lists the newest first with edit and remove actions", () => {
  const html = render(
    createElement(RecentTransactions, {
      transactions,
      loading: false,
      error: "",
      onRetry: noop,
      onAdd: noop,
      onSeeAll: noop,
      onEdit: noop,
      onRemove: noop,
    }),
  );
  assert.match(html, /Recent Transactions/);
  assert.match(html, /Swiggy dinner/);
  assert.match(html, /Monthly salary/);
  assert.match(html, /Edit Swiggy dinner/);
  assert.match(html, /Remove Swiggy dinner/);
  // Newest first: the metro recharge (yesterday) precedes the salary.
  assert.ok(html.indexOf("Metro recharge") < html.indexOf("Monthly salary"));
});

test("RecentTransactions shows the empty state and the error state", () => {
  const empty = render(
    createElement(RecentTransactions, {
      transactions: [],
      loading: false,
      error: "",
      onRetry: noop,
      onAdd: noop,
      onSeeAll: noop,
      onEdit: noop,
      onRemove: noop,
    }),
  );
  assert.match(empty, /Your activity starts here/);
  const failed = render(
    createElement(RecentTransactions, {
      transactions: [],
      loading: false,
      error: "Unable to reach your account.",
      onRetry: noop,
      onAdd: noop,
      onSeeAll: noop,
      onEdit: noop,
      onRemove: noop,
    }),
  );
  assert.match(failed, /Unable to reach your account\./);
  const errorOnly = render(
    createElement(ActivityError, {
      error: "Something broke.",
      onRetry: noop,
    }),
  );
  assert.match(errorOnly, /Something broke\./);
  const emptyOnly = render(
    createElement(ActivityEmpty, {
      title: "Your activity starts here",
      description: "Add your first transaction.",
      onAdd: noop,
      action: "Add transaction",
    }),
  );
  assert.match(emptyOnly, /Your activity starts here/);
});

test("BalanceBreakdownCard shows the month label and the cash flow", () => {
  const month = currentMonth();
  const html = render(
    createElement(BalanceBreakdownCard, {
      month,
      onMonth: noop,
      profile: stubProfile,
      transactions,
      loading: false,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(html, /Recorded cash flow/);
  const label = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  assert.ok(html.includes(label), `expected the month label ${label}`);
  assert.match(html, /Previous month/);
  assert.match(html, /Next month/);
});

test("ExpenseBreakdownCard allocates the budget split across categories", () => {
  const html = render(
    createElement(ExpenseBreakdownCard, { profile: stubProfile }),
  );
  assert.match(html, /Planned Expense Breakdown/);
  assert.match(html, /Rent/);
  assert.match(html, /Groceries/);
  // Rent is 30% of ₹85,000.
  assert.match(html, /₹25,500/);
});

test("ExpenseBreakdownCard falls back to fixed/variable totals without a split", () => {
  const html = render(
    createElement(ExpenseBreakdownCard, {
      profile: { ...stubProfile, budget_split: null },
    }),
  );
  assert.match(html, /Fixed expenses/);
  assert.match(html, /Variable expenses/);
});

test("SpendingAnalysis renders the breakdown for the current week", () => {
  const html = render(
    createElement(SpendingAnalysis, {
      transactions,
      bills: bills.map(({ id, name, amount, dueDate }) => ({
        id,
        name,
        amount,
        dueDate,
      })),
      loading: false,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(html, /Spending Analysis/);
  assert.match(html, /Food &amp; Dining/);
});

test("UpcomingBills lists bills in due-date order with payment actions", () => {
  const html = render(
    createElement(UpcomingBills, {
      activity: fakeActivity(bills),
      autoPayNotice: "Auto-pay recorded 1 payment.",
    }),
  );
  assert.match(html, /Upcoming Bills/);
  assert.match(html, /Electricity/);
  assert.match(html, /Broadband/);
  assert.match(html, /Auto-pay recorded 1 payment\./);
  assert.match(html, /Record a payment for Electricity/);
  // Overdue first: Broadband (due 2 days ago) precedes Electricity.
  assert.ok(html.indexOf("Broadband") < html.indexOf("Electricity"));
});

test("UpcomingBills shows the empty state with no bills", () => {
  const html = render(
    createElement(UpcomingBills, { activity: fakeActivity([]) }),
  );
  assert.match(html, /A little less to remember/);
});

test("ReadinessCard renders its loading state before the fetch settles", () => {
  const html = render(createElement(ReadinessCard));
  assert.match(html, /Investment readiness/);
  assert.match(html, /Loading your readiness score…/);
});

test("PlanningCards shows budgets and goals with their progress", () => {
  const html = render(
    createElement(PlanningCards, {
      budgets,
      goals: stubGoals,
      onManage: noop,
      onAdd: noop,
      onGoalSavedAmount: noop,
      loading: false,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(html, /Budget Status/);
  assert.match(html, /Emergency fund/);
  assert.match(html, /New laptop/);
  assert.match(html, /Rent/);
});

test("PlanningCards shows the loading state while budgets load", () => {
  const html = render(
    createElement(PlanningCards, {
      budgets: [],
      goals: [],
      onManage: noop,
      onAdd: noop,
      onGoalSavedAmount: noop,
      loading: true,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(html, /Loading budget spending…/);
});

test("BudgetEditor opens with the saved split totalling 100%", () => {
  const html = render(
    createElement(BudgetEditor, {
      data: stubProfileData,
      onSaved: noop,
      onClose: noop,
    }),
  );
  assert.match(html, /Manage budget percentages/);
  assert.match(html, /100% allocated/);
  assert.match(html, /Rent/);
  assert.match(html, /<dialog/);
});

test("Modal renders a labelled dialog with its children", () => {
  const html = render(
    createElement(
      Modal,
      { title: "Test dialog", onClose: noop },
      createElement("p", null, "Dialog body"),
    ),
  );
  assert.match(html, /<dialog/);
  assert.match(html, /Test dialog/);
  assert.match(html, /Dialog body/);
});

test("Header shows the brand and the sidebar links to the dashboard sections", () => {
  const header = render(
    createElement(Header, {
      month: currentMonth(),
      onMonth: noop,
      query: "",
      onQuery: noop,
      onSearch: noop,
      onAdd: noop,
      onNotifications: noop,
      notificationCount: 2,
      onReport: noop,
      onTransactions: noop,
      user: stubUser,
      onSignOut: noop,
      isSigningOut: false,
      signOutError: "",
    }),
  );
  assert.match(header, /FinVerse/);
  const sidebar = render(
    createElement(Sidebar, { onTransactions: noop, onReport: noop }),
  );
  assert.match(sidebar, /href="#overview"/);
  const menu = render(
    createElement(ProfileMenu, {
      user: stubUser,
      onSignOut: noop,
      isSigningOut: false,
      signOutError: "",
    }),
  );
  // Closed, the menu shows only the user's initials.
  assert.match(menu, />TU</);
});

const dialogProps = {
  onClose: noop,
  transactions,
  transactionsLoading: false,
  transactionsError: "",
  onRetryTransactions: noop,
  notifications: [
    {
      billId: "b2",
      billName: "Broadband",
      kind: "overdue",
      dueDate: bills[1].dueDate,
      amountDue: 999,
      daysUntilDue: -2,
    },
  ],
  notificationsLoading: false,
  notificationsError: "",
  onRetryNotifications: noop,
  query: "",
  onQuery: noop,
  profile: stubProfile,
  onTransaction: asyncNoop,
  editingTransaction: null,
  onEditTransaction: noop,
  onRemoveTransaction: noop,
  onTransactionEdit: asyncNoop,
  onTransactionRemove: asyncNoop,
};

test("DashboardDialog renders every dialog kind with its title", () => {
  const titles = {
    transaction: "Add transaction",
    transactions: "Transactions",
    goal: "Add savings goal",
    report: "Account report",
    notifications: "Notifications",
  };
  for (const [kind, title] of Object.entries(titles)) {
    const html = render(
      createElement(DashboardDialog, { ...dialogProps, kind }),
    );
    assert.ok(html.includes(title), `expected ${kind} to show ${title}`);
  }
  const editing = render(
    createElement(DashboardDialog, {
      ...dialogProps,
      kind: "edit-transaction",
      editingTransaction: transactions[0],
    }),
  );
  assert.match(editing, /Edit transaction/);
  assert.match(editing, /Swiggy dinner/);
  const removing = render(
    createElement(DashboardDialog, {
      ...dialogProps,
      kind: "remove-transaction",
      editingTransaction: transactions[0],
    }),
  );
  assert.match(removing, /Remove transaction/);
  assert.match(removing, /Swiggy dinner/);
});

test("DashboardDialog exposes the CSV, PDF and Excel exports", () => {
  const html = render(
    createElement(DashboardDialog, { ...dialogProps, kind: "transactions" }),
  );
  assert.match(html, /Export CSV/);
  assert.match(html, /Export PDF/);
  assert.match(html, /Export Excel/);
  const report = render(
    createElement(DashboardDialog, { ...dialogProps, kind: "report" }),
  );
  assert.match(report, /Account report/);
  assert.match(report, /Export PDF/);
});

test("DashboardDialog notifications list the overdue bill", () => {
  const html = render(
    createElement(DashboardDialog, { ...dialogProps, kind: "notifications" }),
  );
  assert.match(html, /Notifications/);
  assert.match(html, /Broadband/);
});

test("TransactionForm renders every field and prefills the initial record", () => {
  const html = render(
    createElement(TransactionForm, {
      initial: transactions[0],
      submitLabel: "Save transaction",
      onSubmit: asyncNoop,
      onClose: noop,
      onSavingChange: noop,
    }),
  );
  assert.match(html, /name="name"/);
  assert.match(html, /name="amount"/);
  assert.match(html, /name="category"/);
  assert.match(html, /name="date"/);
  assert.match(html, /name="type"/);
  assert.match(html, /value="Swiggy dinner"/);
  assert.match(html, /Save transaction/);
});

test("ExpenseEntry offers plain words, voice and receipt capture", () => {
  const html = render(
    createElement(ExpenseEntry, {
      onTransaction: asyncNoop,
      disabled: false,
    }),
  );
  assert.match(html, /Add an expense in plain words/);
  assert.match(html, /e\.g\. coffee 250, or lunch Rs 1,250 yesterday/);
  assert.match(
    html,
    /Photograph a receipt — the photo never leaves your device/,
  );
});

test("AiChat renders the prompt box and its helper states", () => {
  const html = render(createElement(AiChat));
  assert.match(html, /Ask FinVerse AI/);
  assert.match(html, /Why did I overspend on food this month\?/);
  assert.match(html, /AI mode/);
  assert.equal(aiErrorMessage(new Error("boom")), "boom");
  assert.equal(
    aiErrorMessage(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    ),
    "FinVerse AI took too long to answer. Please try again.",
  );
  assert.equal(
    aiErrorMessage(new ActivityApiError("slow down", 429)),
    "You are asking too quickly. Please wait a moment and try again.",
  );
  const reasoning = render(createElement(ReasoningIndicator));
  assert.ok(reasoning.length > 0);
  const verified = render(
    createElement(VerificationNote, {
      verification: { status: "verified", checksPassed: 2 },
    }),
  );
  assert.match(verified, /Verified against your data \(2 checks passed\)/);
  const template = render(
    createElement(VerificationNote, {
      verification: { status: "template", checksPassed: 0 },
    }),
  );
  assert.match(template, /generated from your verified numbers instead/);
  const unverified = render(
    createElement(VerificationNote, {
      verification: { status: "unverified", checksPassed: 0 },
    }),
  );
  assert.equal(unverified, "");
});

test("Dashboard renders every section with the profile data", () => {
  const html = render(
    createElement(Dashboard, {
      user: stubUser,
      profileData: stubProfileData,
    }),
  );
  for (const section of [
    "FinVerse",
    "Monthly income",
    "Recorded cash flow",
    "Planned Expense Breakdown",
    "Recent Transactions",
    "Spending Analysis",
    "Upcoming Bills",
    "Investment readiness",
    "Budget Status",
    "Ask FinVerse AI",
    "Add an expense in plain words",
  ]) {
    assert.ok(
      html.includes(section),
      `expected the dashboard to show ${section}`,
    );
  }
});

test("FinancialProfileForm starts on Income with the saved values", () => {
  const html = render(
    createElement(FinancialProfileForm, {
      initialData: stubProfileData,
      onSaved: noop,
      onCancel: noop,
      onSavingChange: noop,
    }),
  );
  assert.match(html, />Income</);
  assert.match(html, /85000/);
  assert.match(html, /1\. Income/);
  assert.match(html, /4\. Investing profile/);
});

test("FinancialProfileForm opens on a later step when asked", () => {
  const html = render(
    createElement(FinancialProfileForm, {
      initialData: stubProfileData,
      initialStep: 2,
      onSaved: noop,
      onCancel: noop,
      onSavingChange: noop,
    }),
  );
  assert.match(html, />Savings and goals</);
});

test("BudgetFields reports the allocation total and the remaining share", () => {
  const full = render(
    createElement(BudgetFields, {
      income: "85000",
      split: stubProfile.budget_split,
      onChange: noop,
    }),
  );
  assert.match(full, /100% allocated/);
  const partial = render(
    createElement(BudgetFields, {
      income: "85000",
      split: { rent: 30, groceries: 15 },
      onChange: noop,
    }),
  );
  assert.match(partial, /45% allocated/);
  assert.match(partial, /55% remaining/);
});

test("OnboardingForm starts by asking for the user's name", () => {
  const html = render(
    createElement(OnboardingForm, { initialName: "Test User" }),
  );
  assert.match(html, /What should we call you\?/);
  assert.match(html, /value="Test User"/);
});

test("AuthForm renders the login and sign-up copy with the Google button", () => {
  const login = render(
    createElement(AuthForm, { mode: "login", googleAuthEnabled: true }),
  );
  assert.match(login, /Log in to FinVerse\./);
  assert.match(login, /Welcome back/);
  assert.match(login, /Continue with Google/);
  assert.match(login, /\/auth\/sign-up/);
  const signup = render(
    createElement(AuthForm, { mode: "sign-up", googleAuthEnabled: true }),
  );
  assert.match(signup, /Create your FinVerse account\./);
  assert.match(signup, /\/auth\/login/);
  const disabled = render(
    createElement(AuthForm, { mode: "login", googleAuthEnabled: false }),
  );
  assert.match(disabled, /disabled/);
});

test("LandingPage renders the hero and the section headings", () => {
  const html = render(createElement(LandingPage));
  assert.match(html, /Your money\./);
  assert.match(html, /Made clear\./);
  assert.match(html, /Your monthly budget, in rupees/);
  assert.match(html, /How it works/);
  assert.match(html, /What to expect/);
});

test("LandingMotion renders nothing without JavaScript", () => {
  assert.equal(render(createElement(LandingMotion)), "");
});

test("ProfileLoading and ProfileError render their states", () => {
  assert.match(
    render(createElement(ProfileLoading)),
    /Loading your financial profile\.\.\./,
  );
  const error = render(createElement(ProfileError, { retry: noop }));
  assert.match(error, /Unable to load your financial profile/);
  assert.match(error, /Try again/);
});

test("MarketShell frames a market page with its heading and children", () => {
  const html = render(
    createElement(
      MarketShell,
      {
        user: stubUser,
        eyebrow: "Markets",
        title: "Market",
        description: "Prices from Yahoo Finance.",
      },
      createElement("p", null, "Page body"),
    ),
  );
  assert.match(html, /Markets/);
  assert.match(html, /Prices from Yahoo Finance\./);
  assert.match(html, /Page body/);
});

test("PortfolioSection values the holdings and shows the return metrics", () => {
  const html = render(
    createElement(PortfolioSection, {
      summary: portfolioSummary,
      loading: false,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(html, /₹48,000/);
  assert.match(html, /₹44,000/);
  assert.match(html, /\+9\.09%/);
  const loading = render(
    createElement(PortfolioSection, {
      summary: null,
      loading: true,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(loading, /Loading portfolio…/);
  const empty = render(
    createElement(PortfolioSection, {
      summary: { ...portfolioSummary, holdings: [] },
      loading: false,
      error: "",
      onRetry: noop,
    }),
  );
  assert.match(empty, /No holdings yet/);
});

test("HoldingsSection lists each holding with its gain or loss", () => {
  const html = render(
    createElement(HoldingsSection, {
      summary: portfolioSummary,
      loading: false,
      error: "",
      onChanged: noop,
    }),
  );
  assert.match(html, /RELIANCE/);
  assert.match(html, /TCS/);
  assert.match(html, /\+20\.83%/);
  assert.match(html, /-5\.00%/);
  const loading = render(
    createElement(HoldingsSection, {
      summary: null,
      loading: true,
      error: "",
      onChanged: noop,
    }),
  );
  assert.match(loading, /Loading holdings…/);
  const empty = render(
    createElement(HoldingsSection, {
      summary: { ...portfolioSummary, holdings: [] },
      loading: false,
      error: "",
      onChanged: noop,
    }),
  );
  assert.match(empty, /No holdings yet/);
});

test("OptimizerSection asks for two priced holdings and fetches history for them", () => {
  const needsTwo = render(
    createElement(OptimizerSection, { holdings: [valuedHoldings[0]] }),
  );
  assert.match(
    needsTwo,
    /Add at least two holdings with live prices to compare allocations\./,
  );
  const fetching = render(
    createElement(OptimizerSection, { holdings: valuedHoldings }),
  );
  assert.match(fetching, /Suggested allocation/);
  assert.match(fetching, /Fetching a year of prices for your holdings…/);
});

test("ScreenerSection renders the filter mode with its screen button", () => {
  const html = render(createElement(ScreenerSection));
  assert.match(html, /Smart stock screener/);
  assert.match(html, /Loading the stock universe…/);
  assert.match(html, /All sectors/);
});

test("PriceChart, RsiChart and MacdChart render SVGs from history", () => {
  const price = render(
    createElement(PriceChart, { bars: historyBars, currency: "INR" }),
  );
  assert.match(price, /<svg/);
  assert.match(price, /<path/);
  const rsi = render(
    createElement(RsiChart, { values: rsiValues, dates: historyDates }),
  );
  assert.match(rsi, /<svg/);
  const short = render(
    createElement(RsiChart, {
      values: [null, 50],
      dates: ["2026-11-22", "2026-11-23"],
    }),
  );
  assert.match(short, /RSI needs at least 15 trading days of history\./);
  const macd = render(
    createElement(MacdChart, { values: macdValues, dates: historyDates }),
  );
  assert.match(macd, /<svg/);
});

test("HoldingForm renders its fields and can lock the symbol", () => {
  const html = render(
    createElement(HoldingForm, {
      title: "Add holding",
      submitLabel: "Add holding",
      initial: { symbol: "RELIANCE" },
      onSubmit: asyncNoop,
      onClose: noop,
    }),
  );
  assert.match(html, /Add holding/);
  assert.match(html, /value="RELIANCE"/);
  const locked = render(
    createElement(HoldingForm, {
      title: "Edit holding",
      submitLabel: "Save holding",
      initial: {
        symbol: "RELIANCE",
        quantity: 10,
        buyPrice: 2400,
        buyDate: "2025-01-15",
      },
      lockSymbol: true,
      onSubmit: asyncNoop,
      onClose: noop,
    }),
  );
  assert.match(locked, /readOnly/);
});

test("StockNewsSection renders its loading state for the symbol", () => {
  const html = render(createElement(StockNewsSection, { symbol: "RELIANCE" }));
  assert.match(html, /News &amp; sentiment/);
  assert.match(html, /Loading news…/);
});

test("StockProfile renders the loading states for a symbol", () => {
  const html = render(
    createElement(StockProfile, { symbol: "RELIANCE", user: stubUser }),
  );
  assert.match(html, /Loading RELIANCE…/);
  assert.match(html, /Loading price history…/);
  assert.match(html, /Loading fundamentals…/);
});

test("Market renders the indices, search, watchlist and portfolio sections", () => {
  const html = render(createElement(Market, { user: stubUser }));
  assert.match(html, /Benchmarks/);
  assert.match(html, /Loading stock prices and technical indicators…/);
  assert.match(html, /Market overview/);
});
