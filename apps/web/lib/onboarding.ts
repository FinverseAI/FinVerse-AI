import { cents, type FinancialProfile } from "./profile.ts";

export const paydayOptions = Array.from(
  { length: 31 },
  (_, index) => index + 1,
);
export const goalNameLimit = 100;

export function validBudgetSplit(split: Record<string, number>) {
  const values = Object.values(split);
  return (
    values.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 100,
    ) && values.reduce((sum, value) => sum + value, 0) === 100
  );
}

export function validGoalDate(value: string, min: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= min
  );
}

export const budgetCategories = [
  { id: "food", label: "Food & Dining" },
  { id: "groceries", label: "Groceries" },
  { id: "transport", label: "Transport" },
  { id: "shopping", label: "Shopping" },
  { id: "bills", label: "Bills & Utilities" },
  { id: "rent", label: "Rent" },
  { id: "health", label: "Health" },
  { id: "entertainment", label: "Entertainment" },
  { id: "travel", label: "Travel" },
  { id: "education", label: "Education" },
  { id: "investments", label: "Investments" },
  { id: "others", label: "Others" },
] as const;

// Allocate whole paise using largest remainders so the category totals stay exact.
export function allocateBudget(income: string, split: Record<string, number>) {
  const total = cents(income);
  const rows = budgetCategories.map(({ id }, index) => {
    const exact = total * (split[id] ?? 0);
    return {
      id,
      index,
      amount: Math.floor(exact / 100),
      remainder: exact % 100,
    };
  });
  const assigned = Object.values(split).reduce((sum, value) => sum + value, 0);
  const remaining =
    assigned === 100
      ? total - rows.reduce((sum, row) => sum + row.amount, 0)
      : 0;
  const ranked = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (let index = 0; index < Math.min(remaining, ranked.length); index++)
    ranked[index]!.amount++;
  return Object.fromEntries(rows.map((row) => [row.id, row.amount]));
}

export function budgetPlan(income: string, split: Record<string, number>) {
  const amounts = allocateBudget(income, split);
  const fixed = (amounts.rent ?? 0) + (amounts.bills ?? 0);
  const savings = amounts.investments ?? 0;
  return {
    budget_split: split,
    fixed_expenses: (fixed / 100).toFixed(2),
    variable_expenses: ((cents(income) - fixed - savings) / 100).toFixed(2),
    monthly_savings_target: (savings / 100).toFixed(2),
  };
}

export function onboardingBudgets(profile: FinancialProfile) {
  if (!profile.budget_split) return [];
  const amounts = allocateBudget(profile.monthly_income, profile.budget_split);
  return budgetCategories
    .filter(({ id }) => (profile.budget_split![id] ?? 0) > 0)
    .map(({ id, label }) => ({
      name: label,
      spent: 0,
      limit: amounts[id]! / 100,
    }));
}
