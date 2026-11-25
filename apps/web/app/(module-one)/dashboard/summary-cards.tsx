import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Transaction, type Tone } from "./data";
import { planVsActual } from "./spending-data";
import { MiniStat, ProgressBar } from "./ui";
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
  const monthLabel = monthLabelOf(month);
  const showActuals = !loading && !error && actuals.count > 0;
  const cards = [
    {
      label: "Monthly income",
      value: totals.income,
      tone: "accent" as Tone,
      details: [
        { label: "After tax", value: Number(profile.monthly_income) },
        {
          label: "Other income",
          value: Number(profile.other_monthly_income ?? 0),
        },
      ],
      ratio: totals.income
        ? (Number(profile.monthly_income) / totals.income) * 100
        : 0,
      ratioLabel: "Primary income share",
      actual: actuals.income,
      actualLabel: "Recorded income",
    },
    {
      label: "Savings target",
      value: totals.target,
      tone: "purple" as Tone,
      details: [
        { label: "Saved so far", value: totals.savings },
        { label: "Monthly target", value: totals.target },
      ],
      ratio: totals.income ? (totals.target / totals.income) * 100 : 0,
      ratioLabel: "Target as share of income",
      actual: actuals.savings,
      actualLabel: "Net kept",
    },
    {
      label: "Monthly surplus",
      value: totals.surplus,
      tone: "accent" as Tone,
      details: [
        { label: "Income", value: totals.income },
        { label: "Expenses", value: totals.expenses },
      ],
      ratio: totals.income ? (totals.surplus / totals.income) * 100 : 0,
      ratioLabel: "Income left after expenses and savings target",
      actual: actuals.surplus,
      actualLabel: "Recorded surplus",
    },
  ];
  return (
    <section
      aria-label="Account overview — monthly plan and recorded activity"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <p className="text-xs leading-5 text-dash-muted md:col-span-2 xl:col-span-4">
        Monthly plan — from your saved financial profile — with what you
        actually recorded in {monthLabel} alongside it.
      </p>
      {loading && (
        <p
          role="status"
          className="text-xs leading-5 text-dash-muted md:col-span-2 xl:col-span-4"
        >
          Loading recorded activity…
        </p>
      )}
      {error && !loading && (
        <div className="md:col-span-2 xl:col-span-4">
          <ActivityError error={error} onRetry={onRetry} />
        </div>
      )}
      {!loading && !error && actuals.count === 0 && (
        <p className="text-xs leading-5 text-dash-muted md:col-span-2 xl:col-span-4">
          No transactions recorded in {monthLabel} yet — actuals will appear
          here once you record activity.
        </p>
      )}
      <article className="dash-panel summary-card savings-card flex flex-col">
        <h2 className="dash-eyebrow">Current savings</h2>
        <p className="mt-4 text-3xl leading-9 font-medium tracking-tight break-words">
          {money(totals.savings)}
        </p>
        <p className="mt-3 text-xs leading-5 text-dash-muted">
          A snapshot you entered in your financial profile — update it there
          whenever it changes.
        </p>
        <button
          className="dash-small-button mt-auto self-end border-dash-accent/40 bg-dash-accent/10 text-dash-accent"
          onClick={onReport}
        >
          View report
        </button>
      </article>
      {cards.map((card) => (
        <article key={card.label} className="dash-panel summary-card">
          <h2 className="dash-eyebrow">{card.label}</h2>
          <p className="mt-4 text-3xl font-medium tracking-tight break-words">
            {money(card.value)}
          </p>
          <div className="mb-3 mt-3 grid grid-cols-2 gap-2">
            {card.details.map((detail) => (
              <MiniStat
                key={detail.label}
                label={detail.label}
                value={money(detail.value)}
              />
            ))}
          </div>
          {card.label === "Monthly income" && profile.payday && (
            <p className="-mt-1 mb-3 text-xs text-dash-muted">
              Payday: day {profile.payday} of each month
            </p>
          )}
          <ProgressBar
            value={card.ratio}
            label={card.ratioLabel}
            tone={card.tone}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <p data-tone={card.tone} className="font-mono text-lg font-medium">
              {card.ratio.toFixed(1)}%
            </p>
            <span className="text-right font-mono text-xs text-dash-muted">
              {card.ratioLabel}
            </span>
          </div>
          {showActuals && (
            <div className="mt-3 border-t border-dash-border pt-3">
              <MiniStat
                label={`${card.actualLabel} · ${monthLabel}`}
                value={money(card.actual.actual)}
              />
              <p className="mt-1.5 text-xs text-dash-muted">
                {differenceLabel(card.actual.difference)}
              </p>
              {card.label === "Savings target" && (
                <p className="mt-1.5 text-xs leading-5 text-dash-muted">
                  Recorded income minus recorded expenses — a negative value
                  means spending exceeded income this month.
                </p>
              )}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
