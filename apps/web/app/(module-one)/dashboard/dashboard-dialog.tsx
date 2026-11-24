"use client";

import { useState } from "react";
import Link from "next/link";
import { activityError } from "./use-activity";
import {
  committedBills,
  dateKey,
  monthlyCashFlow,
  periodRange,
  type BillForForecast,
} from "./spending-data";
import {
  transactionCategories,
  money,
  normalizeCategory,
  type Transaction,
} from "./data";
import { transactionsToCsv } from "../../../lib/export-csv";
import { accountReportToPdf, transactionsToPdf } from "../../../lib/export-pdf";
import { transactionsToXlsx } from "../../../lib/export-xlsx";
import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import type { DashboardNotification } from "../../../lib/notifications";
import { formatFetchedAt, formatPrice } from "../../../lib/market";
import { Icon, MiniStat } from "./ui";
import { Modal } from "./modal";

export type DialogKind =
  | "transaction"
  | "transactions"
  | "edit-transaction"
  | "remove-transaction"
  | "goal"
  | "report"
  | "notifications";
const titles: Record<DialogKind, string> = {
  transaction: "Add transaction",
  transactions: "Transactions",
  "edit-transaction": "Edit transaction",
  "remove-transaction": "Remove transaction",
  goal: "Add savings goal",
  report: "Account report",
  notifications: "Notifications",
};
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
type DialogProps = {
  kind: DialogKind;
  onClose: () => void;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string;
  onRetryTransactions: () => void;
  notifications: DashboardNotification[];
  notificationsLoading: boolean;
  notificationsError: string;
  onRetryNotifications: () => void;
  query: string;
  onQuery: (query: string) => void;
  profile: FinancialProfile;
  /** Bills feed the report's unpaid-bills line; optional so the dialog stays usable without them. */
  bills?: BillForForecast[];
  onTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  editingTransaction: Transaction | null;
  onEditTransaction: (transaction: Transaction) => void;
  onRemoveTransaction: (transaction: Transaction) => void;
  onTransactionEdit: (
    id: string,
    transaction: Omit<Transaction, "id">,
  ) => Promise<void>;
  onTransactionRemove: (id: string) => Promise<void>;
};
export function DashboardDialog({
  kind,
  onClose,
  transactions,
  transactionsLoading,
  transactionsError,
  onRetryTransactions,
  notifications,
  notificationsLoading,
  notificationsError,
  onRetryNotifications,
  query,
  onQuery,
  profile,
  bills = [],
  onTransaction,
  editingTransaction,
  onEditTransaction,
  onRemoveTransaction,
  onTransactionEdit,
  onTransactionRemove,
}: DialogProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reportExporting, setReportExporting] = useState(false);
  const [reportExportError, setReportExportError] = useState("");
  const totals = profileTotals(profile);
  // Plan vs actual (team decision, 24 November 2026): the plan comes
  // from the saved profile, the actuals from recorded transactions,
  // and the report shows them side by side, never mixed.
  const reportNow = new Date();
  const actual = monthlyCashFlow(transactions, dateKey(reportNow).slice(0, 7));
  const committed = committedBills(
    bills,
    periodRange("monthly", reportNow).end,
  );
  async function exportReportPdf() {
    if (reportExporting) return;
    setReportExporting(true);
    setReportExportError("");
    try {
      const bytes = await accountReportToPdf({
        generatedOn: dateKey(reportNow),
        monthLabel: reportNow.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        plan: totals,
        actual,
        committedBills: committed,
      });
      download(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        `finverse-account-report-${dateKey(reportNow)}.pdf`,
      );
    } catch {
      setReportExportError("The PDF export failed. Please try again.");
    } finally {
      setReportExporting(false);
    }
  }
  return (
    <Modal
      title={titles[kind]}
      busy={saving}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      {kind === "transaction" && (
        <>
          <TransactionForm
            submitLabel="Add transaction"
            disabled={transactionsLoading || !!transactionsError}
            onSubmit={onTransaction}
            onClose={onClose}
            onSavingChange={setSaving}
          />
          {transactionsError && (
            <div role="alert" className="mt-4 text-xs text-dash-red">
              <p>{transactionsError}</p>
              <button
                type="button"
                className="dash-small-button mt-3"
                onClick={onRetryTransactions}
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}
      {kind === "edit-transaction" && editingTransaction && (
        <TransactionForm
          initial={editingTransaction}
          submitLabel="Save changes"
          onSubmit={(transaction) =>
            onTransactionEdit(editingTransaction.id, transaction)
          }
          onClose={onClose}
          onSavingChange={setSaving}
        />
      )}
      {kind === "remove-transaction" && editingTransaction && (
        <div>
          <p className="text-sm leading-7 text-dash-muted">
            Remove{" "}
            <strong className="break-words font-medium text-dash-text">
              {editingTransaction.name}
            </strong>{" "}
            ({money(Math.abs(editingTransaction.amount), 2)}) from your
            transactions? This also removes it from spending analysis.
          </p>
          {saveError && (
            <p role="alert" className="mt-4 text-xs text-dash-red">
              {saveError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="dash-small-button"
              onClick={onClose}
              disabled={saving}
            >
              Keep transaction
            </button>
            <button
              className="dash-primary"
              disabled={saving}
              onClick={async () => {
                if (saving) return;
                setSaving(true);
                setSaveError("");
                try {
                  await onTransactionRemove(editingTransaction.id);
                  onClose();
                } catch (error) {
                  setSaveError(activityError(error));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Removing…" : "Remove transaction"}
            </button>
          </div>
        </div>
      )}
      {kind === "transactions" && transactionsLoading && (
        <p role="status" className="py-8 text-center text-sm text-dash-muted">
          Loading transactions…
        </p>
      )}
      {kind === "transactions" && transactionsError && (
        <div role="alert">
          <p className="text-sm text-dash-red">{transactionsError}</p>
          <button
            className="dash-small-button mt-4"
            onClick={onRetryTransactions}
          >
            Try again
          </button>
        </div>
      )}
      {kind === "transactions" &&
        !transactionsLoading &&
        !transactionsError && (
          <TransactionTable
            transactions={transactions}
            query={query}
            onQuery={onQuery}
            onEdit={onEditTransaction}
            onRemove={onRemoveTransaction}
          />
        )}
      {kind === "report" && (
        <div className="space-y-4">
          <p className="text-xs text-dash-muted">
            Monthly plan — from your saved financial profile
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
            Surplus = total monthly income minus fixed expenses minus variable
            expenses minus savings target.
          </p>
          <p className="text-xs text-dash-muted">
            Actual this month — from your recorded transactions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Recorded income" value={money(actual.income, 2)} />
            <MiniStat
              label="Recorded expenses"
              value={money(actual.expenses, 2)}
            />
            <MiniStat label="Net recorded flow" value={money(actual.net, 2)} />
            <MiniStat
              label="Unpaid bills due by month-end"
              value={money(committed.total, 2)}
            />
          </div>
          <p className="text-xs text-dash-muted">
            The plan and the actuals are separate figures: the plan is what you
            set out to spend, the actuals are what your recorded transactions
            show
            {actual.count === 0
              ? ". No transactions recorded this month yet"
              : ` across ${actual.count} transaction${actual.count === 1 ? "" : "s"} this month`}
            . Unpaid bills count as committed spending in forecasts
            {committed.count > 0
              ? ` — ${committed.count} unpaid bill${committed.count === 1 ? "" : "s"} due by month-end`
              : ""}
            .
          </p>
          <button
            type="button"
            onClick={exportReportPdf}
            disabled={reportExporting}
            className="rounded-full border border-dash-border px-4 py-2 text-sm text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50"
          >
            {reportExporting ? "Exporting…" : "Export PDF"}
          </button>
          {reportExportError && (
            <p role="alert" className="text-sm text-dash-red">
              {reportExportError}
            </p>
          )}
        </div>
      )}
      {kind === "notifications" && notificationsLoading && (
        <p role="status" className="py-8 text-center text-sm text-dash-muted">
          Loading notifications…
        </p>
      )}
      {kind === "notifications" && notificationsError && (
        <div role="alert">
          <p className="text-sm text-dash-red">{notificationsError}</p>
          <button
            className="dash-small-button mt-4"
            onClick={onRetryNotifications}
          >
            Try again
          </button>
        </div>
      )}
      {kind === "notifications" &&
        !notificationsLoading &&
        !notificationsError && (
          <NotificationList notifications={notifications} />
        )}
    </Modal>
  );
}

/**
 * In-app reminders only — FinVerse sends no email. Bills appear while
 * unpaid and due soon; price alerts appear while fired (the target was
 * crossed on a market-overview load). Paying a bill removes its
 * notification; an alert clears when the price moves back across its
 * target and the alert re-arms.
 */
function NotificationList({
  notifications,
}: {
  notifications: DashboardNotification[];
}) {
  if (!notifications.length) {
    return (
      <div>
        <p className="py-8 text-center text-sm text-dash-muted">
          All caught up — no bills due soon and no price alerts fired.
        </p>
        <p className="text-center text-xs leading-6 text-dash-muted">
          Bills that are overdue or due in the next week appear here, along with
          any watchlist price alerts that have fired.
        </p>
      </div>
    );
  }
  return (
    <div>
      <ul className="space-y-3">
        {notifications.map((notification) =>
          notification.source === "price-alert" ? (
            <li
              key={`alert-${notification.alertId}`}
              className="surface-inset flex items-center gap-3 border px-3 py-2.5"
            >
              <Icon name="bell" className="size-4 shrink-0 text-dash-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  <Link
                    className="hover:text-dash-accent"
                    href={`/market/stock/${encodeURIComponent(notification.symbol)}`}
                  >
                    {notification.symbol}
                  </Link>
                  {notification.name ? (
                    <span className="font-normal text-dash-muted">
                      {" "}
                      · {notification.name}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-dash-muted">
                  Price alert — reached{" "}
                  {notification.alertDirection === "above" ? "≥" : "≤"}{" "}
                  {formatPrice(notification.alertPrice, notification.currency)}{" "}
                  · {formatFetchedAt(notification.firedAt)}
                </p>
              </div>
            </li>
          ) : (
            <li
              key={notification.billId}
              className={`surface-inset flex items-center gap-3 border px-3 py-2.5 ${notification.kind === "overdue" ? "border-dash-red/40" : ""}`}
            >
              <Icon
                name="calendar"
                className={`size-4 shrink-0 ${notification.kind === "overdue" ? "text-dash-red" : notification.kind === "due-today" ? "text-dash-warning" : "text-dash-muted"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {notification.billName}
                </p>
                <p className="mt-0.5 text-xs text-dash-muted">
                  {notification.kind === "overdue"
                    ? `Overdue by ${-notification.daysUntilDue} day${-notification.daysUntilDue === 1 ? "" : "s"}`
                    : notification.kind === "due-today"
                      ? "Due today"
                      : `Due in ${notification.daysUntilDue} day${notification.daysUntilDue === 1 ? "" : "s"}`}
                  {" · "}
                  {new Date(
                    `${notification.dueDate}T12:00:00`,
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p className="shrink-0 font-mono text-xs">
                {money(notification.amountDue, 2)}
              </p>
            </li>
          ),
        )}
      </ul>
      <p className="mt-4 text-xs leading-6 text-dash-muted">
        Paying a bill removes its notification; a price alert clears when the
        price moves back across its target. FinVerse does not send email
        reminders.
      </p>
    </div>
  );
}

/** Shared by the expense-entry confirm dialog, which pre-fills it from an extraction. */
export function TransactionForm({
  initial,
  submitLabel,
  disabled = false,
  onSubmit,
  onClose,
  onSavingChange,
}: {
  initial?: Transaction;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (transaction: Omit<Transaction, "id">) => Promise<void>;
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  return (
    <form
      className="dash-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        const form = new FormData(event.currentTarget);
        const amount = Number(form.get("amount"));
        setSaving(true);
        onSavingChange(true);
        setSaveError("");
        try {
          await onSubmit({
            name: String(form.get("name")).trim(),
            category: String(form.get("category")),
            amount: form.get("type") === "expense" ? -amount : amount,
            date: String(form.get("date")),
          });
          onClose();
        } catch (error) {
          setSaveError(activityError(error));
        } finally {
          setSaving(false);
          onSavingChange(false);
        }
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
          defaultValue={initial?.name}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          Type
          <select
            className="dash-input"
            name="type"
            defaultValue={
              initial ? (initial.amount < 0 ? "expense" : "income") : "expense"
            }
          >
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
            defaultValue={
              initial ? Math.abs(initial.amount).toFixed(2) : undefined
            }
          />
        </label>
      </div>
      <label>
        Category
        <select
          className="dash-input"
          name="category"
          defaultValue={
            initial?.category ? normalizeCategory(initial.category) : "Others"
          }
        >
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
          min="1900-01-01"
          max="9999-12-31"
          defaultValue={initial?.date ?? dateKey(new Date())}
        />
      </label>
      <p className="text-xs text-dash-muted">
        Saved securely to your account and included in spending analysis.
      </p>
      {saveError && (
        <p role="alert" className="text-xs text-dash-red">
          {saveError}
        </p>
      )}
      <button className="dash-primary h-10" disabled={saving || disabled}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function TransactionTable({
  transactions,
  query,
  onQuery,
  onEdit,
  onRemove,
}: {
  transactions: Transaction[];
  query: string;
  onQuery: (query: string) => void;
  onEdit: (transaction: Transaction) => void;
  onRemove: (transaction: Transaction) => void;
}) {
  const filtered = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((item) =>
      `${item.name} ${item.category} ${item.date}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportError, setExportError] = useState("");
  function exportCsv() {
    download(
      new Blob([transactionsToCsv(filtered)], {
        type: "text/csv;charset=utf-8",
      }),
      `finverse-transactions-${dateKey(new Date())}.csv`,
    );
  }
  async function exportPdf() {
    if (exporting) return;
    setExporting("pdf");
    setExportError("");
    try {
      const bytes = await transactionsToPdf(filtered);
      download(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        `finverse-transactions-${dateKey(new Date())}.pdf`,
      );
    } catch {
      setExportError("The PDF export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }
  async function exportXlsx() {
    if (exporting) return;
    setExporting("xlsx");
    setExportError("");
    try {
      const bytes = await transactionsToXlsx(filtered);
      download(
        new Blob([bytes as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `finverse-transactions-${dateKey(new Date())}.xlsx`,
      );
    } catch {
      setExportError("The Excel export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }
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
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-dash-muted">
          {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
          {query ? " matching your search" : ""}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="dash-small-button gap-1.5"
            onClick={exportCsv}
            disabled={!filtered.length}
            title="Download the listed transactions as a CSV file"
          >
            <Icon name="download" className="size-3" />
            Export CSV
          </button>
          <button
            type="button"
            className="dash-small-button gap-1.5"
            onClick={exportPdf}
            disabled={!filtered.length || exporting !== null}
            title="Download the listed transactions as a PDF statement"
          >
            <Icon name="download" className="size-3" />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            className="dash-small-button gap-1.5"
            onClick={exportXlsx}
            disabled={!filtered.length || exporting !== null}
            title="Download the listed transactions as an Excel workbook"
          >
            <Icon name="download" className="size-3" />
            {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="mt-3 text-xs text-dash-red">
          {exportError}
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">All recorded transactions</caption>
          <thead className="text-xs text-dash-muted">
            <tr>
              <th className="pb-3 font-normal">Transaction</th>
              <th className="pb-3 text-right font-normal">Amount</th>
              <th className="pb-3 text-right font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-dash-border">
                <td className="py-3">
                  {item.name}
                  <span className="mt-1 block text-xs text-dash-muted">
                    {item.category} · {item.date}
                  </span>
                </td>
                <td
                  className={`py-3 text-right font-mono ${item.amount > 0 ? "text-dash-accent" : "text-dash-text"}`}
                >
                  {item.amount > 0 ? "+" : ""}
                  {money(item.amount, 2)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
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
