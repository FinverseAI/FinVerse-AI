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
 * The screener's universe is the user's holdings + watchlist plus symbols
 * currently returned by the market-data provider; the caller may also pass an
 * explicit symbol list. Quotes and history come from the market
 * service's Postgres cache when fresh, so a repeat screen is mostly
 * cached reads; live fetches are batched 5 at a time so Yahoo is not
 * hammered with 20 concurrent requests.
 */

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
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fetchedAt?: string | null;
  currency?: string;
  stale: boolean;
}

export interface ScreenResponse {
  filters: ScreenFilters;
  universe: string[];
  matches: ScreenedStock[];
  unavailable: string[];
  evaluatedAt: string;
  /**
   * True when the Yahoo active-symbols fetch failed and the universe
   * fell back to holdings + watchlist only — the screen ran over a
   * reduced universe and the UI should say so. Optional in the type
   * so hand-built ScreenResponse literals elsewhere keep compiling;
   * the service always sets it.
   */
  universeDegraded?: boolean;
  /**
   * How many of the returned matches rest on stale price/history.
   * Same optionality note as universeDegraded; the service always
   * sets it.
   */
  staleCount?: number;
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
    // One article can span several stored chunks (one row per chunk),
    // so collapse rows back to one article per url — first row wins,
    // and rows arrive newest first.
    const seenUrls = new Set<string>();
    const articles: NewsArticle[] = [];
    for (const row of rows) {
      const key = row.url ?? row.title ?? row.content;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const publisher =
        typeof metadata.publisher === 'string' ? metadata.publisher : 'Unknown';
      articles.push({
        title: row.title ?? row.content,
        publisher,
        publishedAt: row.published_at
          ? row.published_at.toISOString().slice(0, 10)
          : null,
        url: row.url,
        sentiment: scoreSentiment(row.title ?? row.content),
      });
    }
    // fetchedAt is when the served rows were actually indexed (the
    // newest row's created_at), not "now" — the rows may be hours old.
    const fetchedAt =
      rows.length > 0
        ? new Date(
            Math.max(...rows.map((row) => row.created_at.getTime())),
          ).toISOString()
        : new Date().toISOString();
    return {
      symbol,
      articles,
      overall: aggregateSentiment(articles.map((a) => a.sentiment)),
      available: articles.length > 0 || refreshed,
      reason:
        articles.length === 0
          ? 'No recent news was found for this stock.'
          : null,
      fetchedAt,
    };
  }

  /**
   * The screener universe: holdings + watchlist + provider-reported
   * active Indian equities. When the provider fetch fails the universe
   * silently shrinks to holdings + watchlist — `universeDegraded`
   * reports that, so the caller can warn instead of screening a
   * reduced universe as if it were the whole market.
   */
  async screenerUniverse(
    userId: string,
  ): Promise<{ symbols: string[]; universeDegraded: boolean }> {
    let universeDegraded = false;
    const [active, holdings, watchlist] = await Promise.all([
      this.market.activeIndianSymbols().catch(() => {
        universeDegraded = true;
        return [];
      }),
      this.portfolio.holdings(userId).catch(() => []),
      this.portfolio.watchlist(userId).catch(() => []),
    ]);
    const symbols = new Set<string>(active);
    for (const holding of holdings) symbols.add(holding.symbol);
    for (const item of watchlist) symbols.add(item.symbol);
    return { symbols: [...symbols], universeDegraded };
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
    // An explicit symbol list is the user's own universe — it cannot
    // be degraded by a provider failure. The default universe can.
    let universe: string[];
    let universeDegraded = false;
    if (filters.symbols && filters.symbols.length > 0) {
      universe = [
        ...new Set(filters.symbols.map((symbol) => normalizeSymbol(symbol))),
      ];
    } else {
      const defaultUniverse = await this.screenerUniverse(userId);
      universe = defaultUniverse.symbols;
      universeDegraded = defaultUniverse.universeDegraded;
    }
    const snapshot = await this.snapshot(universe, universeDegraded);
    const matches = snapshot.matches
      .filter((stock) => passesFilters(stock, filters))
      .slice(0, filters.limit ?? 20);
    return {
      ...snapshot,
      filters,
      matches,
      // staleCount counts the matches actually returned, after the
      // filters and limit — that is what the UI warns about.
      staleCount: matches.filter((stock) => stock.stale).length,
    };
  }

  async marketSnapshot(userId: string) {
    const { symbols, universeDegraded } = await this.screenerUniverse(userId);
    return this.snapshot(symbols, universeDegraded);
  }

  private async snapshot(
    universe: string[],
    universeDegraded = false,
  ): Promise<ScreenResponse> {
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
    const matches = candidates.sort((a, b) => {
      const aChange = a.change1moPercent ?? Number.NEGATIVE_INFINITY;
      const bChange = b.change1moPercent ?? Number.NEGATIVE_INFINITY;
      return bChange - aChange || a.symbol.localeCompare(b.symbol);
    });
    return {
      filters: {},
      universe,
      matches,
      unavailable,
      evaluatedAt: new Date().toISOString(),
      universeDegraded,
      staleCount: matches.filter((stock) => stock.stale).length,
    };
  }

  /** One symbol's metrics, or null when neither price nor history loads. */
  private async evaluateSymbol(symbol: string): Promise<ScreenedStock | null> {
    let profile: Awaited<ReturnType<MarketService['profile']>>;
    let history: Awaited<ReturnType<MarketService['history']>> | null;
    try {
      [profile, history] = await Promise.all([
        this.market.profile(symbol),
        this.market.history(symbol, '3mo').catch(() => null),
      ]);
    } catch {
      return null;
    }
    const closes = history?.bars.map((bar) => bar.close) ?? [];
    const rsiValues = closes.length > 1 ? rsi(closes) : [];
    const sma20Values = closes.length > 1 ? sma(closes, 20) : [];
    const sma50Values = closes.length > 1 ? sma(closes, 50) : [];
    const latestRsi = last(rsiValues);
    const latestSma20 = last(sma20Values);
    const latestSma50 = last(sma50Values);
    const latest = closes[closes.length - 1];
    const monthAgo =
      closes.length > 21 ? closes[closes.length - 22] : undefined;
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
      fiftyTwoWeekHigh: fundamentals?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: fundamentals?.fiftyTwoWeekLow ?? null,
      fetchedAt: profile.fetchedAt,
      currency: profile.currency,
      stale: profile.stale || (history?.stale ?? false),
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
    stock.currency &&
    stock.currency !== 'INR' &&
    [
      filters.minPrice,
      filters.maxPrice,
      filters.minMarketCapCr,
      filters.maxMarketCapCr,
    ].some((bound) => bound !== undefined)
  )
    return false;
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
