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

test("neutralises formula injection in fields starting with =, +, - or @", () => {
  const csv = transactionsToCsv([
    {
      name: "=cmd|' /C calc'!A0",
      amount: -1,
      date: "2026-11-05",
      category: "Others",
    },
    {
      name: "+2+2",
      amount: -2,
      date: "2026-11-05",
      category: "@evil",
    },
    { name: "-5", amount: -3, date: "2026-11-05", category: "Food" },
    { name: "=2+2,3", amount: -4, date: "2026-11-05", category: "Food" },
    { name: "Salary", amount: 50000, date: "2026-11-05", category: "Income" },
  ]);
  // The single-quote prefix stays the first character of the cell, even
  // when the field also needs quoting for a comma.
  assert.ok(csv.includes("'=cmd|' /C calc'!A0"), "= is neutralised");
  assert.ok(csv.includes("'+2+2"), "+ is neutralised");
  assert.ok(csv.includes("'@evil"), "@ is neutralised");
  assert.ok(csv.includes("'-5"), "- is neutralised");
  assert.ok(csv.includes(`"'=2+2,3"`), "prefix survives quoting");
  assert.ok(csv.includes(",Salary,Income,"), "plain names are untouched");
});
