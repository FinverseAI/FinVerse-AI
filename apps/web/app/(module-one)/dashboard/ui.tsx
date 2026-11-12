import { useEffect, useRef, type ReactNode } from "react";

import {
  transactionCategories,
  money,
  type Tone,
  type Budget,
  type Transaction,
} from "./data";

import { profileTotals, type FinancialProfile } from "../../../lib/profile";

const paths = {
  grid: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z",
  card: "M3 5h18v14H3z M3 10h18",
  chart: "M4 3v18h17 M8 16v-5 M13 16V6 M18 16V9",
  bulb: "M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2",
  wallet: "M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7 M21 12h-5v4h5",
  file: "M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8",
  settings:
    "m10 3 4 0 1 3 3 1 3 2-1 4-3 1-1 3-4 1-2-3-3-1-1-4 3-2 1-3z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  user: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 18c1-5 13-5 14 0",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l5 5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  plus: "M12 5v14 M5 12h14",
  arrow: "M6 18 18 6 M7 6h11v11",
  trend: "m3 17 6-6 4 4 8-10 M15 5h6v6",
  pie: "M12 3v9h9 M9 3.5A9 9 0 1 0 20.5 15 M15 3.5a9 9 0 0 1 5.5 5.5H15z",
  filter: "M3 5h18 M6 12h12 M10 19h4",
  target:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
  pig: "M5 8 4 4l5 2c4-2 9 0 10 4h3v5h-3l-2 5h-3v-3H9v3H6l-2-5c-3-1-3-5-1-5 M15 9h.01 M10 3h4",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  down: "m7 10 5 5 5-5",
  close: "m6 6 12 12 M6 18 18 6",
};
export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="clay-inset min-w-0 border px-3 py-2.5">
      <p className="font-mono text-[8px] leading-4 tracking-[0.13em] text-dash-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 break-words font-mono text-xs font-medium text-dash-text">
        {value}
      </p>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "accent",
}: {
  value: number;
  label: string;
  tone?: Tone;
}) {
  return (
    <div
      className="glass-progress overflow-hidden rounded-full"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-current transition-[width] duration-300 motion-reduce:transition-none"
        data-tone={tone}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PanelHeading({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
        <Icon name={icon} className="size-4 text-dash-accent" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export type DialogKind =
  | "transaction"
  | "transactions"
  | "budgets"
  | "goal"
  | "report"
  | "notifications";
const titles: Record<DialogKind, string> = {
  transaction: "Add transaction",
  transactions: "Transactions",
  budgets: "Manage budgets",
  goal: "Add savings goal",
  report: "Account report",
  notifications: "Notifications",
};
type DialogProps = {
  kind: DialogKind;
  onClose: () => void;
  budgets: Budget[];
  transactions: Transaction[];
  query: string;
  onQuery: (query: string) => void;
  profile: FinancialProfile;
  onTransaction: (transaction: Transaction) => void;
  onBudgets: (budgets: Budget[]) => void;
};
export function DashboardDialog({
  kind,
  onClose,
  budgets,
  transactions,
  query,
  onQuery,
  profile,
  onTransaction,
  onBudgets,
}: DialogProps) {
  const totals = profileTotals(profile);
  return (
    <Modal title={titles[kind]} onClose={onClose}>
      {kind === "transaction" && (
        <form
          className="dash-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const amount = Number(form.get("amount"));
            onTransaction({
              id: crypto.randomUUID(),
              name: String(form.get("name")).trim(),
              category: String(form.get("category")),
              amount: form.get("type") === "expense" ? -amount : amount,
              date: String(form.get("date")),
            });
            onClose();
          }}
        >
          <label>
            Description
            <input
              className="dash-input"
              name="name"
              required
              maxLength={80}
              pattern=".*\S.*"
              placeholder="e.g. Weekly groceries"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Type
              <select className="dash-input" name="type">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                className="dash-input"
                name="amount"
                type="number"
                required
                min="0.01"
                max="100000000"
                step="0.01"
                placeholder="0.00"
              />
            </label>
          </div>
          <label>
            Category
            <select className="dash-input" name="category">
              {transactionCategories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              className="dash-input"
              name="date"
              type="date"
              required
              defaultValue={new Date().toLocaleDateString("en-CA")}
            />
          </label>
          <p className="text-[11px] text-dash-muted">
            Saved in this preview session. Refreshing resets the demo.
          </p>
          <button className="dash-primary h-10">Add transaction</button>
        </form>
      )}
      {kind === "transactions" && (
        <TransactionTable
          transactions={transactions}
          query={query}
          onQuery={onQuery}
        />
      )}
      {kind === "budgets" && (
        <form
          className="dash-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onBudgets(
              budgets.map((budget, index) => ({
                ...budget,
                limit: Number(form.get(`budget-${index}`)),
              })),
            );
            onClose();
          }}
        >
          {!budgets.length && (
            <p className="text-xs text-dash-muted">
              No category budgets have been set. Monthly expense totals can be
              updated in your financial profile.
            </p>
          )}
          {budgets.map((budget, index) => (
            <label key={budget.name}>
              {budget.name} monthly limit (₹)
              <input
                className="dash-input"
                name={`budget-${index}`}
                type="number"
                min="1"
                max="100000000"
                step="0.01"
                required
                defaultValue={budget.limit}
              />
            </label>
          ))}
          <button className="dash-primary h-10" disabled={!budgets.length}>
            Save budgets
          </button>
        </form>
      )}
      {kind === "report" && (
        <div className="space-y-4">
          <p className="text-xs text-dash-muted">
            Current financial profile ? Monthly plan
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              label="Current savings"
              value={money(totals.savings, 2)}
            />
            <MiniStat label="Monthly income" value={money(totals.income, 2)} />
            <MiniStat
              label="Monthly expenses"
              value={money(totals.expenses, 2)}
            />
            <MiniStat label="Savings target" value={money(totals.target, 2)} />
            <MiniStat
              label="Monthly surplus"
              value={money(totals.surplus, 2)}
            />
          </div>
          <p className="text-xs text-dash-muted">
            Surplus = total monthly income ? fixed expenses ? variable expenses
            ? savings target.
          </p>
        </div>
      )}
      {kind === "notifications" && (
        <p className="text-sm text-dash-muted">No notifications yet.</p>
      )}
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="dialog-title"
      className="dashboard glass-dialog fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto border p-6 text-dash-text sm:p-8"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className="dash-icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TransactionTable({
  transactions,
  query,
  onQuery,
}: {
  transactions: Transaction[];
  query: string;
  onQuery: (query: string) => void;
}) {
  const filtered = transactions.filter((item) =>
    `${item.name} ${item.category} ${item.date}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div>
      <label className="block text-xs text-dash-muted">
        Search transactions
        <input
          className="dash-input mt-2 w-full"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Name, category, or date"
        />
      </label>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">
            Transactions entered in this session
          </caption>
          <thead className="text-[10px] text-dash-muted">
            <tr>
              <th className="pb-3 font-normal">Transaction</th>
              <th className="pb-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-dash-border">
                <td className="py-3">
                  {item.name}
                  <span className="mt-1 block text-[10px] text-dash-muted">
                    {item.category} · {item.date}
                  </span>
                </td>
                <td
                  className={`py-3 text-right font-mono ${item.amount > 0 ? "text-dash-accent" : "text-dash-text"}`}
                >
                  {item.amount > 0 ? "+" : ""}
                  {money(item.amount, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="py-8 text-center text-sm text-dash-muted">
            {transactions.length
              ? "No transactions match your search."
              : "No transactions entered yet."}
          </p>
        )}
      </div>
    </div>
  );
}
