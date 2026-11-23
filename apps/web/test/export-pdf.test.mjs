import assert from "node:assert/strict";
import test from "node:test";
import { accountReportToPdf, transactionsToPdf } from "../lib/export-pdf.ts";

const sample = [
  { name: "Salary", amount: 50000, date: "2026-11-01", category: "Income" },
  {
    name: "Weekly groceries at the market",
    amount: -1234.5,
    date: "2026-11-02",
    category: "Groceries",
  },
];

test("exports transactions as a valid PDF with the table contents", async () => {
  const bytes = await transactionsToPdf(sample);
  const text = new TextDecoder("latin1").decode(bytes);
  assert.equal(text.slice(0, 5), "%PDF-");
  assert.ok(text.includes("FinVerse"));
  assert.ok(text.includes("Salary"));
  assert.ok(text.includes("Weekly groceries at the market"));
  assert.ok(text.includes("Groceries"));
  assert.ok(text.includes("Rs. 50,000.00"));
  assert.ok(text.includes("-Rs. 1,234.50"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
});

test("an empty export is still a valid PDF", async () => {
  const bytes = await transactionsToPdf([]);
  const text = new TextDecoder("latin1").decode(bytes);
  assert.equal(text.slice(0, 5), "%PDF-");
  assert.ok(text.includes("No transactions to show."));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
});

test("long names are truncated instead of overflowing the column", async () => {
  const bytes = await transactionsToPdf([
    {
      name: "A very long merchant name that would never fit in one column",
      amount: -10,
      date: "2026-11-03",
      category: "Shopping",
    },
  ]);
  const text = new TextDecoder("latin1").decode(bytes);
  assert.ok(!text.includes("would never fit in one column"));
  assert.ok(text.includes("A very long merchant name"));
});

test("account report pdf shows the plan and the actuals as separate sections", async () => {
  const bytes = await accountReportToPdf({
    generatedOn: "2026-11-24",
    monthLabel: "November 2026",
    plan: {
      savings: 120000,
      income: 60000,
      expenses: 38000,
      target: 12000,
      surplus: 10000,
    },
    actual: { income: 60000, expenses: 14250.5, net: 45749.5, count: 12 },
    committedBills: { total: 1399, count: 3 },
  });
  const text = new TextDecoder("latin1").decode(bytes);
  assert.equal(text.slice(0, 5), "%PDF-");
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.ok(text.includes("Account Report"));
  assert.ok(text.includes("Monthly plan"));
  assert.ok(text.includes("Rs. 1,20,000.00")); // en-IN grouping
  assert.ok(text.includes("Actual"));
  assert.ok(text.includes("November 2026"));
  assert.ok(text.includes("Rs. 14,250.50"));
  assert.ok(text.includes("Rs. 45,749.50"));
  assert.ok(text.includes("Rs. 1,399.00"));
  assert.ok(text.includes("12 recorded transactions"));
});

test("account report pdf stays valid with no recorded activity and no unpaid bills", async () => {
  const bytes = await accountReportToPdf({
    generatedOn: "2026-11-24",
    monthLabel: "November 2026",
    plan: { savings: 0, income: 0, expenses: 0, target: 0, surplus: 0 },
    actual: { income: 0, expenses: 0, net: 0, count: 0 },
    committedBills: { total: 0, count: 0 },
  });
  const text = new TextDecoder("latin1").decode(bytes);
  assert.equal(text.slice(0, 5), "%PDF-");
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.ok(text.includes("0 recorded transactions"));
  assert.ok(text.includes("Rs. 0.00"));
});
