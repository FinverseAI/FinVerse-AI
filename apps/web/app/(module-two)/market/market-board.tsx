"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatFetchedAt,
  formatPercent,
  formatPrice,
} from "../../../lib/market";
import {
  formatMarketCapCrore,
  type ScreenedStock,
  type ScreenResponse,
} from "../../../lib/rag";

const points = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function rangePosition(s: ScreenedStock) {
  const { price, fiftyTwoWeekLow: low, fiftyTwoWeekHigh: high } = s;
  if (price == null || low == null || high == null || high <= low) return null;
  return Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
}

export function Change({ value }: { value: number | null }) {
  return (
    <span
      className={
        value === null || value === 0
          ? "text-dash-muted"
          : value > 0
            ? "market-positive"
            : "market-negative"
      }
    >
      {value === null ? "" : formatPercent(value)}
    </span>
  );
}

function StockName({ stock }: { stock: ScreenedStock }) {
  return (
    <Link
      href={`/market/stock/${encodeURIComponent(stock.symbol)}`}
      className="stock-identity"
    >
      <strong>{stock.symbol.replace(/\.(NS|BO)$/, "")}</strong>
      <small>
        {stock.name ?? stock.symbol}
        {stock.sector && ` · ${stock.sector}`}
      </small>
    </Link>
  );
}

function RangeTrack({ stock }: { stock: ScreenedStock }) {
  const position = rangePosition(stock);
  if (position === null) return null;
  return (
    <div
      className="annual-range"
      aria-label={`${position.toFixed(0)}% through the annual range`}
    >
      <div>
        <i style={{ left: `${position}%` }} />
      </div>
      <small>
        {points.format(stock.fiftyTwoWeekLow!)} –{" "}
        {points.format(stock.fiftyTwoWeekHigh!)}
      </small>
    </div>
  );
}

function trend(s: ScreenedStock) {
  if (s.sma20 === null || s.price === null) return "";
  const relation =
    s.price === s.sma20 ? "At" : s.price > s.sma20 ? "Above" : "Below";
  const averages =
    s.sma50 === null
      ? ""
      : s.sma20 === s.sma50
        ? " · 20 = 50"
        : s.sma20 > s.sma50
          ? " · 20 > 50"
          : " · 20 < 50";
  return `${relation} SMA-20${averages}`;
}

type SortKey =
  | "symbol"
  | "price"
  | "changePercent"
  | "change1moPercent"
  | "marketCap"
  | "trailingPE"
  | "rsi14"
  | "range"
  | "trend";

export function StockTable({
  stocks,
  screening = false,
}: {
  stocks: ScreenedStock[];
  screening?: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({
    key: "marketCap",
    ascending: false,
  });
  const columns: [SortKey, string][] = [
    ["symbol", "Stock"],
    ["price", "Price"],
    ["changePercent", "Day"],
    ["change1moPercent", "1 month"],
    ["marketCap", "Market cap"],
    ["trailingPE", "P/E"],
    ["rsi14", "RSI 14"],
    screening ? ["trend", "Trend"] : ["range", "52-week range"],
  ];
  function sortValue(s: ScreenedStock) {
    if (sort.key === "range") return rangePosition(s);
    if (sort.key === "trend") return trend(s);
    return s[sort.key];
  }
  const sorted = [...stocks].sort((a, b) => {
    const left = sortValue(a),
      right = sortValue(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const delta =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return (
      (sort.ascending ? delta : -delta) || a.symbol.localeCompare(b.symbol)
    );
  });
  return (
    <div className="stock-table-scroll">
      <table className="stock-table">
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th
                key={key}
                scope="col"
                aria-sort={
                  sort.key === key
                    ? sort.ascending
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort({
                      key,
                      ascending:
                        sort.key === key ? !sort.ascending : key === "symbol",
                    })
                  }
                >
                  {label} {sort.key === key ? (sort.ascending ? "↑" : "↓") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.symbol}
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  !event.target.closest("a,button") &&
                  !window.getSelection()?.toString()
                ) {
                  event.currentTarget.querySelector("a")?.click();
                }
              }}
            >
              <td>
                <StockName stock={s} />
              </td>
              <td>
                {s.price === null ? "" : formatPrice(s.price, s.currency)}
                <small>
                  {s.stale ? "Last known · " : ""}
                  {s.fetchedAt && formatFetchedAt(s.fetchedAt)}
                </small>
              </td>
              <td>
                <Change value={s.changePercent} />
              </td>
              <td>
                <Change value={s.change1moPercent} />
              </td>
              <td>
                {s.currency && s.currency !== "INR" && s.marketCap !== null
                  ? formatPrice(s.marketCap, s.currency)
                  : formatMarketCapCrore(s.marketCap)}
              </td>
              <td>{s.trailingPE?.toFixed(2) ?? ""}</td>
              <td>{s.rsi14?.toFixed(1) ?? ""}</td>
              <td>{screening ? trend(s) : <RangeTrack stock={s} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ranking({
  label,
  stocks,
  ranged = false,
}: {
  label: string;
  stocks: ScreenedStock[];
  ranged?: boolean;
}) {
  return (
    <div className="market-ranking">
      <h4>{label}</h4>
      <ol>
        {stocks.slice(0, 3).map((s) => (
          <li key={s.symbol}>
            <Link href={`/market/stock/${encodeURIComponent(s.symbol)}`}>
              {s.symbol.split(".")[0]}
            </Link>
            <div className="ranking-metric">
              {ranged ? (
                <>
                  <small>{rangePosition(s)?.toFixed(0)}% of range</small>
                  <RangeTrack stock={s} />
                </>
              ) : (
                <Change value={s.changePercent} />
              )}
            </div>
            <small>
              {s.price !== null && formatPrice(s.price, s.currency)}
              {s.stale && " · last known"}
            </small>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MarketBoard({ snapshot }: { snapshot: ScreenResponse }) {
  const [query, setQuery] = useState("");
  const stocks = snapshot.matches;
  const moves = stocks
    .filter((s) => !s.stale && s.changePercent !== null)
    .sort((a, b) => b.changePercent! - a.changePercent!);
  const gainers = moves.filter((s) => s.changePercent! > 0);
  const losers = moves.filter((s) => s.changePercent! < 0).reverse();
  const flat = moves.length - gainers.length - losers.length;
  const ranged = stocks
    .filter((s) => !s.stale && rangePosition(s) !== null)
    .sort((a, b) => rangePosition(b)! - rangePosition(a)!);
  const shown = stocks.filter((s) =>
    `${s.symbol} ${s.name ?? ""} ${s.sector ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      {moves.length > 0 && (
        <section className="breadth-strip">
          <div>
            <span className="desk-label">Market breadth</span>
            <p>{moves.length} stocks with a session change</p>
          </div>
          <div className="breadth-data">
            <div className="breadth-track" aria-hidden="true">
              <i style={{ flexGrow: gainers.length }} />
              <i style={{ flexGrow: flat }} />
              <i style={{ flexGrow: losers.length }} />
            </div>
            <div>
              <span className="market-positive">
                {gainers.length} advancing
              </span>
              <span>{flat} flat</span>
              <span className="market-negative">{losers.length} declining</span>
            </div>
          </div>
        </section>
      )}
      <div className="market-rankings">
        <section className="dash-panel">
          <h3>Session movers</h3>
          <div className="ranking-pair">
            <Ranking label="Top gainers" stocks={gainers} />
            <Ranking label="Top losers" stocks={losers} />
          </div>
        </section>
        <section className="dash-panel">
          <h3>52-week positioning</h3>
          <div className="ranking-pair">
            <Ranking label="Nearest high" stocks={ranged} ranged />
            <Ranking
              label="Nearest low"
              stocks={[...ranged].reverse()}
              ranged
            />
          </div>
        </section>
      </div>
      <section className="dash-panel">
        <div className="desk-heading">
          <div>
            <h3>All stocks</h3>
            {stocks.length > 0 && (
              <p className="desk-muted">
                {stocks.length} of {snapshot.universe.length} stocks priced ·
                Checked {formatFetchedAt(snapshot.evaluatedAt)}
              </p>
            )}
          </div>
          <input
            aria-label="Filter all stocks"
            placeholder="Find a name, symbol or sector"
            className="dash-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {shown.length ? (
          <StockTable stocks={shown} />
        ) : (
          <p className="desk-muted">
            {stocks.length
              ? "No stocks match your search."
              : "Stock quotes are unavailable."}
          </p>
        )}
        {!!snapshot.unavailable.length && (
          <p className="desk-muted">
            Quotes unavailable for {snapshot.unavailable.join(", ")}.
          </p>
        )}
      </section>
    </>
  );
}
