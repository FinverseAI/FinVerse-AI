import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money } from "./data";
import { MiniStat, PanelHeading, ProgressBar } from "./ui";

export default function ExpenseBreakdownCard({
  profile,
}: {
  profile: FinancialProfile;
}) {
  const totals = profileTotals(profile);
  const expenses = [
    { name: "Fixed expenses", amount: Number(profile.fixed_expenses) },
    { name: "Variable expenses", amount: Number(profile.variable_expenses) },
  ];
  return (
    <article id="expenses" className="dash-panel flex flex-col p-4">
      <PanelHeading icon="filter" title="Expense Breakdown">
        <p className="font-mono text-[10px] text-dash-muted">
          Monthly ·{" "}
          <span className="text-dash-text">{money(totals.expenses, 2)}</span>
        </p>
      </PanelHeading>
      <div className="mt-3 space-y-3">
        {totals.expenses === 0 && (
          <p className="text-xs text-dash-muted">
            No monthly expenses entered.
          </p>
        )}
        {expenses.map((category) => {
          const percent = totals.expenses
            ? (category.amount / totals.expenses) * 100
            : 0;
          return (
            <div key={category.name}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span>{category.name}</span>
                <span className="font-mono text-[10px] text-dash-muted">
                  {money(category.amount, 2)} · {percent.toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                label={category.name + " share of expenses"}
                value={percent}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-7">
        <MiniStat label="Total expenses" value={money(totals.expenses, 2)} />
        <MiniStat label="Savings target" value={money(totals.target, 2)} />
        <MiniStat label="Monthly surplus" value={money(totals.surplus, 2)} />
      </div>
    </article>
  );
}
