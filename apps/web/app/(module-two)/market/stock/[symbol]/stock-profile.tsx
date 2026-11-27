"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../../../../auth/types";
import type {
  HistoryRange,
  HistoryResponse,
  MarketProfile,
  WatchlistItem,
} from "../../../../../lib/market";
import {
  formatCompact,
  formatFetchedAt,
  formatPercent,
  formatPrice,
  historyRanges,
} from "../../../../../lib/market";
import { ema, macd, rsi, sma } from "../../../../../lib/indicators";
import {
  activityError,
  activityRequest,
} from "../../../../(module-one)/dashboard/use-activity";
import { MiniStat, PanelHeading } from "../../../../(module-one)/dashboard/ui";
import { MarketShell } from "../../market-shell";
import { MacdChart, PriceChart, RsiChart } from "../../price-chart";
import { HoldingForm, type HoldingFormData } from "../../holding-form";
import { StockFilingsSection } from "./stock-filings";
import { StockNewsSection } from "./stock-news";
import { StockSnapshot } from "./stock-snapshot";

const volumeFormat = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function lastDefined(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function rsiReading(value: number | null) {
  if (value === null) return "Not enough history";
  if (value >= 70) return "Overbought (above 70)";
  if (value <= 30) return "Oversold (below 30)";
  return "Neutral (30–70)";
}

export default function StockProfile({
  symbol,
  user,
}: {
  symbol: string;
  user?: AuthUser;
}) {
  const [profile, setProfile] = useState<MarketProfile | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [range, setRange] = useState<HistoryRange>("1y");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [watchItem, setWatchItem] = useState<WatchlistItem | null>(null);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchError, setWatchError] = useState("");
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [holdingSaved, setHoldingSaved] = useState("");

  const encodedSymbol = encodeURIComponent(symbol);

  // Follows the useActivity pattern: each effect fetches with promise
  // callbacks (state only changes when the fetch settles), and revision
  // counters drive refetches. Loading flags start true and are re-armed
  // by event handlers (retry buttons and the range selector).
  const [profileRevision, setProfileRevision] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);

  function retryProfile() {
    setLoadingProfile(true);
    setProfileError("");
    setProfileRevision((current) => current + 1);
  }

  function retryHistory() {
    setLoadingHistory(true);
    setHistoryError("");
    setHistoryRevision((current) => current + 1);
  }

  function selectRange(selected: HistoryRange) {
    if (selected === range) return;
    setRange(selected);
    setLoadingHistory(true);
    setHistoryError("");
  }

  useEffect(() => {
    let active = true;
    activityRequest<MarketProfile>(`/api/market/profile/${encodedSymbol}`)
      .then((data) => {
        if (active) {
          setProfile(data);
          setProfileError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setProfileError(activityError(caught));
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    activityRequest<WatchlistItem[]>("/api/watchlist")
      .then((items) => {
        if (active) {
          setWatchItem(
            Array.isArray(items)
              ? (items.find((item) => item.symbol === symbol) ?? null)
              : null,
          );
        }
      })
      .catch(() => {
        // The watchlist button degrades to "add" if this check fails; the
        // add itself reports the real error.
        if (active) setWatchItem(null);
      });
    return () => {
      active = false;
    };
  }, [encodedSymbol, symbol, profileRevision]);

  useEffect(() => {
    let active = true;
    activityRequest<HistoryResponse>(
      `/api/market/history/${encodedSymbol}?range=${range}`,
    )
      .then((data) => {
        if (active) {
          setHistory(data);
          setHistoryError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setHistoryError(activityError(caught));
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [encodedSymbol, range, historyRevision]);

  const closes = useMemo(
    () => (history?.bars ?? []).map((bar) => bar.close),
    [history],
  );
  const dates = useMemo(
    () => (history?.bars ?? []).map((bar) => bar.date),
    [history],
  );
  const indicators = useMemo(() => {
    if (closes.length === 0) {
      return {
        sma20: [] as (number | null)[],
        sma50: [] as (number | null)[],
        rsi14: [] as (number | null)[],
        macdValues: [] as ({
          macd: number;
          signal: number;
          histogram: number;
        } | null)[],
      };
    }
    return {
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      rsi14: rsi(closes, 14),
      macdValues: macd(closes, 12, 26, 9),
    };
  }, [closes]);
  // EMA is not plotted, but the 12/26 EMAs are the MACD inputs; computing
  // them here keeps the indicator set complete for the stats row.
  const ema12 = useMemo(() => (closes.length ? ema(closes, 12) : []), [closes]);
  const ema26 = useMemo(() => (closes.length ? ema(closes, 26) : []), [closes]);

  const latestRsi = lastDefined(indicators.rsi14);
  const latestMacd = useMemo(() => {
    for (let i = indicators.macdValues.length - 1; i >= 0; i--) {
      if (indicators.macdValues[i] !== null) return indicators.macdValues[i];
    }
    return null;
  }, [indicators.macdValues]);
  const latestSma20 = lastDefined(indicators.sma20);
  const latestSma50 = lastDefined(indicators.sma50);
  const latestEma12 = lastDefined(ema12);
  const latestEma26 = lastDefined(ema26);
  const latestBar = history?.bars[history.bars.length - 1] ?? null;
  const currency = profile?.currency ?? "INR";

  async function toggleWatchlist() {
    setWatchError("");
    setWatchBusy(true);
    try {
      if (watchItem) {
        await activityRequest(
          `/api/watchlist/${encodeURIComponent(watchItem.id)}`,
          { method: "DELETE" },
        );
        setWatchItem(null);
      } else {
        const created = await activityRequest<WatchlistItem>("/api/watchlist", {
          method: "POST",
          body: JSON.stringify({
            symbol,
            name: profile?.name ?? undefined,
          }),
        });
        setWatchItem(created);
      }
    } catch (caught) {
      setWatchError(activityError(caught));
    } finally {
      setWatchBusy(false);
    }
  }

  async function addHolding(data: HoldingFormData) {
    await activityRequest("/api/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setHoldingSaved(
      `${data.symbol} added to your holdings — see it on the Market page.`,
    );
  }

  const fundamentals = profile?.fundamentals ?? null;

  return (
    <MarketShell
      user={user}
      eyebrow="Investments / Stock analysis"
      title={profile?.name ?? symbol}
      description={`Explore ${symbol}: price performance, technical signals, and the stories behind the stock.`}
    >
      <nav className="market-section-nav" aria-label="Stock analysis sections">
        <a href="/market">All markets</a>
        <a href="#price-history">Price performance</a>
        <a href="#technicals">Technical indicators</a>
        <a href="#fundamentals">Fundamentals</a>
        <a href="#filings">Filings & reports</a>
        <a href="#stock-news">News & sentiment</a>
      </nav>
      <section aria-label="Current price" className="dash-panel stock-quote">
        {loadingProfile ? (
          <p role="status" className="text-sm text-dash-muted">
            Loading {symbol}…
          </p>
        ) : profileError || !profile ? (
          <div>
            <p role="alert" className="text-sm text-dash-red">
              {profileError ||
                "This symbol could not be loaded. It may not exist, or market data may be unavailable."}
            </p>
            <button className="dash-small-button mt-4" onClick={retryProfile}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {profile.name ?? profile.symbol}
                </h2>
                <p className="mt-1 font-mono text-xs text-dash-muted">
                  {profile.symbol}
                  {profile.sector ? ` · ${profile.sector}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="dash-small-button"
                  disabled={watchBusy}
                  onClick={toggleWatchlist}
                >
                  {watchBusy
                    ? "Saving…"
                    : watchItem
                      ? "Remove from watchlist"
                      : "Add to watchlist"}
                </button>
                <button
                  type="button"
                  className="dash-primary"
                  onClick={() => setShowHoldingForm(true)}
                >
                  Add holding
                </button>
              </div>
            </div>
            {profile.price === null ? (
              <p className="mt-4 text-sm text-dash-muted">
                Price unavailable right now. Market data could not be reached
                and no previous price is stored.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <p className="font-mono text-4xl font-medium sm:text-5xl">
                  {formatPrice(profile.price, profile.currency)}
                </p>
                {profile.changePercent !== null && (
                  <span
                    className={`font-mono text-sm font-medium ${profile.changePercent >= 0 ? "market-positive" : "market-negative"}`}
                  >
                    {formatPercent(profile.changePercent)}{" "}
                    <span className="text-xs text-dash-muted">
                      vs. previous close
                    </span>
                    {profile.change !== null &&
                      ` (${profile.change >= 0 ? "+" : ""}${formatPrice(profile.change, profile.currency)})`}
                  </span>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-dash-muted">
              {profile.stale
                ? `Last known price from ${formatFetchedAt(profile.fetchedAt)} — live data unavailable`
                : `Updated ${formatFetchedAt(profile.fetchedAt)}`}
            </p>
            {watchError && (
              <p role="alert" className="mt-3 text-sm text-dash-red">
                {watchError}
              </p>
            )}
            {holdingSaved && (
              <p role="status" className="mt-3 text-sm text-dash-accent">
                {holdingSaved}
              </p>
            )}
          </>
        )}
      </section>

      <div className="stock-analysis-grid">
        <section
          id="price-history"
          aria-label="Price history"
          className="dash-panel"
        >
          <PanelHeading icon="chart" title="Price performance">
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="History range"
            >
              {historyRanges.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={range === option.value}
                  onClick={() => selectRange(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                    range === option.value
                      ? "bg-dash-raised text-dash-text"
                      : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </PanelHeading>
          {loadingHistory ? (
            <p role="status" className="mt-4 text-sm text-dash-muted">
              Loading price history…
            </p>
          ) : historyError ? (
            <div className="mt-4">
              <p role="alert" className="text-sm text-dash-red">
                {historyError}
              </p>
              <button className="dash-small-button mt-4" onClick={retryHistory}>
                Try again
              </button>
            </div>
          ) : history && history.bars.length > 0 ? (
            <div className="mt-4">
              <PriceChart
                bars={history.bars}
                currency={currency}
                overlays={[
                  {
                    label: "SMA 20",
                    values: indicators.sma20,
                    color: "#efd0a2",
                  },
                  {
                    label: "SMA 50",
                    values: indicators.sma50,
                    color: "#c0cad5",
                  },
                ]}
              />
              {history.stale && (
                <p className="mt-3 text-xs text-dash-warning">
                  Showing the last cached history from{" "}
                  {formatFetchedAt(history.fetchedAt)} — the latest bars may be
                  missing.
                </p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <MiniStat
                  label="Latest close"
                  value={
                    latestBar ? formatPrice(latestBar.close, currency) : "—"
                  }
                />
                <MiniStat
                  label="Latest volume"
                  value={
                    latestBar?.volume !== null &&
                    latestBar?.volume !== undefined
                      ? volumeFormat.format(latestBar.volume)
                      : "—"
                  }
                />
                <MiniStat
                  label="SMA 20"
                  value={
                    latestSma20 !== null
                      ? formatPrice(latestSma20, currency)
                      : "Needs 20 days"
                  }
                />
                <MiniStat
                  label="SMA 50"
                  value={
                    latestSma50 !== null
                      ? formatPrice(latestSma50, currency)
                      : "Needs 50 days"
                  }
                />
                <MiniStat
                  label="EMA 12"
                  value={
                    latestEma12 !== null
                      ? formatPrice(latestEma12, currency)
                      : "Needs 12 days"
                  }
                />
                <MiniStat
                  label="EMA 26"
                  value={
                    latestEma26 !== null
                      ? formatPrice(latestEma26, currency)
                      : "Needs 26 days"
                  }
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-dash-muted">
                SMA 20 and SMA 50 are the average closes of the last 20 and 50
                trading days — a price above its average is in an uptrend
                against that window, below it in a downtrend. When the shorter
                average (20) sits above the longer one (50), the recent trend is
                stronger than the longer-term one. EMA 12 and EMA 26 are the
                same idea but weight recent days more heavily, so they react
                faster; the 12-day EMA above the 26-day EMA points the same way
                as a rising MACD. The EMAs are not drawn on the chart — they are
                the two lines whose difference is the MACD below.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-dash-muted">
              No price history is available for this symbol in this range. It
              may be newly listed.
            </p>
          )}
        </section>

        <StockSnapshot
          profile={profile}
          bars={history?.bars ?? []}
          loading={loadingHistory}
          unavailable={Boolean(historyError)}
        />
      </div>

      <div id="technicals">
        {!loadingHistory &&
        !historyError &&
        history &&
        history.bars.length > 0 ? (
          <section
            aria-label="Technical indicators"
            className="grid gap-4 xl:grid-cols-2"
          >
            <article className="dash-panel">
              <PanelHeading icon="target" title="RSI (14)" />
              <div className="mt-4">
                <RsiChart values={indicators.rsi14} dates={dates} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <MiniStat
                  label="Latest RSI"
                  value={latestRsi !== null ? latestRsi.toFixed(1) : "—"}
                />
                <MiniStat label="Reading" value={rsiReading(latestRsi)} />
              </div>
              <p className="mt-4 text-xs leading-5 text-dash-muted">
                RSI compares recent gains to recent losses over 14 trading days.
                The 30/70 bands are the standard textbook levels — they describe
                momentum, not a buy or sell instruction.
              </p>
            </article>
            <article className="dash-panel">
              <PanelHeading icon="chart" title="MACD (12, 26, 9)" />
              <div className="mt-4">
                <MacdChart values={indicators.macdValues} dates={dates} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniStat
                  label="MACD"
                  value={latestMacd ? latestMacd.macd.toFixed(2) : "—"}
                />
                <MiniStat
                  label="Signal"
                  value={latestMacd ? latestMacd.signal.toFixed(2) : "—"}
                />
                <MiniStat
                  label="Histogram"
                  value={latestMacd ? latestMacd.histogram.toFixed(2) : "—"}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-dash-muted">
                MACD is the 12-day EMA minus the 26-day EMA; the signal line is
                its 9-day EMA. The histogram shows MACD minus signal. EMAs are
                seeded with the SMA of their first period.
              </p>
            </article>
          </section>
        ) : (
          <p className="dash-panel text-sm text-dash-muted">
            {loadingHistory
              ? "Updating technical indicators..."
              : "Technical indicators need price history for the selected range."}
          </p>
        )}
      </div>

      <div className="stock-research-grid">
        <section
          id="fundamentals"
          aria-label="Fundamentals"
          className="dash-panel"
        >
          <PanelHeading icon="file" title="Fundamentals" />
          {loadingProfile ? (
            <p role="status" className="mt-4 text-sm text-dash-muted">
              Loading fundamentals…
            </p>
          ) : !profile?.fundamentalsAvailable || !fundamentals ? (
            <p className="mt-4 text-sm text-dash-muted">
              Fundamentals are unavailable right now. Check the price and
              history panels for their latest available data.
            </p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniStat label="Sector" value={fundamentals.sector ?? "—"} />
                <MiniStat
                  label="Industry"
                  value={fundamentals.industry ?? "—"}
                />
                <MiniStat
                  label="Market cap"
                  value={
                    fundamentals.marketCap !== null
                      ? formatCompact(fundamentals.marketCap, currency)
                      : "—"
                  }
                />
                <MiniStat
                  label="Trailing P/E"
                  value={
                    fundamentals.trailingPE !== null
                      ? fundamentals.trailingPE.toFixed(2)
                      : "—"
                  }
                />
                <MiniStat
                  label="Forward P/E"
                  value={
                    fundamentals.forwardPE !== null
                      ? fundamentals.forwardPE.toFixed(2)
                      : "—"
                  }
                />
                <MiniStat
                  label="Dividend yield"
                  value={
                    fundamentals.dividendYield !== null
                      ? formatPercent(fundamentals.dividendYield * 100, false)
                      : "—"
                  }
                />
                <MiniStat
                  label="52-week high"
                  value={
                    fundamentals.fiftyTwoWeekHigh !== null
                      ? formatPrice(fundamentals.fiftyTwoWeekHigh, currency)
                      : "—"
                  }
                />
                <MiniStat
                  label="52-week low"
                  value={
                    fundamentals.fiftyTwoWeekLow !== null
                      ? formatPrice(fundamentals.fiftyTwoWeekLow, currency)
                      : "—"
                  }
                />
              </div>
              <h3 className="mt-6 text-xs font-medium text-dash-muted">
                Deeper fundamentals
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                  label="Book value"
                  value={
                    fundamentals.bookValue !== null
                      ? formatPrice(fundamentals.bookValue, currency)
                      : "—"
                  }
                />
                <MiniStat
                  label="Price / book"
                  value={
                    fundamentals.priceToBook !== null
                      ? fundamentals.priceToBook.toFixed(2)
                      : "—"
                  }
                />
                <MiniStat
                  label="Return on equity"
                  value={
                    fundamentals.returnOnEquity !== null
                      ? formatPercent(fundamentals.returnOnEquity * 100, false)
                      : "—"
                  }
                />
                <MiniStat
                  label="Debt / equity"
                  value={
                    fundamentals.debtToEquity !== null
                      ? fundamentals.debtToEquity.toFixed(2)
                      : "—"
                  }
                />
                <MiniStat
                  label="Revenue growth"
                  value={
                    fundamentals.revenueGrowth !== null
                      ? formatPercent(fundamentals.revenueGrowth * 100, false)
                      : "—"
                  }
                />
                <MiniStat
                  label="Earnings growth"
                  value={
                    fundamentals.earningsGrowth !== null
                      ? formatPercent(fundamentals.earningsGrowth * 100, false)
                      : "—"
                  }
                />
                <MiniStat
                  label="Payout ratio"
                  value={
                    fundamentals.payoutRatio !== null
                      ? formatPercent(fundamentals.payoutRatio * 100, false)
                      : "—"
                  }
                />
                <MiniStat
                  label="Beta"
                  value={
                    fundamentals.beta !== null
                      ? fundamentals.beta.toFixed(2)
                      : "—"
                  }
                />
                <MiniStat
                  label="Shares outstanding"
                  value={
                    fundamentals.sharesOutstanding !== null
                      ? volumeFormat.format(fundamentals.sharesOutstanding)
                      : "—"
                  }
                />
              </div>
              {fundamentals.description && (
                <details className="mt-5 border-t border-dash-border pt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    About the company
                  </summary>
                  <p className="mt-3 text-base leading-7 text-dash-muted">
                    {fundamentals.description}
                  </p>
                </details>
              )}
            </>
          )}
        </section>

        <StockFilingsSection symbol={symbol} />

        <StockNewsSection symbol={symbol} />
      </div>

      {showHoldingForm && (
        <HoldingForm
          title={`Add ${symbol} to holdings`}
          submitLabel="Add holding"
          initial={{
            symbol,
            name: profile?.name ?? undefined,
            sector: profile?.sector ?? fundamentals?.sector ?? undefined,
            buyPrice: profile?.price ?? undefined,
            currency:
              profile?.currency === "INR" || profile?.currency === "USD"
                ? profile.currency
                : undefined,
          }}
          onSubmit={addHolding}
          onClose={() => setShowHoldingForm(false)}
        />
      )}
    </MarketShell>
  );
}
