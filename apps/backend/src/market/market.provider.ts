import { Injectable, Optional } from '@nestjs/common';
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
  /**
   * Absent when Yahoo omits it for a non-Indian listing: a missing
   * currency is never defaulted to INR outside India (B21) — callers
   * must treat such a profile as unpriceable in that currency.
   */
  currency?: string;
  // Deeper fundamentals (Filings & Reports, Nov 2026): every field is
  // verified to exist in yahoo-finance2's quoteSummary types — book
  // value, price-to-book, beta and shares outstanding come from
  // defaultKeyStatistics; ROE, debt-to-equity and growth from
  // financialData; payout ratio from summaryDetail. Absent values stay
  // undefined and surface as null, never as zero.
  bookValue?: number;
  priceToBook?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  payoutRatio?: number;
  beta?: number;
  sharesOutstanding?: number;
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
  activeIndianSymbols(): Promise<string[]>;
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
 * The client is injectable for tests; in production Nest passes nothing
 * (@Optional) and the default client is built. The library's default
 * export is a const, not a class, so the instance type is spelled out.
 *
 * Timeouts (B20): every Yahoo call carries an AbortSignal that fails
 * the request after YAHOO_TIMEOUT_MS. The installed yahoo-finance2's
 * `queue.timeout` client option is a dead letter — the Queue never
 * reads it — so the timeout is passed per call via
 * `fetchOptions.signal`, which the library forwards to fetch.
 */
export const YAHOO_TIMEOUT_MS = 10_000;

/** Per-call module options carrying the Yahoo timeout signal. */
function timeoutOptions() {
  return { fetchOptions: { signal: AbortSignal.timeout(YAHOO_TIMEOUT_MS) } };
}

/**
 * A known Indian listing: an NSE (`.NS`) or BSE (`.BO`) symbol. Only
 * these default a missing Yahoo currency to INR (B21) — a foreign
 * quote that omits its currency is unpriceable, not ₹.
 */
function isIndianListing(symbol: string): boolean {
  return /\.(NS|BO)$/i.test(symbol);
}

@Injectable()
export class YahooFinanceProvider implements MarketDataProvider {
  private readonly client: InstanceType<typeof YahooFinance>;

  constructor(@Optional() client?: InstanceType<typeof YahooFinance>) {
    this.client = client ?? new YahooFinance();
  }

  async activeIndianSymbols(): Promise<string[]> {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_in&count=15',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      finance?: {
        result?: { quotes?: { symbol?: string; quoteType?: string }[] }[];
      };
    };
    const quotes = data.finance?.result?.[0]?.quotes;
    if (!Array.isArray(quotes)) return [];
    return quotes.flatMap(({ symbol, quoteType }) =>
      quoteType === 'EQUITY' &&
      typeof symbol === 'string' &&
      /^[A-Z0-9&.-]{1,17}\.(NS|BO)$/.test(symbol)
        ? [symbol]
        : [],
    );
  }

  async quote(symbol: string): Promise<MarketQuoteData> {
    const result = await this.client.quote(symbol, undefined, timeoutOptions());
    const price = finite(result.regularMarketPrice);
    if (price === undefined || price <= 0) {
      throw new Error(`No usable price returned for ${symbol}.`);
    }
    const currency = text(result.currency);
    if (currency === undefined && !isIndianListing(symbol)) {
      // A foreign quote with no currency cannot be valued — it must
      // not silently become ₹ (B21). Callers fall back to the stale
      // cache or report the symbol unavailable.
      throw new Error(`No currency returned for ${symbol}.`);
    }
    return {
      symbol: result.symbol ?? symbol,
      name: text(result.longName) ?? text(result.shortName),
      price,
      previousClose: finite(result.regularMarketPreviousClose),
      currency: currency ?? 'INR',
    };
  }

  async history(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<MarketHistoryBar[]> {
    const { quotes: rows } = await this.client.chart(
      symbol,
      {
        interval: '1d',
        period1: from,
        period2: to,
      },
      timeoutOptions(),
    );
    const bars: MarketHistoryBar[] = [];
    for (const row of rows) {
      // A suspended or missing session can have null OHLC values.
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
    const result = await this.client.search(query, undefined, timeoutOptions());
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
    const result = await this.client.search(
      symbol,
      { newsCount: 10 },
      timeoutOptions(),
    );
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
    const result = await this.client.quoteSummary(
      symbol,
      {
        modules: [
          'assetProfile',
          'summaryDetail',
          'price',
          'financialData',
          'defaultKeyStatistics',
        ],
      },
      timeoutOptions(),
    );
    const assetProfile = result.assetProfile;
    const summaryDetail = result.summaryDetail;
    const price = result.price;
    const financialData = result.financialData;
    const keyStatistics = result.defaultKeyStatistics;
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
      // Only an Indian listing defaults a missing currency to INR; a
      // foreign profile without one reports no currency (B21).
      currency:
        text(price?.currency) ?? (isIndianListing(symbol) ? 'INR' : undefined),
      bookValue: finite(keyStatistics?.bookValue),
      priceToBook: finite(keyStatistics?.priceToBook),
      returnOnEquity: finite(financialData?.returnOnEquity),
      debtToEquity: finite(financialData?.debtToEquity),
      revenueGrowth: finite(financialData?.revenueGrowth),
      earningsGrowth: finite(financialData?.earningsGrowth),
      payoutRatio: finite(summaryDetail?.payoutRatio),
      beta: finite(keyStatistics?.beta),
      sharesOutstanding: finite(keyStatistics?.sharesOutstanding),
    };
  }
}
