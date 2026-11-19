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
  } | null;
  fundamentalsAvailable: boolean;
};

export type SearchResult = {
  symbol: string;
  name?: string;
  exchange?: string;
  type?: string;
};

export type OverviewResponse = {
  indices: MarketQuote[];
  watchlist: {
    id: string;
    symbol: string;
    name: string | null;
    quote: MarketQuote | null;
  }[];
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

export type PortfolioSummary = {
  holdings: ValuedHolding[];
  totals: {
    totalValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
  };
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

const priceFormats = new Map<string, Intl.NumberFormat>();
export function formatPrice(value: number, currency = "INR") {
  let formatter = priceFormats.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    priceFormats.set(currency, formatter);
  }
  return formatter.format(value);
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
  today = new Date().toISOString().slice(0, 10),
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
