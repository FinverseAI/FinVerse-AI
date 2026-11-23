import { normalizeCategory, type Budget, type Transaction } from "./data.ts";

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

export type MonthlyBalance = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  /** Cumulative net flow since the first recorded month. */
  runningTotal: number;
  count: number;
};

/**
 * Monthly balance history, reconstructed purely from recorded
 * transactions: each month's income, expenses, net flow, and the
 * running total of net flow since the first recorded month. Months
 * with no transactions are included with a zero net, so the running
 * total carries forward visibly instead of vanishing.
 *
 * The running total starts at ₹0 at the first recorded transaction:
 * it shows how recorded activity adds up, not a bank balance.
 */
export function monthlyBalanceHistory(
  transactions: Transaction[],
): MonthlyBalance[] {
  if (!transactions.length) return [];
  const months = [
    ...new Set(transactions.map((item) => item.date.slice(0, 7))),
  ].sort();
  const first = months[0]!;
  const last = months[months.length - 1]!;
  const history: MonthlyBalance[] = [];
  let runningPaise = 0;
  for (let month = first; month <= last; month = shiftMonth(month, 1)) {
    const flow = monthlyCashFlow(transactions, month);
    runningPaise += Math.round(flow.net * 100);
    history.push({
      month,
      income: flow.income,
      expenses: flow.expenses,
      net: flow.net,
      runningTotal: runningPaise / 100,
      count: flow.count,
    });
  }
  return history;
}

/** The running total at the end of a month: 0 before any activity, the latest total after it. */
export function runningTotalAt(
  history: MonthlyBalance[],
  month: string,
): number {
  let total = 0;
  for (const row of history) {
    if (row.month > month) break;
    total = row.runningTotal;
  }
  return total;
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
  const start = periodRange("monthly", now).start;
  const end = dateKey(now);
  return budgets.map((budget) => ({
    ...budget,
    spent:
      transactions.reduce((sum, transaction) => {
        const matches = normalizeCategory(transaction.category) === budget.name;
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

export function spendingSummary(
  transactions: Transaction[],
  now: Date,
  bills: BillForForecast[] = [],
) {
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
  // Committed spending (team decision, 24 November 2026): unpaid
  // bills due by month-end count in the forecast. The rate estimate
  // only extrapolates what is already recorded, so a bill that has
  // not been paid yet would otherwise be invisible until it lands.
  // Once a bill is paid it leaves the committed total and its
  // payment transaction joins the recorded rate instead, so it is
  // never counted twice.
  const monthEnd = dateKey(new Date(year, month + 1, 0));
  const committed = committedBills(bills, monthEnd);
  const rateProjection =
    Math.round((monthCents / day) * new Date(year, month + 1, 0).getDate()) /
    100;
  return {
    monthTotal: monthCents / 100,
    monthDifference: (monthCents - previousMonthCents) / 100,
    previousMonthTotal: previousMonthCents / 100,
    weekChange: previousWeekCents
      ? ((weekCents - previousWeekCents) / previousWeekCents) * 100
      : null,
    projection: Math.round((rateProjection + committed.total) * 100) / 100,
    committedBills: committed.total,
    committedBillCount: committed.count,
    categoryCount: new Set(
      transactions
        .filter(
          (item) =>
            item.amount < 0 && item.date >= monthStart && item.date <= today,
        )
        .map((item) => normalizeCategory(item.category)),
    ).size,
  };
}

/** The bill fields a forecast needs: due date, amount, and what is already paid. */
export type BillForForecast = {
  dueDate: string;
  amount: number;
  paidTotal?: number;
};

/**
 * Committed spending: the unpaid remainders of bills due on or
 * before `through` (an ISO date). Overdue bills count — the money is
 * still owed — but bills due after `through` belong to a later
 * period. Fully paid bills contribute nothing.
 */
export function committedBills(
  bills: BillForForecast[],
  through: string,
): { total: number; count: number } {
  let totalCents = 0;
  let count = 0;
  for (const bill of bills) {
    if (!bill.dueDate || bill.dueDate > through) continue;
    const remaining = Math.round((bill.amount - (bill.paidTotal ?? 0)) * 100);
    if (remaining <= 0) continue;
    totalCents += remaining;
    count++;
  }
  return { total: totalCents / 100, count };
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
  for (const expense of expenses) {
    // Legacy labels merge into their canonical category, so one
    // category never appears twice in the breakdown.
    const name = normalizeCategory(expense.category);
    categories.set(
      name,
      (categories.get(name) ?? 0) + Math.round(-expense.amount * 100),
    );
  }
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
