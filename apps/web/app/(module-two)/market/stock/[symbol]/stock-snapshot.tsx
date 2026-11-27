import type { MarketProfile, HistoryBar } from "../../../../../lib/market";
import {
  formatCompact,
  formatPercent,
  formatPrice,
} from "../../../../../lib/market";
import { PanelHeading } from "../../../../(module-one)/dashboard/ui";

export function StockSnapshot({
  profile,
  bars,
  loading,
  unavailable,
}: {
  profile: MarketProfile | null;
  bars: HistoryBar[];
  loading: boolean;
  unavailable: boolean;
}) {
  const first = bars[0];
  const last = bars[bars.length - 1];
  const periodChange =
    !loading &&
    !unavailable &&
    first &&
    last &&
    bars.length > 1 &&
    first.close > 0
      ? ((last.close - first.close) / first.close) * 100
      : null;
  const fundamentals = profile?.fundamentals;
  const currency = profile?.currency ?? "INR";
  const low = fundamentals?.fiftyTwoWeekLow;
  const high = fundamentals?.fiftyTwoWeekHigh;
  const price = profile?.price;
  const position =
    low != null && high != null && price != null && high > low
      ? Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100))
      : null;
  return (
    <aside className="dash-panel stock-snapshot" aria-label="Stock snapshot">
      <PanelHeading icon="pie" title="At a glance" />
      <div>
        <p className="text-sm text-dash-muted">
          Selected period · close to close
        </p>
        <p
          className={`mt-2 font-mono text-3xl font-medium ${periodChange === null ? "text-dash-muted" : periodChange >= 0 ? "market-positive" : "market-negative"}`}
        >
          {loading
            ? "Loading…"
            : periodChange === null
              ? "—"
              : formatPercent(periodChange)}
        </p>
        {!loading && !unavailable && first && last && (
          <p className="mt-2 text-xs text-dash-muted">
            {first.date} to {last.date}
          </p>
        )}
      </div>
      <dl>
        <div>
          <dt>Previous close</dt>
          <dd>
            {profile?.previousClose != null
              ? formatPrice(profile.previousClose, currency)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Market cap</dt>
          <dd>
            {fundamentals?.marketCap != null
              ? formatCompact(fundamentals.marketCap, currency)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>P/E ratio</dt>
          <dd>
            {fundamentals?.trailingPE != null
              ? fundamentals.trailingPE.toFixed(2)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Dividend yield</dt>
          <dd>
            {fundamentals?.dividendYield != null
              ? formatPercent(fundamentals.dividendYield * 100, false)
              : "—"}
          </dd>
        </div>
      </dl>
      {low != null && high != null && high > low && (
        <div>
          <h3 className="text-sm font-medium">52-week range</h3>
          <div className="stock-range" aria-hidden="true">
            {position !== null && <span style={{ left: `${position}%` }} />}
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span>{formatPrice(low, currency)}</span>
            <span>{formatPrice(high, currency)}</span>
          </div>
          <p className="mt-2 text-xs text-dash-muted">
            Low / high
            {position !== null ? " · marker shows the latest quoted price" : ""}
          </p>
        </div>
      )}
      <p className="text-xs leading-5 text-dash-muted">
        Yahoo Finance · quotes may be delayed. Period change uses closing prices
        in the selected chart range.
      </p>
    </aside>
  );
}
