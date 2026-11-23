import assert from "node:assert/strict";
import test from "node:test";
import { transactionsToXlsx } from "../lib/export-xlsx.ts";

async function readWorkbook(bytes) {
  const loaded = await import("xlsx");
  const XLSX = loaded.default ?? loaded;
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets["Transactions"];
  assert.ok(sheet, "the Transactions sheet exists");
  return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

const sample = [
  { name: "Salary", amount: 50000, date: "2026-11-01", category: "Income" },
  {
    name: "Groceries, with a comma",
    amount: -1234.5,
    date: "2026-11-02",
    category: "Groceries",
  },
];

test("exports transactions as a real workbook with numeric amounts", async () => {
  const rows = await readWorkbook(await transactionsToXlsx(sample));
  assert.deepEqual(rows[0], ["Date", "Name", "Category", "Amount (₹)"]);
  assert.deepEqual(rows[1], ["2026-11-01", "Salary", "Income", 50000]);
  assert.deepEqual(rows[2], [
    "2026-11-02",
    "Groceries, with a comma",
    "Groceries",
    -1234.5,
  ]);
  assert.equal(typeof rows[1][3], "number");
});

test("an empty export still carries the header row", async () => {
  const rows = await readWorkbook(await transactionsToXlsx([]));
  assert.deepEqual(rows, [["Date", "Name", "Category", "Amount (₹)"]]);
});
