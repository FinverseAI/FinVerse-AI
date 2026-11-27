import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { allocateBudget, budgetCategories } from "../../../lib/onboarding";
import { money } from "./data";
import { PanelHeading, ProgressBar } from "./ui";
import styles from "./dashboard.module.css";

export default function ExpenseBreakdownCard({
  profile,
}: {
  profile: FinancialProfile;
}) {
  const totals = profileTotals(profile);
  const hasBudgetSplit = Boolean(
    profile.budget_split && Object.keys(profile.budget_split).length,
  );
  const allocated = hasBudgetSplit
    ? allocateBudget(profile.monthly_income, profile.budget_split!)
    : null;
  const expenses = allocated
    ? budgetCategories
        .filter(
          ({ id }) =>
            id !== "investments" && (profile.budget_split?.[id] ?? 0) > 0,
        )
        .map(({ id, label }) => ({
          name: label,
          amount: allocated[id]! / 100,
        }))
    : [
        { name: "Fixed expenses", amount: Number(profile.fixed_expenses) },
        {
          name: "Variable expenses",
          amount: Number(profile.variable_expenses),
        },
      ];
  const expenseTotal = expenses.reduce(
    (sum, category) => sum + category.amount,
    0,
  );
  const ranked = [...expenses].sort((a, b) => b.amount - a.amount);
  return (
    <article id="expenses" className="dash-panel flex flex-col p-5">
      <PanelHeading icon="filter" title="Planned expenses">
        <p className="font-mono text-xs text-dash-muted">
          Monthly ·{" "}
          <span className="text-dash-text">{money(expenseTotal)}</span>
        </p>
      </PanelHeading>
      <p className="mt-3 text-xs leading-5 text-dash-muted">
        Planned allocation from your budget percentages — what you actually
        spent is in Spending analysis below
      </p>
      <div className="mt-4 space-y-4">
        {expenseTotal === 0 ? (
          <p className="text-xs text-dash-muted">
            No monthly expenses entered
          </p>
        ) : (
          ranked.map((category, index) => {
            const percent = expenseTotal
              ? (category.amount / expenseTotal) * 100
              : 0;
            return (
              <div key={category.name}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span>{category.name}</span>
                  <span className="font-mono text-xs text-dash-muted">
                    {money(category.amount)} · {percent.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar
                  label={`${category.name} share of expenses`}
                  value={percent}
                  tone={index === 0 ? "accent" : "muted"}
                />
              </div>
            );
          })
        )}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Total expenses</p>
          <p className={styles.miniValue}>{money(expenseTotal)}</p>
        </div>
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Savings target</p>
          <p className={styles.miniValue}>{money(totals.target)}</p>
        </div>
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Monthly surplus</p>
          <p className={styles.miniValue}>{money(totals.surplus)}</p>
        </div>
      </div>
    </article>
  );
}
