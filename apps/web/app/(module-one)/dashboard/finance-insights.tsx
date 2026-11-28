import {
  money,
  normalizeCategory,
  type Budget,
  type Transaction,
} from "./data";
import { dateKey, shiftMonth } from "./spending-data";
import { PanelHeading } from "./ui";

export default function FinanceInsights({
  month,
  today,
  transactions,
  budgets,
  available,
}: {
  month: string;
  today: string;
  transactions: Transaction[];
  budgets: Budget[];
  available: boolean;
}) {
  const day = month === today.slice(0, 7) ? Number(today.slice(-2)) : null;
  const previousMonth = shiftMonth(month, -1);
  const totals = new Map<string, number>();
  let previousFood = 0;
  let food = 0;
  for (const item of transactions) {
    if (item.amount >= 0 || item.date > today) continue;
    const amount = Math.round(-item.amount * 100);
    const category = normalizeCategory(item.category);
    const isFood = ["Food & Dining", "Groceries"].includes(category);
    if (item.date.startsWith(`${month}-`)) {
      totals.set(category, (totals.get(category) ?? 0) + amount);
      if (isFood) food += amount;
    } else if (
      isFood &&
      item.date.startsWith(`${previousMonth}-`) &&
      (!day || Number(item.date.slice(-2)) <= day)
    ) {
      previousFood += amount;
    }
  }
  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
  const difference = previousFood
    ? Math.round(((food - previousFood) / previousFood) * 100)
    : null;
  const [year, calendarMonth] = month.split("-").map(Number);
  const days = Number(dateKey(new Date(year!, calendarMonth!, 0)).slice(-2));
  const projected =
    day && day >= 7 && day < days
      ? budgets
          .filter(
            ({ limit, spent }) =>
              limit > 0 && spent < limit && (spent * days) / day > limit,
          )
          .sort(
            (first, second) =>
              second.spent / second.limit - first.spent / first.limit,
          )[0]
      : undefined;

  return (
    <section className="dash-panel p-5" aria-label="Financial insights">
      <PanelHeading icon="bulb" title="Financial insights" />
      {!available ? (
        <p className="mt-3 text-sm text-dash-muted">
          Insights appear when your recorded activity loads.
        </p>
      ) : !top ? (
        <p className="mt-3 text-sm text-dash-muted">
          Record an expense to see insights for this month.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li className="surface-inset border p-3 text-sm">
            <strong>{top[0]}</strong> was your largest spending category at{" "}
            <strong className="text-dash-blue">{money(top[1] / 100, 2)}</strong>
            .
          </li>
          {difference !== null && (
            <li className="surface-inset border p-3 text-sm">
              Food spending was{" "}
              {difference === 0
                ? "unchanged"
                : `${Math.abs(difference)}% ${difference > 0 ? "higher" : "lower"}`}{" "}
              than {day ? "the same period last month" : "the previous month"}.
            </li>
          )}
          {projected && (
            <li className="surface-inset border p-3 text-sm">
              At the current pace, {projected.name} spending may reach{" "}
              <strong className="text-dash-warning">
                {money((projected.spent * days) / day!)}
              </strong>{" "}
              against a {money(projected.limit)} budget.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
