import { money, type Budget } from "./data";
import type { FinancialGoal } from "../../../lib/profile";

import { PanelHeading, ProgressBar } from "./ui";

export default function PlanningCards({
  budgets,
  goals,
  onManage,
  onAdd,
}: {
  budgets: Budget[];
  goals: FinancialGoal[];
  onManage: () => void;
  onAdd: () => void;
}) {
  return (
    <section
      id="planning"
      aria-label="Budgets and savings"
      className="grid gap-4 lg:grid-cols-2"
    >
      <BudgetCard budgets={budgets} onManage={onManage} />
      <SavingsCard goals={goals} onAdd={onAdd} />
    </section>
  );
}

function BudgetCard({
  budgets,
  onManage,
}: {
  budgets: Budget[];
  onManage: () => void;
}) {
  return (
    <article className="dash-panel p-5">
      <PanelHeading icon="target" title="Budget Status">
        <button className="dash-small-button" onClick={onManage}>
          Manage budgets
        </button>
      </PanelHeading>
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
            percent >= 100 ? "red" : percent >= 90 ? "warning" : "accent";
          return (
            <div key={budget.name}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                <span>{budget.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-dash-muted">
                    {money(budget.spent)} / {money(budget.limit)}
                  </span>
                  <span data-tone={tone} className="dash-badge">
                    {percent >= 100
                      ? "Over budget"
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
              <p className="mt-1.5 font-mono text-[9px] text-dash-muted">
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

function SavingsCard({
  goals,
  onAdd,
}: {
  goals: FinancialGoal[];
  onAdd: () => void;
}) {
  return (
    <article className="dash-panel p-5">
      <PanelHeading icon="pig" title="Savings Progress">
        <button
          className="dash-small-button border-dash-accent/40 bg-dash-accent/10 text-dash-accent"
          onClick={onAdd}
        >
          + Add goal
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
          return (
            <div key={`${goal.name}-${index}`}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span>{goal.name}</span>
                <span className="font-mono text-xs font-semibold text-dash-accent">
                  {goal.priority} priority
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-1 font-mono text-[9px] text-dash-muted">
                <span>
                  Target {money(Number(goal.target_amount), 2)} · {deadline}
                </span>
                <span>Progress not tracked yet</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
