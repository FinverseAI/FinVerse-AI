"use client";

import { useState } from "react";
import { activityError } from "./use-activity";
import { dateKey } from "./spending-data";
import { transactionCategories, money, type Transaction } from "./data";
import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { MiniStat } from "./ui";
import { Modal } from "./modal";

export type DialogKind =
  "transaction" | "transactions" | "goal" | "report" | "notifications";
const titles: Record<DialogKind, string> = {
  transaction: "Add transaction",
  transactions: "Transactions",
  goal: "Add savings goal",
  report: "Account report",
  notifications: "Notifications",
};
type DialogProps = {
  kind: DialogKind;
  onClose: () => void;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string;
  onRetryTransactions: () => void;
  query: string;
  onQuery: (query: string) => void;
  profile: FinancialProfile;
  onTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
};
export function DashboardDialog({
  kind,
  onClose,
  transactions,
  transactionsLoading,
  transactionsError,
  onRetryTransactions,
  query,
  onQuery,
  profile,
  onTransaction,
}: DialogProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const totals = profileTotals(profile);
  return (
    <Modal
      title={titles[kind]}
      busy={saving}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      {kind === "transaction" && (
        <form
          className="dash-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving) return;
            const form = new FormData(event.currentTarget);
            const amount = Number(form.get("amount"));
            setSaving(true);
            setSaveError("");
            try {
              await onTransaction({
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
            <select className="dash-input" name="category" defaultValue="Other">
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
              defaultValue={dateKey(new Date())}
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
          <button
            className="dash-primary h-10"
            disabled={saving || transactionsLoading || !!transactionsError}
          >
            {saving ? "Saving…" : "Add transaction"}
          </button>
          {transactionsError && (
            <div role="alert" className="text-xs text-dash-red">
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
        </form>
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
          />
        )}
      {kind === "report" && (
        <div className="space-y-4">
          <p className="text-xs text-dash-muted">
            Current financial profile / Monthly plan
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
        </div>
      )}
      {kind === "notifications" && (
        <p className="text-sm text-dash-muted">No notifications yet.</p>
      )}
    </Modal>
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
  const filtered = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((item) =>
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
          <caption className="sr-only">All recorded transactions</caption>
          <thead className="text-xs text-dash-muted">
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
