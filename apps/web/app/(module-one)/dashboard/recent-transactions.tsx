import { money, type Transaction } from "./data";
import { Icon, PanelHeading } from "./ui";

export function ActivityEmpty({
  title,
  description,
  onAdd,
  action,
}: {
  title: string;
  description: string;
  onAdd?: () => void;
  action?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
      <span className="surface-inset mb-1 grid size-12 place-items-center border text-dash-accent">
        <Icon name="wallet" className="size-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-64 text-xs leading-6 text-dash-muted">
        {description}
      </p>
      {onAdd && (
        <button className="dash-small-button mt-2" onClick={onAdd}>
          {action}
        </button>
      )}
    </div>
  );
}

export function ActivityError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
      role="alert"
    >
      <p className="text-xs leading-6 text-dash-red">{error}</p>
      <button className="dash-small-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default function RecentTransactions({
  transactions,
  loading,
  error,
  onRetry,
  onAdd,
  onSeeAll,
  onEdit,
  onRemove,
  month,
}: {
  transactions: Transaction[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onAdd: () => void;
  onSeeAll: () => void;
  onEdit: (transaction: Transaction) => void;
  onRemove: (transaction: Transaction) => void;
  /** The dashboard month this list is scoped to; without it, all months show. */
  month?: string;
}) {
  const monthLabel = month
    ? new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : null;
  // Scoped to the selected month: picking January shows January's
  // transactions, not the current month's.
  const scoped = month
    ? transactions.filter((item) => item.date.startsWith(`${month}-`))
    : transactions;
  const recent = [...scoped]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  return (
    <article
      id="recent-transactions"
      tabIndex={-1}
      className="dash-panel flex min-h-120 flex-col p-5 xl:min-h-120"
      aria-busy={loading}
    >
      <PanelHeading icon="file" title="Recent Transactions">
        <div className="flex gap-2">
          <button
            className="dash-small-button gap-1"
            onClick={onAdd}
            disabled={loading || !!error}
          >
            <Icon name="plus" className="size-3" />
            New
          </button>
          <button className="dash-small-button" onClick={onSeeAll}>
            See all<span className="sr-only"> transactions</span>
          </button>
        </div>
      </PanelHeading>
      {monthLabel && (
        <p className="mt-3 text-xs leading-5 text-dash-muted">
          Showing {monthLabel} only — change the month above to see another
          month.
        </p>
      )}
      {loading ? (
        <p role="status" className="m-auto text-xs text-dash-muted">
          Loading transactions…
        </p>
      ) : error ? (
        <ActivityError error={error} onRetry={onRetry} />
      ) : !recent.length ? (
        monthLabel && transactions.length ? (
          <p className="m-auto px-5 py-8 text-center text-xs leading-6 text-dash-muted">
            No transactions recorded in {monthLabel} yet.
          </p>
        ) : (
          <ActivityEmpty
            title="Your activity starts here"
            description="Add your first transaction to see your recent spending and income at a glance."
            onAdd={onAdd}
            action="Add transaction"
          />
        )
      ) : (
        <>
          <div className="mt-4 min-h-0 flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Your five most recent transactions
                {monthLabel ? ` in ${monthLabel}` : ""}
              </caption>
              <thead className="font-mono text-xs tracking-widest text-dash-muted uppercase">
                <tr>
                  {["Merchant", "Category", "Date", "Amount", "Actions"].map(
                    (label) => (
                      <th
                        key={label}
                        className={`pb-3 font-normal ${label === "Amount" || label === "Actions" ? "text-right" : ""}`}
                      >
                        {label === "Actions" ? (
                          <span className="sr-only">Actions</span>
                        ) : (
                          label
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {recent.map((item, index) => (
                  <tr
                    key={item.id}
                    className="h-16 border-t border-dash-border/50"
                  >
                    <td className="max-w-52 pr-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-xl bg-current/10 font-semibold"
                          data-tone={
                            (
                              [
                                "blue",
                                "accent",
                                "purple",
                                "warning",
                                "accent",
                              ] as const
                            )[index]
                          }
                        >
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="pr-3">
                      <span className="rounded-full border border-dash-border px-2 py-1 text-xs text-dash-muted whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className="pr-3 text-xs text-dash-muted whitespace-nowrap">
                      {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" },
                      )}
                    </td>
                    <td
                      className={`pr-4 text-right font-mono whitespace-nowrap ${item.amount > 0 ? "text-dash-accent" : ""}`}
                    >
                      {item.amount > 0 ? "+" : "−"}
                      {money(Math.abs(item.amount))}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none"
                        aria-label={`Edit ${item.name}`}
                        title={`Edit ${item.name}`}
                        onClick={() => onEdit(item)}
                      >
                        <Icon name="edit" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
                        aria-label={`Remove ${item.name}`}
                        title={`Remove ${item.name}`}
                        onClick={() => onRemove(item)}
                      >
                        <Icon name="trash" className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-dash-border pt-3 text-xs text-dash-muted">
            Showing {recent.length} of {scoped.length} transactions
            {monthLabel ? ` in ${monthLabel}` : ""}
          </p>
        </>
      )}
    </article>
  );
}
