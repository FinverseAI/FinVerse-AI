import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Transaction } from "./data";
import { monthlyCashFlow, planVsActual } from "./spending-data";
import { ProgressBar } from "./ui";
import { ActivityError } from "./recent-transactions";

function monthLabelOf(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function differenceLabel(difference: number) {
  if (difference === 0) return "Exactly on plan";
  const amount = money(Math.abs(difference));
  return difference > 0 ? `${amount} above plan` : `${amount} below plan`;
}

export default function SummaryCards({
  onReport,
  profile,
  transactions,
  month,
  loading,
  error,
  onRetry,
}: {
  onReport: () => void;
  profile: FinancialProfile;
  transactions: Transaction[];
  month: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const totals = profileTotals(profile);
  const actuals = planVsActual(profile, transactions, month);
  const recorded = monthlyCashFlow(transactions, month);
  const monthLabel = monthLabelOf(month);
  const showActuals = !loading && !error && actuals.count > 0;
  const cards = [
    {
      label: "Income",
      actual: recorded.income,
      plan: totals.income,
      difference: actuals.income.difference,
      detail: `Recorded income in ${monthLabel}`,
      extra:
        profile.payday != null
          ? `Payday: day ${profile.payday} of each month`
          : null,
      tone: "muted" as const,
    },
    {
      label: "Expenses",
      actual: recorded.expenses,
      plan: totals.expenses,
      difference: recorded.expenses - totals.expenses,
      detail: `Recorded expenses in ${monthLabel}`,
      extra: null,
      tone: "muted" as const,
    },
    {
      label: "Savings",
      actual: actuals.savings.actual,
      plan: totals.target,
      difference: actuals.savings.difference,
      detail: `Net kept in ${monthLabel} — recorded income minus recorded expenses`,
      extra: null,
      tone: "accent" as const,
    },
  ];
  return (
    <section aria-label="Income, expenses and savings this month">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-dash-muted">
          Plan from your saved profile, actuals from recorded transactions in{" "}
          {monthLabel}
        </p>
        <button className="dash-small-button" onClick={onReport}>
          View report
        </button>
      </div>
      {loading && (
        <p role="status" className="text-xs leading-5 text-dash-muted">
          Loading recorded activity…
        </p>
      )}
      {error && !loading && <ActivityError error={error} onRetry={onRetry} />}
      {!loading && !error && actuals.count === 0 && (
        <p className="mb-3 text-xs leading-5 text-dash-muted">
          No transactions recorded in {monthLabel} yet — actuals will appear
          here once you record activity
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const percent =
            card.plan > 0 ? (card.actual / card.plan) * 100 : 0;
          return (
            <article key={card.label} className="dash-panel p-5">
              <h2 className="text-sm font-medium text-dash-muted">
                {card.label}
              </h2>
              <p className="mt-4 font-mono text-3xl leading-9 font-medium break-words">
                {showActuals || !loading ? money(card.actual) : "—"}
              </p>
              <p className="mt-2 text-xs leading-5 text-dash-muted">
                {card.plan > 0
                  ? `${money(card.actual)} of ${money(card.plan)} planned · ${Math.round(percent)}%`
                  : "No plan set for this month"}
              </p>
              <div className="mt-4">
                <ProgressBar
                  value={Math.max(0, percent)}
                  label={`${card.label}: ${Math.round(percent)}% of plan`}
                  tone={card.tone}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-dash-muted">
                {showActuals ? differenceLabel(card.difference) : card.detail}
              </p>
              {card.extra && (
                <p className="mt-1 text-xs text-dash-muted">{card.extra}</p>
              )}
              {card.label === "Savings" && showActuals && (
                <p className="mt-1 text-xs leading-5 text-dash-muted">
                  {card.detail}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
