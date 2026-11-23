import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCategory,
  transactionCategories,
} from "../app/(module-one)/dashboard/data.ts";
import { budgetCategories } from "../lib/onboarding.ts";

test("transaction categories are the twelve setup labels plus Income", () => {
  const setupLabels = budgetCategories.map(({ label }) => label);
  assert.equal(setupLabels.length, 12);
  assert.deepEqual(
    [...transactionCategories].sort(),
    [...setupLabels, "Income"].sort(),
  );
});

test("legacy labels map to their canonical category", () => {
  assert.equal(normalizeCategory("Housing"), "Rent");
  assert.equal(normalizeCategory("Transportation"), "Transport");
  assert.equal(normalizeCategory("Utilities"), "Bills & Utilities");
  assert.equal(normalizeCategory("Other"), "Others");
});

test("canonical labels pass through unchanged", () => {
  for (const category of transactionCategories) {
    assert.equal(normalizeCategory(category), category);
  }
});
