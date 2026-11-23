import assert from "node:assert/strict";
import test from "node:test";
import { transactionsToPdf } from "../lib/export-pdf.ts";

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
