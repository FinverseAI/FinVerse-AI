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
  /** The dashboard month the report's actuals follow; defaults to the current month. */
  month?: string;
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
  month,
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
  const [reportExporting, setReportExporting] = useState<"pdf" | "xlsx" | null>(
    null,
  );
  const [reportExportError, setReportExportError] = useState("");
  const totals = profileTotals(profile);
  // Plan vs actual (team decision, 24 November 2026): the plan comes
  // from the saved profile, the actuals from recorded transactions,
  // and the report shows them side by side, never mixed. The actuals
  // follow the dashboard month, like every other card.
  const reportNow = new Date();
  const reportMonth = month ?? dateKey(reportNow).slice(0, 7);
  const reportMonthDate = new Date(`${reportMonth}-01T12:00:00`);
  const reportMonthLabel = reportMonthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const actual = monthlyCashFlow(transactions, reportMonth);
  const committed = committedBills(
    bills,
    periodRange("monthly", reportMonthDate).end,
  );
  // The spreadsheet exports carry the same rows as the PDF report:
  // the monthly plan, the recorded actuals for the selected month,
  // and the unpaid bills committed by month-end. Amounts follow the
  // transaction convention (income positive, spending negative).
  const reportRows = [
    {
      date: dateKey(reportNow),
      name: "Current savings (snapshot)",
      category: "Monthly plan",
      amount: totals.savings,
    },
    {
      date: dateKey(reportNow),
      name: "Monthly income",
      category: "Monthly plan",
      amount: totals.income,
    },
    {
      date: dateKey(reportNow),
      name: "Monthly expenses",
      category: "Monthly plan",
      amount: -totals.expenses,
    },
    {
      date: dateKey(reportNow),
      name: "Savings target",
      category: "Monthly plan",
      amount: -totals.target,
    },
    {
      date: dateKey(reportNow),
      name: "Monthly surplus",
      category: "Monthly plan",
      amount: totals.surplus,
    },
    {
      date: dateKey(reportNow),
      name: "Recorded income",
      category: `Actual — ${reportMonthLabel}`,
      amount: actual.income,
    },
    {
      date: dateKey(reportNow),
      name: "Recorded expenses",
      category: `Actual — ${reportMonthLabel}`,
      amount: -actual.expenses,
    },
    {
      date: dateKey(reportNow),
      name: "Net recorded flow",
      category: `Actual — ${reportMonthLabel}`,
      amount: actual.net,
    },
    {
      date: dateKey(reportNow),
      name: "Unpaid bills due by month-end",
      category: `Actual — ${reportMonthLabel}`,
      amount: -committed.total,
    },
  ];
  function exportReportCsv() {
    download(
      new Blob([transactionsToCsv(reportRows)], {
        type: "text/csv;charset=utf-8",
      }),
      `finverse-account-report-${dateKey(reportNow)}.csv`,
    );
  }
  async function exportReportXlsx() {
    if (reportExporting) return;
    setReportExporting("xlsx");
    setReportExportError("");
    try {
      const bytes = await transactionsToXlsx(reportRows);
      download(
        new Blob([bytes as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `finverse-account-report-${dateKey(reportNow)}.xlsx`,
      );
    } catch {
      setReportExportError("The Excel export failed. Please try again.");
    } finally {
      setReportExporting(null);
    }
  }
  async function exportReportPdf() {
    if (reportExporting) return;
    setReportExporting("pdf");
    setReportExportError("");
    try {
      const bytes = await accountReportToPdf({
        generatedOn: dateKey(reportNow),
        monthLabel: reportMonthLabel,
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
      setReportExporting(null);
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
            ({money(Math.abs(editingTransaction.amount))}) from your
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
            <MiniStat label="Current savings" value={money(totals.savings)} />
            <MiniStat label="Monthly income" value={money(totals.income)} />
            <MiniStat label="Monthly expenses" value={money(totals.expenses)} />
            <MiniStat label="Savings target" value={money(totals.target)} />
            <MiniStat label="Monthly surplus" value={money(totals.surplus)} />
          </div>
          <p className="text-xs text-dash-muted">
            Surplus = total monthly income minus fixed expenses minus variable
            expenses minus savings target.
          </p>
          <p className="text-xs text-dash-muted">
            Actual — {reportMonthLabel} — from your recorded transactions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Recorded income" value={money(actual.income)} />
            <MiniStat
              label="Recorded expenses"
              value={money(actual.expenses)}
            />
            <MiniStat label="Net recorded flow" value={money(actual.net)} />
            <MiniStat
              label="Unpaid bills due by month-end"
              value={money(committed.total)}
            />
          </div>
          <p className="text-xs text-dash-muted">
            The plan and the actuals are separate figures: the plan is what you
            set out to spend, the actuals are what your recorded transactions
            show
            {actual.count === 0
              ? `. No transactions recorded in ${reportMonthLabel} yet`
              : ` across ${actual.count} transaction${actual.count === 1 ? "" : "s"} in ${reportMonthLabel}`}
            . Unpaid bills count as committed spending in forecasts
            {committed.count > 0
              ? ` — ${committed.count} unpaid bill${committed.count === 1 ? "" : "s"} due by month-end`
              : ""}
            .
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportReportCsv}
              disabled={reportExporting !== null}
              className="rounded-full border border-dash-border px-4 py-2 text-sm text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportReportPdf}
              disabled={reportExporting !== null}
              className="rounded-full border border-dash-border px-4 py-2 text-sm text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50"
            >
              {reportExporting === "pdf" ? "Exporting…" : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={exportReportXlsx}
              disabled={reportExporting !== null}
              className="rounded-full border border-dash-border px-4 py-2 text-sm text-dash-text transition-colors hover:border-dash-accent disabled:opacity-50"
            >
              {reportExporting === "xlsx" ? "Exporting…" : "Export Excel"}
            </button>
          </div>
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
                {money(notification.amountDue)}
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
  // Type and category are coupled: income can only be "Income", and
  // expenses use the spending categories — income saved as
  // "Food & Dining" used to mislabel every breakdown it fed. If the
  // type changes and the current category no longer fits, it resets
  // to a valid default instead of silently keeping a wrong one.
  const initialType = initial && initial.amount >= 0 ? "income" : "expense";
  const initialCategory = (() => {
    const normalized = initial?.category
      ? normalizeCategory(initial.category)
      : "Others";
    if (initialType === "income") return "Income";
    return normalized === "Income" ? "Others" : normalized;
  })();
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [category, setCategory] = useState(initialCategory);
  const categoriesForType =
    type === "income"
      ? ["Income"]
      : transactionCategories.filter((name) => name !== "Income");
  function changeType(next: "expense" | "income") {
    setType(next);
    setCategory((current) =>
      next === "income" ? "Income" : current === "Income" ? "Others" : current,
    );
  }
  // Today from local date parts, never toISOString(): UTC slips a day
  // behind between 00:00–05:30 IST and would cap the date at yesterday.
  const todayKey = dateKey(new Date());
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
            category,
            amount: type === "expense" ? -amount : amount,
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
            value={type}
            onChange={(event) =>
              changeType(event.target.value as "expense" | "income")
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
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categoriesForType.map((name) => (
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
          max={todayKey}
          defaultValue={initial?.date ?? todayKey}
        />
      </label>
      <p className="text-xs text-dash-muted">
        Saved securely to your account and included in spending analysis. Dates
        can&apos;t be in the future, and income uses the Income category only.
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
                  {money(item.amount)}
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
