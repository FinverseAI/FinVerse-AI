"use client";

import { useMemo } from "react";
import { HoldingsSection } from "./holdings";
import type { CurrencyTotals, PortfolioSummary } from "../../../lib/market";
import {
  earliestBuyDate,
  formatFetchedAt,
  formatMoney,
  formatPercent,
  portfolioCashFlows,
  todayIst,
  totalsByCurrency,
} from "../../../lib/market";
import { cagrFromDates, xirr } from "../../../lib/portfolio";
import { PanelHeading, ProgressBar } from "../../(module-one)/dashboard/ui";

const allocationColors = [
  "#ffb194",
  "#89c9dd",
  "#b6b0ed",
  "#eac47a",
  "#76ccb0",
  "#e59ab8",
];

function GainText({
  value,
  percent,
  currency = "INR",
}: {
  value: number;
  percent: number;
  currency?: string;
}) {
  const up = value >= 0;
  return (
    <span className={up ? "market-positive" : "market-negative"}>
      {up ? "+" : "−"}
      {formatMoney(Math.abs(value), currency)} ({formatPercent(percent)})
    </span>
  );
}

/** One total per currency, joined — never a mixed-currency sum. */
function CurrencyAmounts({
  groups,
  pick,
}: {
  groups: CurrencyTotals[];
  pick: "totalValue" | "totalInvested";
}) {
  return (
    <>
      {groups.map((group) => (
        <span key={group.currency} className="block">
          {formatMoney(group[pick], group.currency)}
        </span>
      ))}
    </>
  );
}

export function PortfolioSection({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const returns = useMemo(() => {
    if (!summary || summary.holdings.length === 0) {
      return {
        xirrValue: null,
        cagrValue: null,
        priced: 0,
        total: 0,
        mixedCurrency: false,
      };
    }
    const priced = summary.holdings.filter((holding) => holding.priced);
    // XIRR and CAGR combine cash flows into one rate, which is only
    // meaningful when every priced holding shares one currency.
    const mixedCurrency =
      new Set(priced.map((holding) => holding.currency ?? "INR")).size > 1;
    // IST-pinned "today": the UTC date runs a day behind IST between
    // 00:00 and 05:30.
    const today = todayIst();
    const flows = mixedCurrency
      ? []
      : portfolioCashFlows(summary.holdings, today);
    const start = earliestBuyDate(summary.holdings);
    return {
      xirrValue: !mixedCurrency && start && start < today ? xirr(flows) : null,
      cagrValue:
        !mixedCurrency && start !== null
          ? cagrFromDates(
              summary.totals.totalInvested,
              summary.totals.totalValue,
              start,
              today,
            )
          : null,
      priced: priced.length,
      total: summary.holdings.length,
      mixedCurrency,
    };
  }, [summary]);

  const currencyGroups = useMemo(
    () => (summary ? totalsByCurrency(summary.holdings) : []),
    [summary],
  );
  const mixedCurrency = currencyGroups.length > 1;
  const singleCurrency =
    currencyGroups.length === 1 ? currencyGroups[0]! : null;

  return (
    <section id="portfolio" aria-label="Portfolio" className="scroll-mt-24">
      <div className="desk-heading">
        <h3>Portfolio valuation</h3>
        <a className="dash-small-button" href="#optimizer">
          Open Optimizer →
        </a>
      </div>
      {loading ? (
        <p role="status" className="mt-4 text-sm text-dash-muted">
          Loading portfolio…
        </p>
      ) : error ? (
        <div className="dash-panel mt-4">
          <p role="alert" className="text-sm text-dash-red">
            {error}
          </p>
          <button className="dash-small-button mt-4" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : !summary ? null : (
        <div className="mt-4 space-y-4">
          {(() => {
            const isEmpty = summary.holdings.length === 0;
            return (
              <>
                {mixedCurrency && (
                  <p role="note" className="dash-panel text-sm text-dash-muted">
                    Your holdings are in more than one currency, so totals are
                    shown per currency below — they are not combined into a
                    single figure, and XIRR needs holdings in one currency.
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <article className="dash-panel value-feature">
                    <h3 className="dash-eyebrow">
                      {summary.unavailable.length
                        ? "Priced holdings value"
                        : "Current value"}
                    </h3>
                    <p className="mt-4 text-3xl font-medium tracking-tight break-words">
                      {isEmpty ? (
                        formatMoney(0)
                      ) : returns.priced ? (
                        singleCurrency ? (
                          formatMoney(
                            singleCurrency.totalValue,
                            singleCurrency.currency,
                          )
                        ) : (
                          <CurrencyAmounts
                            groups={currencyGroups}
                            pick="totalValue"
                          />
                        )
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-dash-muted">
                      {isEmpty
                        ? "No holdings yet — add a holding to track its value."
                        : `${returns.priced} of ${returns.total} holdings priced${summary.asOf ? ` · as of ${formatFetchedAt(summary.asOf)}` : ""}`}
                    </p>
                  </article>
                  <article className="dash-panel">
                    <h3 className="dash-eyebrow">Invested</h3>
                    <p className="mt-4 text-3xl font-medium tracking-tight break-words">
                      {isEmpty ? (
                        formatMoney(0)
                      ) : singleCurrency ? (
                        formatMoney(
                          singleCurrency.totalInvested,
                          singleCurrency.currency,
                        )
                      ) : (
                        <CurrencyAmounts
                          groups={currencyGroups}
                          pick="totalInvested"
                        />
                      )}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-dash-muted">
                      {isEmpty
                        ? "No holdings yet — add a holding to see what you put in."
                        : "Purchase cost across all holdings."}
                    </p>
                  </article>
                  <article className="dash-panel">
                    <h3 className="dash-eyebrow">Gain / loss</h3>
                    <p className="mt-4 text-2xl font-medium tracking-tight break-words">
                      {isEmpty ? (
                        formatMoney(0)
                      ) : returns.priced ? (
                        singleCurrency ? (
                          <GainText
                            value={singleCurrency.totalGainLoss}
                            percent={singleCurrency.totalGainLossPercent}
                            currency={singleCurrency.currency}
                          />
                        ) : (
                          <>
                            {currencyGroups.map((group) => (
                              <span key={group.currency} className="block">
                                <GainText
                                  value={group.totalGainLoss}
                                  percent={group.totalGainLossPercent}
                                  currency={group.currency}
                                />
                              </span>
                            ))}
                          </>
                        )
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-dash-muted">
                      {isEmpty
                        ? "No holdings yet — gains appear once you add one."
                        : "Unrealised return on priced holdings."}
                    </p>
                  </article>
                  <article className="dash-panel">
                    <h3 className="dash-eyebrow">XIRR</h3>
                    <p className="mt-4 text-3xl font-medium tracking-tight break-words">
                      {returns.xirrValue !== null
                        ? formatPercent(returns.xirrValue * 100)
                        : "—"}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-dash-muted">
                      {isEmpty
                        ? "Add a holding with a buy date to see your annualised return."
                        : returns.mixedCurrency
                          ? "XIRR needs holdings in a single currency."
                          : returns.xirrValue !== null
                            ? "Annualised from dated purchases."
                            : "Needs at least one dated buy and a current value."}
                    </p>
                    <p
                      className="desk-muted mt-2"
                      title="Simple annualised growth from the earliest priced purchase, treating the invested cost as one sum."
                    >
                      Simple CAGR ·{" "}
                      {returns.mixedCurrency || returns.cagrValue === null
                        ? "—"
                        : formatPercent(returns.cagrValue * 100)}
                    </p>
                  </article>
                </div>
                {isEmpty && (
                  <p className="text-sm text-dash-muted">
                    <a className="desk-link" href="#holdings">
                      Add your first holding →
                    </a>
                  </p>
                )}
              </>
            );
          })()}

          <HoldingsSection
            summary={summary}
            loading={false}
            error=""
            onChanged={onRetry}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <article className="dash-panel">
              <PanelHeading icon="pie" title="Sector concentration" />
              {summary.sectors.length === 0 ? (
                <p className="mt-4 text-sm text-dash-muted">
                  No priced holdings to break down by sector yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {summary.sectors.map((sector) => (
                    <li key={sector.sector}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">
                          {sector.sector}
                        </span>
                        <span className="font-mono text-xs text-dash-muted">
                          {singleCurrency
                            ? `${formatMoney(sector.value, singleCurrency.currency)} · `
                            : ""}
                          {sector.weight.toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar
                          value={sector.weight}
                          label={`${sector.sector} share of portfolio`}
                          tone="accent"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs leading-5 text-dash-muted">
                Weights use the current value of priced holdings.
                {mixedCurrency
                  ? " Holdings span more than one currency, so these weights mix currencies — use the per-currency totals above for comparable figures."
                  : ""}
              </p>
            </article>
            <article className="dash-panel">
              <PanelHeading icon="pie" title="Allocation by holding" />
              {summary.totals.totalValue > 0 && (
                <div className="allocation-strip" aria-hidden="true">
                  {summary.holdings
                    .filter((h) => h.priced)
                    .map((h, i) => (
                      <i
                        key={h.id}
                        style={{
                          flexGrow: h.currentValue ?? 0,
                          backgroundColor:
                            allocationColors[i % allocationColors.length],
                        }}
                      />
                    ))}
                </div>
              )}
              <ul className="allocation-list">
                {summary.holdings
                  .filter((h) => h.priced)
                  .map((h, i) => (
                    <li key={h.id}>
                      <span>
                        <i
                          style={{
                            backgroundColor:
                              allocationColors[i % allocationColors.length],
                          }}
                        />
                        {h.symbol}
                      </span>
                      <strong>
                        {summary.totals.totalValue > 0
                          ? formatPercent(
                              ((h.currentValue ?? 0) /
                                summary.totals.totalValue) *
                                100,
                              false,
                            )
                          : ""}
                      </strong>
                    </li>
                  ))}
              </ul>
              {!returns.priced && (
                <p className="desk-muted">Allocation needs a priced holding.</p>
              )}
              {mixedCurrency && (
                <p className="mt-3 text-xs text-dash-muted">
                  Holdings span more than one currency, so these shares mix
                  currencies — use the per-currency totals above for comparable
                  figures.
                </p>
              )}
              {summary.stale && (
                <p className="mt-3 text-xs text-dash-warning">
                  Some prices are last-known values — the live market was
                  unreachable when they were fetched.
                </p>
              )}
              {summary.unavailable.length > 0 && (
                <p className="mt-3 text-xs text-dash-muted">
                  Excluded from current value and returns:{" "}
                  {summary.unavailable.join(", ")}.
                </p>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
