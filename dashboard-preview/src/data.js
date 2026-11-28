export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const categories = [
  { name: "Food", budget: 1350, transactions: [360, 308, 280, 65] },
  { name: "Transport", budget: 410, transactions: [235, 45] },
  { name: "Shopping", budget: 370, transactions: [192, 28] },
  { name: "Housing", budget: 1420, transactions: [395, 35] },
  { name: "Leisure", budget: 930, transactions: [140, 48] },
  { name: "Other", budget: 520, transactions: [117, 112] },
];

const ledger = [
  {
    balance: 4128.4,
    income: 3420,
    savings: 1180,
    expenseScale: 0.84,
    goals: [29, 39, 10],
  },
  {
    balance: 5075.6,
    income: 4180,
    savings: 1630,
    expenseScale: 0.93,
    goals: [33, 42, 11],
  },
  {
    balance: 4762.3,
    income: 3540,
    savings: 1210,
    expenseScale: 1.12,
    goals: [35, 44, 13],
  },
  {
    balance: 4551.2,
    income: 3390,
    savings: 1090,
    expenseScale: 1.19,
    goals: [39, 48, 14],
  },
  {
    balance: 5293.15,
    income: 4095,
    savings: 1580,
    expenseScale: 0.97,
    goals: [42, 53, 16],
  },
  {
    balance: 5330.2,
    income: 3820,
    savings: 1467.5,
    expenseScale: 1,
    goals: [46, 57, 18],
  },
  {
    balance: 5451.1,
    income: 4020,
    savings: 1540,
    expenseScale: 1.15,
    goals: [49, 60, 20],
  },
  {
    balance: 5716.75,
    income: 4185,
    savings: 1690,
    expenseScale: 1.07,
    goals: [53, 64, 22],
  },
  {
    balance: 5588.35,
    income: 3690,
    savings: 1320,
    expenseScale: 1.24,
    goals: [57, 68, 24],
  },
  {
    balance: 5940.1,
    income: 4290,
    savings: 1730,
    expenseScale: 0.91,
    goals: [61, 72, 26],
  },
  {
    balance: 6130.8,
    income: 4510,
    savings: 1880,
    expenseScale: 1.04,
    goals: [65, 77, 28],
  },
  {
    balance: 6257.45,
    income: 4630,
    savings: 1920,
    expenseScale: 1.32,
    goals: [69, 81, 31],
  },
];

const goalNames = ["Emergency Fund", "Investments", "Retirement"];
const sparkOffsets = [-550, -40, 410, 170, -190, -430, -250, 540, 810, 260, 0];
const incomeTarget = 5000;
const savingsTarget = 2500;
const expenseMaximum = categories.reduce(
  (sum, category) => sum + category.budget,
  0,
);
const round = (number) => Math.round(number * 100) / 100;

export const snapshots = ledger.map((entry, index) => {
  const expenses = categories.map(({ name, budget, transactions }) => {
    const amounts = transactions.map((value) =>
      round(value * entry.expenseScale),
    );
    return {
      name,
      budget,
      actual: round(amounts.reduce((sum, value) => sum + value, 0)),
      range: [Math.min(...amounts), Math.max(...amounts)],
      amounts,
    };
  });
  const previous = ledger[index - 1]?.balance ?? 4008.15;
  const amounts = expenses.flatMap((group) => group.amounts);
  const spending = round(
    expenses.reduce((sum, group) => sum + group.actual, 0),
  );
  const largestExpense = Math.max(...amounts);
  return {
    month: months[index],
    balance: entry.balance,
    balanceChange: ((entry.balance - previous) / previous) * 100,
    sparkline: sparkOffsets.map((offset, day) => ({
      day: day + 1,
      value: round(entry.balance + offset * (entry.expenseScale + 0.12)),
    })),
    metrics: [
      {
        name: "Income",
        tone: "green",
        actual: entry.income,
        target: incomeTarget,
      },
      {
        name: "Expense",
        tone: "cyan",
        actual: spending,
        target: expenseMaximum,
        limitLabel: "Maximum",
      },
      {
        name: "Savings",
        tone: "lavender",
        actual: entry.savings,
        target: savingsTarget,
      },
    ],
    expenses,
    expenseStats: [
      { label: "Transactions", count: amounts.length },
      { label: "< €100", count: amounts.filter((value) => value < 100).length },
      {
        label: "€100 – €500",
        count: amounts.filter((value) => value >= 100 && value <= 500).length,
      },
      {
        label: "> €500",
        count: amounts.filter((value) => value > 500).length || "—",
      },
    ],
    highestIncome: round(entry.income * 0.88),
    largestExpense,
    goals: goalNames.map((name, goal) => ({
      name,
      percent: entry.goals[goal],
    })),
    net: entry.income - spending,
    gross: entry.income,
  };
});

export function balanceSeries(activeMonth, gross) {
  return snapshots.map((snapshot, index) => {
    const value = gross ? snapshot.gross : snapshot.net;
    const recorded = index <= activeMonth;
    return {
      month: snapshot.month,
      value: recorded ? value : null,
      low: recorded ? value - (gross ? 360 : 420) : null,
      high: recorded ? value + (gross ? 420 : 460) : null,
    };
  });
}

const decimalEuro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function euros(value) {
  return decimalEuro.format(value);
}

export function compactEuros(value) {
  return `€${Math.round(value).toLocaleString("en-IE")}`;
}
