// Realistic fixtures shared by the render tests. Dates are relative to
// today so month-based components (cash flow, spending analysis, bills)
// always have something in the current month to show.
export {
  stubGoals,
  stubProfile,
  stubProfileData,
  stubUser,
} from "./stubs/profile-guard.mjs";

function dateKey(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  // Local date parts, NOT toISOString(): the dashboard's week/month
  // logic uses local dates, and toISOString() (UTC) slips a day
  // behind whenever local time is past midnight but UTC is still
  // the previous day (00:00–05:30 IST) — t1 landed on Sunday and
  // dropped out of "this week", failing the render test only at
  // night. Fixed 2026-11-24 after the harsh-test pass caught it.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const transactions = [
  {
    id: "t1",
    name: "Swiggy dinner",
    category: "Food & Dining",
    amount: -850,
    // This week's Monday, so the weekly spending breakdown always sees it
    // (a fixed "2 days ago" falls in the previous week on a Monday).
    date: dateKey(-((new Date().getDay() + 6) % 7)),
  },
  {
    id: "t2",
    name: "Monthly salary",
    category: "Income",
    amount: 85000,
    date: dateKey(-10),
  },
  {
    id: "t3",
    name: "Metro recharge",
    category: "Transport",
    amount: -500,
    date: dateKey(0),
  },
];

export const bills = [
  {
    id: "b1",
    name: "Electricity",
    amount: 2400,
    dueDate: dateKey(3),
    autoPay: true,
    recurrence: "monthly",
    paidTotal: 0,
  },
  {
    id: "b2",
    name: "Broadband",
    amount: 999,
    dueDate: dateKey(-2),
    autoPay: false,
    recurrence: "monthly",
    paidTotal: 0,
  },
  {
    id: "b3",
    name: "One-off repair",
    amount: 5000,
    dueDate: dateKey(10),
    autoPay: false,
    recurrence: null,
    paidTotal: 2000,
  },
];

export const budgets = [
  { name: "Rent", spent: 25000, limit: 25500 },
  { name: "Groceries", spent: 9000, limit: 13500 },
  { name: "Food & Dining", spent: 8200, limit: 9000 },
];

/** A fake useActivity return value with canned items and no-op actions. */
export function fakeActivity(items, overrides = {}) {
  return {
    items,
    loading: false,
    error: "",
    retry: () => {},
    add: async () => {},
    update: async () => {},
    append: () => {},
    patch: () => {},
    remove: async () => {},
    ...overrides,
  };
}

export const valuedHoldings = [
  {
    id: "h1",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    sector: "Energy",
    quantity: 10,
    buyPrice: 2400,
    buyDate: "2025-01-15",
    currentPrice: 2900,
    currentValue: 29000,
    investedValue: 24000,
    gainLoss: 5000,
    gainLossPercent: 20.83,
    fetchedAt: "2026-11-23T10:00:00.000Z",
    stale: false,
    priced: true,
  },
  {
    id: "h2",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    sector: "Technology",
    quantity: 5,
    buyPrice: 4000,
    buyDate: "2025-03-10",
    currentPrice: 3800,
    currentValue: 19000,
    investedValue: 20000,
    gainLoss: -1000,
    gainLossPercent: -5,
    fetchedAt: "2026-11-23T10:00:00.000Z",
    stale: false,
    priced: true,
  },
];

export const portfolioSummary = {
  holdings: valuedHoldings,
  totals: {
    totalValue: 48000,
    totalInvested: 44000,
    totalGainLoss: 4000,
    totalGainLossPercent: 9.09,
  },
  sectors: [
    { sector: "Energy", value: 29000, weight: 60.42 },
    { sector: "Technology", value: 19000, weight: 39.58 },
  ],
  unavailable: [],
  asOf: "2026-11-23T10:00:00.000Z",
  stale: false,
};

/** Thirty days of gently rising bars, newest last. */
export const historyBars = Array.from({ length: 30 }, (_, index) => {
  const date = new Date("2026-10-25T00:00:00.000Z");
  date.setDate(date.getDate() + index);
  const close = 2800 + index * 7;
  return {
    date: date.toISOString().slice(0, 10),
    open: close - 5,
    high: close + 12,
    low: close - 9,
    close,
    volume: 1000000 + index * 1000,
  };
});

export const historyDates = historyBars.map((bar) => bar.date);

export const rsiValues = historyBars.map((_, index) =>
  index < 14 ? null : 45 + ((index * 3) % 20),
);

export const macdValues = historyBars.map((_, index) =>
  index < 26
    ? null
    : {
        macd: 12.5 + index,
        signal: 10 + index,
        histogram: 2.5,
      },
);
