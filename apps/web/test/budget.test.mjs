import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateBudget,
  budgetCategories,
  budgetPlan,
} from "../lib/onboarding.ts";
import { profileInput } from "../lib/profile.ts";

const split = Object.fromEntries(budgetCategories.map(({ id }) => [id, 0]));

test("an unassigned budget does not allocate phantom paise", () => {
  assert.ok(
    Object.values(allocateBudget("100.01", split)).every(
      (value) => value === 0,
    ),
  );
});

test("allocation preserves every paise and uses a stable tie break", () => {
  const portions = { ...split, food: 33, rent: 33, investments: 34 };
  const amounts = allocateBudget("0.05", portions);
  assert.equal(
    Object.values(amounts).reduce((sum, value) => sum + value, 0),
    5,
  );
  assert.equal(amounts.food, 2);
  assert.equal(amounts.rent, 1);
  assert.equal(amounts.investments, 2);
});

test("income changes recalculate fixed expenses, variable expenses and savings together", () => {
  const portions = { ...split, food: 20, bills: 10, rent: 40, investments: 30 };
  assert.deepEqual(budgetPlan("1000.01", portions), {
    budget_split: portions,
    fixed_expenses: "500.01",
    variable_expenses: "200.00",
    monthly_savings_target: "300.00",
  });
});

test("legacy nullable onboarding fields are omitted from profile updates", () => {
  const input = profileInput({
    profile: { payday: null, budget_split: null, monthly_income: "100" },
    goals: [],
    onboarding_completed: true,
  });
  assert.equal(Object.hasOwn(input, "payday"), false);
  assert.equal(Object.hasOwn(input, "budget_split"), false);
  assert.equal(input.monthly_income, "100");
});
