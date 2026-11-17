import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetsWithSpending,
  dateKey,
  periodRange,
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
    { name: "Housing", amount: 0.3, percentage: 100 },
  ]);
  assert.equal(result.bars[0].amount, 0.1);
  assert.equal(result.bars[6].amount, 0.2);
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
