"use client";

import { useMemo, useState } from "react";
import { money, type Tone, type Transaction } from "./data";
import { PanelHeading, ProgressBar } from "./ui";
import { ActivityError } from "./recent-transactions";
import {
  dateKey,
  periodRange,
  spendingBreakdown,
  spendingSummary,
} from "./spending-data";

const categoryTones: Record<string, Tone> = {
  Housing: "accent",
  "Food & Dining": "accent",
  Shopping: "blue",
  Utilities: "purple",
  Entertainment: "warning",
  Transportation: "blue",
  Other: "muted",
};

export default function SpendingAnalysis({
  transactions,
  loading,
  error,
  onRetry,
}: {
  transactions: Transaction[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "custom">(
    "weekly",
  );
  const [now] = useState(() => new Date());
  const [custom, setCustom] = useState(() => ({
    start: periodRange("monthly", now).start,
    end: dateKey(now),
  }));
  const range = period === "custom" ? custom : periodRange(period, now);
  const rangeDays =
    (Date.parse(range.end) - Date.parse(range.start)) / 86400000;
  const invalidRange =
    !range.start ||
    !range.end ||
    !Number.isFinite(rangeDays) ||
    rangeDays < 0 ||
    rangeDays > 365;
  const summary = useMemo(
    () => spendingSummary(transactions, now),
    [transactions, now],
  );
  const breakdown = useMemo(
    () => spendingBreakdown(transactions, range.start, range.end),
    [transactions, range.start, range.end],
  );
  const maximum = Math.max(1, ...breakdown.bars.map((bar) => bar.amount));
  const periodLabel =
    period === "weekly"
      ? "This week"
      : period === "monthly"
        ? "This month"
        : "Selected dates";
  const stats = [
    {
      label: "This month so far",
      value: money(summary.monthTotal),
      detail: `Across ${summary.categoryCount} spending categories`,
    },
    {
      label: "Vs last month",
      value: summary.previousMonthTotal
        ? `${summary.monthDifference > 0 ? "+" : summary.monthDifference < 0 ? "−" : ""}${money(Math.abs(summary.monthDifference))}`
        : "—",
      detail: summary.previousMonthTotal
        ? "Compared with the same days last month"
        : "No expenses in the prior comparison period",
    },
    {
      label: "Vs previous week",
      value:
        summary.weekChange === null
          ? "—"
          : `${summary.weekChange > 0 ? "+" : ""}${summary.weekChange.toFixed(1)}%`,
      detail:
        summary.weekChange === null
          ? "No expenses in the prior comparison period"
          : "Compared with the same weekdays",
    },
    {
      label: "Projected month-end",
      value: money(summary.projection),
      detail: "Estimate based on recorded daily spending",
    },
  ];

  return (
    <section
      className="dash-panel overflow-hidden"
      aria-label="Spending analysis"
      aria-busy={loading}
    >
      <div className="p-5">
        <PanelHeading icon="chart" title="Spending Analysis">
          <div
            className="surface-inset flex gap-1 rounded-full border p-1"
            role="group"
            aria-label="Spending period"
          >
            {(["weekly", "monthly", "custom"] as const).map((option) => (
              <button
                key={option}
                aria-pressed={period === option}
                className={`rounded-full px-3 py-2 text-xs capitalize transition-colors ${period === option ? "bg-dash-accent text-dash-bg" : "text-dash-muted hover:text-dash-text"}`}
                onClick={() => setPeriod(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </PanelHeading>
        {period === "custom" && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-dash-muted">
              From
              <input
                type="date"
                className="dash-input mt-2 block"
                aria-label="Spending start date"
                min="1900-01-01"
                max={custom.end || "9999-12-31"}
                value={custom.start}
                onChange={(event) =>
                  setCustom((value) => ({
                    ...value,
                    start: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-xs text-dash-muted">
              To
              <input
                type="date"
                className="dash-input mt-2 block"
                aria-label="Spending end date"
                min={custom.start || "1900-01-01"}
                max="9999-12-31"
                value={custom.end}
                onChange={(event) =>
                  setCustom((value) => ({ ...value, end: event.target.value }))
                }
              />
            </label>
            <p className="pb-3 text-xs text-dash-muted">
              Select up to 366 days.
            </p>
          </div>
        )}
        {!error && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div className="surface-inset border px-4 py-3" key={stat.label}>
                <p className="dash-eyebrow !text-xs">{stat.label}</p>
                <p className="mt-2 font-mono text-base">
                  {loading ? "—" : stat.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-dash-muted">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {loading ? (
        <p role="status" className="p-10 text-center text-sm text-dash-muted">
          Loading spending activity…
        </p>
      ) : error ? (
        <ActivityError error={error} onRetry={onRetry} />
      ) : invalidRange ? (
        <p role="alert" className="px-5 pb-6 text-sm text-dash-warning">
          Choose a valid date range of up to 366 days, with the end on or after
          the start.
        </p>
      ) : (
        <div className="grid gap-6 border-t border-dash-border p-5 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="dash-eyebrow !text-xs">
                {breakdown.bars.some((bar) => bar.date !== bar.end)
                  ? "Spending over time"
                  : "Daily spending"}{" "}
                · {periodLabel}
              </h3>
              <span className="text-xs text-dash-muted">
                {money(breakdown.total)}
              </span>
            </div>
            <div
              className="mt-6 flex h-36 items-end gap-1.5"
              role="list"
              aria-label={`Spending, ${periodLabel.toLowerCase()}`}
            >
              {breakdown.bars.map((bar, index) => {
                const date = new Date(`${bar.date}T12:00:00`);
                const label = date.toLocaleDateString(
                  "en-IN",
                  period === "weekly"
                    ? { weekday: "short" }
                    : { day: "numeric", month: "short" },
                );
                const description = `${bar.date}${bar.end !== bar.date ? ` to ${bar.end}` : ""}: ${money(bar.amount, 2)}`;
                return (
                  <div
                    key={bar.date}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                    role="listitem"
                  >
                    <div
                      tabIndex={0}
                      aria-label={description}
                      className="relative flex min-h-2 items-end rounded-t-lg outline-dash-accent"
                      style={{
                        height: `${Math.max(3, (bar.amount / maximum) * 100)}%`,
                      }}
                    >
                      <div
                        className={`w-full rounded-t-lg border border-dash-accent/20 bg-dash-accent transition-colors group-hover:bg-dash-accent/80 ${bar.amount ? "h-full" : "h-px opacity-30"}`}
                      />
                      <span
                        className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max max-w-48 rounded-lg border border-dash-border bg-dash-surface px-2 py-1 text-xs text-dash-text shadow-lg group-hover:block group-focus-within:block ${index > breakdown.bars.length / 2 ? "right-0" : "left-0"}`}
                      >
                        {description}
                      </span>
                    </div>
                    <span
                      className="absolute top-full left-1/2 mt-2 w-max -translate-x-1/2 text-center font-mono text-xs text-dash-muted"
                      aria-hidden="true"
                    >
                      {breakdown.bars.length <= 7 ||
                      index % Math.ceil(breakdown.bars.length / 6) === 0
                        ? label
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-9 text-xs leading-5 text-dash-muted">
              {breakdown.total
                ? "Recorded expenses only. Income and unpaid bills are excluded."
                : "No expenses recorded for these dates. Add a transaction to start tracking."}
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="dash-eyebrow !text-xs">
              Category breakdown · {periodLabel}
            </h3>
            {breakdown.categories.length ? (
              <ul className="mt-5 space-y-4">
                {breakdown.categories.map((category) => (
                  <li
                    key={category.name}
                    className="grid grid-cols-category items-center gap-x-3 gap-y-2 text-xs sm:grid-cols-category-wide"
                  >
                    <span className="truncate" title={category.name}>
                      {category.name}
                    </span>
                    <ProgressBar
                      value={category.percentage}
                      label={`${category.name}: ${money(category.amount, 2)}, ${category.percentage.toFixed(1)}%`}
                      tone={categoryTones[category.name] ?? "muted"}
                    />
                    <span className="col-start-2 text-right font-mono text-xs text-dash-muted sm:col-auto">
                      {money(category.amount)} ·{" "}
                      {Math.round(category.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="surface-inset mt-5 flex min-h-36 items-center justify-center border p-6 text-center text-xs leading-6 text-dash-muted">
                Your spending categories will appear here as you record
                expenses.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
