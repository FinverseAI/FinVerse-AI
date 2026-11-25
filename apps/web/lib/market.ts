/**
 * Shared market types and formatting for the Module 2 UI. These mirror the
 * backend market responses exactly (apps/backend/src/market/) — a price is
 * only ever shown with its source timestamp, and a null price means the
 * market is unavailable, never zero.
 */

export type MarketQuote = {
  symbol: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  sector: string | null;
  fetchedAt: string | null;
  stale: boolean;
};

export type HistoryBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type HistoryResponse = {
  symbol: string;
  range: string;
  bars: HistoryBar[];
  fetchedAt: string | null;
  stale: boolean;
};

export type MarketProfile = MarketQuote & {
  fundamentals: {
    sector: string | null;
    industry: string | null;
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    dividendYield: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    description: string | null;
    // Deeper fundamentals (Yahoo financialData / defaultKeyStatistics).
    // Ratios arrive as fractions (0.168 = 16.8%); the stock page formats
    // them. Null means Yahoo did not report the field, never zero.
    bookValue: number | null;
    priceToBook: number | null;
    returnOnEquity: number | null;
    debtToEquity: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    payoutRatio: number | null;
    beta: number | null;
    sharesOutstanding: number | null;
  } | null;
  fundamentalsAvailable: boolean;
};

export type SearchResult = {
  symbol: string;
  name?: string;
  exchange?: string;
  type?: string;
};

/** An alert that fired on THIS overview load — the in-app notification. */
export type PriceAlert = {
  id: string;
  symbol: string;
  name: string | null;
  alertDirection: "above" | "below";
  alertPrice: number;
  /** The fresh price that crossed the target. */
  price: number;
  currency: string;
  firedAt: string;
};

/** An alert currently fired, as returned by GET /api/market/alerts. */
export type FiredAlert = {
  id: string;
  symbol: string;
  name: string | null;
  alertDirection: "above" | "below" | null;
  alertPrice: number | null;
  // Null when the currency is unknown (B26) — never a guessed ₹.
  currency: string | null;
  firedAt: string | null;
};

export type OverviewResponse = {
  indices: MarketQuote[];
  watchlist: {
    id: string;
    symbol: string;
    name: string | null;
    note: string | null;
    alertDirection: "above" | "below" | null;
    alertPrice: number | null;
    /** When the alert last fired; null when never fired or re-armed. */
    alertFiredAt: string | null;
    quote: MarketQuote | null;
  }[];
  /** Alerts that fired on this load (empty when nothing crossed). */
  alerts: PriceAlert[];
  unavailable: string[];
};

export type Holding = {
  id: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  /** The currency the buy price is entered in (INR by default). */
  currency: string;
};

export type ValuedHolding = Holding & {
  currentPrice: number | null;
  currentValue: number | null;
  investedValue: number;
  gainLoss: number | null;
  gainLossPercent: number | null;
  fetchedAt: string | null;
  stale: boolean;
  priced: boolean;
};

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string | null;
};

export type CurrencyTotals = {
  currency: string;
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
};

export type PortfolioSummary = {
  holdings: ValuedHolding[];
  totals: {
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  };
  /**
   * Per-currency totals, one entry per currency with priced holdings.
   * `totals` is the aggregate across currencies and is only meaningful
   * when every priced holding shares one currency — read this instead
   * whenever holdings span currencies.
   */
  totalsByCurrency?: CurrencyTotals[];
  sectors: { sector: string; value: number; weight: number }[];
  unavailable: string[];
  asOf: string | null;
  stale: boolean;
};

export const historyRanges = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
] as const;

export type HistoryRange = (typeof historyRanges)[number]["value"];

/**
 * Today's date in IST (Asia/Kolkata), as YYYY-MM-DD. Built from IST date
 * parts via Intl — never from `toISOString()`, which is UTC and runs a
 * day behind IST between 00:00 and 05:30.
 */
export function todayIst(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const moneyFormats = new Map<string, Intl.NumberFormat>();
/**
 * The canonical money formatter. Recorded amounts and totals render
 * with 0 decimals by default; pass `decimals = 2` for per-unit prices
 * (see `formatPrice`). All other formatters delegate here so the same
 * figure never renders with different decimals on different surfaces.
 */
export function formatMoney(
  value: number,
  currency: string | null = "INR",
  decimals = 0,
) {
  // B26: an unknown currency renders as a plain number — never a
  // guessed ₹. Callers that know the currency pass it explicitly.
  if (currency == null) {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  const key = `${currency}:${decimals}`;
  let formatter = moneyFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    moneyFormats.set(key, formatter);
  }
  return formatter.format(value);
}

/** Per-unit prices always render with two decimals, in their currency. */
export function formatPrice(value: number, currency: string | null = "INR") {
  return formatMoney(value, currency, 2);
}

const compactFormats = new Map<string, Intl.NumberFormat>();
export function formatCompact(value: number, currency = "INR") {
  let formatter = compactFormats.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    });
    compactFormats.set(currency, formatter);
  }
  return formatter.format(value);
}

export function formatPercent(value: number, signed = true) {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const fetchedAtFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatFetchedAt(iso: string | null) {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : fetchedAtFormat.format(date);
}

/**
 * Dated cash flows for the portfolio's XIRR: every priced holding's buy
 * is an outflow on its buy date, and the holding's current value is an
 * inflow today. Unpriced holdings are excluded — their value is unknown,
 * and guessing would corrupt the rate.
 */
export function portfolioCashFlows(
  holdings: ValuedHolding[],
  today = todayIst(),
) {
  const flows: { amount: number; date: string }[] = [];
  for (const holding of holdings) {
    if (!holding.priced || holding.currentValue === null) continue;
    flows.push({ amount: -holding.investedValue, date: holding.buyDate });
    flows.push({ amount: holding.currentValue, date: today });
  }
  return flows;
}

/** The earliest buy date across priced holdings, for the portfolio CAGR. */
export function earliestBuyDate(holdings: ValuedHolding[]) {
  let earliest: string | null = null;
  for (const holding of holdings) {
    if (!holding.priced) continue;
    if (earliest === null || holding.buyDate < earliest) {
      earliest = holding.buyDate;
    }
  }
  return earliest;
}

/**
 * Per-currency totals from priced holdings, computed from the holdings
 * themselves so mixed-currency portfolios never silently add USD and INR
 * together. One entry per currency with priced holdings, sorted by
 * currency code; empty when nothing is priced.
 */
export function totalsByCurrency(holdings: ValuedHolding[]): CurrencyTotals[] {
  const byCurrency = new Map<string, CurrencyTotals>();
  for (const holding of holdings) {
    if (!holding.priced || holding.currentValue === null) continue;
    const currency = holding.currency ?? "INR";
    const entry = byCurrency.get(currency) ?? {
      currency,
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
    };
    entry.totalValue =
      Math.round((entry.totalValue + holding.currentValue) * 100) / 100;
    entry.totalInvested =
      Math.round((entry.totalInvested + holding.investedValue) * 100) / 100;
    entry.totalGainLoss =
      Math.round((entry.totalGainLoss + (holding.gainLoss ?? 0)) * 100) / 100;
    byCurrency.set(currency, entry);
  }
  for (const entry of byCurrency.values()) {
    entry.totalGainLossPercent =
      entry.totalInvested === 0
        ? 0
        : Math.round((entry.totalGainLoss / entry.totalInvested) * 100 * 100) /
          100;
  }
  return [...byCurrency.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
}
