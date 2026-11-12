export type Tone = "accent" | "blue" | "purple" | "warning" | "red" | "muted";
export type Budget = { name: string; spent: number; limit: number };
export type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
};

export const money = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const transactionCategories = [
  "Income",
  "Housing",
  "Food & Dining",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Other",
  "Transportation",
];

export const landingPreview = {
  income: 68400,
  expenses: 31260,
  savings: 18900,
  budgets: [
    { name: "Food", spent: 5200, limit: 8000, color: "bg-dash-accent" },
    { name: "Transport", spent: 2100, limit: 4000, color: "bg-dash-accent" },
    { name: "Shopping", spent: 4600, limit: 6000, color: "bg-dash-warning" },
  ],
};
