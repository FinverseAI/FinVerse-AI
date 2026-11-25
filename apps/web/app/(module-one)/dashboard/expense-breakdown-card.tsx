import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { allocateBudget, budgetCategories } from "../../../lib/onboarding";
import { money } from "./data";
import { MiniStat, PanelHeading, ProgressBar } from "./ui";

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
  return (
    <article id="expenses" className="dash-panel flex flex-col p-4">
      <PanelHeading icon="filter" title="Planned Expense Breakdown">
        <p className="font-mono text-xs text-dash-muted">
          Monthly ·{" "}
          <span className="text-dash-text">{money(expenseTotal)}</span>
        </p>
      </PanelHeading>
      <p className="mt-2 text-xs leading-5 text-dash-muted">
        Planned allocation from your budget percentages — what you actually
        spent is in Spending analysis below.
      </p>
      <div className="mt-3 space-y-3">
        {expenseTotal === 0 ? (
          <p className="text-xs text-dash-muted">
            No monthly expenses entered.
          </p>
        ) : (
          expenses.map((category) => {
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
                  label={category.name + " share of expenses"}
                  value={percent}
                />
              </div>
            );
          })
        )}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-7">
        <MiniStat label="Total expenses" value={money(expenseTotal)} />
        <MiniStat label="Savings target" value={money(totals.target)} />
        <MiniStat label="Monthly surplus" value={money(totals.surplus)} />
      </div>
    </article>
  );
}
