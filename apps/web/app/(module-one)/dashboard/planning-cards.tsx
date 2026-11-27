"use client";

import { useEffect, useState } from "react";
import { money, type Budget } from "./data";
import { cents, type FinancialGoal } from "../../../lib/profile";

import { Icon, PanelHeading, ProgressBar } from "./ui";
import { ActivityError } from "./recent-transactions";
import { activityError, activityRequest } from "./use-activity";
import { Modal } from "./modal";
import { dateKey } from "./spending-data";

type GoalContribution = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

export default function PlanningCards({
  budgets,
  goals,
  onManage,
  onAdd,
  onGoalSavedAmount,
  loading,
  error,
  onRetry,
  month,
}: {
  budgets: Budget[];
  goals: FinancialGoal[];
  onManage: () => void;
  onAdd: () => void;
  onGoalSavedAmount: (goalId: string, savedAmount: string) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** The dashboard month the budget spending is scoped to. */
  month?: string;
}) {
  return (
    <section
      id="planning"
      aria-label="Budgets and savings"
      className="grid gap-4 lg:grid-cols-2"
    >
      {loading || error ? (
        <article className="dash-panel p-5" aria-busy={loading}>
          <PanelHeading icon="target" title="Budget status" />
          {loading ? (
            <p role="status" className="py-8 text-sm text-dash-muted">
              Loading budget spending…
            </p>
          ) : (
            <ActivityError error={error} onRetry={onRetry} />
          )}
        </article>
      ) : (
        <BudgetCard budgets={budgets} onManage={onManage} month={month} />
      )}
      <SavingsCard
        goals={goals}
        onAdd={onAdd}
        onGoalSavedAmount={onGoalSavedAmount}
      />
    </section>
  );
}

function BudgetCard({
  budgets,
  onManage,
  month,
}: {
  budgets: Budget[];
  onManage: () => void;
  month?: string;
}) {
  const monthLabel = new Date(
    `${month ?? dateKey(new Date()).slice(0, 7)}-01T12:00:00`,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return (
    <article className="dash-panel p-5">
      <PanelHeading icon="target" title="Budget status">
        <button className="dash-small-button" onClick={onManage}>
          Manage budgets
        </button>
      </PanelHeading>
      <p className="mt-3 text-xs leading-5 text-dash-muted">
        Spending in {monthLabel} against each category budget — change the month
        above to see another month.
      </p>
      <div className="mt-3 space-y-5">
        {!budgets.length && (
          <p className="text-xs text-dash-muted">
            No category budgets have been set.
          </p>
        )}
        {budgets.map((budget) => {
          const percent =
            budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
          const tone =
            percent >= 100 ? "red" : percent >= 90 ? "warning" : "muted";
          return (
            <div key={budget.name}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-xs">
                <span>{budget.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-dash-muted">
                    {money(budget.spent)} / {money(budget.limit)}
                  </span>
                  <span data-tone={tone} className="font-mono text-xs">
                    {percent > 100
                      ? "Over budget"
                      : percent === 100
                        ? "Fully used"
                        : percent >= 90
                          ? "Watch"
                          : "On track"}
                  </span>
                </div>
              </div>
              <ProgressBar
                value={percent}
                label={`${budget.name} budget used`}
                tone={tone}
              />
              <p className="mt-1.5 font-mono text-xs text-dash-muted">
                {money(Math.abs(budget.limit - budget.spent))}{" "}
                {percent > 100 ? "over budget" : "left to spend"}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ContributionForm({
  goal,
  onSaved,
  onClose,
}: {
  goal: FinancialGoal;
  onSaved: (savedAmount: string) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const remaining = Math.max(
    0.01,
    (cents(goal.target_amount) - cents(goal.saved_amount ?? "0")) / 100,
  );
  return (
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
          await activityRequest(
            `/api/goals/${encodeURIComponent(goal.id!)}/contributions`,
            {
              method: "POST",
              body: JSON.stringify({
                amount,
                date: String(form.get("date")),
                note: String(form.get("note")).trim() || undefined,
              }),
            },
          );
          onSaved(
            (
              (cents(goal.saved_amount ?? "0") + Math.round(amount * 100)) /
              100
            ).toFixed(2),
          );
          onClose();
        } catch (error) {
          setSaveError(activityError(error));
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-sm leading-7 text-dash-muted">
        Add savings towards{" "}
        <strong className="break-words font-medium text-dash-text">
          {goal.name}
        </strong>{" "}
        — {money(cents(goal.saved_amount ?? "0") / 100)} saved of{" "}
        {money(Number(goal.target_amount))}.
      </p>
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
            defaultValue={remaining.toFixed(2)}
            autoFocus
          />
        </label>
        <label>
          Date
          <input
            className="dash-input"
            name="date"
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            required
            defaultValue={dateKey(new Date())}
          />
        </label>
      </div>
      <label>
        Note (optional)
        <input
          className="dash-input"
          name="note"
          maxLength={140}
          placeholder="e.g. Salary day"
        />
      </label>
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
          {saving ? "Saving…" : "Add savings"}
        </button>
      </div>
    </form>
  );
}

function ContributionHistory({
  goal,
  onSaved,
}: {
  goal: FinancialGoal;
  onSaved: (savedAmount: string) => void;
}) {
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  useEffect(() => {
    let cancelled = false;
    activityRequest<GoalContribution[]>(
      `/api/goals/${encodeURIComponent(goal.id!)}/contributions`,
    )
      .then((data) => {
        if (!cancelled) setContributions(data);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(activityError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [goal.id]);
  return (
    <div>
      <p className="text-sm leading-7 text-dash-muted">
        Savings added towards{" "}
        <strong className="break-words font-medium text-dash-text">
          {goal.name}
        </strong>
        .
      </p>
      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-dash-muted">
          Loading contributions…
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 text-xs text-dash-red">
          {error}
        </p>
      ) : !contributions.length ? (
        <p className="py-8 text-center text-sm text-dash-muted">
          No savings added yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {contributions.map((contribution) => (
            <li
              key={contribution.id}
              className="surface-inset flex items-center gap-2 border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs">
                  {money(contribution.amount)}
                </p>
                <p className="mt-1 truncate text-xs text-dash-muted">
                  {new Date(`${contribution.date}T12:00:00`).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                  {contribution.note ? ` · ${contribution.note}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
                aria-label={`Remove contribution of ${money(contribution.amount)}`}
                title="Remove this contribution"
                disabled={!!deletingId}
                onClick={async () => {
                  if (deletingId) return;
                  setDeletingId(contribution.id);
                  setError("");
                  try {
                    await activityRequest(
                      `/api/goals/${encodeURIComponent(goal.id!)}/contributions/${encodeURIComponent(contribution.id)}`,
                      { method: "DELETE" },
                    );
                    const remaining = contributions.filter(
                      (item) => item.id !== contribution.id,
                    );
                    setContributions(remaining);
                    onSaved(
                      (
                        remaining.reduce(
                          (sum, item) => sum + Math.round(item.amount * 100),
                          0,
                        ) / 100
                      ).toFixed(2),
                    );
                  } catch (caught: unknown) {
                    setError(activityError(caught));
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

function SavingsCard({
  goals,
  onAdd,
  onGoalSavedAmount,
}: {
  goals: FinancialGoal[];
  onAdd: () => void;
  onGoalSavedAmount: (goalId: string, savedAmount: string) => void;
}) {
  const [dialog, setDialog] = useState<"add" | "history" | null>(null);
  const [selected, setSelected] = useState<FinancialGoal | null>(null);
  const [notice, setNotice] = useState("");
  const selectedGoal = selected
    ? (goals.find((goal) => goal.id === selected.id) ?? selected)
    : null;
  return (
    <>
      <article className="dash-panel p-5">
        <PanelHeading icon="pig" title="Savings progress">
          <button
            className="dash-small-button"
            onClick={onAdd}
          >
            Add goal
          </button>
        </PanelHeading>
        <div className="mt-3 space-y-5">
          {!goals.length && (
            <p className="text-xs text-dash-muted">No savings goals yet.</p>
          )}
          {goals.map((goal, index) => {
            const deadline = new Date(
              `${goal.target_date}T12:00:00`,
            ).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const target = Number(goal.target_amount);
            const saved = cents(goal.saved_amount ?? "0") / 100;
            const percent = target > 0 ? (saved / target) * 100 : 0;
            return (
              <div key={goal.id ?? `${goal.name}-${index}`}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span>{goal.name}</span>
                  <span className="font-mono text-xs text-dash-muted">
                    {goal.priority} priority
                  </span>
                </div>
                <ProgressBar
                  value={percent}
                  label={`${goal.name} savings progress`}
                  tone={percent >= 100 ? "accent" : "muted"}
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 font-mono text-xs text-dash-muted">
                  <span>
                    Saved {money(saved)} of {money(target)} · {deadline}
                  </span>
                  <span
                    className={
                      percent >= 100 ? "font-semibold text-dash-accent" : ""
                    }
                  >
                    {percent >= 100
                      ? "Goal reached"
                      : `${Math.floor(percent)}% saved`}
                  </span>
                </div>
                {goal.id && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="dash-small-button gap-1.5"
                      onClick={() => {
                        setSelected(goal);
                        setDialog("add");
                      }}
                    >
                      <Icon name="plus" className="size-3" />
                      Add savings
                    </button>
                    {saved > 0 && (
                      <button
                        type="button"
                        className="dash-small-button"
                        onClick={() => {
                          setSelected(goal);
                          setDialog("history");
                        }}
                      >
                        History
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span role="status" className="sr-only">
          {notice}
        </span>
      </article>
      {dialog === "add" && selectedGoal?.id && (
        <Modal title="Add savings" onClose={() => setDialog(null)}>
          <ContributionForm
            goal={selectedGoal}
            onSaved={(savedAmount) => {
              onGoalSavedAmount(selectedGoal.id!, savedAmount);
              setNotice("Savings added.");
            }}
            onClose={() => setDialog(null)}
          />
        </Modal>
      )}
      {dialog === "history" && selectedGoal?.id && (
        <Modal title="Savings history" onClose={() => setDialog(null)}>
          <ContributionHistory
            goal={selectedGoal}
            onSaved={(savedAmount) => {
              onGoalSavedAmount(selectedGoal.id!, savedAmount);
              setNotice("Contribution removed.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
