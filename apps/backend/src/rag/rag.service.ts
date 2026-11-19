import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rsi, sma } from '../ai/indicators';
import { MarketService } from '../market/market.service';
import { normalizeSymbol } from '../market/market.validation';
import { PortfolioService } from '../market/portfolio.service';
import { resolveRagConfig, type RagConfig } from './rag.config';
import { RagIngestService } from './rag.ingest';
import { RagRepository } from './rag.repository';
import {
  aggregateSentiment,
  scoreSentiment,
  type SentimentAggregate,
  type SentimentResult,
} from './rag.sentiment';
import { ScreenFiltersSchema, type ScreenFilters } from './rag.validation';

/**
 * The deterministic RAG features: News & Sentiment and the Smart Stock
 * Screener. Both are pure computation over the market layer plus the
 * vector store — no model call happens here. The LLM narratives for
 * these features live in the AI service (commit 6), which reads the
 * same data.
 *
 * The screener's universe is the user's holdings + watchlist plus a
 * curated list of liquid NIFTY names; the caller may also pass an
 * explicit symbol list. Quotes and history come from the market
 * service's Postgres cache when fresh, so a repeat screen is mostly
 * cached reads; live fetches are batched 5 at a time so Yahoo is not
 * hammered with 20 concurrent requests.
 */

/** Liquid NIFTY names screened when the caller gives no universe. */
export const DEFAULT_SCREENER_UNIVERSE = [
  'RELIANCE.NS',
  'HDFCBANK.NS',
  'ICICIBANK.NS',
  'INFY.NS',
  'TCS.NS',
  'SBIN.NS',
  'ITC.NS',
  'HINDUNILVR.NS',
  'LT.NS',
  'BHARTIARTL.NS',
  'KOTAKBANK.NS',
  'AXISBANK.NS',
  'MARUTI.NS',
  'TITAN.NS',
  'SUNPHARMA.NS',
] as const;

const SCREENER_BATCH_SIZE = 5;
const NEWS_LIST_LIMIT = 10;
const CRORE = 10_000_000;

export interface NewsArticle {
  title: string;
  publisher: string;
  publishedAt: string | null;
  url: string | null;
  sentiment: SentimentResult;
}

export interface NewsResponse {
  symbol: string;
  articles: NewsArticle[];
  overall: SentimentAggregate;
  /** False when neither the store nor a fresh fetch had any news. */
  available: boolean;
  reason: string | null;
  fetchedAt: string;
}

export interface ScreenedStock {
  symbol: string;
  name: string | null;
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function last<T>(values: (T | null)[]): T | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null && values[i] !== undefined) return values[i];
  }
  return null;
}

async function mapInBatches<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn));
    results.push(...batch);
  }
  return results;
}

@Injectable()
export class RagService {
  private readonly config: RagConfig;

  constructor(
    configService: ConfigService,
    private readonly repository: RagRepository,
    private readonly ingest: RagIngestService,
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
  ) {
    this.config = resolveRagConfig((key) => configService.get<string>(key));
  }

  /**
   * News + sentiment for one symbol, refreshing the index if stale.
   * News is public market content, so no user scoping applies here.
   */
  async newsForSymbol(symbolInput: string): Promise<NewsResponse> {
    const symbol = normalizeSymbol(symbolInput);
    const freshness = await this.repository.newsFreshness(symbol);
    const stale =
      freshness.count === 0 ||
      freshness.newestAt === null ||
      Date.now() - freshness.newestAt.getTime() > this.config.newsTtlMs;
    let refreshed = false;
    if (stale) {
      const result = await this.ingest.indexNews(symbol);
      refreshed = result.available;
    }
    const rows = await this.repository.listRecentNews(symbol, NEWS_LIST_LIMIT);
    const articles: NewsArticle[] = rows.map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const publisher =
        typeof metadata.publisher === 'string' ? metadata.publisher : 'Unknown';
      return {
        title: row.title ?? row.content,
        publisher,
        publishedAt: row.published_at
          ? row.published_at.toISOString().slice(0, 10)
          : null,
        url: row.url,
        sentiment: scoreSentiment(row.title ?? row.content),
      };
    });
    return {
      symbol,
      articles,
      overall: aggregateSentiment(articles.map((a) => a.sentiment)),
      available: articles.length > 0 || refreshed,
      reason:
        articles.length === 0
          ? 'No recent news was found for this stock.'
          : null,
      fetchedAt: new Date().toISOString(),
    };
  }

  /** The screener universe: holdings + watchlist + the curated list. */
  async screenerUniverse(userId: string): Promise<string[]> {
    const [holdings, watchlist] = await Promise.all([
      this.portfolio.holdings(userId).catch(() => []),
      this.portfolio.watchlist(userId).catch(() => []),
    ]);
    const symbols = new Set<string>(DEFAULT_SCREENER_UNIVERSE);
    for (const holding of holdings) symbols.add(holding.symbol);
    for (const item of watchlist) symbols.add(item.symbol);
    return [...symbols];
  }

  /** Deterministic screen over the universe. Never fails outright. */
  async screen(userId: string, input: unknown): Promise<ScreenResponse> {
    const parsed = ScreenFiltersSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new BadRequestException(
        first?.message ?? 'The screener filters were invalid.',
      );
    }
    const filters = parsed.data;
    const universe =
      filters.symbols && filters.symbols.length > 0
        ? [...new Set(filters.symbols.map((symbol) => normalizeSymbol(symbol)))]
        : await this.screenerUniverse(userId);
    const evaluated = await mapInBatches(
      universe,
      SCREENER_BATCH_SIZE,
      (symbol) => this.evaluateSymbol(symbol),
    );
    const unavailable: string[] = [];
    const candidates: ScreenedStock[] = [];
    // mapInBatches preserves order, so a null at index i is universe[i].
    evaluated.forEach((result, index) => {
      if (result === null) unavailable.push(universe[index]);
      else candidates.push(result);
    });
    const matches = candidates
      .filter((stock) => passesFilters(stock, filters))
      .sort((a, b) => {
        const aChange = a.change1moPercent ?? Number.NEGATIVE_INFINITY;
        const bChange = b.change1moPercent ?? Number.NEGATIVE_INFINITY;
        return bChange - aChange || a.symbol.localeCompare(b.symbol);
      })
      .slice(0, filters.limit ?? 20);
    return {
      filters,
      universe,
      matches,
      unavailable,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /** One symbol's metrics, or null when neither price nor history loads. */
  private async evaluateSymbol(symbol: string): Promise<ScreenedStock | null> {
    let profile: Awaited<ReturnType<MarketService['profile']>>;
    let history: Awaited<ReturnType<MarketService['history']>>;
    try {
      [profile, history] = await Promise.all([
        this.market.profile(symbol),
        this.market.history(symbol, '3mo'),
      ]);
    } catch {
      return null;
    }
    const closes = history.bars.map((bar) => bar.close);
    const rsiValues = closes.length > 1 ? rsi(closes) : [];
    const sma20Values = closes.length > 1 ? sma(closes, 20) : [];
    const sma50Values = closes.length > 1 ? sma(closes, 50) : [];
    const latestRsi = last(rsiValues);
    const latestSma20 = last(sma20Values);
    const latestSma50 = last(sma50Values);
    const latest = closes[closes.length - 1];
    const monthAgo =
      closes.length > 21 ? closes[closes.length - 22] : closes[0];
    const fundamentals = profile.fundamentals;
    return {
      symbol,
      name: profile.name ?? null,
      price: profile.price,
      changePercent: profile.changePercent,
      marketCap: fundamentals?.marketCap ?? null,
      trailingPE: fundamentals?.trailingPE ?? null,
      sector: fundamentals?.sector ?? profile.sector ?? null,
      rsi14: latestRsi === null ? null : round2(latestRsi),
      sma20: latestSma20 === null ? null : round2(latestSma20),
      sma50: latestSma50 === null ? null : round2(latestSma50),
      change1moPercent:
        monthAgo !== undefined && latest !== undefined && monthAgo !== 0
          ? round2(((latest - monthAgo) / monthAgo) * 100)
          : null,
      stale: profile.stale || history.stale,
    };
  }
}

/**
 * Every filter is a hard gate. A null metric cannot satisfy a filter
 * that constrains it, so the symbol is excluded — the screen never
 * pretends a missing number passed.
 */
function passesFilters(stock: ScreenedStock, filters: ScreenFilters): boolean {
  const { price, marketCap, trailingPE, rsi14, change1moPercent } = stock;
  if (
    filters.minPrice !== undefined &&
    (price === null || price < filters.minPrice)
  )
    return false;
  if (
    filters.maxPrice !== undefined &&
    (price === null || price > filters.maxPrice)
  )
    return false;
  if (
    filters.minMarketCapCr !== undefined &&
    (marketCap === null || marketCap < filters.minMarketCapCr * CRORE)
  )
    return false;
  if (
    filters.maxMarketCapCr !== undefined &&
    (marketCap === null || marketCap > filters.maxMarketCapCr * CRORE)
  )
    return false;
  if (
    filters.minRsi !== undefined &&
    (rsi14 === null || rsi14 < filters.minRsi)
  )
    return false;
  if (
    filters.maxRsi !== undefined &&
    (rsi14 === null || rsi14 > filters.maxRsi)
  )
    return false;
  if (
    filters.minPe !== undefined &&
    (trailingPE === null || trailingPE < filters.minPe)
  )
    return false;
  if (
    filters.maxPe !== undefined &&
    (trailingPE === null || trailingPE > filters.maxPe)
  )
    return false;
  if (
    filters.minChange1mo !== undefined &&
    (change1moPercent === null || change1moPercent < filters.minChange1mo)
  )
    return false;
  if (
    filters.maxChange1mo !== undefined &&
    (change1moPercent === null || change1moPercent > filters.maxChange1mo)
  )
    return false;
  if (
    filters.sector !== undefined &&
    (stock.sector === null ||
      stock.sector.toLowerCase() !== filters.sector.toLowerCase())
  )
    return false;
  if (filters.trend !== undefined) {
    const { sma20, sma50 } = stock;
    switch (filters.trend) {
      case 'above-sma20':
        if (price === null || sma20 === null || price <= sma20) return false;
        break;
      case 'below-sma20':
        if (price === null || sma20 === null || price >= sma20) return false;
        break;
      case 'above-sma50':
        if (price === null || sma50 === null || price <= sma50) return false;
        break;
      case 'below-sma50':
        if (price === null || sma50 === null || price >= sma50) return false;
        break;
      case 'golden-cross':
        if (sma20 === null || sma50 === null || sma20 <= sma50) return false;
        break;
      case 'death-cross':
        if (sma20 === null || sma50 === null || sma20 >= sma50) return false;
        break;
    }
  }
  return true;
}
