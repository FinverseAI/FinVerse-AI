import type { Budget, Transaction } from "./data";

export function monthlyCashFlow(transactions: Transaction[], month: string) {
  const records = transactions.filter((item) =>
    item.date.startsWith(`${month}-`),
  );
  const income = records.reduce(
    (sum, item) => sum + (item.amount > 0 ? Math.round(item.amount * 100) : 0),
    0,
  );
  const expenses = records.reduce(
    (sum, item) => sum + (item.amount < 0 ? Math.round(-item.amount * 100) : 0),
    0,
  );
  return {
    count: records.length,
    income: income / 100,
    expenses: expenses / 100,
    net: (income - expenses) / 100,
  };
}

export function shiftMonth(month: string, offset: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(year!, index! - 1 + offset, 1);
  return dateKey(date).slice(0, 7);
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftDate(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function periodRange(period: "weekly" | "monthly", now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start =
    period === "weekly"
      ? shiftDate(today, -((today.getDay() + 6) % 7))
      : new Date(today.getFullYear(), today.getMonth(), 1);
  const end =
    period === "weekly"
      ? shiftDate(start, 6)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start: dateKey(start), end: dateKey(end) };
}

// Older transaction labels map to the equivalent onboarding budget categories.
export function budgetsWithSpending(
  budgets: Budget[],
  transactions: Transaction[],
  now: Date,
) {
  const aliases: Record<string, string> = {
    Housing: "Rent",
    Transportation: "Transport",
    Utilities: "Bills & Utilities",
    Other: "Others",
  };
  const start = periodRange("monthly", now).start;
  const end = dateKey(now);
  return budgets.map((budget) => ({
    ...budget,
    spent:
      transactions.reduce((sum, transaction) => {
        const matches =
          transaction.category === budget.name ||
          aliases[transaction.category] === budget.name;
        return (
          sum +
          (matches &&
          transaction.amount < 0 &&
          transaction.date >= start &&
          transaction.date <= end
            ? Math.round(-transaction.amount * 100)
            : 0)
        );
      }, 0) / 100,
  }));
}

function expenseCents(transactions: Transaction[], start: string, end: string) {
  return transactions.reduce(
    (sum, item) =>
      sum +
      (item.amount < 0 && item.date >= start && item.date <= end
        ? Math.round(-item.amount * 100)
        : 0),
    0,
  );
}

export function spendingSummary(transactions: Transaction[], now: Date) {
  const year = now.getFullYear(),
    month = now.getMonth(),
    day = now.getDate();
  const today = dateKey(now);
  const monthStart = dateKey(new Date(year, month, 1));
  const lastMonthStart = dateKey(new Date(year, month - 1, 1));
  const lastMonthEnd = dateKey(
    new Date(
      year,
      month - 1,
      Math.min(day, new Date(year, month, 0).getDate()),
    ),
  );
  const monthCents = expenseCents(transactions, monthStart, today);
  const previousMonthCents = expenseCents(
    transactions,
    lastMonthStart,
    lastMonthEnd,
  );
  const week = periodRange("weekly", now);
  const previousStart = dateKey(
    shiftDate(new Date(`${week.start}T12:00:00`), -7),
  );
  const previousEnd = dateKey(shiftDate(now, -7));
  const weekCents = expenseCents(transactions, week.start, today);
  const previousWeekCents = expenseCents(
    transactions,
    previousStart,
    previousEnd,
  );
  return {
    monthTotal: monthCents / 100,
    monthDifference: (monthCents - previousMonthCents) / 100,
    previousMonthTotal: previousMonthCents / 100,
    weekChange: previousWeekCents
      ? ((weekCents - previousWeekCents) / previousWeekCents) * 100
      : null,
    projection:
      Math.round((monthCents / day) * new Date(year, month + 1, 0).getDate()) /
      100,
    categoryCount: new Set(
      transactions
        .filter(
          (item) =>
            item.amount < 0 && item.date >= monthStart && item.date <= today,
        )
        .map((item) => item.category),
    ).size,
  };
}

export function spendingBreakdown(
  transactions: Transaction[],
  start: string,
  end: string,
) {
  const expenses = transactions.filter(
    (item) => item.amount < 0 && item.date >= start && item.date <= end,
  );
  const categories = new Map<string, number>();
  for (const expense of expenses)
    categories.set(
      expense.category,
      (categories.get(expense.category) ?? 0) +
        Math.round(-expense.amount * 100),
    );
  const totalCents = [...categories.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const firstDay = new Date(`${start}T12:00:00`);
  const lastDay = new Date(`${end}T12:00:00`);
  const days =
    Math.round(
      (Date.UTC(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()) -
        Date.UTC(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          firstDay.getDate(),
        )) /
        86400000,
    ) + 1;
  if (!Number.isFinite(days) || days < 1 || days > 366)
    return { total: 0, categories: [], bars: [] };
  const interval = Math.ceil(days / 31);
  const bars = [];
  for (let day = 0; day < days; day += interval) {
    const date = shiftDate(firstDay, day);
    const bucketStart = dateKey(date);
    const bucketEnd = dateKey(
      shiftDate(firstDay, Math.min(day + interval - 1, days - 1)),
    );
    bars.push({
      date: bucketStart,
      end: bucketEnd,
      amount: expenseCents(expenses, bucketStart, bucketEnd) / 100,
    });
  }
  return {
    total: totalCents / 100,
    categories: [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, cents]) => ({
        name,
        amount: cents / 100,
        percentage: totalCents ? (cents / totalCents) * 100 : 0,
      })),
    bars,
  };
}
