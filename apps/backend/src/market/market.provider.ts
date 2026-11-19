import YahooFinance from 'yahoo-finance2';

/**
 * Market data behind a narrow interface so the services (and their tests)
 * never touch the Yahoo client directly. Every price the provider returns is
 * a plain number; the services decide how it is cached and presented.
 */
export interface MarketQuoteData {
  symbol: string;
  name?: string;
  price: number;
  previousClose?: number;
  currency: string;
  sector?: string;
}

export interface MarketHistoryBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketSearchResult {
  symbol: string;
  name?: string;
  exchange?: string;
  type?: string;
}

export interface MarketProfileData {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  description?: string;
  currency: string;
}

/**
 * One news item from Yahoo search. Search news carries a title,
 * publisher, publish time and link but no article body — the RAG layer
 * indexes exactly that metadata and never pretends to have read the
 * full text.
 */
export interface MarketNewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: Date;
  relatedTickers?: string[];
}

export interface MarketDataProvider {
  quote(symbol: string): Promise<MarketQuoteData>;
  history(symbol: string, from: Date, to: Date): Promise<MarketHistoryBar[]>;
  search(query: string): Promise<MarketSearchResult[]>;
  profile(symbol: string): Promise<MarketProfileData>;
  news(symbol: string): Promise<MarketNewsItem[]>;
}

export const MARKET_DATA_PROVIDER = 'MARKET_DATA_PROVIDER';

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Yahoo Finance implementation (yahoo-finance2, free, no API key).
 * Throws on any provider failure; callers decide how to fall back
 * (stale cache, partial results, or a 503) and never invent a price.
 */
export class YahooFinanceProvider implements MarketDataProvider {
  private readonly client = new YahooFinance();

  async quote(symbol: string): Promise<MarketQuoteData> {
    const result = await this.client.quote(symbol);
    const price = finite(result.regularMarketPrice);
    if (price === undefined || price <= 0) {
      throw new Error(`No usable price returned for ${symbol}.`);
    }
    return {
      symbol: result.symbol ?? symbol,
      name: text(result.longName) ?? text(result.shortName),
      price,
      previousClose: finite(result.regularMarketPreviousClose),
      currency: text(result.currency) ?? 'INR',
    };
  }

  async history(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<MarketHistoryBar[]> {
    const rows = await this.client.historical(symbol, {
      period1: from,
      period2: to,
    });
    const bars: MarketHistoryBar[] = [];
    for (const row of rows) {
      // Historical rows include dividend/split events, which carry no OHLC.
      const open = finite(row.open);
      const high = finite(row.high);
      const low = finite(row.low);
      const close = finite(row.close);
      if (
        !(row.date instanceof Date) ||
        open === undefined ||
        high === undefined ||
        low === undefined ||
        close === undefined
      ) {
        continue;
      }
      bars.push({
        date: row.date,
        open,
        high,
        low,
        close,
        volume: finite(row.volume),
      });
    }
    bars.sort((a, b) => a.date.getTime() - b.date.getTime());
    return bars;
  }

  async search(query: string): Promise<MarketSearchResult[]> {
    const result = await this.client.search(query);
    // Non-Yahoo results (e.g. web links) carry no symbol; only Yahoo
    // quotes are tradeable instruments, so only those are returned.
    return result.quotes
      .filter(
        (item): item is typeof item & { symbol: string } =>
          typeof (item as { symbol?: unknown }).symbol === 'string',
      )
      .slice(0, 10)
      .map((item) => ({
        symbol: item.symbol,
        name: text(item.shortname) ?? text(item.longname),
        exchange: text(item.exchDisp),
        type: text(item.quoteType),
      }));
  }

  async news(symbol: string): Promise<MarketNewsItem[]> {
    const result = await this.client.search(symbol, { newsCount: 10 });
    const items: MarketNewsItem[] = [];
    // The client validates the shape, but news items arrive from an
    // external API — each one is still checked before it is trusted.
    for (const raw of result.news as unknown[]) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const title = text(item.title);
      const link = text(item.link);
      const publishedAt = item.providerPublishTime;
      if (!title || !link || !(publishedAt instanceof Date)) continue;
      items.push({
        title,
        publisher: text(item.publisher) ?? 'Unknown',
        link,
        publishedAt,
        relatedTickers: Array.isArray(item.relatedTickers)
          ? item.relatedTickers.filter(
              (ticker): ticker is string => typeof ticker === 'string',
            )
          : undefined,
      });
    }
    return items;
  }

  async profile(symbol: string): Promise<MarketProfileData> {
    const result = await this.client.quoteSummary(symbol, {
      modules: ['assetProfile', 'summaryDetail', 'price'],
    });
    const assetProfile = result.assetProfile;
    const summaryDetail = result.summaryDetail;
    const price = result.price;
    return {
      symbol,
      name: text(price?.longName) ?? text(price?.shortName),
      sector: text(assetProfile?.sector),
      industry: text(assetProfile?.industry),
      marketCap: finite(summaryDetail?.marketCap),
      trailingPE: finite(summaryDetail?.trailingPE),
      forwardPE: finite(summaryDetail?.forwardPE),
      dividendYield: finite(summaryDetail?.dividendYield),
      fiftyTwoWeekHigh: finite(summaryDetail?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: finite(summaryDetail?.fiftyTwoWeekLow),
      description: text(assetProfile?.longBusinessSummary),
      currency: text(price?.currency) ?? 'INR',
    };
  }
}
