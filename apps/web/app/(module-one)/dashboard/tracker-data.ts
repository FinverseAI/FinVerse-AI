import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { onboardingBudgets } from "../../../lib/onboarding";
import { normalizeCategory, type Transaction } from "./data";
import {
  monthlyBalanceHistory,
  runningTotalAt,
  shiftMonth,
} from "./spending-data";

export const monthNames = [
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
] as const;

const expenseGroups = [
  { label: "Food", categories: ["Food & Dining", "Groceries"] },
  { label: "Transport", categories: ["Transport"] },
  { label: "Shopping", categories: ["Shopping"] },
  { label: "Housing", categories: ["Rent", "Bills & Utilities"] },
  { label: "Entertainment", categories: ["Entertainment"] },
  { label: "Other", categories: [] },
];

export function trackerData(
  transactions: Transaction[],
  profile: FinancialProfile,
  month: string,
) {
  const history = monthlyBalanceHistory(transactions);
  const byMonth = new Map(history.map((row) => [row.month, row]));
  const selected = byMonth.get(month);
  const balance = runningTotalAt(history, month);
  const previousMonth = shiftMonth(month, -1);
  const previous = runningTotalAt(history, previousMonth);
  const plan = profileTotals(profile);
  const records = transactions.filter((item) =>
    item.date.startsWith(month + "-"),
  );
  const income = records.filter((item) => item.amount > 0);
  const expenses = records.filter((item) => item.amount < 0);
  const byDay = new Map<string, number>();
  for (const item of records) {
    byDay.set(
      item.date,
      (byDay.get(item.date) ?? 0) + Math.round(item.amount * 100),
    );
  }
  let running = Math.round(previous * 100);
  const sparkline = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, flow]) => {
      running += flow;
      return { day: Number(date.slice(-2)), balance: running / 100 };
    });
  const groupIndex = (category: string) => {
    const index = expenseGroups.findIndex((group) =>
      group.categories.includes(normalizeCategory(category)),
    );
    return index < 0 ? expenseGroups.length - 1 : index;
  };
  const groups = expenseGroups.map(({ label }) => ({
    label,
    cents: 0,
    budgetCents: 0,
    amounts: [] as number[],
  }));
  for (const { name, limit } of onboardingBudgets(profile)) {
    groups[groupIndex(name)]!.budgetCents += Math.round(limit * 100);
  }
  for (const item of expenses) {
    const group = groups[groupIndex(item.category)]!;
    group.cents += Math.round(-item.amount * 100);
    group.amounts.push(-item.amount);
  }

  return {
    balance: history.length && month >= history[0]!.month ? balance : null,
    change: previous ? ((balance - previous) / Math.abs(previous)) * 100 : null,
    metrics: [
      {
        label: "Income",
        actual: income.length ? selected!.income : null,
        target: plan.income,
      },
      {
        label: "Expense",
        actual: expenses.length ? selected!.expenses : null,
        target: plan.expenses,
      },
      { label: "Savings", actual: selected?.net ?? null, target: plan.target },
    ],
    highestIncome: income.reduce<Transaction | null>(
      (highest, item) =>
        !highest || item.amount > highest.amount ? item : highest,
      null,
    ),
    highestExpense: expenses.reduce<Transaction | null>(
      (highest, item) =>
        !highest || item.amount < highest.amount ? item : highest,
      null,
    ),
    groups: groups.map(({ label, cents, budgetCents, amounts }) => ({
      label,
      total: cents / 100,
      budget: budgetCents / 100,
      amounts,
    })),
    counts: [
      { label: "Transactions", value: records.length },
      { label: "Income entries", value: income.length },
      { label: "Expenses", value: expenses.length },
      {
        label: "Categories",
        value: new Set(expenses.map((item) => normalizeCategory(item.category)))
          .size,
      },
    ],
    sparkline,
    months: monthNames.map((name, index) => {
      const key = month.slice(0, 5) + String(index + 1).padStart(2, "0");
      const row = byMonth.get(key);
      return {
        key,
        name,
        net: row?.count ? row.net : null,
        gross: row?.count ? row.income : null,
      };
    }),
    netTarget: plan.income - plan.expenses,
    grossTarget: plan.income,
  };
}
