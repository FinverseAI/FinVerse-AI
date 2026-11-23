export type Tone = "accent" | "blue" | "purple" | "warning" | "red" | "muted";
export type Budget = { name: string; spent: number; limit: number };
export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
};

const currencyFormats = new Map<number, Intl.NumberFormat>();
export function money(value: number, decimals = 0) {
  let formatter = currencyFormats.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    currencyFormats.set(decimals, formatter);
  }
  return formatter.format(value);
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
  return LEGACY_CATEGORIES[category] ?? category;
}
