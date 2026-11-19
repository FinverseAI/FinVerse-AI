/**
 * Shared types and pure helpers for the Phase 2 RAG features — News &
 * Sentiment and the Smart Stock Screener. The backend answers in these
 * shapes (apps/backend/src/rag/rag.service.ts); the client validates with
 * isNewsResponse / isScreenResponse before rendering, so a backend drift
 * fails loudly instead of rendering half a response.
 */

export type SentimentLabel = "positive" | "negative" | "neutral";

export interface SentimentResult {
  score: number;
  label: SentimentLabel;
  matchedPositive: string[];
  matchedNegative: string[];
}

export interface SentimentAggregate {
  score: number;
  label: SentimentLabel;
  positive: number;
  negative: number;
  neutral: number;
}

export interface NewsArticle {
  title: string;
  publisher: string;
  publishedAt: string;
  url: string;
  sentiment: SentimentResult;
}

export interface NewsResponse {
  symbol: string;
  articles: NewsArticle[];
  overall: SentimentAggregate;
  available: boolean;
  reason: string | null;
  fetchedAt: string;
}

export type ScreenerTrend =
  | "above-sma20"
  | "below-sma20"
  | "above-sma50"
  | "below-sma50"
  | "golden-cross"
  | "death-cross";

export const TREND_OPTIONS: Array<{ value: ScreenerTrend; label: string }> = [
  { value: "above-sma20", label: "Price above 20-day average" },
  { value: "below-sma20", label: "Price below 20-day average" },
  { value: "above-sma50", label: "Price above 50-day average" },
  { value: "below-sma50", label: "Price below 50-day average" },
  { value: "golden-cross", label: "Golden cross (20-day above 50-day)" },
  { value: "death-cross", label: "Death cross (20-day below 50-day)" },
];

export interface ScreenFilters {
  symbols?: string[];
  minPrice?: number;
  maxPrice?: number;
  minMarketCapCrore?: number;
  maxMarketCapCrore?: number;
  minRsi?: number;
  maxRsi?: number;
  minPe?: number;
  maxPe?: number;
  minChange1mo?: number;
  maxChange1mo?: number;
  trend?: ScreenerTrend;
  sector?: string;
  limit?: number;
}

export interface ScreenedStock {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  sector: string | null;
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  change1moPercent: number | null;
  stale: boolean;
}

export interface ScreenResponse {
  filters: ScreenFilters;
  universe: string[];
  matches: ScreenedStock[];
  unavailable: string[];
  evaluatedAt: string;
}

/** The screener form keeps every field as a string; this builds the payload. */
export interface ScreenerFormState {
  minPrice: string;
  maxPrice: string;
  minMarketCapCrore: string;
  maxMarketCapCrore: string;
  minRsi: string;
  maxRsi: string;
  minPe: string;
  maxPe: string;
  minChange1mo: string;
  maxChange1mo: string;
  trend: string;
  sector: string;
  limit: string;
}

export const EMPTY_SCREENER_FORM: ScreenerFormState = {
  minPrice: "",
  maxPrice: "",
  minMarketCapCrore: "",
  maxMarketCapCrore: "",
  minRsi: "",
  maxRsi: "",
  minPe: "",
  maxPe: "",
  minChange1mo: "",
  maxChange1mo: "",
  trend: "",
  sector: "",
  limit: "",
};

/** Blank or non-numeric input is omitted from the filters, never sent as 0. */
export function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildScreenFilters(form: ScreenerFormState): ScreenFilters {
  const filters: ScreenFilters = {};
  // Only the numeric filter keys: symbols/trend/sector are handled below.
  type NumericFilterKey =
    | "minPrice"
    | "maxPrice"
    | "minMarketCapCrore"
    | "maxMarketCapCrore"
    | "minRsi"
    | "maxRsi"
    | "minPe"
    | "maxPe"
    | "minChange1mo"
    | "maxChange1mo"
    | "limit";
  const numeric: Array<[NumericFilterKey, string]> = [
    ["minPrice", form.minPrice],
    ["maxPrice", form.maxPrice],
    ["minMarketCapCrore", form.minMarketCapCrore],
    ["maxMarketCapCrore", form.maxMarketCapCrore],
    ["minRsi", form.minRsi],
    ["maxRsi", form.maxRsi],
    ["minPe", form.minPe],
    ["maxPe", form.maxPe],
    ["minChange1mo", form.minChange1mo],
    ["maxChange1mo", form.maxChange1mo],
    ["limit", form.limit],
  ];
  for (const [key, raw] of numeric) {
    const value = parseOptionalNumber(raw);
    if (value !== undefined) filters[key] = value;
  }
  const trend = TREND_OPTIONS.find((option) => option.value === form.trend);
  if (trend) filters.trend = trend.value;
  const sector = form.sector.trim();
  if (sector !== "") filters.sector = sector;
  return filters;
}

const newsDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "2026-11-18T10:00:00Z" → "18 Nov 2026"; an unparseable value passes through. */
export function formatNewsDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : newsDate.format(parsed);
}

const croreFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** A market cap in rupees, shown in crore (₹17,60,000 crore). */
export function formatMarketCapCrore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `₹${croreFormat.format(value / 10_000_000)} crore`;
}

/** The text colour for a sentiment label. */
export function sentimentTextClass(label: SentimentLabel): string {
  if (label === "positive") return "text-dash-accent";
  if (label === "negative") return "text-dash-red";
  return "text-dash-muted";
}

/** "Positive · 2 of 5 articles" — the one-line overall-sentiment summary. */
export function formatSentimentSummary(overall: SentimentAggregate): string {
  const total = overall.positive + overall.negative + overall.neutral;
  const label = overall.label.charAt(0).toUpperCase() + overall.label.slice(1);
  if (total === 0) return "No articles to score yet.";
  const share =
    overall.label === "positive"
      ? overall.positive
      : overall.label === "negative"
        ? overall.negative
        : overall.neutral;
  return `${label} · ${share} of ${total} article${total === 1 ? "" : "s"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSentimentLabel(value: unknown): value is SentimentLabel {
  return value === "positive" || value === "negative" || value === "neutral";
}

function isSentimentResult(value: unknown): value is SentimentResult {
  if (!isRecord(value)) return false;
  if (typeof value.score !== "number") return false;
  if (!isSentimentLabel(value.label)) return false;
  if (!Array.isArray(value.matchedPositive)) return false;
  if (!Array.isArray(value.matchedNegative)) return false;
  return true;
}

export function isNewsResponse(value: unknown): value is NewsResponse {
  if (!isRecord(value)) return false;
  if (typeof value.symbol !== "string") return false;
  if (!Array.isArray(value.articles)) return false;
  if (!isRecord(value.overall)) return false;
  if (typeof value.overall.score !== "number") return false;
  if (!isSentimentLabel(value.overall.label)) return false;
  if (typeof value.overall.positive !== "number") return false;
  if (typeof value.overall.negative !== "number") return false;
  if (typeof value.overall.neutral !== "number") return false;
  if (typeof value.available !== "boolean") return false;
  if (typeof value.reason !== "string" && value.reason !== null) return false;
  if (typeof value.fetchedAt !== "string") return false;
  for (const article of value.articles) {
    if (!isRecord(article)) return false;
    if (typeof article.title !== "string") return false;
    if (typeof article.publisher !== "string") return false;
    if (typeof article.publishedAt !== "string") return false;
    if (typeof article.url !== "string") return false;
    if (!isSentimentResult(article.sentiment)) return false;
  }
  return true;
}

export function isScreenResponse(value: unknown): value is ScreenResponse {
  if (!isRecord(value)) return false;
  if (!isRecord(value.filters)) return false;
  if (!Array.isArray(value.universe)) return false;
  if (!Array.isArray(value.matches)) return false;
  if (!Array.isArray(value.unavailable)) return false;
  if (typeof value.evaluatedAt !== "string") return false;
  for (const match of value.matches) {
    if (!isRecord(match)) return false;
    if (typeof match.symbol !== "string") return false;
    if (typeof match.name !== "string") return false;
    if (match.price !== null && typeof match.price !== "number") return false;
    if (match.changePercent !== null && typeof match.changePercent !== "number")
      return false;
    if (match.marketCap !== null && typeof match.marketCap !== "number")
      return false;
    if (match.trailingPE !== null && typeof match.trailingPE !== "number")
      return false;
    if (match.sector !== null && typeof match.sector !== "string") return false;
    if (match.rsi14 !== null && typeof match.rsi14 !== "number") return false;
    if (match.sma20 !== null && typeof match.sma20 !== "number") return false;
    if (match.sma50 !== null && typeof match.sma50 !== "number") return false;
    if (
      match.change1moPercent !== null &&
      typeof match.change1moPercent !== "number"
    )
      return false;
    if (typeof match.stale !== "boolean") return false;
  }
  return true;
}
