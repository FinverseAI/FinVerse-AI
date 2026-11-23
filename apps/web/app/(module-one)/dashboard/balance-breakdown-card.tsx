import { useMemo } from "react";
import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Transaction } from "./data";
import { Icon, MiniStat, PanelHeading } from "./ui";
import {
  monthlyBalanceHistory,
  monthlyCashFlow,
  runningTotalAt,
  shiftMonth,
} from "./spending-data";
import { ActivityError } from "./recent-transactions";

/** Months shown in the balance history list (most recent first). */
const HISTORY_LIMIT = 12;

function monthLabelOf(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

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
  const history = useMemo(
    () => monthlyBalanceHistory(transactions),
    [transactions],
  );
  const balanceToDate = runningTotalAt(history, month);
  const monthLabel = monthLabelOf(month);
  const recentHistory = [...history].reverse().slice(0, HISTORY_LIMIT);
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
      ) : (
        <>
          {recorded.count ? (
            <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Recorded income"
                value={money(recorded.income, 2)}
              />
              <MiniStat
                label="Recorded expenses"
                value={money(recorded.expenses, 2)}
              />
              <MiniStat
                label="Net recorded flow"
                value={money(recorded.net, 2)}
              />
              <MiniStat
                label="Balance change to date"
                value={money(balanceToDate, 2)}
              />
            </div>
          ) : (
            <div className="my-6">
              <p className="text-sm text-dash-muted">
                No transactions recorded for {monthLabel}.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                  label="Balance change to date"
                  value={money(balanceToDate, 2)}
                />
              </div>
            </div>
          )}
          <p className="mb-3 text-xs leading-5 text-dash-muted">
            Balance change is reconstructed from your recorded transactions only
            — it starts at ₹0 at your first recorded transaction and carries
            forward month to month. It is not a bank balance.
          </p>
          {recentHistory.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs text-dash-muted">
                Balance history
                {history.length > HISTORY_LIMIT &&
                  ` · last ${HISTORY_LIMIT} months of ${history.length}`}
              </p>
              <ul className="space-y-1.5">
                {recentHistory.map((row) => (
                  <li
                    key={row.month}
                    className="surface-inset flex items-center justify-between gap-3 border px-3 py-2 text-xs"
                  >
                    <span className="text-dash-text">
                      {monthLabelOf(row.month)}
                      <span className="text-dash-muted">
                        {" "}
                        · {row.count} transaction{row.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-right whitespace-nowrap">
                      <span className="text-dash-muted">
                        {row.net >= 0 ? "+" : "−"}
                        {money(Math.abs(row.net), 2)} net ·{" "}
                      </span>
                      <span className="font-mono font-medium">
                        {money(row.runningTotal, 2)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
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
