import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Tone } from "./data";
import { MiniStat, ProgressBar } from "./ui";

export default function SummaryCards({
  onReport,
  profile,
}: {
  onReport: () => void;
  profile: FinancialProfile;
}) {
  const totals = profileTotals(profile);
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
    },
    {
      label: "Savings target",
      value: totals.target,
      tone: "purple" as Tone,
      details: [
        { label: "Current savings", value: totals.savings },
        { label: "Monthly target", value: totals.target },
      ],
      ratio: totals.income ? (totals.target / totals.income) * 100 : 0,
      ratioLabel: "Income to savings",
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
      ratioLabel: "Income remaining after savings",
    },
  ];
  return (
    <section
      aria-label="Account overview"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <article className="dash-panel summary-card savings-card flex flex-col">
        <h2 className="dash-eyebrow">Current savings</h2>
        <p className="mt-4 text-3xl leading-9 font-medium tracking-tight break-words">
          {money(totals.savings, 2)}
        </p>
        <p className="mt-3 text-xs leading-5 text-dash-muted">
          From your financial profile. Savings history is not available yet.
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
            {money(card.value, 2)}
          </p>
          <div className="mb-3 mt-3 grid grid-cols-2 gap-2">
            {card.details.map((detail) => (
              <MiniStat
                key={detail.label}
                label={detail.label}
                value={money(detail.value, 2)}
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
        </article>
      ))}
    </section>
  );
}
