import { useEffect, useMemo, useRef, useState } from "react";
import { formatCompact } from "../../../lib/market";
import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, type Transaction } from "./data";
import { Icon, PanelHeading } from "./ui";
import {
  monthlyBalanceHistory,
  monthlyCashFlow,
  runningTotalAt,
  shiftMonth,
} from "./spending-data";
import { ActivityError } from "./recent-transactions";
import styles from "./dashboard.module.css";

/** Months shown in the balance history list (most recent first). */
const HISTORY_LIMIT = 12;
/** Months plotted in the balance chart (most recent first, then reversed). */
const CHART_MONTHS = 12;

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function monthLabelOf(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shortMonthOf(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "short",
  });
}

/** Tween a numeric series toward new values over 350ms, so a Net/Gross
 * switch or a month change morphs the line instead of swapping it. */
function useTweenedValues(values: number[], key: string) {
  const [display, setDisplay] = useState(values);
  const prevRef = useRef(values);
  useEffect(() => {
    const from = prevRef.current;
    const to = values;
    prevRef.current = values;
    if (
      from.length !== to.length ||
      from.every((value, index) => value === to[index])
    ) {
      setDisplay(to);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 350;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from.map((value, index) => value + (to[index]! - value) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, values]);
  return display;
}

type Point = { x: number; y: number };

/** Smooth open curve through the points (Catmull-Rom to bezier). */
function smoothPath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1)
    return `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

const CHART_W = 720;
const CHART_H = 300;
const PAD = { left: 56, right: 16, top: 20, bottom: 32 };

function BalanceChart({
  months,
  net,
  income,
  expenses,
  mode,
}: {
  months: string[];
  net: number[];
  income: number[];
  expenses: number[];
  mode: "net" | "gross";
}) {
  const key = `${mode}:${months.join(",")}`;
  const netValues = useTweenedValues(net, key);
  const incomeValues = useTweenedValues(income, key);
  const expenseValues = useTweenedValues(expenses, key);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const series = mode === "net" ? netValues : [...incomeValues, ...expenseValues];
  let min = Math.min(0, ...series);
  let max = Math.max(0, ...series);
  if (max - min < 1) max = min + 1;
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const x = (index: number) =>
    months.length === 1
      ? PAD.left + plotW / 2
      : PAD.left + (index / (months.length - 1)) * plotW;
  const y = (value: number) =>
    PAD.top + (1 - (value - min) / (max - min)) * plotH;
  const toPoints = (values: number[]): Point[] =>
    values.map((value, index) => ({ x: x(index), y: y(value) }));

  const ticks = [0, 1, 2, 3].map((step) => min + ((max - min) * step) / 3);
  const netPoints = toPoints(netValues);
  const incomePoints = toPoints(incomeValues);
  const expensePoints = toPoints(expenseValues);
  const active = hover;

  function indexFromEvent(event: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((event.clientX - rect.left) / rect.width) * CHART_W;
    const ratio = (px - PAD.left) / plotW;
    const index = Math.round(ratio * (months.length - 1));
    setHover(Math.max(0, Math.min(months.length - 1, index)));
  }

  const tooltipMonth = active !== null ? months[active]! : "";
  return (
    <div className={styles.chartWrap}>
      <svg
        ref={svgRef}
        className={styles.chartSvg}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        tabIndex={0}
        aria-label={`Balance development, ${mode === "net" ? "net running total" : "income and expenses"} by month`}
        onMouseMove={indexFromEvent}
        onMouseLeave={() => setHover(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setHover((current) => {
              const base = current ?? months.length - 1;
              const next =
                event.key === "ArrowLeft" ? base - 1 : base + 1;
              return Math.max(0, Math.min(months.length - 1, next));
            });
          }
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={CHART_W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-dash-border)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize={11}
              fill="var(--color-dash-muted)"
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}
        {months.map((month, index) => (
          <text
            key={month}
            x={x(index)}
            y={CHART_H - 8}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill="var(--color-dash-muted)"
          >
            {shortMonthOf(month)}
          </text>
        ))}
        {netPoints.length > 1 && (
          <path
            d={`${smoothPath(netPoints)} L ${netPoints[netPoints.length - 1]!.x.toFixed(1)} ${y(0).toFixed(1)} L ${netPoints[0]!.x.toFixed(1)} ${y(0).toFixed(1)} Z`}
            fill="var(--color-dash-accent)"
            fillOpacity={0.08}
            opacity={mode === "net" ? 1 : 0}
            style={{ transition: `opacity 300ms ${EASE}` }}
          />
        )}
        <path
          d={smoothPath(incomePoints)}
          fill="none"
          stroke="var(--color-dash-muted)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={mode === "gross" ? 1 : 0}
          style={{ transition: `opacity 300ms ${EASE}` }}
        />
        <path
          d={smoothPath(expensePoints)}
          fill="none"
          stroke="var(--color-dash-red)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={mode === "gross" ? 1 : 0}
          style={{ transition: `opacity 300ms ${EASE}` }}
        />
        <path
          d={smoothPath(netPoints)}
          fill="none"
          stroke="var(--color-dash-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={mode === "net" ? 1 : 0}
          style={{ transition: `opacity 300ms ${EASE}` }}
        />
        {netPoints.length === 1 && (
          <circle
            cx={netPoints[0]!.x}
            cy={netPoints[0]!.y}
            r={4}
            fill="var(--color-dash-accent)"
            opacity={mode === "net" ? 1 : 0}
            style={{ transition: `opacity 300ms ${EASE}` }}
          />
        )}
        {active !== null && months.length > 0 && (
          <g>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={CHART_H - PAD.bottom}
              stroke="var(--color-dash-border)"
              strokeWidth={1}
            />
            {mode === "net" ? (
              <circle
                cx={x(active)}
                cy={y(netValues[active]!)}
                r={4}
                fill="var(--color-dash-accent)"
                stroke="var(--color-dash-bg)"
                strokeWidth={2}
              />
            ) : (
              <>
                <circle
                  cx={x(active)}
                  cy={y(incomeValues[active]!)}
                  r={4}
                  fill="var(--color-dash-muted)"
                  stroke="var(--color-dash-bg)"
                  strokeWidth={2}
                />
                <circle
                  cx={x(active)}
                  cy={y(expenseValues[active]!)}
                  r={4}
                  fill="var(--color-dash-red)"
                  stroke="var(--color-dash-bg)"
                  strokeWidth={2}
                />
              </>
            )}
          </g>
        )}
      </svg>
      {active !== null && months.length > 0 && (
        <div
          className={styles.chartTooltip}
          style={{ left: `${(x(active) / CHART_W) * 100}%` }}
        >
          {monthLabelOf(tooltipMonth)}
          <br />
          {mode === "net"
            ? `Balance ${money(netValues[active]!)}`
            : `In ${money(incomeValues[active]!)} · Out ${money(expenseValues[active]!)}`}
        </div>
      )}
    </div>
  );
}

export default function BalanceBreakdownCard({
  month,
  onMonth,
  profile,
  transactions,
  loading,
  error,
  onRetry,
  onJumpToMonth,
  onEditProfile,
}: {
  month: string;
  onMonth: (month: string) => void;
  profile: FinancialProfile;
  transactions: Transaction[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** Jump to a history month's transactions (sets the dashboard month and scrolls to them). */
  onJumpToMonth?: (month: string) => void;
  onEditProfile?: () => void;
}) {
  const totals = profileTotals(profile);
  const recorded = monthlyCashFlow(transactions, month);
  const history = useMemo(
    () => monthlyBalanceHistory(transactions),
    [transactions],
  );
  const balanceToDate = runningTotalAt(history, month);
  const monthLabel = monthLabelOf(month);
  const previousMonth = shiftMonth(month, -1);
  const previousFlow = monthlyCashFlow(transactions, previousMonth);
  const netDifference = recorded.net - previousFlow.net;
  const [mode, setMode] = useState<"net" | "gross">("net");
  const recentHistory = [...history].reverse().slice(0, HISTORY_LIMIT);
  const chartRows = useMemo(
    () => [...history].slice(-CHART_MONTHS),
    [history],
  );
  const chartMonths = useMemo(() => chartRows.map((row) => row.month), [chartRows]);
  const chartNet = useMemo(() => chartRows.map((row) => row.runningTotal), [chartRows]);
  const chartIncome = useMemo(() => chartRows.map((row) => row.income), [chartRows]);
  const chartExpenses = useMemo(
    () => chartRows.map((row) => row.expenses),
    [chartRows],
  );

  return (
    <article
      id="balance"
      className="dash-panel flex min-w-0 flex-col self-start p-5"
      aria-busy={loading}
    >
      <PanelHeading icon="chart" title="Balance development">
        <div className="flex items-center gap-2">
          <div
            className={styles.seg}
            role="group"
            aria-label="Balance chart view"
          >
            <button
              type="button"
              aria-pressed={mode === "net"}
              onClick={() => setMode("net")}
            >
              Net
            </button>
            <button
              type="button"
              aria-pressed={mode === "gross"}
              onClick={() => setMode("gross")}
            >
              Gross
            </button>
          </div>
          <button
            className="dash-icon-button"
            aria-label="Previous month"
            disabled={month <= "1900-01"}
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <Icon name="left" />
          </button>
          <span className="text-center text-xs" aria-live="polite">
            {monthLabel}
          </span>
          <button
            className="dash-icon-button"
            aria-label="Next month"
            disabled={month >= "9999-12"}
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <Icon name="right" />
          </button>
        </div>
      </PanelHeading>
      {loading ? (
        <p role="status" className="py-8 text-sm text-dash-muted">
          Loading recorded activity…
        </p>
      ) : error ? (
        <ActivityError error={error} onRetry={onRetry} />
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-dash-muted">Balance to date</p>
              <p className="mt-2 font-mono text-3xl leading-9 font-medium break-words">
                {money(balanceToDate)}
              </p>
              <p className="mt-2 text-xs leading-5 text-dash-muted">
                Net flow in {monthLabel}: {money(recorded.net)}
                {previousFlow.count > 0 &&
                  ` · ${netDifference >= 0 ? "+" : "−"}${money(Math.abs(netDifference))} vs ${monthLabelOf(previousMonth)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-dash-muted">Current savings</p>
              <p className="mt-2 font-mono text-base font-medium">
                {money(totals.savings)}
              </p>
              {onEditProfile && (
                <button
                  type="button"
                  className="dash-small-button mt-3"
                  onClick={onEditProfile}
                >
                  Edit profile
                </button>
              )}
            </div>
          </div>
          {chartRows.length > 0 ? (
            <BalanceChart
              months={chartMonths}
              net={chartNet}
              income={chartIncome}
              expenses={chartExpenses}
              mode={mode}
            />
          ) : (
            <p className="py-10 text-center text-sm text-dash-muted">
              No transactions recorded yet — the chart appears once you record
              activity
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-dash-muted">
            Balance to date is reconstructed from your recorded transactions
            only — it starts at ₹0 at your first recorded transaction and
            carries forward month to month. It is not a bank balance
          </p>
          {recentHistory.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs text-dash-muted">
                Balance history
                {history.length > HISTORY_LIMIT &&
                  ` · last ${HISTORY_LIMIT} months of ${history.length}`}
                {onJumpToMonth && " — select a month to see its transactions"}
              </p>
              <ul>
                {recentHistory.map((row) => {
                  const content = (
                    <>
                      <span className="text-dash-text">
                        {monthLabelOf(row.month)}
                        <span className="text-dash-muted">
                          {" "}
                          · {row.count} transaction{row.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="text-right whitespace-nowrap">
                        <span className="text-dash-muted">
                          {row.net >= 0 ? "+" : "−"}
                          {money(Math.abs(row.net))} net ·{" "}
                        </span>
                        <span className="font-mono font-medium">
                          {money(row.runningTotal)}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={row.month}>
                      {onJumpToMonth ? (
                        <button
                          type="button"
                          className={styles.historyRow}
                          onClick={() => onJumpToMonth(row.month)}
                          aria-label={`View ${monthLabelOf(row.month)} transactions`}
                          title={`View ${monthLabelOf(row.month)} transactions`}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className={styles.historyRow}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
      <p className="mt-5 mb-3 text-xs text-dash-muted">
        Current monthly plan (separate from recorded activity)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Monthly income</p>
          <p className={styles.miniValue}>{money(totals.income)}</p>
        </div>
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Monthly expenses</p>
          <p className={styles.miniValue}>{money(totals.expenses)}</p>
        </div>
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Savings target</p>
          <p className={styles.miniValue}>{money(totals.target)}</p>
        </div>
        <div className={styles.mini}>
          <p className={styles.miniLabel}>Monthly surplus</p>
          <p className={styles.miniValue}>{money(totals.surplus)}</p>
        </div>
      </div>
    </article>
  );
}
