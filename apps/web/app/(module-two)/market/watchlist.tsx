"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatFetchedAt,
  formatPrice,
  type OverviewResponse,
  type SearchResult,
} from "../../../lib/market";
import {
  activityError,
  activityRequest,
} from "../../(module-one)/dashboard/use-activity";
import { Icon, PanelHeading } from "../../(module-one)/dashboard/ui";
import { Modal } from "../../(module-one)/dashboard/modal";
import { Change } from "./market-board";

type Watched = OverviewResponse["watchlist"][number];

function alertStatus(item: Watched) {
  if (!item.alertDirection || item.alertPrice == null) return "No alert";
  // A recorded firing outranks the live quote: the target WAS reached,
  // even if the current quote is stale or missing. The state clears
  // when the price moves back and the alert re-arms.
  if (item.alertFiredAt) return "Target reached";
  if (item.quote?.price == null || item.quote.stale) return "Awaiting quote";
  const reached =
    item.alertDirection === "above"
      ? item.quote.price >= item.alertPrice
      : item.quote.price <= item.alertPrice;
  return reached ? "Target reached" : "Watching";
}

function WatchSettings({
  item,
  onClose,
  onChanged,
}: {
  item: Watched;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState(item.note ?? "");
  const [direction, setDirection] = useState(item.alertDirection ?? "");
  const [price, setPrice] = useState(item.alertPrice?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={`Watch settings · ${item.symbol}`}
      onClose={onClose}
      busy={busy}
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await activityRequest(
              `/api/watchlist/${encodeURIComponent(item.id)}`,
              {
                method: "PUT",
                body: JSON.stringify({
                  note,
                  alertDirection: direction || null,
                  alertPrice: direction ? price : null,
                }),
              },
            );
            onChanged();
            onClose();
          } catch (caught) {
            setError(activityError(caught));
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm">
          Research note
          <textarea
            className="dash-input mt-2 w-full"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Price alert
            <select
              className="dash-input mt-2 w-full"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="">No alert</option>
              <option value="above">At or above</option>
              <option value="below">At or below</option>
            </select>
          </label>
          <label className="block text-sm">
            Target {item.quote?.currency && `(${item.quote.currency})`}
            <input
              className="dash-input mt-2 w-full"
              type="number"
              min="0.01"
              max="100000000"
              step="0.01"
              required={!!direction}
              disabled={!direction}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>
        <p className="desk-muted">
          The status updates here when a quote refreshes. Changing the target
          re-arms a fired alert.
        </p>
        {error && (
          <p role="alert" className="market-negative">
            {error}
          </p>
        )}
        <button className="dash-primary px-4 py-2" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}

export function Watchlist({
  overview,
  loading,
  error,
  onChanged,
}: {
  overview: OverviewResponse | null;
  loading: boolean;
  error: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Watched | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [watchBusy, setWatchBusy] = useState<string | null>(null);
  const [watchError, setWatchError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await activityRequest<SearchResult[]>(
          `/api/market/search?q=${encodeURIComponent(trimmed)}`,
        );
        if (!active) return;
        setResults(Array.isArray(data) ? data : []);
        setSearchError("");
      } catch (caught) {
        if (!active) return;
        // Keep the previous results on a failed search; only the error
        // is new.
        setSearchError(activityError(caught));
      } finally {
        if (active) setSearching(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
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
      onChanged();
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
      onChanged();
    } catch (caught) {
      setWatchError(activityError(caught));
    } finally {
      setWatchBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {(overview?.alerts?.length ?? 0) > 0 && (
        <section
          className="dash-panel"
          aria-label="Price alerts fired"
          role="status"
        >
          <PanelHeading icon="bell" title="Price alerts fired" />
          <ul className="mt-3 space-y-2">
            {overview!.alerts.map((alert) => (
              <li
                key={alert.id}
                className="surface-inset flex flex-wrap items-center gap-x-2 gap-y-1 border px-3 py-2 text-sm"
              >
                <Link
                  className="font-medium text-dash-text hover:text-dash-accent"
                  href={`/market/stock/${encodeURIComponent(alert.symbol)}`}
                >
                  {alert.symbol}
                </Link>
                <span className="text-dash-muted">
                  {alert.alertDirection === "above" ? "rose to" : "fell to"}{" "}
                  {formatPrice(alert.price, alert.currency)} — target{" "}
                  {alert.alertDirection === "above" ? "≥" : "≤"}{" "}
                  {formatPrice(alert.alertPrice, alert.currency)}
                </span>
                <span className="ml-auto font-mono text-xs text-dash-muted">
                  {formatFetchedAt(alert.firedAt)}
                </span>
              </li>
            ))}
          </ul>
          <p className="desk-muted mt-3">
            These fired on this load. They stay in your notifications until the
            price moves back across the target.
          </p>
        </section>
      )}
      <section className="dash-panel">
        <div className="desk-heading">
          <div>
            <h3>Watched stocks</h3>
            <p className="desk-muted">
              {overview
                ? `${overview.watchlist.length} saved ${overview.watchlist.length === 1 ? "symbol" : "symbols"}`
                : "Your saved symbols"}
            </p>
          </div>
          <button className="dash-small-button" onClick={onChanged}>
            Refresh quotes
          </button>
        </div>
        {loading ? (
          <p role="status" className="desk-muted">
            Loading watchlist…
          </p>
        ) : error ? (
          <p role="alert" className="market-negative">
            {error}
          </p>
        ) : !overview?.watchlist.length ? (
          <p className="desk-empty">
            Find a stock below to start your watchlist.
          </p>
        ) : (
          <div
            className="stock-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Watched stocks table, scrollable"
          >
            <table className="stock-table watch-table">
              <thead>
                <tr>
                  {[
                    "Stock",
                    "Price / day",
                    "Research note",
                    "Price alert",
                    "Status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.watchlist.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="stock-identity"
                        href={`/market/stock/${encodeURIComponent(item.symbol)}`}
                      >
                        <strong>{item.symbol}</strong>
                        <small>{item.name ?? item.quote?.name}</small>
                      </Link>
                    </td>
                    <td>
                      {item.quote?.price != null ? (
                        <>
                          {formatPrice(item.quote.price, item.quote.currency)}{" "}
                          <Change value={item.quote.changePercent} />
                          <small>
                            {item.quote.stale && "Last known · "}
                            {formatFetchedAt(item.quote.fetchedAt)}
                          </small>
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="watch-note">{item.note || ""}</td>
                    <td>
                      {item.alertPrice != null
                        ? `${item.alertDirection === "above" ? "≥" : "≤"} ${item.quote ? formatPrice(item.alertPrice, item.quote.currency) : item.alertPrice}`
                        : ""}
                    </td>
                    <td>
                      <span
                        className="watch-status"
                        data-hit={alertStatus(item) === "Target reached"}
                      >
                        {alertStatus(item)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="dash-small-button"
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </button>
                        <button
                          aria-label={`Remove ${item.symbol}`}
                          disabled={watchBusy === item.id}
                          onClick={() => removeFromWatchlist(item.id)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-label="Search stocks" className="dash-panel">
        <PanelHeading icon="search" title="Add to watchlist" />
        <label className="relative mt-4 block">
          <span className="sr-only">Search stocks by name or symbol</span>
          <input
            className="dash-input w-full py-3 pl-10"
            value={query}
            onChange={(event) => {
              // Do not clear the previous results here: they stay on
              // screen until the debounced fetch returns, so typing
              // does not flicker the list away on every keystroke.
              setQuery(event.target.value);
              setSearchError("");
              setSearching(event.target.value.trim().length >= 2);
            }}
            placeholder="Search companies or symbols"
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

      {editing && (
        <WatchSettings
          item={editing}
          onClose={() => setEditing(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
