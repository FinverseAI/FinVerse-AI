"use client";

import { useState } from "react";
import { money } from "./data";
import { Icon, MiniStat, PanelHeading } from "./ui";
import { ActivityEmpty, ActivityError } from "./recent-transactions";
import { activityError, useActivity } from "./use-activity";
import { Modal } from "./modal";
import { dateKey } from "./spending-data";

type Bill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  autoPay: boolean;
};

function BillRow({
  bill,
  onRemove,
}: {
  bill: Bill;
  onRemove: (bill: Bill) => void;
}) {
  const today = new Date();
  const soon = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7,
  );
  const overdue = bill.dueDate < dateKey(today);
  const dueSoon = bill.dueDate <= dateKey(soon);
  const status = overdue
    ? "Overdue"
    : dueSoon
      ? "Due soon"
      : bill.autoPay
        ? "Auto-pay"
        : "Upcoming";
  return (
    <li
      className={`surface-inset flex min-h-14 items-center gap-2 border px-3 py-2 ${overdue ? "border-dash-red/40" : ""}`}
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
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="mb-1.5 font-mono text-xs">{money(bill.amount, 2)}</p>
        <span
          className={`dash-badge !px-2 !py-1 !text-xs ${overdue ? "text-dash-red" : dueSoon ? "text-dash-warning" : bill.autoPay ? "text-dash-blue" : "text-dash-muted"}`}
        >
          {status}
        </span>
      </div>
      <button
        className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
        aria-label={`Remove ${bill.name}`}
        title={`Remove ${bill.name}`}
        onClick={() => onRemove(bill)}
      >
        <Icon name="close" className="size-3.5" />
      </button>
    </li>
  );
}

export default function UpcomingBills() {
  const { items, loading, error, retry, add, remove } =
    useActivity<Bill>("/api/bills");
  const [dialog, setDialog] = useState<"all" | "add" | "remove" | null>(null);
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
    bills.reduce((sum, bill) => sum + Math.round(bill.amount * 100), 0) / 100;

  function openAdd(fromAll = false) {
    setReturnToAll(fromAll);
    setSaveError("");
    setDialog("add");
  }
  function openRemove(bill: Bill) {
    setSelected(bill);
    setReturnToAll(dialog === "all");
    setSaveError("");
    setDialog("remove");
  }
  function closeEditor() {
    if (!saving) {
      setSaveError("");
      setDialog(returnToAll ? "all" : null);
    }
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
              <BillRow key={bill.id} bill={bill} onRemove={openRemove} />
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
                  <BillRow key={bill.id} bill={bill} onRemove={openRemove} />
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
        <Modal title="Add upcoming bill" onClose={closeEditor}>
          <form
            className="dash-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (saving) return;
              const form = new FormData(event.currentTarget);
              setSaving(true);
              setSaveError("");
              try {
                await add({
                  name: String(form.get("name")).trim(),
                  amount: Number(form.get("amount")),
                  dueDate: String(form.get("dueDate")),
                  autoPay: form.get("autoPay") === "on",
                });
                setNotice("Bill added successfully.");
                setDialog(returnToAll ? "all" : null);
              } catch (error) {
                setSaveError(activityError(error));
              } finally {
                setSaving(false);
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
                  defaultValue={dateKey(new Date())}
                />
              </label>
            </div>
            <label className="surface-inset !flex-row items-center gap-3 border p-4">
              <input
                className="size-4 accent-dash-accent"
                name="autoPay"
                type="checkbox"
              />
              <span className="text-xs">Already set up with auto-pay</span>
            </label>
            <p className="text-xs leading-6 text-dash-muted">
              Track a payment you have scheduled with your provider. Adding a
              bill here does not make a payment.
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
                onClick={closeEditor}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="dash-primary" disabled={saving}>
                {saving ? "Saving…" : "Add bill"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "remove" && selected && (
        <Modal title="Remove bill" onClose={closeEditor}>
          <p className="text-sm leading-7 text-dash-muted">
            Remove{" "}
            <strong className="break-words font-medium text-dash-text">
              {selected.name}
            </strong>{" "}
            ({money(selected.amount, 2)}) from your bills? This only removes the
            reminder.
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
                  await remove(selected.id);
                  setNotice(`${selected.name} removed.`);
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
