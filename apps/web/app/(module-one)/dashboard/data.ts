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

export const transactionCategories = [
  "Income",
  "Housing",
  "Food & Dining",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Other",
  "Transportation",
  "Groceries",
  "Health",
  "Travel",
  "Education",
  "Investments",
];
