"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "../../../auth/types";
import type {
  MarketQuote,
  OverviewResponse,
  PortfolioSummary,
  SearchResult,
} from "../../../lib/market";
import {
  formatFetchedAt,
  formatPercent,
  formatPrice,
} from "../../../lib/market";
import {
  activityError,
  activityRequest,
} from "../../(module-one)/dashboard/use-activity";
import { Icon, MiniStat, PanelHeading } from "../../(module-one)/dashboard/ui";
import { MarketShell } from "./market-shell";
import { PortfolioSection } from "./portfolio";
import { HoldingsSection } from "./holdings";
import { OptimizerSection } from "./optimizer";

function ChangeBadge({ quote }: { quote: MarketQuote }) {
  if (quote.price === null || quote.changePercent === null) return null;
  const up = quote.changePercent >= 0;
  return (
    <span
      className={`font-mono text-xs font-medium ${up ? "text-dash-accent" : "text-dash-red"}`}
    >
      {formatPercent(quote.changePercent)}
      {quote.change !== null &&
        ` (${up ? "+" : ""}${formatPrice(quote.change, quote.currency)})`}
    </span>
  );
}

function StaleNote({ quote }: { quote: MarketQuote }) {
  if (!quote.stale) {
    return (
      <p className="text-xs text-dash-muted">
        Updated {formatFetchedAt(quote.fetchedAt)}
      </p>
    );
  }
  return (
    <p className="text-xs text-dash-warning">
      Last known price from {formatFetchedAt(quote.fetchedAt)} — live data
      unavailable
    </p>
  );
}

function IndexCard({ quote }: { quote: MarketQuote }) {
  return (
    <article className="dash-panel flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {quote.name ?? quote.symbol}
          </h3>
          <p className="mt-1 font-mono text-xs text-dash-muted">
            {quote.symbol}
          </p>
        </div>
        <ChangeBadge quote={quote} />
      </div>
      {quote.price === null ? (
        <p className="mt-4 text-sm text-dash-muted">
          Unavailable right now. Market data could not be reached and no
          previous price is stored.
        </p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-medium tracking-tight break-words">
            {formatPrice(quote.price, quote.currency)}
          </p>
          <div className="mt-3">
            <StaleNote quote={quote} />
          </div>
        </>
      )}
    </article>
  );
}

export default function Market({ user }: { user?: AuthUser }) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [watchBusy, setWatchBusy] = useState<string | null>(null);
  const [watchError, setWatchError] = useState("");

  // Follows the useActivity pattern: each effect fetches with promise
  // callbacks (state only changes when the fetch settles), and a revision
  // counter drives refetches. Retry buttons re-arm the loading flags;
  // refreshes after a change keep the old data on screen.
  const [overviewRevision, setOverviewRevision] = useState(0);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summaryRevision, setSummaryRevision] = useState(0);

  useEffect(() => {
    let active = true;
    activityRequest<OverviewResponse>("/api/market/overview")
      .then((data) => {
        if (active) {
          setOverview(data);
          setError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(activityError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [overviewRevision]);

  useEffect(() => {
    let active = true;
    activityRequest<PortfolioSummary>("/api/portfolio/summary")
      .then((data) => {
        if (active) {
          setSummary(data);
          setSummaryError("");
        }
      })
      .catch((caught: unknown) => {
        if (active) setSummaryError(activityError(caught));
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [summaryRevision]);

  function retryOverview() {
    setLoading(true);
    setError("");
    setOverviewRevision((current) => current + 1);
  }

  function refreshOverview() {
    setOverviewRevision((current) => current + 1);
  }

  function retrySummary() {
    setSummaryLoading(true);
    setSummaryError("");
    setSummaryRevision((current) => current + 1);
  }

  function refreshSummary() {
    setSummaryRevision((current) => current + 1);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await activityRequest<SearchResult[]>(
          `/api/market/search?q=${encodeURIComponent(trimmed)}`,
        );
        setResults(Array.isArray(data) ? data : []);
        setSearchError("");
      } catch (caught) {
        setResults([]);
        setSearchError(activityError(caught));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // A short query hides previous results without clearing them: derived
  // during render instead of synchronised in the effect.
  const showResults = query.trim().length >= 2;
  const visibleResults = showResults ? results : [];

  const watchedSymbols = new Set(
    overview?.watchlist.map((item) => item.symbol) ?? [],
  );

  async function addToWatchlist(result: SearchResult) {
    setWatchError("");
    setWatchBusy(result.symbol);
    try {
      await activityRequest("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({
          symbol: result.symbol,
          name: result.name ?? undefined,
        }),
      });
      refreshOverview();
    } catch (caught) {
      setWatchError(activityError(caught));
    } finally {
      setWatchBusy(null);
    }
  }

  async function removeFromWatchlist(id: string) {
    setWatchError("");
    setWatchBusy(id);
    try {
      await activityRequest(`/api/watchlist/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      refreshOverview();
    } catch (caught) {
      setWatchError(activityError(caught));
    } finally {
      setWatchBusy(null);
    }
  }

  return (
    <MarketShell
      user={user}
      eyebrow="Module 2 · Investments"
      title="Markets & portfolio."
      description="Live prices from Yahoo Finance, your watchlist, holdings and portfolio — every number traced to a stored price and its timestamp. A price that cannot be fetched is shown as unavailable, never guessed."
    >
      <section aria-label="Market indices">
        <PanelHeading icon="chart" title="Today's indices" />
        {loading ? (
          <p role="status" className="mt-4 text-sm text-dash-muted">
            Loading market data…
          </p>
        ) : error ? (
          <div className="dash-panel mt-4">
            <p role="alert" className="text-sm text-dash-red">
              {error}
            </p>
            <button className="dash-small-button mt-4" onClick={retryOverview}>
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {overview?.indices.map((quote) => (
              <IndexCard key={quote.symbol} quote={quote} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Search stocks" className="dash-panel">
        <PanelHeading icon="search" title="Find a stock" />
        <label className="relative mt-4 block">
          <span className="sr-only">Search stocks by name or symbol</span>
          <input
            className="dash-input w-full py-3 pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or symbol — try Reliance or RELIANCE.NS"
            aria-describedby="stock-search-help"
            autoComplete="off"
          />
          <Icon
            name="search"
            className="pointer-events-none absolute top-3 left-3 size-5 text-dash-muted"
          />
        </label>
        <p id="stock-search-help" className="mt-2 text-xs text-dash-muted">
          NSE symbols end in .NS and BSE symbols in .BO. Results come from Yahoo
          Finance.
        </p>
        {searching && showResults && (
          <p role="status" className="mt-4 text-sm text-dash-muted">
            Searching…
          </p>
        )}
        {searchError && showResults && (
          <p role="alert" className="mt-4 text-sm text-dash-red">
            {searchError}
          </p>
        )}
        {!searching &&
          showResults &&
          visibleResults.length === 0 &&
          !searchError && (
            <p className="mt-4 text-sm text-dash-muted">
              No matches for “{query.trim()}”. Check the spelling or try the
              symbol directly.
            </p>
          )}
        {visibleResults.length > 0 && (
          <ul className="mt-4 divide-y divide-dash-border">
            {visibleResults.map((result) => {
              const watched = watchedSymbols.has(result.symbol);
              return (
                <li
                  key={result.symbol}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/market/stock/${encodeURIComponent(result.symbol)}`}
                      className="text-sm font-medium text-dash-text hover:text-dash-accent"
                    >
                      {result.name ?? result.symbol}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-dash-muted">
                      {result.symbol}
                      {result.exchange ? ` · ${result.exchange}` : ""}
                      {result.type ? ` · ${result.type}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dash-small-button"
                    disabled={watched || watchBusy === result.symbol}
                    onClick={() => addToWatchlist(result)}
                  >
                    {watched
                      ? "Watching"
                      : watchBusy === result.symbol
                        ? "Adding…"
                        : "Add to watchlist"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {watchError && (
          <p role="alert" className="mt-4 text-sm text-dash-red">
            {watchError}
          </p>
        )}
      </section>

      <section aria-label="Watchlist" className="dash-panel">
        <PanelHeading icon="pie" title="Your watchlist" />
        {loading ? (
          <p role="status" className="mt-4 text-sm text-dash-muted">
            Loading watchlist…
          </p>
        ) : error ? (
          <p role="alert" className="mt-4 text-sm text-dash-red">
            {error}
          </p>
        ) : overview && overview.watchlist.length === 0 ? (
          <p className="mt-4 text-sm text-dash-muted">
            Your watchlist is empty. Search for a stock above to start following
            it.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-dash-border">
            {overview?.watchlist.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/market/stock/${encodeURIComponent(item.symbol)}`}
                    className="text-sm font-medium text-dash-text hover:text-dash-accent"
                  >
                    {item.name ?? item.symbol}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-dash-muted">
                    {item.symbol}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {item.quote && item.quote.price !== null ? (
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium">
                        {formatPrice(item.quote.price, item.quote.currency)}
                      </p>
                      <ChangeBadge quote={item.quote} />
                      {item.quote.stale && (
                        <p className="mt-0.5 text-xs text-dash-warning">
                          Last known · {formatFetchedAt(item.quote.fetchedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-dash-muted">Price unavailable</p>
                  )}
                  <button
                    type="button"
                    className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
                    aria-label={`Remove ${item.symbol} from watchlist`}
                    disabled={watchBusy === item.id}
                    onClick={() => removeFromWatchlist(item.id)}
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {overview && overview.unavailable.length > 0 && (
          <p className="mt-4 text-xs text-dash-muted">
            Could not fetch prices for {overview.unavailable.join(", ")} — the
            market service is unreachable and no previous price is stored.
          </p>
        )}
      </section>

      <PortfolioSection
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onRetry={retrySummary}
      />

      <HoldingsSection
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
        onChanged={refreshSummary}
      />

      <OptimizerSection holdings={summary?.holdings ?? []} />

      <section aria-label="Data notes" className="dash-panel">
        <PanelHeading icon="bulb" title="About these prices" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <MiniStat label="Source" value="Yahoo Finance" />
          <MiniStat label="Quote cache" value="15 minutes" />
          <MiniStat label="History cache" value="24 hours" />
        </div>
        <p className="mt-4 text-xs leading-5 text-dash-muted">
          Prices are cached for up to 15 minutes and history for up to a day, so
          a quote may lag the live market by a few minutes. Every price shows
          when it was fetched; a stale price is labelled as last known, and a
          price that cannot be fetched at all is shown as unavailable rather
          than estimated.
        </p>
      </section>
    </MarketShell>
  );
}
