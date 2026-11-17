import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Transaction } from "./data";
import { Icon, MiniStat, PanelHeading } from "./ui";
import { monthlyCashFlow, shiftMonth } from "./spending-data";
import { ActivityError } from "./recent-transactions";

export default function BalanceBreakdownCard({
  month,
  onMonth,
  profile,
  transactions,
  loading,
  error,
  onRetry,
}: {
  month: string;
  onMonth: (month: string) => void;
  profile: FinancialProfile;
  transactions: Transaction[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const totals = profileTotals(profile);
  const recorded = monthlyCashFlow(transactions, month);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" },
  );
  return (
    <article
      id="balance"
      className="dash-panel flex min-w-0 flex-col self-start p-5"
      aria-busy={loading}
    >
      <PanelHeading icon="pie" title="Recorded cash flow">
        <div className="flex items-center gap-2">
          <button
            className="dash-icon-button"
            aria-label="Previous month"
            disabled={month <= "1900-01"}
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <Icon name="left" />
          </button>
          <span className="text-center text-xs" aria-live="polite">
            {monthLabel}
          </span>
          <button
            className="dash-icon-button"
            aria-label="Next month"
            disabled={month >= "9999-12"}
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <Icon name="right" />
          </button>
        </div>
      </PanelHeading>
      {loading ? (
        <p role="status" className="py-8 text-sm text-dash-muted">
          Loading recorded activity...
        </p>
      ) : error ? (
        <ActivityError error={error} onRetry={onRetry} />
      ) : recorded.count ? (
        <div className="my-6 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Recorded income" value={money(recorded.income, 2)} />
          <MiniStat
            label="Recorded expenses"
            value={money(recorded.expenses, 2)}
          />
          <MiniStat label="Net recorded flow" value={money(recorded.net, 2)} />
        </div>
      ) : (
        <p className="py-8 text-sm text-dash-muted">
          No transactions recorded for {monthLabel}.
        </p>
      )}
      <p className="mb-3 text-xs text-dash-muted">
        Current monthly plan (separate from recorded activity)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Monthly income" value={money(totals.income, 2)} />
        <MiniStat label="Monthly expenses" value={money(totals.expenses, 2)} />
        <MiniStat label="Savings target" value={money(totals.target, 2)} />
        <MiniStat label="Monthly surplus" value={money(totals.surplus, 2)} />
      </div>
    </article>
  );
}
