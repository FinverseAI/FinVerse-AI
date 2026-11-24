/**
 * Price-alert evaluation — pure functions over a watchlist item and its
 * quote. There is no background-job system (the backend runs as a
 * Netlify Function), so alerts are evaluated on the market-overview
 * load, when quotes refresh: see `MarketService.overview`.
 *
 * The firing rule, in one sentence: a crossed alert notifies ONCE per
 * crossing. `alert_fired_at` records the firing; while it is set, the
 * alert stays fired and never re-notifies. It re-arms — cleared back
 * to null — the first time a fresh quote shows the price back on the
 * un-crossed side, so the next crossing fires again.
 *
 * Two honesty rules:
 * - Boundary equality counts as crossed: the UI promises "at or above"
 *   / "at or below", so a price exactly on the target fires.
 * - Only FRESH quotes evaluate. A stale quote is a last-known price,
 *   not a live one: it neither fires nor re-arms an alert.
 */

export type AlertDirection = 'above' | 'below';

/** The watchlist fields an alert decision needs. */
export type AlertTarget = {
  alert_direction: string | null | undefined;
  alert_price: number | string | { toString(): string } | null | undefined;
  alert_fired_at: Date | string | null | undefined;
};

/** The quote fields an alert decision needs. */
export type AlertQuote =
  | {
      price: number | null | undefined;
      stale: boolean;
    }
  | null
  | undefined;

export type AlertDecision = 'fire' | 'rearm' | 'none';

/** Boundary equality counts as crossed ("at or above" / "at or below"). */
export function isAlertCrossed(
  direction: AlertDirection,
  price: number,
  target: number,
): boolean {
  return direction === 'above' ? price >= target : price <= target;
}

/**
 * Decide what a fresh quote means for one watchlist item:
 * - `fire` — crossed, and not already fired (notify once, record it).
 * - `rearm` — back on the un-crossed side after firing (clear it so a
 *   later crossing fires again).
 * - `none` — no alert configured, no usable quote, already fired and
 *   still crossed, or never fired and un-crossed.
 */
export function evaluateAlert(
  item: AlertTarget,
  quote: AlertQuote,
): AlertDecision {
  const direction = item.alert_direction;
  if (direction !== 'above' && direction !== 'below') return 'none';
  const target =
    item.alert_price == null ? NaN : Number(item.alert_price.toString());
  if (!Number.isFinite(target)) return 'none';
  if (!quote || quote.stale || quote.price == null) return 'none';
  const crossed = isAlertCrossed(direction, quote.price, target);
  if (crossed) return item.alert_fired_at ? 'none' : 'fire';
  return item.alert_fired_at ? 'rearm' : 'none';
}
