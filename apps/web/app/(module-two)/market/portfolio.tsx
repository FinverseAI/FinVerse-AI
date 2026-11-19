"use client";

import { useMemo } from "react";
import type { PortfolioSummary } from "../../../lib/market";
import {
  earliestBuyDate,
  formatFetchedAt,
  formatPercent,
  portfolioCashFlows,
} from "../../../lib/market";
import { cagrFromDates, xirr } from "../../../lib/portfolio";
import { money } from "../../(module-one)/dashboard/data";
import {
  MiniStat,
  PanelHeading,
  ProgressBar,
} from "../../(module-one)/dashboard/ui";

function GainText({ value, percent }: { value: number; percent: number }) {
  const up = value >= 0;
  return (
    <span className={up ? "text-dash-accent" : "text-dash-red"}>
      {up ? "+" : "−"}
      {money(Math.abs(value), 2)} ({formatPercent(percent)})
    </span>
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
      return { xirrValue: null, cagrValue: null, priced: 0, total: 0 };
    }
    const priced = summary.holdings.filter((holding) => holding.priced);
    const today = new Date().toISOString().slice(0, 10);
    const flows = portfolioCashFlows(summary.holdings, today);
    const start = earliestBuyDate(summary.holdings);
    return {
      xirrValue: xirr(flows),
      cagrValue:
        start !== null
          ? cagrFromDates(
              summary.totals.totalInvested,
              summary.totals.totalValue,
              start,
              today,
            )
          : null,
      priced: priced.length,
      total: summary.holdings.length,
    };
  }, [summary]);

  return (
    <section id="portfolio" aria-label="Portfolio" className="scroll-mt-24">
      <PanelHeading icon="target" title="Your portfolio" />
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
      ) : !summary || summary.holdings.length === 0 ? (
        <div className="dash-panel mt-4">
          <p className="text-sm text-dash-muted">
            You have no holdings yet. Add your first holding below, and your
            portfolio value, gains, XIRR and sector mix will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="dash-panel">
              <h3 className="dash-eyebrow">Current value</h3>
              <p className="mt-4 text-3xl font-medium tracking-tight break-words">
                {money(summary.totals.totalValue, 2)}
              </p>
              <p className="mt-3 text-xs leading-5 text-dash-muted">
                {returns.priced} of {returns.total} holdings priced
                {summary.asOf
                  ? ` · as of ${formatFetchedAt(summary.asOf)}`
                  : ""}
              </p>
            </article>
            <article className="dash-panel">
              <h3 className="dash-eyebrow">Invested</h3>
              <p className="mt-4 text-3xl font-medium tracking-tight break-words">
                {money(summary.totals.totalInvested, 2)}
              </p>
              <p className="mt-3 text-xs leading-5 text-dash-muted">
                Sum of quantity × buy price across priced holdings.
              </p>
            </article>
            <article className="dash-panel">
              <h3 className="dash-eyebrow">Gain / loss</h3>
              <p className="mt-4 text-2xl font-medium tracking-tight break-words">
                <GainText
                  value={summary.totals.totalGainLoss}
                  percent={summary.totals.totalGainLossPercent}
                />
              </p>
              <p className="mt-3 text-xs leading-5 text-dash-muted">
                Current value minus invested, on priced holdings only.
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
                {returns.xirrValue !== null
                  ? "Money-weighted annual return on your dated buys."
                  : "Needs at least one dated buy and a current value."}
              </p>
            </article>
          </div>

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
                          {money(sector.value, 2)} · {sector.weight.toFixed(1)}%
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
                Sectors come from each holding&apos;s stored sector, falling
                back to the quote&apos;s sector. Holdings without a sector group
                under “Unknown”.
              </p>
            </article>
            <article className="dash-panel">
              <PanelHeading icon="chart" title="Return measures" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MiniStat
                  label="XIRR (money-weighted)"
                  value={
                    returns.xirrValue !== null
                      ? formatPercent(returns.xirrValue * 100)
                      : "—"
                  }
                />
                <MiniStat
                  label="CAGR (time-weighted)"
                  value={
                    returns.cagrValue !== null
                      ? formatPercent(returns.cagrValue * 100)
                      : "—"
                  }
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-dash-muted">
                XIRR prices your actual buy dates — it is the right measure when
                money went in at different times. CAGR treats the whole
                portfolio as one sum held since your earliest buy (
                {earliestBuyDate(summary.holdings) ?? "—"}). The two differ
                whenever buys were spread out; neither is wrong, they answer
                different questions. Unpriced holdings are excluded from both —
                their value is unknown, and guessing would corrupt the rates.
              </p>
              {summary.stale && (
                <p className="mt-3 text-xs text-dash-warning">
                  Some prices are last-known values — the live market was
                  unreachable when they were fetched.
                </p>
              )}
              {summary.unavailable.length > 0 && (
                <p className="mt-3 text-xs text-dash-muted">
                  Excluded from totals (price unavailable):{" "}
                  {summary.unavailable.join(", ")}.
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-dash-muted">
                Values use exact-paise arithmetic: each holding is valued in
                paise and rounded once, so the totals always reconcile with the
                rows below.
              </p>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
