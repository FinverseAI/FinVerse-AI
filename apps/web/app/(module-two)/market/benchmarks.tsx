import Link from "next/link";
import {
  formatFetchedAt,
  formatPrice,
  type HistoryResponse,
  type MarketQuote,
} from "../../../lib/market";
import { Change } from "./market-board";

const benchmarks = [
  { symbol: "^NSEI", name: "NIFTY 50", unit: "NSE · Index points" },
  { symbol: "^BSESN", name: "SENSEX", unit: "BSE · Index points" },
  { symbol: "^NSEBANK", name: "NIFTY Bank", unit: "NSE · Index points" },
  { symbol: "GC=F", name: "Gold futures", unit: "USD / troy oz" },
  { symbol: "SI=F", name: "Silver futures", unit: "USD / troy oz" },
];

function CloseChart({ history }: { history: HistoryResponse }) {
  const bars = history.bars;
  if (bars.length < 2) return null;
  const closes = bars.map((bar) => bar.close);
  const min = Math.min(...closes),
    max = Math.max(...closes);
  const points = closes
    .map(
      (close, i) =>
        `${((i * 400) / (bars.length - 1)).toFixed(2)},${max === min ? 44 : (82 - ((close - min) / (max - min)) * 74).toFixed(2)}`,
    )
    .join(" ");
  return (
    <figure className="benchmark-chart">
      <svg
        viewBox="0 0 400 90"
        preserveAspectRatio="none"
        role="img"
        aria-label={`NIFTY 50 closes from ${bars[0]!.date} to ${bars.at(-1)?.date}, ranging from ${min} to ${max} points`}
      >
        <defs>
          <linearGradient id="nifty-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#ffb194" stopOpacity=".3" />
            <stop offset="1" stopColor="#ffb194" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 50, 80].map((y) => (
          <line
            key={y}
            x1="0"
            x2="400"
            y1={y}
            y2={y}
            stroke="#ffffff20"
            strokeDasharray="3 5"
          />
        ))}
        <polygon points={`0,90 ${points} 400,90`} fill="url(#nifty-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#ffba9c"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <figcaption>
        {history.stale ? "Last known · " : ""}1-month closes · through{" "}
        {bars.at(-1)?.date}
      </figcaption>
    </figure>
  );
}

export function Benchmarks({
  quotes,
  history,
  historyLoading,
  loading,
}: {
  quotes: MarketQuote[];
  history: HistoryResponse | null;
  historyLoading: boolean;
  loading: boolean;
}) {
  return (
    <section className="benchmark-grid" aria-label="Indices and commodities">
      {benchmarks.map((b, index) => {
        const quote = quotes.find((q) => q.symbol === b.symbol);
        const price = quote?.price;
        return (
          <article
            className={index === 0 ? "benchmark benchmark-lead" : "benchmark"}
            key={b.symbol}
          >
            <span className="desk-label">{b.unit}</span>
            <h3>
              <Link href={`/market/stock/${encodeURIComponent(b.symbol)}`}>
                {b.name}
              </Link>
            </h3>
            <p className="benchmark-price">
              {price == null
                ? ""
                : b.symbol.startsWith("^")
                  ? price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : formatPrice(price, quote?.currency)}
            </p>
            <div className="benchmark-change">
              <Change value={quote?.changePercent ?? null} />
              {price !== null && price !== undefined && (
                <small>{`${quote?.stale ? "Last known" : "Fetched"} · ${formatFetchedAt(quote?.fetchedAt ?? null)}`}</small>
              )}
            </div>
            {index === 0 &&
              (history && history.bars.length >= 2 ? (
                <CloseChart history={history} />
              ) : null)}
          </article>
        );
      })}
    </section>
  );
}
