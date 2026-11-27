"use client";

import { useMemo, useState } from "react";
import { money, type Transaction } from "./data";
import { PanelHeading, ProgressBar } from "./ui";
import { ActivityError } from "./recent-transactions";
import styles from "./dashboard.module.css";
import {
  dateKey,
  periodRange,
  spendingBreakdown,
  spendingRangeSummary,
  type BillForForecast,
} from "./spending-data";

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function monthLabelOf(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function SpendingAnalysis({
  transactions,
  bills = [],
  loading,
  error,
  onRetry,
  month,
}: {
  transactions: Transaction[];
  /** Unpaid bills count as committed spending in the month-end projection. */
  bills?: BillForForecast[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** The dashboard month this panel is scoped to; defaults to the current month. */
  month?: string;
}) {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "custom">(
    "weekly",
  );
  // The anchor is the end of the selected month, capped at today: a
  // past month analyses its own last week/month, the current month
  // analyses up to today. Never a frozen `new Date()` of mount time.
  const now = useMemo(() => {
    const today = new Date();
    if (!month) return today;
    const [year, monthIndex] = month.split("-").map(Number);
    const monthEnd = new Date(year!, monthIndex!, 0);
    return dateKey(monthEnd) < dateKey(today) ? monthEnd : today;
  }, [month]);
  const [custom, setCustom] = useState(() => ({
    start: periodRange("monthly", now).start,
    end: dateKey(now),
  }));
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const range = period === "custom" ? custom : periodRange(period, now);
  const rangeDays =
    (Date.parse(range.end) - Date.parse(range.start)) / 86400000;
  const invalidRange =
    !range.start ||
    !range.end ||
    !Number.isFinite(rangeDays) ||
    rangeDays < 0 ||
    rangeDays > 365;
  // The stat cards read the SAME range as the chart below — weekly,
  // monthly or custom — never the current month regardless of toggle.
  const summary = useMemo(
    () =>
      invalidRange
        ? null
        : spendingRangeSummary(transactions, range.start, range.end, bills),
    [transactions, range.start, range.end, bills, invalidRange],
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
  const rangeDates =
    period === "custom"
      ? `${shortDate(range.start)} – ${new Date(`${range.end}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : period === "weekly"
        ? `${shortDate(range.start)} – ${shortDate(range.end)}`
        : monthLabelOf(range.start.slice(0, 7));
  const stats = summary
    ? [
        {
          label:
            period === "weekly"
              ? "This week so far"
              : period === "monthly"
                ? "This month so far"
                : `Total · ${rangeDates}`,
          value: money(summary.total),
          detail:
            summary.categoryCount > 0
              ? `Across ${summary.categoryCount} spending categor${summary.categoryCount === 1 ? "y" : "ies"} · ${rangeDates}`
              : `No spending recorded · ${rangeDates}`,
        },
        {
          label: "Vs previous period",
          value: summary.previousTotal
            ? `${summary.difference > 0 ? "+" : summary.difference < 0 ? "−" : ""}${money(Math.abs(summary.difference))}`
            : "—",
          detail: summary.previousTotal
            ? `Compared with ${shortDate(summary.previousStart)} – ${shortDate(summary.previousEnd)}`
            : "No expenses in the prior comparison period",
        },
        {
          label: "Change vs previous period",
          value:
            summary.percentChange === null
              ? "—"
              : `${summary.percentChange > 0 ? "+" : ""}${summary.percentChange.toFixed(1)}%`,
          detail:
            summary.percentChange === null
              ? "No expenses in the prior comparison period"
              : `Compared with ${shortDate(summary.previousStart)} – ${shortDate(summary.previousEnd)}`,
        },
        summary.projection === null
          ? {
              label: "Daily average",
              value: money(summary.dailyAverage),
              detail: `Across ${summary.days} day${summary.days === 1 ? "" : "s"} · ${rangeDates}`,
            }
          : {
              label:
                period === "weekly"
                  ? "Projected week-end"
                  : period === "monthly"
                    ? "Projected month-end"
                    : "Projected range end",
              value: money(summary.projection),
              detail:
                summary.committedBills > 0
                  ? `Daily rate plus ${money(summary.committedBills)} in unpaid bills due by range end`
                  : "Estimate based on recorded daily spending",
            },
      ]
    : [];

  return (
    <section
      className="dash-panel overflow-hidden"
      aria-label="Spending analysis"
      aria-busy={loading}
    >
      <div className="p-5">
        <PanelHeading icon="chart" title="Spending Analysis">
          <div
            className={styles.seg}
            role="group"
            aria-label="Spending period"
          >
            {(["weekly", "monthly", "custom"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
              >
                {option === "weekly"
                  ? "Weekly"
                  : option === "monthly"
                    ? "Monthly"
                    : "Custom"}
              </button>
            ))}
          </div>
        </PanelHeading>
        {month && period !== "custom" && (
          <p className="mt-3 text-xs leading-5 text-dash-muted">
            Scoped to {monthLabelOf(month)} — change the month above to see
            another month.
          </p>
        )}
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div className={styles.mini} key={stat.label}>
                <p className={styles.miniLabel}>{stat.label}</p>
                <p className={`${styles.miniValue} !text-base !leading-6`}>
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
                const description = `${bar.date}${bar.end !== bar.date ? ` to ${bar.end}` : ""}: ${money(bar.amount)}`;
                return (
                  <div
                    key={bar.date}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                    role="listitem"
                  >
                    <div
                      tabIndex={0}
                      role="button"
                      aria-label={`${description}. Activate to show the amount.`}
                      aria-expanded={activeBar === bar.date}
                      onClick={() =>
                        setActiveBar((current) =>
                          current === bar.date ? null : bar.date,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveBar((current) =>
                            current === bar.date ? null : bar.date,
                          );
                        }
                      }}
                      className="relative flex min-h-2 cursor-pointer items-end rounded-t-lg outline-dash-accent"
                      style={{
                        height: `${Math.max(3, (bar.amount / maximum) * 100)}%`,
                      }}
                    >
                      <div
                        className={`w-full rounded-t-sm border border-transparent transition-colors group-hover:bg-dash-muted ${bar.amount && bar.amount === maximum ? "bg-dash-accent" : "bg-dash-muted/50"} ${bar.amount ? "h-full" : "h-px opacity-30"}`}
                      />
                      <span
                        className={`pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-48 rounded-lg border border-dash-border bg-dash-surface px-2 py-1 text-xs text-dash-text shadow-lg ${activeBar === bar.date ? "block" : "hidden group-hover:block group-focus-within:block"} ${index > breakdown.bars.length / 2 ? "right-0" : "left-0"}`}
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
            <p className="mt-1 text-xs leading-5 text-dash-muted">
              Tap a bar — or focus it and press Enter — to see its amount.
            </p>
          </div>
          <div className="min-w-0">
            <h3 className="dash-eyebrow !text-xs">
              Category breakdown · {periodLabel}
            </h3>
            {breakdown.categories.length ? (
              <ul className="mt-5 space-y-4">
                {breakdown.categories.map((category, index) => (
                  <li
                    key={category.name}
                    className="grid grid-cols-category items-center gap-x-3 gap-y-2 text-xs sm:grid-cols-category-wide"
                  >
                    <span className="truncate" title={category.name}>
                      {category.name}
                    </span>
                    <ProgressBar
                      value={category.percentage}
                      label={`${category.name}: ${money(category.amount)}, ${category.percentage.toFixed(1)}%`}
                      tone={index === 0 ? "accent" : "muted"}
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
