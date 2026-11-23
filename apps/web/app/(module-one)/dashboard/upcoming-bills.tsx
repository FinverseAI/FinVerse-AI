"use client";

import { useState } from "react";
import { money } from "./data";
import { Icon, MiniStat, PanelHeading } from "./ui";
import { ActivityEmpty, ActivityError } from "./recent-transactions";
import { activityError, activityRequest, type Activity } from "./use-activity";
import { Modal } from "./modal";
import { dateKey } from "./spending-data";

type BillPayment = {
  id: string;
  amount: number;
  paidDate: string;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  autoPay: boolean;
  /** "monthly" repeats: paying it creates the next occurrence. Null is a one-off bill. */
  recurrence: "monthly" | null;
  paidTotal?: number;
  payments?: BillPayment[];
};

type BillInput = Omit<Bill, "id" | "paidTotal" | "payments">;

function BillRow({
  bill,
  onRemove,
  onEdit,
  onPay,
  onHistory,
}: {
  bill: Bill;
  onRemove: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onPay: (bill: Bill) => void;
  onHistory: (bill: Bill) => void;
}) {
  const today = new Date();
  const soon = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7,
  );
  const paidTotal = bill.paidTotal ?? 0;
  const payments = bill.payments ?? [];
  const fullyPaid = paidTotal >= bill.amount - 0.005;
  const overdue = bill.dueDate < dateKey(today);
  const dueSoon = bill.dueDate <= dateKey(soon);
  const status = fullyPaid
    ? "Paid"
    : overdue
      ? "Overdue"
      : dueSoon
        ? "Due soon"
        : bill.autoPay
          ? "Auto-pay"
          : "Upcoming";
  return (
    <li
      className={`surface-inset flex min-h-14 items-center gap-2 border px-3 py-2 ${overdue && !fullyPaid ? "border-dash-red/40" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" title={bill.name}>
          {bill.name}
        </p>
        <p className="mt-1 text-xs text-dash-muted">
          Due{" "}
          {new Date(`${bill.dueDate}T12:00:00`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {bill.autoPay && dueSoon ? " · Auto-pay" : ""}
          {bill.recurrence === "monthly" ? " · Monthly" : ""}
        </p>
        {paidTotal > 0 && (
          <button
            type="button"
            className="mt-1 text-left text-xs text-dash-accent underline underline-offset-2"
            onClick={() => onHistory(bill)}
          >
            Paid {money(paidTotal, 2)} of {money(bill.amount, 2)}
            {payments.length
              ? ` · ${payments.length} payment${payments.length === 1 ? "" : "s"}`
              : ""}
          </button>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="mb-1.5 font-mono text-xs">{money(bill.amount, 2)}</p>
        <span
          className={`dash-badge !px-2 !py-1 !text-xs ${fullyPaid ? "text-dash-accent" : overdue ? "text-dash-red" : dueSoon ? "text-dash-warning" : bill.autoPay ? "text-dash-blue" : "text-dash-muted"}`}
        >
          {status}
        </span>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none"
          aria-label={`Edit ${bill.name}`}
          title={`Edit ${bill.name}`}
          onClick={() => onEdit(bill)}
        >
          <Icon name="edit" className="size-3.5" />
        </button>
        {!fullyPaid && (
          <button
            type="button"
            className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none"
            aria-label={`Record a payment for ${bill.name}`}
            title={`Record a payment for ${bill.name}`}
            onClick={() => onPay(bill)}
          >
            <Icon name="wallet" className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
          aria-label={`Remove ${bill.name}`}
          title={`Remove ${bill.name}`}
          onClick={() => onRemove(bill)}
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function BillForm({
  initial,
  submitLabel,
  onSubmit,
  onClose,
  onSavingChange,
}: {
  initial?: Bill;
  submitLabel: string;
  onSubmit: (input: BillInput) => Promise<void>;
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
        setSaving(true);
        onSavingChange(true);
        setSaveError("");
        try {
          await onSubmit({
            name: String(form.get("name")).trim(),
            amount: Number(form.get("amount")),
            dueDate: String(form.get("dueDate")),
            autoPay: form.get("autoPay") === "on",
            recurrence: form.get("recurrence") === "monthly" ? "monthly" : null,
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
        Bill name
        <input
          className="dash-input"
          name="name"
          required
          maxLength={80}
          pattern=".*\S.*"
          placeholder="e.g. Rent or Internet"
          defaultValue={initial?.name}
          autoFocus
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Amount (₹)
          <input
            className="dash-input"
            name="amount"
            type="number"
            min="0.01"
            max="100000000"
            step="0.01"
            required
            placeholder="0.00"
            defaultValue={initial ? initial.amount.toFixed(2) : undefined}
          />
        </label>
        <label>
          Due date
          <input
            className="dash-input"
            name="dueDate"
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            required
            defaultValue={initial?.dueDate ?? dateKey(new Date())}
          />
        </label>
      </div>
      <label>
        Repeats
        <select
          className="dash-input"
          name="recurrence"
          defaultValue={initial?.recurrence ?? ""}
        >
          <option value="">One-off — does not repeat</option>
          <option value="monthly">
            Monthly — paying it creates next month&apos;s bill
          </option>
        </select>
      </label>
      <label className="surface-inset !flex-row items-center gap-3 border p-4">
        <input
          className="size-4 accent-dash-accent"
          name="autoPay"
          type="checkbox"
          defaultChecked={initial?.autoPay}
        />
        <span className="text-xs">Already set up with auto-pay</span>
      </label>
      <p className="text-xs leading-6 text-dash-muted">
        Auto-pay bills are recorded as paid in FinVerse on their due date when
        you open the dashboard. That records the payment here — it does not pay
        your provider; your bank or provider&apos;s auto-pay does that.
      </p>
      {saveError && (
        <p role="alert" className="text-xs leading-6 text-dash-red">
          {saveError}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="dash-small-button"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button className="dash-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  bill,
  onSubmit,
  onClose,
  onSavingChange,
}: {
  bill: Bill;
  onSubmit: (input: { amount: number; paidDate: string }) => Promise<void>;
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const remaining = Math.max(
    0.01,
    Math.round((bill.amount - (bill.paidTotal ?? 0)) * 100) / 100,
  );
  return (
    <form
      className="dash-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        const form = new FormData(event.currentTarget);
        setSaving(true);
        onSavingChange(true);
        setSaveError("");
        try {
          await onSubmit({
            amount: Number(form.get("amount")),
            paidDate: String(form.get("paidDate")),
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
      <p className="text-sm leading-7 text-dash-muted">
        Record a payment you made for{" "}
        <strong className="break-words font-medium text-dash-text">
          {bill.name}
        </strong>{" "}
        ({money(bill.amount, 2)} due
        {(bill.paidTotal ?? 0) > 0 &&
          `, ${money(bill.paidTotal ?? 0, 2)} already paid`}
        ). Recording it also adds a matching expense transaction — it does not
        pay your provider.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Amount paid (₹)
          <input
            className="dash-input"
            name="amount"
            type="number"
            min="0.01"
            max="100000000"
            step="0.01"
            required
            placeholder="0.00"
            defaultValue={remaining.toFixed(2)}
            autoFocus
          />
        </label>
        <label>
          Date paid
          <input
            className="dash-input"
            name="paidDate"
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            required
            defaultValue={dateKey(new Date())}
          />
        </label>
      </div>
      {saveError && (
        <p role="alert" className="text-xs leading-6 text-dash-red">
          {saveError}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="dash-small-button"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button className="dash-primary" disabled={saving}>
          {saving ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}

function PaymentHistory({
  bill,
  onDelete,
}: {
  bill: Bill;
  onDelete: (paymentId: string) => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const payments = bill.payments ?? [];
  return (
    <div>
      <p className="text-sm leading-7 text-dash-muted">
        Payments recorded for{" "}
        <strong className="break-words font-medium text-dash-text">
          {bill.name}
        </strong>{" "}
        — {money(bill.paidTotal ?? 0, 2)} of {money(bill.amount, 2)}.
      </p>
      <p className="mt-2 text-xs leading-6 text-dash-muted">
        Removing a payment record does not remove the expense transaction it
        created.
      </p>
      {deleteError && (
        <p role="alert" className="mt-4 text-xs text-dash-red">
          {deleteError}
        </p>
      )}
      {!payments.length ? (
        <p className="py-8 text-center text-sm text-dash-muted">
          No payments recorded yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="surface-inset flex items-center gap-2 border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs">{money(payment.amount, 2)}</p>
                <p className="mt-1 text-xs text-dash-muted">
                  Paid{" "}
                  {new Date(`${payment.paidDate}T12:00:00`).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
              <button
                type="button"
                className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
                aria-label={`Remove payment of ${money(payment.amount, 2)}`}
                title="Remove this payment record"
                disabled={!!deletingId}
                onClick={async () => {
                  if (deletingId) return;
                  setDeletingId(payment.id);
                  setDeleteError("");
                  try {
                    await onDelete(payment.id);
                  } catch (error) {
                    setDeleteError(activityError(error));
                  } finally {
                    setDeletingId("");
                  }
                }}
              >
                <Icon name="trash" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function UpcomingBills({
  activity,
  onPaymentRecorded,
  autoPayNotice,
}: {
  /** The bills fetch, owned by the dashboard so it can also feed the notification centre. */
  activity: Activity<Bill>;
  /** Called after a payment lands: the payment also creates an expense transaction, so the transactions list needs a refresh. */
  onPaymentRecorded?: () => void;
  /** What the auto-pay run on this load recorded, if anything (set by the dashboard). */
  autoPayNotice?: string;
}) {
  const { items, loading, error, retry, add, update, append, patch, remove } =
    activity;
  const [dialog, setDialog] = useState<
    "all" | "add" | "edit" | "remove" | "pay" | "history" | null
  >(null);
  const [selected, setSelected] = useState<Bill | null>(null);
  const [returnToAll, setReturnToAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const bills = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const filtered = bills.filter((bill) =>
    bill.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const total =
    bills.reduce(
      (sum, bill) =>
        sum + Math.round((bill.amount - (bill.paidTotal ?? 0)) * 100),
      0,
    ) / 100;
  // The selected bill is re-read from the live list so payment history
  // stays fresh after a payment is added or removed.
  const selectedBill = selected
    ? (items.find((bill) => bill.id === selected.id) ?? selected)
    : null;

  function openAdd(fromAll = false) {
    setReturnToAll(fromAll);
    setSaveError("");
    setDialog("add");
  }
  function openEditor(bill: Bill, kind: "edit" | "remove" | "pay" | "history") {
    setSelected(bill);
    setReturnToAll(dialog === "all");
    setSaveError("");
    setDialog(kind);
  }
  function closeEditor() {
    if (!saving) {
      setSaveError("");
      setDialog(returnToAll ? "all" : null);
    }
  }
  // Forms call this after a successful save, while `saving` is still true
  // (it resets in the form's finally block), so it must not gate on it.
  // The Cancel button is disabled while saving, and the modal chrome still
  // uses closeEditor.
  function closeAfterSave() {
    setSaveError("");
    setDialog(returnToAll ? "all" : null);
  }
  async function recordPayment(
    billId: string,
    input: { amount: number; paidDate: string },
  ) {
    const saved = await activityRequest<
      BillPayment & { nextBill: Bill | null }
    >(`/api/bills/${encodeURIComponent(billId)}/payments`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    patch(billId, (bill) => {
      const payments = [saved, ...(bill.payments ?? [])];
      const paidTotal =
        payments.reduce(
          (sum, payment) => sum + Math.round(payment.amount * 100),
          0,
        ) / 100;
      return { ...bill, payments, paidTotal };
    });
    // A monthly bill's next occurrence rides back with the payment;
    // add it to the list without a refetch.
    if (saved.nextBill) append(saved.nextBill);
    setNotice("Payment recorded.");
    // The payment also created a matching expense transaction.
    onPaymentRecorded?.();
  }
  async function removePayment(billId: string, paymentId: string) {
    await activityRequest(
      `/api/bills/${encodeURIComponent(billId)}/payments/${encodeURIComponent(paymentId)}`,
      { method: "DELETE" },
    );
    patch(billId, (bill) => {
      const payments = (bill.payments ?? []).filter(
        (payment) => payment.id !== paymentId,
      );
      const paidTotal =
        payments.reduce(
          (sum, payment) => sum + Math.round(payment.amount * 100),
          0,
        ) / 100;
      return { ...bill, payments, paidTotal };
    });
    setNotice("Payment record removed.");
  }

  return (
    <>
      <article
        className="dash-panel flex min-h-120 flex-col p-5 xl:min-h-120"
        aria-busy={loading}
      >
        <PanelHeading icon="calendar" title="Upcoming Bills">
          <div className="flex gap-2">
            <button
              className="dash-icon-button"
              aria-label="Add bill"
              title="Add bill"
              onClick={() => openAdd()}
              disabled={loading || !!error}
            >
              <Icon name="plus" className="size-3.5" />
            </button>
            <button
              className="dash-small-button"
              onClick={() => {
                setQuery("");
                setDialog("all");
              }}
            >
              See all<span className="sr-only"> bills</span>
            </button>
          </div>
        </PanelHeading>
        {autoPayNotice && (
          <p role="status" className="mt-3 text-xs leading-6 text-dash-muted">
            {autoPayNotice}
          </p>
        )}
        {loading ? (
          <p role="status" className="m-auto text-xs text-dash-muted">
            Loading bills…
          </p>
        ) : error ? (
          <ActivityError error={error} onRetry={retry} />
        ) : !bills.length ? (
          <ActivityEmpty
            title="A little less to remember"
            description="Add your upcoming bills and keep every due date in one place."
            onAdd={() => openAdd()}
            action="Add your first bill"
          />
        ) : (
          <ul className="mt-3 flex-1 space-y-2">
            {bills.slice(0, 5).map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onRemove={(item) => openEditor(item, "remove")}
                onEdit={(item) => openEditor(item, "edit")}
                onPay={(item) => openEditor(item, "pay")}
                onHistory={(item) => openEditor(item, "history")}
              />
            ))}
          </ul>
        )}
        {!error && !loading && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat
              label={`Total due · ${bills.length} bills`}
              value={money(total, 2)}
            />
            <MiniStat
              label="Auto-pay"
              value={`${bills.filter((bill) => bill.autoPay).length} scheduled`}
            />
          </div>
        )}
        <span role="status" className="sr-only">
          {notice}
        </span>
      </article>
      {dialog === "all" && (
        <Modal title="All bills" onClose={() => setDialog(null)}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-xs text-dash-muted">
              {bills.length} bills · {money(total, 2)} total due
            </p>
            <button
              className="dash-small-button gap-1.5"
              onClick={() => openAdd(true)}
              disabled={loading || !!error}
            >
              <Icon name="plus" className="size-3" />
              Add bill
            </button>
          </div>
          <label className="text-xs text-dash-muted">
            Search bills
            <input
              className="dash-input mt-2 w-full"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
            />
          </label>
          {loading ? (
            <p
              role="status"
              className="py-8 text-center text-sm text-dash-muted"
            >
              Loading bills…
            </p>
          ) : error ? (
            <ActivityError error={error} onRetry={retry} />
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {filtered.map((bill) => (
                  <BillRow
                    key={bill.id}
                    bill={bill}
                    onRemove={(item) => openEditor(item, "remove")}
                    onEdit={(item) => openEditor(item, "edit")}
                    onPay={(item) => openEditor(item, "pay")}
                    onHistory={(item) => openEditor(item, "history")}
                  />
                ))}
              </ul>
              {!filtered.length && (
                <p className="py-10 text-center text-sm text-dash-muted">
                  {bills.length
                    ? "No bills match your search."
                    : "No bills yet. Add one to get started."}
                </p>
              )}
            </>
          )}
        </Modal>
      )}
      {dialog === "add" && (
        <Modal title="Add upcoming bill" onClose={closeEditor} busy={saving}>
          <BillForm
            submitLabel="Add bill"
            onSubmit={async (input) => {
              await add(input);
              setNotice("Bill added successfully.");
            }}
            onClose={closeAfterSave}
            onSavingChange={setSaving}
          />
        </Modal>
      )}
      {dialog === "edit" && selectedBill && (
        <Modal title="Edit bill" onClose={closeEditor} busy={saving}>
          <BillForm
            initial={selectedBill}
            submitLabel="Save changes"
            onSubmit={async (input) => {
              await update(selectedBill.id, input);
              setNotice("Bill updated.");
            }}
            onClose={closeAfterSave}
            onSavingChange={setSaving}
          />
        </Modal>
      )}
      {dialog === "pay" && selectedBill && (
        <Modal title="Record payment" onClose={closeEditor} busy={saving}>
          <PaymentForm
            bill={selectedBill}
            onSubmit={(input) => recordPayment(selectedBill.id, input)}
            onClose={closeAfterSave}
            onSavingChange={setSaving}
          />
        </Modal>
      )}
      {dialog === "history" && selectedBill && (
        <Modal title="Payment history" onClose={closeEditor}>
          <PaymentHistory
            bill={selectedBill}
            onDelete={(paymentId) => removePayment(selectedBill.id, paymentId)}
          />
        </Modal>
      )}
      {dialog === "remove" && selectedBill && (
        <Modal title="Remove bill" onClose={closeEditor}>
          <p className="text-sm leading-7 text-dash-muted">
            Remove{" "}
            <strong className="break-words font-medium text-dash-text">
              {selectedBill.name}
            </strong>{" "}
            ({money(selectedBill.amount, 2)}) from your bills? This only removes
            the reminder
            {(selectedBill.payments ?? []).length
              ? " and its payment history"
              : ""}
            . Expense transactions recorded from its payments stay in your
            records.
          </p>
          {saveError && (
            <p role="alert" className="mt-4 text-xs text-dash-red">
              {saveError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="dash-small-button"
              onClick={closeEditor}
              disabled={saving}
            >
              Keep bill
            </button>
            <button
              className="dash-primary"
              disabled={saving}
              onClick={async () => {
                if (saving) return;
                setSaving(true);
                setSaveError("");
                try {
                  await remove(selectedBill.id);
                  setNotice(`${selectedBill.name} removed.`);
                  setDialog(returnToAll ? "all" : null);
                } catch (error) {
                  setSaveError(activityError(error));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Removing…" : "Remove bill"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
