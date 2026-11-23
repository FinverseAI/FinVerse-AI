import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetsWithSpending,
  committedBills,
  dateKey,
  monthlyBalanceHistory,
  periodRange,
  runningTotalAt,
  spendingBreakdown,
  spendingSummary,
  monthlyCashFlow,
  shiftMonth,
} from "../app/(module-one)/dashboard/spending-data.ts";

test("cash flow uses recorded amounts and month navigation crosses years", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.deepEqual(
    monthlyCashFlow(
      [
        expense("2026-11-01", 100, "Income"),
        expense("2026-11-03", -0.1),
        expense("2026-11-04", -0.2),
        expense("2026-10-04", -50),
      ],
      "2026-11",
    ),
    { count: 3, income: 100, expenses: 0.3, net: 99.7 },
  );
});

test("budget spending is derived from saved current-month expenses and category aliases", () => {
  const budgets = [{ name: "Rent", limit: 2000, spent: 999 }];
  const transactions = [
    expense("2026-11-01", -1200, "Housing"),
    expense("2026-10-01", -500, "Housing"),
    expense("2026-11-02", 200, "Housing"),
    expense("2026-11-30", -300, "Housing"),
  ];
  assert.deepEqual(
    budgetsWithSpending(budgets, transactions, new Date(2026, 10, 13)),
    [{ name: "Rent", limit: 2000, spent: 1200 }],
  );
});

const expense = (date, amount, category = "Other") => ({
  id: `${date}-${amount}`,
  name: "Test",
  date,
  amount,
  category,
});

test("balance history reconstructs monthly running totals with gap months carried forward", () => {
  const history = monthlyBalanceHistory([
    expense("2026-09-01", 10000, "Income"),
    expense("2026-09-05", -2500.1, "Rent"),
    expense("2026-11-02", -0.2, "Groceries"),
  ]);
  assert.deepEqual(history, [
    {
      month: "2026-09",
      income: 10000,
      expenses: 2500.1,
      net: 7499.9,
      runningTotal: 7499.9,
      count: 2,
    },
    {
      month: "2026-10",
      income: 0,
      expenses: 0,
      net: 0,
      runningTotal: 7499.9,
      count: 0,
    },
    {
      month: "2026-11",
      income: 0,
      expenses: 0.2,
      net: -0.2,
      runningTotal: 7499.7,
      count: 1,
    },
  ]);
  assert.equal(runningTotalAt(history, "2026-08"), 0);
  assert.equal(runningTotalAt(history, "2026-09"), 7499.9);
  assert.equal(runningTotalAt(history, "2026-10"), 7499.9);
  assert.equal(runningTotalAt(history, "2026-12"), 7499.7);
});

test("balance history is empty without transactions", () => {
  assert.deepEqual(monthlyBalanceHistory([]), []);
  assert.equal(runningTotalAt([], "2026-11"), 0);
});

test("weeks start on Monday, including when the date is a Sunday", () => {
  assert.deepEqual(periodRange("weekly", new Date(2026, 10, 15)), {
    start: "2026-11-09",
    end: "2026-11-15",
  });
  assert.deepEqual(periodRange("monthly", new Date(2024, 1, 15)), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.equal(dateKey(new Date(2026, 0, 1)), "2026-01-01");
});

test("spending excludes income and dates outside the selected inclusive range", () => {
  const result = spendingBreakdown(
    [
      expense("2026-11-09", -0.1, "Housing"),
      expense("2026-11-15", -0.2, "Housing"),
      expense("2026-11-10", 5000, "Income"),
      expense("2026-11-08", -80),
      expense("2026-11-16", -90),
    ],
    "2026-11-09",
    "2026-11-15",
  );
  assert.equal(result.total, 0.3);
  assert.equal(result.bars.length, 7);
  assert.deepEqual(result.categories, [
    { name: "Rent", amount: 0.3, percentage: 100 },
  ]);
  assert.equal(result.bars[0].amount, 0.1);
  assert.equal(result.bars[6].amount, 0.2);
});

test("legacy and canonical labels merge into one breakdown row", () => {
  const result = spendingBreakdown(
    [
      expense("2026-11-09", -100, "Housing"),
      expense("2026-11-10", -50, "Rent"),
      expense("2026-11-11", -25, "Other"),
      expense("2026-11-12", -25, "Others"),
    ],
    "2026-11-09",
    "2026-11-12",
  );
  assert.equal(result.total, 200);
  assert.deepEqual(result.categories, [
    { name: "Rent", amount: 150, percentage: 75 },
    { name: "Others", amount: 50, percentage: 25 },
  ]);
});

test("comparisons use matching elapsed days and do not invent a percentage without a baseline", () => {
  const now = new Date(2026, 10, 13);
  const transactions = [
    expense("2026-11-09", -100),
    expense("2026-11-13", -30),
    expense("2026-11-14", -500),
    expense("2026-11-02", -50),
    expense("2026-10-01", -80),
    expense("2026-10-14", -999),
  ];
  const result = spendingSummary(transactions, now);
  assert.equal(result.monthTotal, 180);
  assert.equal(result.monthDifference, 100);
  assert.equal(result.weekChange, 160);
  assert.equal(result.projection, 415.38);
  assert.equal(spendingSummary([], now).weekChange, null);
});

test("month comparisons clamp to shorter prior months and cross year boundaries", () => {
  assert.equal(
    spendingSummary([expense("2026-02-28", -20)], new Date(2026, 2, 31))
      .previousMonthTotal,
    20,
  );
  assert.equal(
    spendingSummary([expense("2025-12-01", -20)], new Date(2026, 0, 1))
      .previousMonthTotal,
    20,
  );
});

test("unpaid bills due by month-end count as committed spending in the forecast", () => {
  const now = new Date(2026, 10, 13);
  const transactions = [
    expense("2026-11-09", -100),
    expense("2026-11-13", -30),
  ];
  const bills = [
    // Due this month, unpaid: counts in full.
    { dueDate: "2026-11-20", amount: 999 },
    // Due this month, partially paid: only the remainder counts.
    { dueDate: "2026-11-25", amount: 500, paidTotal: 200 },
    // Overdue and unpaid: still owed, still counts.
    { dueDate: "2026-10-28", amount: 100 },
    // Fully paid: contributes nothing.
    { dueDate: "2026-11-05", amount: 50, paidTotal: 50 },
    // Due next month: belongs to next month's forecast.
    { dueDate: "2026-12-01", amount: 10000 },
  ];
  const result = spendingSummary(transactions, now, bills);
  assert.equal(result.committedBills, 1399);
  assert.equal(result.committedBillCount, 3);
  // Rate estimate for 130 over 13 days of a 30-day month is 300;
  // committed bills add 1399.
  assert.equal(result.projection, 1699);
  // Without bills the projection is the rate estimate alone.
  assert.equal(spendingSummary(transactions, now).projection, 300);
  assert.equal(spendingSummary(transactions, now).committedBills, 0);
});

test("committed bills ignore missing due dates and overpayments", () => {
  assert.deepEqual(
    committedBills(
      [
        { dueDate: "", amount: 100 },
        { dueDate: "2026-11-20", amount: 100, paidTotal: 150 },
      ],
      "2026-11-30",
    ),
    { total: 0, count: 0 },
  );
});

test("long custom ranges aggregate without losing amounts, and invalid ranges stay empty", () => {
  const result = spendingBreakdown(
    [
      expense("2024-01-01", -1),
      expense("2024-02-29", -2),
      expense("2024-12-31", -3),
    ],
    "2024-01-01",
    "2024-12-31",
  );
  assert.ok(result.bars.length <= 31);
  assert.equal(
    result.bars.reduce((sum, bar) => sum + bar.amount, 0),
    6,
  );
  assert.equal(
    spendingBreakdown([], "2026-11-15", "2026-11-01").bars.length,
    0,
  );
  assert.equal(spendingBreakdown([], "", "").bars.length, 0);
});
