import { formatMoney } from "../../../lib/market.ts";

export type Tone =
  "accent" | "green" | "blue" | "purple" | "warning" | "red" | "muted";
export type Budget = { name: string; spent: number; limit: number };
export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  customCategory?: boolean;
};

export const incomeCategories = [
  "Income",
  "Salary",
  "Freelancing",
  "Business",
  "Investment income",
  "Other income",
];

/**
 * Recorded amounts and totals render with 0 decimals by default.
 * Delegates to the canonical formatter in lib/market so the same figure
 * never renders with different decimals on different surfaces; per-unit
 * prices use formatPrice (2dp) instead.
 */
export function money(value: number, decimals = 0) {
  return formatMoney(value, "INR", decimals);
}

/**
 * The transaction categories: the twelve setup labels
 * (apps/web/lib/onboarding.ts) plus Income for money coming in.
 * Transaction entry, the budget match, and the spending breakdown all
 * use this one list.
 */
export const transactionCategories = [
  "Income",
  "Food & Dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills & Utilities",
  "Rent",
  "Health",
  "Entertainment",
  "Travel",
  "Education",
  "Investments",
  "Others",
];

/**
 * Labels saved before the categories were unified (November 2026).
 * They still map to their canonical label, so older records keep
 * matching budgets and breakdowns.
 */
const LEGACY_CATEGORIES: Record<string, string> = {
  Housing: "Rent",
  Transportation: "Transport",
  Utilities: "Bills & Utilities",
  Other: "Others",
};

/** Map a saved category label to its canonical form. */
export function normalizeCategory(category: string): string {
  return Object.hasOwn(LEGACY_CATEGORIES, category)
    ? LEGACY_CATEGORIES[category]!
    : category;
}
