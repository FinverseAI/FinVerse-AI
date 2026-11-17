import assert from "node:assert/strict";
import test from "node:test";
import { transactionsToCsv } from "../lib/export-csv.ts";

const rows = (csv) =>
  csv
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split("\r\n");

test("exports transactions with a header, dates and two-decimal amounts", () => {
  const csv = transactionsToCsv([
    { name: "Salary", amount: 50000, date: "2026-11-01", category: "Income" },
    {
      name: "Groceries",
      amount: -1234.5,
      date: "2026-11-02",
      category: "Food & Dining",
    },
  ]);
  assert.equal(csv.startsWith("\uFEFF"), true);
  assert.deepEqual(rows(csv), [
    "Date,Name,Category,Amount (₹)",
    "2026-11-01,Salary,Income,50000.00",
    "2026-11-02,Groceries,Food & Dining,-1234.50",
  ]);
});

test("quotes fields containing commas, quotes or newlines", () => {
  const csv = transactionsToCsv([
    {
      name: 'Cafe, "The Daily Grind"',
      amount: -250,
      date: "2026-11-03",
      category: "Food & Dining",
    },
    {
      name: "Line one\nLine two",
      amount: -10,
      date: "2026-11-04",
      category: "Others",
    },
  ]);
  assert.ok(
    csv.includes('"Cafe, ""The Daily Grind"""'),
    "commas and quotes are escaped",
  );
  assert.ok(csv.includes('"Line one\nLine two"'), "newlines are escaped");
});

test("exports only the header when there are no transactions", () => {
  assert.deepEqual(rows(transactionsToCsv([])), [
    "Date,Name,Category,Amount (₹)",
  ]);
});
