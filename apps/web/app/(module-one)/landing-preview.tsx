"use client";

import { useId, useState } from "react";
import { PriceChart } from "../(module-two)/market/price-chart";
import type { HistoryBar } from "../../lib/market";
import { money } from "./dashboard/data";
import { Icon } from "./dashboard/ui";
import styles from "./landing.module.css";

const views = [
  { id: "money", label: "Money", icon: "wallet" },
  { id: "markets", label: "Markets", icon: "chart" },
  { id: "ai", label: "FinVerse AI", icon: "bulb" },
] as const;

const months = [
  { month: "Jan", income: 60000, expenses: 43500 },
  { month: "Feb", income: 62500, expenses: 54800 },
  { month: "Mar", income: 61000, expenses: 42500 },
  { month: "Apr", income: 69000, expenses: 47300 },
  { month: "May", income: 64600, expenses: 43100 },
  { month: "Jun", income: 68000, expenses: 43500 },
];
const current = months[months.length - 1]!;
const chartScale = Math.max(...months.map(({ income }) => income));

const examplePrices = [
  ["2026-06-01", 23814.25],
  ["2026-06-02", 23983.45],
  ["2026-06-03", 23915.6],
  ["2026-06-04", 24124.4],
  ["2026-06-05", 24001.35],
  ["2026-06-08", 24271.8],
  ["2026-06-09", 24202.9],
  ["2026-06-10", 24413.1],
  ["2026-06-11", 24312.85],
  ["2026-06-12", 24352.3],
] as const;
const marketExample: HistoryBar[] = examplePrices.map(([date, close]) => ({
  date,
  open: close,
  high: close,
  low: close,
  close,
  volume: null,
}));

function MoneyPreview() {
  return (
    <>
      <div className={styles.previewHeading}>
        <h2>Monthly cash flow</h2>
        <span>June</span>
      </div>
      <dl className={styles.totals}>
        <div>
          <dt>Income</dt>
          <dd>{money(current.income)}</dd>
        </div>
        <div>
          <dt>Expenses</dt>
          <dd>{money(current.expenses)}</dd>
        </div>
        <div>
          <dt>Net saved</dt>
          <dd>{money(current.income - current.expenses)}</dd>
        </div>
      </dl>
      <ul
        className={styles.bars}
        aria-label="Example monthly income and expenses"
      >
        {months.map(({ month, income, expenses }) => (
          <li
            key={month}
            aria-label={`${month}, income ${money(income)}, expenses ${money(expenses)}`}
            title={`${month} • ${money(income)} income / ${money(expenses)} expenses`}
          >
            <div aria-hidden="true">
              <span style={{ height: `${(income / chartScale) * 100}%` }} />
              <span style={{ height: `${(expenses / chartScale) * 100}%` }} />
            </div>
            <span aria-hidden="true">{month}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function AiPreview() {
  const budget = 6500;
  const recorded = 7450;
  return (
    <>
      <div className={styles.previewHeading}>
        <h2>Ask FinVerse AI</h2>
        <span>Example answer</span>
      </div>
      <div className={styles.conversation}>
        <p className={styles.question}>Did I go over my grocery budget?</p>
        <div className={styles.answer}>
          <Icon name="bulb" />
          <div>
            <p>
              You spent <strong>{money(recorded)}</strong> on groceries in June,
              which is <strong>{money(recorded - budget)}</strong> over your
              budget.
            </p>
            <dl>
              <div>
                <dt>June grocery budget</dt>
                <dd>{money(budget)}</dd>
              </div>
              <div>
                <dt>June grocery transactions</dt>
                <dd>{money(recorded)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LandingPreview() {
  const [view, setView] = useState<(typeof views)[number]["id"]>("money");
  const panelId = useId();

  return (
    <figure
      id="preview"
      className={styles.preview}
      aria-label="FinVerse workspace preview"
    >
      <figcaption className={styles.previewTitle}>
        <span aria-hidden="true" className={styles.windowDots} />
        FinVerse workspace
        <span>Sample data</span>
      </figcaption>
      <div
        className={styles.previewNav}
        role="group"
        aria-label="Preview a workspace"
      >
        {views.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            data-view={id}
            aria-pressed={view === id}
            aria-controls={panelId}
            onClick={() => setView(id)}
          >
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </div>
      <div id={panelId} className={styles.previewBody}>
        {view === "money" && <MoneyPreview />}
        {view === "markets" && (
          <>
            <div className={styles.previewHeading}>
              <h2>NIFTY 50</h2>
              <span>Example price history</span>
            </div>
            <div className={styles.marketChart}>
              <PriceChart bars={marketExample} />
            </div>
          </>
        )}
        {view === "ai" && <AiPreview />}
      </div>
    </figure>
  );
}
