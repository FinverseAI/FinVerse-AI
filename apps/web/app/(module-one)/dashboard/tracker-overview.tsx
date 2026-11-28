"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { formatMoney } from "../../../lib/market";
import {
  cents,
  type FinancialGoal,
  type FinancialProfile,
} from "../../../lib/profile";
import { type Transaction } from "./data";
import SummaryCards from "./summary-cards";
import { monthNames, trackerData } from "./tracker-data";
import { activityRequest } from "./use-activity";
import { Icon } from "./ui";
import styles from "./tracker-overview.module.css";

type Tracker = ReturnType<typeof trackerData>;
const numberFormat = new Intl.NumberFormat("en-IN");
const percent = (value: number) => `${value.toFixed(1)}%`;
const money = (value: number) => formatMoney(value, "INR", 2);
const chartWidth = 660;
const chartHeight = 220;
const x = (index: number) => ((index + 0.5) / 12) * chartWidth;
const scopeLabel = (month: string) =>
  `${monthNames[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
const fill = (value: number | null) =>
  `${Math.min(100, Math.max(0, value ?? 0))}%`;

// Invert the same cubic Bézier used by the CSS animations.
function ease(progress: number) {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 12; i++) {
    const t = (low + high) / 2;
    const u = 1 - t;
    const time = 3 * u * u * t * 0.22 + 3 * u * t * t * 0.36 + t ** 3;
    if (time < progress) low = t;
    else high = t;
  }
  return 1 - (1 - (low + high) / 2) ** 3;
}

function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const [initialText] = useState(() => format(value));
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const from = shown.current;
    if (
      from === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      shown.current = value;
      element.textContent = format(value);
      return;
    }
    const start = performance.now();
    let frame: number;
    function draw(now: number) {
      const progress = Math.min(1, (now - start) / 580);
      shown.current =
        progress === 1 ? value : from + (value - from) * ease(progress);
      element!.textContent = format(shown.current);
      if (progress < 1) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [value, format]);
  return (
    <span className={styles.mono} aria-label={format(value)} ref={node}>
      {initialText}
    </span>
  );
}

const integer = (value: number) => numberFormat.format(Math.round(value));
const changeLabel = (value: number) =>
  `${value < 0 ? "−" : value > 0 ? "+" : ""}${Math.abs(value).toFixed(2)}%`;

function Sparkline({
  values,
  month,
  available,
}: {
  values: Tracker["sparkline"];
  month: string;
  available: boolean;
}) {
  const days = values.map(({ day }) => day);
  const balances = values.map(({ balance }) => balance);
  const min = Math.min(...balances);
  const range = Math.max(...balances) - min || 1;
  const startDay = days[0] ?? 1;
  const dayRange = (days.at(-1) ?? startDay) - startDay || 1;
  const line = values
    .map(({ day, balance }, index) => {
      const pointX = 4 + ((day - startDay) / dayRange) * 264;
      const pointY = 58 - ((balance - min) / range) * 48;
      return `${index ? "L" : "M"}${pointX} ${pointY}`;
    })
    .join(" ");
  return (
    <div className={styles.spark} data-empty={values.length < 2}>
      <p>Recorded balance trend</p>
      {values.length > 1 ? (
        <svg
          viewBox="0 0 272 70"
          preserveAspectRatio="none"
          role="img"
          aria-label="Recorded daily closing balance in the selected month"
        >
          <path d="M4 68H268" className={styles.gridline} />
          <g key={month} className={styles.redraw}>
            <path d={`${line} L268 68 L4 68 Z`} className={styles.sparkArea} />
            <path d={line} className={styles.sparkLine} />
          </g>
        </svg>
      ) : (
        available && (
          <p>
            {values.length
              ? "Trend appears after two days of activity."
              : "No transactions recorded this month."}
          </p>
        )
      )}
    </div>
  );
}

function BalanceDevelopment({
  data,
  month,
  onMonth,
  available,
}: {
  data: Tracker;
  month: string;
  onMonth: (month: string) => void;
  available: boolean;
}) {
  const [mode, setMode] = useState<"net" | "gross">("net");
  const [hover, setHover] = useState<number | null>(null);
  const active = Number(month.slice(5)) - 1;
  const selected = hover ?? active;
  const target = mode === "net" ? data.netTarget : data.grossTarget;
  const values = data.months.map((point) => (available ? point[mode] : null));
  const extent = [
    0,
    target,
    ...values.filter((value): value is number => value !== null),
  ];
  const min = Math.min(...extent);
  const max = Math.max(...extent);
  const step = (max - min) / 3;
  const y = (value: number) =>
    18 + ((max - value) / (max - min || 1)) * (chartHeight - 36);
  const path = values
    .map((value, index) =>
      value === null
        ? ""
        : `${index && values[index - 1] !== null ? "L" : "M"}${x(index)} ${y(value)}`,
    )
    .join(" ");
  const highlights = [
    { label: "Highest income", item: data.highestIncome, icon: "plus" },
    { label: "Highest spending", item: data.highestExpense, icon: "card" },
  ] as const;
  return (
    <section
      className={`${styles.panel} ${styles.balancePanel} ${styles.enter}`}
      aria-labelledby="balance-development"
    >
      <div className={styles.panelHeading}>
        <div>
          <h2 id="balance-development">Balance development</h2>
          <p>
            {mode === "net" ? "Income less expenses" : "Income before expenses"}{" "}
            · {month.slice(0, 4)}
          </p>
        </div>
        <div className={styles.highlights}>
          {highlights.map(({ label, item, icon }) => (
            <div className={styles.highlight} key={label}>
              <Icon name={icon} />
              {available && item && (
                <AnimatedNumber value={Math.abs(item.amount)} format={money} />
              )}
              <div>
                <p>{label}</p>
                <strong>
                  {available ? (item?.name ?? "No recorded entry") : "—"}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.chartLegend} aria-hidden="true">
        <span>Recorded</span>
        <span>Monthly plan</span>
      </div>
      <div className={styles.chartFrame}>
        <div className={styles.axis} aria-hidden="true">
          {[0, 1, 2, 3].map((tick) => (
            <span key={tick}>
              {step || tick === 3
                ? formatMoney(Math.round(max - tick * step), "INR", 0)
                : ""}
            </span>
          ))}
        </div>
        <div className={styles.chart}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[18, 79.33, 140.67, 202].map((position) => (
              <path
                key={position}
                d={`M0 ${position} H${chartWidth}`}
                className={styles.gridline}
              />
            ))}
            {data.months.map(({ key }, index) => (
              <path
                key={key}
                d={`M${x(index)} 18V202`}
                className={styles.verticalGrid}
              />
            ))}
            <path d={`M${x(selected)} 18V202`} className={styles.chartGuide} />
            <g key={`${month}-${mode}-${available}`} className={styles.redraw}>
              <path
                d={`M${x(0)} ${y(target)} H${x(11)}`}
                className={styles.targetLine}
              />
              <path d={path} className={styles.recordedLine} />
              {values.map(
                (value, i) =>
                  value !== null && (
                    <circle
                      key={i}
                      cx={x(i)}
                      cy={y(value)}
                      r={i === selected ? 4.5 : 2.4}
                      className={styles.chartDot}
                    />
                  ),
              )}
            </g>
          </svg>
          <div
            className={styles.chartControls}
            onMouseLeave={() => setHover(null)}
          >
            {data.months.map((point, index) => (
              <button
                type="button"
                key={point.key}
                aria-label={`${point.name}: ${point[mode] === null || !available ? "no recorded activity" : money(point[mode])}. Monthly plan ${money(target)}.`}
                aria-pressed={index === active}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                onClick={() => {
                  onMonth(point.key);
                  setHover(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setHover(null);
                }}
              >
                <span>{point.name.slice(0, 3)}</span>
              </button>
            ))}
          </div>
          {hover !== null && (
            <div
              className={styles.tooltip}
              aria-hidden="true"
              style={{
                left: `clamp(0px, ${((hover + 0.5) / 12) * 100}% - 74px, calc(100% - 148px))`,
                ...(values[hover] != null && {
                  top: `clamp(0rem, ${(y(values[hover]) / chartHeight) * 100}% - 2.2rem, 72%)`,
                }),
              }}
            >
              <strong>{data.months[hover]?.name}</strong>
              <span>
                {!available || data.months[hover]?.[mode] == null
                  ? available
                    ? "No recorded activity"
                    : "Activity unavailable"
                  : money(data.months[hover]![mode]!)}
              </span>
            </div>
          )}
          {hover === null && values[active] != null && (
            <span
              className={styles.pointLabel}
              aria-hidden="true"
              style={{
                left: `clamp(0px, ${((active + 0.5) / 12) * 100}% + .4rem, calc(100% - 6rem))`,
                top: `clamp(0rem, ${(y(values[active]) / chartHeight) * 100}% - 1.3rem, 80%)`,
              }}
            >
              {money(values[active])}
            </span>
          )}
        </div>
      </div>
      <div className={styles.toggle} role="group" aria-label="Balance series">
        <button
          type="button"
          aria-pressed={mode === "net"}
          onClick={() => setMode("net")}
        >
          Net
        </button>
        <span
          className={styles.toggleTrack}
          data-mode={mode}
          aria-hidden="true"
        />
        <button
          type="button"
          aria-pressed={mode === "gross"}
          onClick={() => setMode("gross")}
        >
          Gross
        </button>
      </div>
    </section>
  );
}

function ExpenseBreakdown({
  data,
  month,
  available,
}: {
  data: Tracker;
  month: string;
  available: boolean;
}) {
  const hasExpenses = available && data.groups.some(({ total }) => total > 0);
  const scale = data.groups.reduce(
    (largest, group) => Math.max(largest, group.total, group.budget),
    0,
  );
  const maxItem = data.groups.reduce(
    (largest, { amounts }) =>
      amounts.reduce((max, amount) => Math.max(max, amount), largest),
    0,
  );
  const plotExpense = (amount: number) => 60 - (amount / maxItem) * 53;

  return (
    <section
      className={`${styles.panel} ${styles.expensePanel} ${styles.enter}`}
      aria-labelledby="expense-breakdown"
    >
      <div className={styles.panelHeading}>
        <div>
          <h2 id="expense-breakdown">Expense breakdown</h2>
          <p>{scopeLabel(month)}</p>
        </div>
        {hasExpenses && (
          <strong className={styles.expenseTotal}>
            {money(data.groups.reduce((sum, group) => sum + group.total, 0))}
          </strong>
        )}
      </div>
      {available && !hasExpenses && (
        <p className={styles.inlineNotice}>
          No expenses recorded for this month.
        </p>
      )}
      {hasExpenses && (
        <>
          <div className={styles.expenseLegend}>
            <span>Recorded expenses</span>
            {data.groups.some(({ budget }) => budget > 0) && (
              <span>Budget</span>
            )}
          </div>
          <div
            className={styles.expenseBars}
            aria-label="Recorded spending and budget by category"
          >
            {data.groups.map(({ label, total, budget }) => (
              <div className={styles.expenseColumn} key={label}>
                <div className={styles.expenseAmounts}>
                  <strong
                    title={total > 0 ? `Recorded: ${money(total)}` : undefined}
                  >
                    {total > 0 ? money(total) : ""}
                  </strong>
                  <span
                    title={budget > 0 ? `Budget: ${money(budget)}` : undefined}
                  >
                    {budget > 0 ? money(budget) : ""}
                  </span>
                </div>
                <div className={styles.barSpace}>
                  {total > 0 && (
                    <div
                      className={styles.bar}
                      style={{ height: `${(total / scale) * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                  {budget > 0 && (
                    <div
                      className={`${styles.bar} ${styles.budgetBar}`}
                      style={{ height: `${(budget / scale) * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className={styles.dotHeading}>
            Individual expenses <span>Each dot is a transaction</span>
          </div>
          <div
            className={styles.dots}
            aria-label="Individual expenses by category"
          >
            {data.groups.map(({ amounts, label }) => {
              const smallest = amounts.reduce(
                (min, amount) => Math.min(min, amount),
                Infinity,
              );
              const largest = amounts.reduce(
                (max, amount) => Math.max(max, amount),
                0,
              );
              return (
                <div key={label}>
                  {amounts.length > 0 && (
                    <svg
                      viewBox="0 0 34 66"
                      role="img"
                      aria-label={`${label}: ${amounts.map(money).join(", ")}`}
                    >
                      <g key={month} className={styles.dotEntries}>
                        <line
                          x1={17}
                          x2={17}
                          y1={plotExpense(largest)}
                          y2={plotExpense(smallest)}
                          className={styles.dotRange}
                        />
                        {amounts.map((amount, index) => {
                          const endpoint =
                            amount === smallest || amount === largest;
                          const offset = endpoint ? 0 : [0, 2, -2][index % 3]!;
                          return (
                            <circle
                              key={index}
                              cx={17 + offset}
                              cy={plotExpense(amount)}
                              r={endpoint ? 2.05 : 1.25}
                              data-endpoint={endpoint}
                            >
                              <title>{money(amount)}</title>
                            </circle>
                          );
                        })}
                      </g>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {available && Boolean(data.counts[0]?.value) && (
        <div className={styles.expenseCounts}>
          {data.counts.map(({ label, value }) => (
            <div key={label}>
              <strong>
                <AnimatedNumber value={value} format={integer} />
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GoalProgress({
  goal,
  month,
}: {
  goal: FinancialGoal;
  month: string;
}) {
  const [history, setHistory] = useState<{
    key: string;
    rows: { date: string; amount: number }[] | null;
  }>();
  const goalId = goal.id;
  const historyKey = `${goalId}:${goal.saved_amount}`;
  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    activityRequest<{ date: string; amount: number }[]>(
      `/api/goals/${encodeURIComponent(goalId)}/contributions`,
    )
      .then((rows) => {
        if (!cancelled) setHistory({ key: historyKey, rows });
      })
      .catch(() => {
        if (!cancelled) setHistory({ key: historyKey, rows: null });
      });
    return () => {
      cancelled = true;
    };
  }, [goalId, historyKey]);
  const target = cents(goal.target_amount);
  const historical = history?.key === historyKey ? history.rows : undefined;
  const actual = historical?.reduce(
    (total, row) =>
      row.date.slice(0, 7) <= month
        ? total + Math.round(row.amount * 100)
        : total,
    0,
  );
  const progress =
    target > 0 && actual !== undefined ? (100 * actual) / target : null;
  const status = target <= 0
    ? "No target set"
    : historical === null || !goalId
      ? "Unavailable"
      : "Loading…";
  return (
    <div className={styles.goal}>
      <span>{goal.name}</span>
      <div
        className={styles.track}
        role={progress === null ? undefined : "progressbar"}
        aria-label={goal.name}
        aria-valuenow={
          progress === null ? undefined : Math.min(100, Math.round(progress))
        }
      >
        <span style={{ "--fill": fill(progress) } as CSSProperties} />
      </div>
      <span>
        {progress === null ? (
          status
        ) : (
          <AnimatedNumber value={progress} format={percent} />
        )}
      </span>
    </div>
  );
}

export default function TrackerOverview({
  month,
  currentMonth,
  onMonth,
  profile,
  transactions,
  goals,
  loading,
  error,
  onRetry,
  onReport,
}: {
  month: string;
  currentMonth: string;
  onMonth: (value: string) => void;
  profile: FinancialProfile;
  transactions: Transaction[];
  goals: FinancialGoal[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onReport?: () => void;
}) {
  const data = useMemo(
    () => trackerData(transactions, profile, month),
    [transactions, profile, month],
  );
  const available = !loading && !error;
  const balance = available ? data.balance : null;
  const change = available ? data.change : null;
  return (
    <div className={styles.overview}>
      <header className={styles.top}>
        <h1>Personal finance tracker</h1>
        <div
          className={styles.months}
          role="group"
          aria-label={`Select a month in ${month.slice(0, 4)}`}
        >
          {data.months.map((point) => (
            <button
              type="button"
              key={point.key}
              aria-label={point.name}
              aria-pressed={point.key === month}
              aria-current={point.key === currentMonth ? "date" : undefined}
              onClick={() => onMonth(point.key)}
            >
              {point.name.slice(0, 3)}
            </button>
          ))}
        </div>
      </header>
      {(loading || error) && (
        <div className={styles.dataNotice} role={error ? "alert" : "status"}>
          {loading ? "Loading recorded activity…" : error}
          {!loading && error && (
            <button
              type="button"
              className="dash-small-button"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div className={styles.layout}>
        <div className={styles.hero}>
          <Sparkline
            values={available ? data.sparkline : []}
            month={month}
            available={available}
          />
          <section
            className={`${styles.bankCard} ${styles.enter}`}
            aria-labelledby="available-balance"
          >
            <div className={styles.bankTop}>
              <Icon name="wallet" />
              <span>Recorded activity</span>
            </div>
            <h2 id="available-balance">Available balance</h2>
            <p className={styles.bankValue}>
              {balance === null ? (
                "—"
              ) : (
                <AnimatedNumber value={balance} format={money} />
              )}
            </p>
            <div className={styles.bankBottom}>
              <p>
                {change === null ? (
                  "Running transaction total"
                ) : (
                  <>
                    <AnimatedNumber value={change} format={changeLabel} />{" "}
                    <span>vs last month</span>
                  </>
                )}
              </p>
              <span className={styles.bankDetails} aria-hidden="true">
                <svg viewBox="0 0 18 13" fill="none">
                  <rect x="1" y="1" width="16" height="11" rx="2.3" />
                  <path d="M1 4.5h5l2 2v5.5M17 8.5h-5l-2-2V1" />
                </svg>
                <span>•••• ••••</span>
              </span>
              <span className={styles.bankMark} aria-hidden="true">
                <i />
                <i />
              </span>
            </div>
          </section>
        </div>
        <div className={styles.metrics} aria-label="Actuals against targets">
          {data.metrics.map(({ label, actual, target }, i) => {
            const ratio =
              available && actual !== null && target
                ? (100 * actual) / target
                : null;
            return (
              <section
                key={label}
                data-metric={label.toLowerCase()}
                className={`${styles.panel} ${styles.metric} ${styles.enter}`}
                style={{ "--delay": `${65 + i * 45}ms` } as CSSProperties}
              >
                <h2>{label}</h2>
                <dl>
                  <div>
                    <dt>Actual</dt>
                    <dd
                      title={
                        available && actual !== null
                          ? actual === target
                            ? "Exactly on plan"
                            : `${money(Math.abs(actual - target))} ${actual > target ? "above" : "below"} plan`
                          : undefined
                      }
                    >
                      {available && actual !== null ? (
                        <AnimatedNumber value={actual} format={money} />
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>
                      <AnimatedNumber value={target} format={money} />
                    </dd>
                  </div>
                </dl>
                <p className={styles.ratio}>
                  {ratio === null ? (
                    "—"
                  ) : (
                    <AnimatedNumber value={ratio} format={percent} />
                  )}
                </p>
                <div
                  className={`${styles.track} ${styles.metricTrack}`}
                  aria-hidden="true"
                  style={{ "--fill": fill(ratio) } as CSSProperties}
                >
                  <span />
                  {ratio !== null && <i />}
                </div>
              </section>
            );
          })}
        </div>
        <BalanceDevelopment
          data={data}
          month={month}
          onMonth={onMonth}
          available={available}
        />
        <ExpenseBreakdown data={data} month={month} available={available} />
        <div
          className={`${styles.panel} ${styles.snapshotPanel} ${styles.enter}`}
        >
          <SummaryCards profile={profile} onReport={onReport} />
          {month < currentMonth && goals.length > 0 && (
            <details className={styles.goalHistory}>
              <summary>Saving progress in {scopeLabel(month)}</summary>
              <div className={styles.goals}>
                {goals.slice(0, 3).map((goal) => (
                  <GoalProgress
                    key={goal.id ?? goal.name}
                    goal={goal}
                    month={month}
                  />
                ))}
                <div className={styles.goalScale} aria-hidden="true">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
