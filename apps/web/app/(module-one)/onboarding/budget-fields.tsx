import { allocateBudget, budgetCategories } from "../../../lib/onboarding";
import { money } from "../dashboard/data";

export default function BudgetFields({
  income,
  split,
  onChange,
}: {
  income: string;
  split: Record<string, number>;
  onChange: (split: Record<string, number>) => void;
}) {
  const amounts = allocateBudget(income, split);
  const total = Object.values(split).reduce((sum, value) => sum + value, 0);
  return (
    <div className="space-y-4">
      <p
        role="status"
        className={
          total === 100
            ? "text-sm text-dash-accent"
            : "text-sm text-dash-warning"
        }
      >
        {total}% allocated ·{" "}
        {total <= 100 ? `${100 - total}% remaining` : `${total - 100}% over`}
      </p>
      <div className="onboarding-budget-grid">
        {budgetCategories.map(({ id, label }) => (
          <label
            key={id}
            className="onboarding-budget-row !flex-row !items-center"
          >
            <span className="min-w-0 flex-1 text-xs text-dash-text">
              {label}
              <span className="mt-1 block text-xs text-dash-muted">
                {money((amounts[id] ?? 0) / 100, 2)} / month
              </span>
            </span>
            <input
              className="dash-input !w-16 !px-2 !py-2 text-right"
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={split[id] ?? 0}
              aria-label={`${label} budget percent`}
              onChange={(event) =>
                onChange({
                  ...split,
                  [id]: Math.max(
                    0,
                    Math.min(100, Math.trunc(Number(event.target.value) || 0)),
                  ),
                })
              }
            />
            <span aria-hidden="true">%</span>
          </label>
        ))}
      </div>
      <p className="text-xs leading-5 text-dash-muted">
        Rent and bills set fixed expenses. Investments set the savings target.
        All other categories set variable expenses. Shares must total 100%.
      </p>
    </div>
  );
}
