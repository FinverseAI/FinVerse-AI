"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoryResponse, ValuedHolding } from "../../../lib/market";
import { formatPercent } from "../../../lib/market";
import {
  efficientFrontier,
  logReturns,
  maxSharpeWeights,
  minVarianceWeights,
  portfolioStats,
  returnsStats,
  type FrontierPoint,
} from "../../../lib/optimization";
import {
  activityError,
  activityRequest,
} from "../../(module-one)/dashboard/use-activity";
import { MiniStat, PanelHeading } from "../../(module-one)/dashboard/ui";

const MIN_DAYS = 30;

function FrontierChart({
  frontier,
  riskFreeRate,
  current,
  suggested,
}: {
  frontier: FrontierPoint[];
  riskFreeRate: number;
  current: { volatility: number; expectedReturn: number } | null;
  suggested: { volatility: number; expectedReturn: number } | null;
}) {
  const width = 720;
  const height = 320;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 36;
  const [hover, setHover] = useState<number | null>(null);

  const maxVol = Math.max(
    ...frontier.map((point) => point.volatility),
    current?.volatility ?? 0,
    suggested?.volatility ?? 0,
  );
  const returns = [
    ...frontier.map((point) => point.expectedReturn),
    riskFreeRate,
    current?.expectedReturn ?? 0,
    suggested?.expectedReturn ?? 0,
  ];
  const minReturn = Math.min(...returns);
  const maxReturn = Math.max(...returns);
  const volSpan = maxVol * 1.1 || 1;
  const returnPad = (maxReturn - minReturn || 1) * 0.15;
  const lowReturn = minReturn - returnPad;
  const highReturn = maxReturn + returnPad;

  const xFor = (volatility: number) =>
    padLeft + (volatility / volSpan) * (width - padLeft - padRight);
  const yFor = (value: number) =>
    padTop +
    (1 - (value - lowReturn) / (highReturn - lowReturn)) *
      (height - padTop - padBottom);

  const line = frontier
    .map(
      (point, i) =>
        `${i === 0 ? "M" : "L"}${xFor(point.volatility).toFixed(1)},${yFor(point.expectedReturn).toFixed(1)}`,
    )
    .join(" ");
  const hovered = hover !== null ? (frontier[hover] ?? null) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        tabIndex={0}
        aria-label={`Efficient frontier: ${frontier.length} portfolios from ${(frontier[0]?.volatility ?? 0) * 100}% volatility to ${(frontier[frontier.length - 1]?.volatility ?? 0) * 100}% volatility${hovered ? `. Selected point: ${formatPercent(hovered.expectedReturn * 100, false)} return at ${formatPercent(hovered.volatility * 100, false)} volatility, Sharpe ${hovered.sharpe !== null ? hovered.sharpe.toFixed(2) : "—"}` : ". Use the left and right arrow keys to move along the frontier."}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            setHover((current) => {
              const start = current ?? (event.key === "ArrowRight" ? -1 : 0);
              const next = event.key === "ArrowRight" ? start + 1 : start - 1;
              return Math.max(0, Math.min(frontier.length - 1, next));
            });
          } else if (event.key === "Home") {
            event.preventDefault();
            setHover(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setHover(frontier.length - 1);
          }
        }}
        onFocus={() => setHover((current) => current ?? frontier.length - 1)}
        onBlur={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          let nearest = 0;
          let nearestDistance = Infinity;
          frontier.forEach((point, i) => {
            const distance = Math.abs(xFor(point.volatility) - x);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3].map((step) => {
          const vol = (volSpan * step) / 3;
          return (
            <g key={step}>
              <line
                x1={xFor(vol)}
                x2={xFor(vol)}
                y1={padTop}
                y2={height - padBottom}
                stroke="var(--color-dash-border)"
                strokeWidth="1"
              />
              <text
                x={xFor(vol)}
                y={height - 20}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-dash-muted)"
              >
                {(vol * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
        {[0, 1, 2, 3].map((step) => {
          const value = lowReturn + ((highReturn - lowReturn) * step) / 3;
          return (
            <g key={step}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yFor(value)}
                y2={yFor(value)}
                stroke="var(--color-dash-border)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={yFor(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-dash-muted)"
              >
                {(value * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
        <text
          x={(width - padRight + padLeft) / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-dash-muted)"
        >
          Volatility (annualised)
        </text>
        <text
          x={12}
          y={(height - padBottom + padTop) / 2}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-dash-muted)"
          transform={`rotate(-90 12 ${(height - padBottom + padTop) / 2})`}
        >
          Expected return (annualised)
        </text>
        {suggested && (
          <line
            x1={xFor(0)}
            y1={yFor(riskFreeRate)}
            x2={xFor(suggested.volatility)}
            y2={yFor(suggested.expectedReturn)}
            stroke="var(--color-dash-warning)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}
        <path
          d={line}
          fill="none"
          stroke="var(--color-dash-accent)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {frontier.map((point, i) => (
          <circle
            key={i}
            cx={xFor(point.volatility)}
            cy={yFor(point.expectedReturn)}
            r={hover === i ? 5 : 3}
            fill="var(--color-dash-accent)"
            stroke="var(--color-dash-text)"
            strokeWidth="1"
          />
        ))}
        <circle
          cx={xFor(0)}
          cy={yFor(riskFreeRate)}
          r="4"
          fill="var(--color-dash-warning)"
          stroke="var(--color-dash-text)"
          strokeWidth="1"
        />
        {current && (
          <circle
            cx={xFor(current.volatility)}
            cy={yFor(current.expectedReturn)}
            r="6"
            fill="var(--color-dash-muted)"
            stroke="var(--color-dash-text)"
            strokeWidth="1.5"
          />
        )}
        {suggested && (
          <circle
            cx={xFor(suggested.volatility)}
            cy={yFor(suggested.expectedReturn)}
            r="7"
            fill="var(--color-dash-accent)"
            stroke="var(--color-dash-text)"
            strokeWidth="1.5"
          />
        )}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-dash-border bg-dash-raised px-3 py-2 text-xs"
          style={{
            left: `${Math.max(14, Math.min(86, (xFor(hovered.volatility) / width) * 100))}%`,
          }}
        >
          <p className="text-dash-muted">
            Return{" "}
            <span className="text-dash-text">
              {formatPercent(hovered.expectedReturn * 100, false)}
            </span>
          </p>
          <p className="mt-0.5 text-dash-muted">
            Volatility{" "}
            <span className="text-dash-text">
              {formatPercent(hovered.volatility * 100, false)}
            </span>
          </p>
          <p className="mt-0.5 text-dash-muted">
            Sharpe{" "}
            <span className="text-dash-text">
              {hovered.sharpe !== null ? hovered.sharpe.toFixed(2) : "—"}
            </span>
          </p>
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-dash-muted">
          Frontier values (table)
        </summary>
        <div className="mt-2 overflow-x-auto" tabIndex={0}>
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-dash-border text-dash-muted">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Volatility
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  Expected return
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Sharpe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {frontier.map((point, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 font-mono">
                    {formatPercent(point.volatility * 100, false)}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono">
                    {formatPercent(point.expectedReturn * 100, false)}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {point.sharpe !== null ? point.sharpe.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-dash-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-dash-accent" />
          Efficient frontier
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-dash-warning" />
          Capital market line
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-dash-muted" />
          Your portfolio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-dash-accent" />
          Max-Sharpe suggestion
        </span>
      </div>
    </div>
  );
}

export function OptimizerSection({
  holdings,
  loading = false,
  error = "",
  onRetry = () => {},
}: {
  holdings: ValuedHolding[];
  /** True while the portfolio summary fetch is still running. */
  loading?: boolean;
  /** The portfolio summary fetch error, if it failed. */
  error?: string;
  /** Re-fetch the portfolio summary. */
  onRetry?: () => void;
}) {
  const priced = useMemo(
    () =>
      holdings.filter(
        (holding) => holding.priced && holding.currentValue !== null,
      ),
    [holdings],
  );
  const symbols = useMemo(
    () => priced.map((holding) => holding.symbol),
    [priced],
  );
  const [riskFreePercent, setRiskFreePercent] = useState("6");
  const [histories, setHistories] = useState<Map<string, HistoryResponse>>(
    new Map(),
  );
  const [failed, setFailed] = useState<string[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const riskFreeRate = Number(riskFreePercent) / 100;
  const riskFreeValid =
    Number.isFinite(riskFreeRate) && riskFreeRate >= 0 && riskFreeRate <= 0.3;

  // The effect only sets state in promise callbacks (never synchronously);
  // the "fetching" UI is derived from the absence of a result below.
  useEffect(() => {
    if (symbols.length < 2) return;
    let active = true;
    Promise.allSettled(
      symbols.map((symbol) =>
        activityRequest<HistoryResponse>(
          `/api/market/history/${encodeURIComponent(symbol)}?range=1y`,
        ),
      ),
    )
      .then((settled) => {
        if (!active) return;
        const next = new Map<string, HistoryResponse>();
        const missing: string[] = [];
        settled.forEach((outcome, i) => {
          const symbol = symbols[i]!;
          if (outcome.status === "fulfilled" && outcome.value.bars.length > 0) {
            next.set(symbol, outcome.value);
          } else {
            missing.push(symbol);
          }
        });
        setHistories(next);
        setFailed(missing);
        setHistoryError("");
      })
      .catch((caught: unknown) => {
        if (active) setHistoryError(activityError(caught));
      });
    return () => {
      active = false;
    };
  }, [symbols, historyRevision]);

  function retryHistory() {
    setHistories(new Map());
    setFailed([]);
    setHistoryError("");
    setHistoryRevision((current) => current + 1);
  }

  const result = useMemo(() => {
    if (symbols.length < 2 || histories.size < 2 || !riskFreeValid) {
      return null;
    }
    const available = symbols.filter((symbol) => histories.has(symbol));
    if (available.length < 2) return null;
    // Common trading days across all assets, in date order.
    const bySymbol = new Map(
      available.map((symbol) => [
        symbol,
        new Map(
          histories.get(symbol)!.bars.map((bar) => [bar.date, bar.close]),
        ),
      ]),
    );
    const first = bySymbol.get(available[0]!)!;
    const commonDates = [...first.keys()]
      .filter((date) =>
        available.every((symbol) => bySymbol.get(symbol)!.has(date)),
      )
      .sort();
    if (commonDates.length < MIN_DAYS + 1) {
      return { shortHistory: commonDates.length, available };
    }
    const series = available.map((symbol) => {
      const closes = commonDates.map((date) =>
        bySymbol.get(symbol)!.get(date)!,
      );
      return logReturns(closes);
    });
    const stats = returnsStats(series, 252);
    if (!stats) return { singular: true, available };
    const currentWeights = available.map((symbol) => {
      const holding = priced.find((item) => item.symbol === symbol)!;
      const total = available.reduce(
        (sum, other) =>
          sum +
          (priced.find((item) => item.symbol === other)?.currentValue ?? 0),
        0,
      );
      return total > 0 ? (holding.currentValue ?? 0) / total : 0;
    });
    const current = portfolioStats(
      currentWeights,
      stats.means,
      stats.covariance,
      riskFreeRate,
    );
    const suggested = maxSharpeWeights(
      stats.means,
      stats.covariance,
      riskFreeRate,
    );
    const minVar = minVarianceWeights(
      stats.means,
      stats.covariance,
      riskFreeRate,
    );
    const frontier = efficientFrontier(
      stats.means,
      stats.covariance,
      riskFreeRate,
      12,
    );
    return {
      available,
      days: commonDates.length,
      stats,
      current,
      currentWeights,
      suggested,
      minVar,
      frontier,
      riskFreeRate,
    };
  }, [histories, symbols, riskFreeRate, riskFreeValid, priced]);

  return (
    <section id="optimizer" aria-label="Optimizer" className="scroll-mt-24">
      <PanelHeading icon="target" title="Optimizer" />
      <p className="mt-3 text-sm leading-6 text-dash-muted">
        A Markowitz mean-variance optimisation over your holdings&apos; last
        year of daily prices: the maximum-Sharpe (tangency) portfolio, long
        only. It answers “what mix would have had the best return per unit of
        risk?” — not “what should I buy?”.
      </p>
      <div className="dash-panel mt-4">
        <label className="flex max-w-xs flex-col gap-2 text-sm text-dash-muted">
          Risk-free rate (annual, %)
          <input
            className="dash-input"
            type="number"
            min="0"
            max="30"
            step="0.1"
            inputMode="decimal"
            value={riskFreePercent}
            onChange={(event) => setRiskFreePercent(event.target.value)}
            aria-describedby="risk-free-help"
          />
          <span id="risk-free-help" className="text-xs">
            Your assumption for a riskless return — for example the 10-year
            government bond yield. The suggestion changes with it.
          </span>
        </label>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-dash-red">
            {error}{" "}
            <button className="desk-link" onClick={onRetry}>
              Try again
            </button>
          </p>
        ) : loading ? (
          <p role="status" className="mt-4 text-sm text-dash-muted">
            Loading your holdings…
          </p>
        ) : historyError ? (
          <p role="alert" className="mt-4 text-sm text-dash-red">
            {historyError}{" "}
            <button className="desk-link" onClick={retryHistory}>
              Retry price history
            </button>
          </p>
        ) : !riskFreeValid ? (
          <p className="mt-4 text-sm text-dash-muted">
            Enter a risk-free rate between 0% and 30% to see the allocation.
          </p>
        ) : priced.length < 2 ? (
          <p className="mt-4 text-sm text-dash-muted">
            Add at least two holdings with live prices to compare allocations.
            The optimiser needs two or more assets to weigh against each other.
          </p>
        ) : failed.length > 0 && histories.size < 2 ? (
          <p className="mt-4 text-sm text-dash-muted">
            Could not fetch price history for {failed.join(", ")} — the
            optimiser needs history for at least two holdings.{" "}
            <button className="desk-link" onClick={retryHistory}>
              Retry price history
            </button>
          </p>
        ) : !result ? (
          <p role="status" className="mt-4 text-sm text-dash-muted">
            Fetching a year of prices for your holdings…
          </p>
        ) : "shortHistory" in result ? (
          <p className="mt-4 text-sm text-dash-muted">
            Only {result.shortHistory} trading days where all{" "}
            {result.available.length} holdings traded together — the optimiser
            needs at least {MIN_DAYS + 1} shared days. A recently listed holding
            shortens the shared window.
          </p>
        ) : "singular" in result ? (
          <p className="mt-4 text-sm text-dash-muted">
            Could not compute an allocation: the holdings&apos; price histories
            are too short or too correlated to separate. Try again when more
            history exists.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {failed.length > 0 && (
              <p className="text-xs text-dash-muted">
                No history for {failed.join(", ")} — excluded from this
                comparison.
              </p>
            )}
            {result.suggested === null ? (
              <p className="text-sm text-dash-muted">
                No holding&apos;s average return beats the risk-free rate of{" "}
                {formatPercent(result.riskFreeRate * 100, false)} — at this rate
                the model suggests holding cash rather than any mix of these
                holdings. Lower the risk-free rate to see an allocation.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-dash-border text-xs text-dash-muted">
                        <th scope="col" className="py-2 pr-3 font-medium">
                          Holding
                        </th>
                        <th
                          scope="col"
                          className="py-2 pr-3 text-right font-medium"
                        >
                          Your weight
                        </th>
                        <th
                          scope="col"
                          className="py-2 pr-3 text-right font-medium"
                        >
                          Suggested
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dash-border">
                      {result.available.map((symbol, i) => {
                        const currentWeight = result.currentWeights[i]! * 100;
                        const suggestedWeight =
                          result.suggested!.weights[i]! * 100;
                        const change = suggestedWeight - currentWeight;
                        return (
                          <tr key={symbol}>
                            <td className="py-2.5 pr-3 font-mono">{symbol}</td>
                            <td className="py-2.5 pr-3 text-right font-mono">
                              {currentWeight.toFixed(1)}%
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono">
                              {suggestedWeight.toFixed(1)}%
                            </td>
                            <td
                              className={`py-2.5 text-right font-mono ${change >= 0 ? "text-dash-accent" : "text-dash-red"}`}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(1)}pp
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <MiniStat
                    label="Suggested return (annualised)"
                    value={formatPercent(
                      result.suggested.expectedReturn * 100,
                      false,
                    )}
                  />
                  <MiniStat
                    label="Suggested volatility (annualised)"
                    value={formatPercent(
                      result.suggested.volatility * 100,
                      false,
                    )}
                  />
                  <MiniStat
                    label="Suggested Sharpe ratio"
                    value={
                      result.suggested.sharpe !== null
                        ? result.suggested.sharpe.toFixed(2)
                        : "—"
                    }
                  />
                  <MiniStat
                    label="Your return (annualised)"
                    value={formatPercent(
                      result.current.expectedReturn * 100,
                      false,
                    )}
                  />
                  <MiniStat
                    label="Your volatility (annualised)"
                    value={formatPercent(
                      result.current.volatility * 100,
                      false,
                    )}
                  />
                  <MiniStat
                    label="Your Sharpe ratio"
                    value={
                      result.current.sharpe !== null
                        ? result.current.sharpe.toFixed(2)
                        : "—"
                    }
                  />
                </div>
                {result.minVar && (
                  <p className="text-xs leading-5 text-dash-muted">
                    The lowest-risk mix of these holdings would return{" "}
                    {formatPercent(result.minVar.expectedReturn * 100, false)}{" "}
                    at {formatPercent(result.minVar.volatility * 100, false)}{" "}
                    volatility.
                  </p>
                )}
              </>
            )}
            {result.frontier.length > 0 && (
              <FrontierChart
                frontier={result.frontier}
                riskFreeRate={result.riskFreeRate}
                current={{
                  volatility: result.current.volatility,
                  expectedReturn: result.current.expectedReturn,
                }}
                suggested={
                  result.suggested
                    ? {
                        volatility: result.suggested.volatility,
                        expectedReturn: result.suggested.expectedReturn,
                      }
                    : null
                }
              />
            )}
            <p className="text-xs leading-5 text-dash-muted">
              Computed from {result.days} shared trading days of daily closes
              over the last year, annualised over 252 trading days. Expected
              returns are the historical average — they describe the past year,
              not the next one. This is a model output, not investment advice:
              past returns do not predict future returns, and the optimiser
              knows nothing about a company&apos;s business.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
