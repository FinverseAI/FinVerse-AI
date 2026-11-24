import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { MarketHistory, MarketQuote, WatchlistItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  evaluateAlert,
  type AlertDecision,
  type AlertDirection,
} from './market.alerts';
import {
  MARKET_DATA_PROVIDER,
  type MarketDataProvider,
  type MarketQuoteData,
} from './market.provider';
import {
  normalizeSymbol,
  rangeDays,
  validateRange,
  validateSearchQuery,
  type HistoryRange,
} from './market.validation';

/** Quotes are refetched when the cached row is older than this. */
export const QUOTE_TTL_MS = 15 * 60 * 1000;
/** History is refetched when the newest cached bar was fetched longer ago. */
export const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

const indexNames: Record<string, string> = {
  '^NSEI': 'NIFTY 50',
  '^BSESN': 'SENSEX',
  '^NSEBANK': 'NIFTY Bank',
  'GC=F': 'Gold futures',
  'SI=F': 'Silver futures',
};
export const overviewIndices = Object.keys(indexNames);

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function quoteResponse(row: MarketQuote, stale: boolean) {
  const price = Number(row.price);
  const previousClose =
    row.previous_close === null ? null : Number(row.previous_close);
  const change = previousClose === null ? null : round2(price - previousClose);
  const changePercent =
    previousClose === null || previousClose === 0
      ? null
      : round2(((price - previousClose) / previousClose) * 100);
  return {
    symbol: row.symbol,
    name: row.name,
    price,
    previousClose,
    change,
    changePercent,
    currency: row.currency,
    sector: row.sector,
    fetchedAt: row.fetched_at.toISOString(),
    stale,
  };
}

function historyResponse(
  symbol: string,
  range: HistoryRange,
  bars: MarketHistory[],
  stale: boolean,
) {
  const fetchedAt = bars.reduce(
    (latest, bar) =>
      bar.fetched_at.getTime() > latest ? bar.fetched_at.getTime() : latest,
    0,
  );
  return {
    symbol,
    range,
    bars: bars.map((bar) => ({
      date: bar.date.toISOString().slice(0, 10),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: bar.volume === null ? null : Number(bar.volume),
    })),
    fetchedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
    stale,
  };
}

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
  ) {}

  private async cacheQuote(data: MarketQuoteData) {
    return this.prisma.marketQuote.upsert({
      where: { symbol: data.symbol },
      update: {
        name: data.name ?? null,
        price: data.price.toFixed(4),
        previous_close:
          data.previousClose === undefined
            ? null
            : data.previousClose.toFixed(4),
        currency: data.currency,
        sector: data.sector ?? null,
        fetched_at: new Date(),
      },
      create: {
        symbol: data.symbol,
        name: data.name ?? null,
        price: data.price.toFixed(4),
        previous_close:
          data.previousClose === undefined
            ? null
            : data.previousClose.toFixed(4),
        currency: data.currency,
        sector: data.sector ?? null,
        fetched_at: new Date(),
      },
    });
  }

  /**
   * One quote, served from the cache when fresh. When the provider fails,
   * the last-known price is returned marked stale; a price is never
   * invented, and a symbol with no cached price at all reports 503.
   */
  async quote(symbolInput: string) {
    const symbol = normalizeSymbol(symbolInput);
    const cached = await this.prisma.marketQuote.findUnique({
      where: { symbol },
    });
    if (cached && Date.now() - cached.fetched_at.getTime() < QUOTE_TTL_MS) {
      return quoteResponse(cached, false);
    }
    try {
      return quoteResponse(
        await this.cacheQuote(await this.provider.quote(symbol)),
        false,
      );
    } catch {
      if (cached) return quoteResponse(cached, true);
      throw new ServiceUnavailableException(
        'Market data is unavailable right now. Please try again.',
      );
    }
  }

  /**
   * Several quotes at once. Symbols that fail (no cache and the provider
   * down) are listed under `unavailable` instead of failing the whole call.
   */
  async quotes(symbolInputs: string[]) {
    const symbols = [...new Set(symbolInputs.map(normalizeSymbol))];
    const settled = await Promise.allSettled(
      symbols.map((symbol) => this.quote(symbol)),
    );
    const quotes: ReturnType<typeof quoteResponse>[] = [];
    const unavailable: string[] = [];
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') quotes.push(result.value);
      else unavailable.push(symbols[index]);
    });
    return { quotes, unavailable };
  }

  async search(queryInput: unknown) {
    const query = validateSearchQuery(queryInput);
    try {
      return await this.provider.search(query);
    } catch {
      throw new ServiceUnavailableException(
        'Market search is unavailable right now. Please try again.',
      );
    }
  }

  /**
   * Daily bars for a range, served from the cache when it covers the range
   * and was refreshed within a day. Bars are immutable once a trading day
   * closes, so cached rows are kept and only the missing days are fetched;
   * today's still-moving bar is always refetched.
   */
  async history(symbolInput: string, rangeInput: unknown) {
    const symbol = normalizeSymbol(symbolInput);
    const range = validateRange(rangeInput);
    const from = new Date(Date.now() - rangeDays[range] * 24 * 60 * 60 * 1000);
    from.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cached = await this.prisma.marketHistory.findMany({
      where: { symbol, date: { gte: from } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
    const newestFetchedAt = cached.reduce(
      (latest, bar) =>
        bar.fetched_at.getTime() > latest ? bar.fetched_at.getTime() : latest,
      0,
    );
    const earliestDate = cached.length
      ? cached[0].date.getTime()
      : Number.POSITIVE_INFINITY;
    const needsRefresh =
      cached.length === 0 ||
      Date.now() - newestFetchedAt > HISTORY_TTL_MS ||
      earliestDate > from.getTime();
    let stale = false;
    let refreshFailed = false;
    if (needsRefresh) {
      try {
        const bars = await this.provider.history(symbol, from, new Date());
        // Today's bar is still moving: drop it so the fresh value replaces
        // the earlier fetch instead of being skipped as a duplicate.
        await this.prisma.marketHistory.deleteMany({
          where: { symbol, date: { gte: today } },
        });
        if (bars.length > 0) {
          await this.prisma.marketHistory.createMany({
            data: bars.map((bar) => ({
              symbol,
              date: bar.date,
              open: bar.open.toFixed(4),
              high: bar.high.toFixed(4),
              low: bar.low.toFixed(4),
              close: bar.close.toFixed(4),
              volume:
                bar.volume === undefined
                  ? null
                  : BigInt(Math.round(bar.volume)),
              fetched_at: new Date(),
            })),
            skipDuplicates: true,
          });
        }
      } catch {
        stale = true;
        refreshFailed = true;
      }
    }
    const bars = needsRefresh
      ? await this.prisma.marketHistory.findMany({
          where: { symbol, date: { gte: from } },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        })
      : cached;
    if (bars.length === 0 && refreshFailed) {
      throw new ServiceUnavailableException(
        'Market history is unavailable right now. Please try again.',
      );
    }
    // No bars after a successful refresh means the symbol genuinely has no
    // history in this range (e.g. newly listed) — an honest empty list,
    // not an error.
    return historyResponse(symbol, range, bars, stale);
  }

  /**
   * Quote plus fundamentals. Fundamentals are fetched live and are allowed
   * to fail independently: the quote is still returned, with
   * `fundamentalsAvailable: false`, instead of failing the whole profile.
   */
  async profile(symbolInput: string) {
    const symbol = normalizeSymbol(symbolInput);
    const quote = await this.quote(symbol);
    try {
      const data = await this.provider.profile(symbol);
      return {
        ...quote,
        fundamentals: {
          sector: data.sector ?? quote.sector,
          industry: data.industry ?? null,
          marketCap: data.marketCap ?? null,
          trailingPE: data.trailingPE ?? null,
          forwardPE: data.forwardPE ?? null,
          dividendYield: data.dividendYield ?? null,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? null,
          description: data.description ?? null,
          bookValue: data.bookValue ?? null,
          priceToBook: data.priceToBook ?? null,
          returnOnEquity: data.returnOnEquity ?? null,
          debtToEquity: data.debtToEquity ?? null,
          revenueGrowth: data.revenueGrowth ?? null,
          earningsGrowth: data.earningsGrowth ?? null,
          payoutRatio: data.payoutRatio ?? null,
          beta: data.beta ?? null,
          sharesOutstanding: data.sharesOutstanding ?? null,
        },
        fundamentalsAvailable: true,
      };
    } catch {
      return {
        ...quote,
        fundamentals: null,
        fundamentalsAvailable: false,
      };
    }
  }

  /** NIFTY 50 + SENSEX plus live quotes for the user's watchlist. */
  activeIndianSymbols() {
    return this.provider.activeIndianSymbols();
  }

  /**
   * Price-alert triggering, evaluated on the overview load — there is
   * no background-job system, so the quotes refresh is the trigger
   * point (the market page re-fetches the overview every 15 minutes
   * while it is open). A crossed alert fires once per crossing and
   * re-arms when the price moves back; see market.alerts.ts.
   *
   * Fail-open by design: every item is evaluated and written
   * independently, and any failure (a bad row, a down database) is
   * swallowed — the quotes response is never affected. An alert is
   * only reported as fired AFTER its fired_at write succeeds, so a
   * failed write re-fires on the next load instead of losing the
   * notification.
   */
  private async evaluatePriceAlerts(
    items: WatchlistItem[],
    bySymbol: Map<string, ReturnType<typeof quoteResponse>>,
  ): Promise<{
    fired: {
      id: string;
      symbol: string;
      name: string | null;
      alertDirection: AlertDirection;
      alertPrice: number;
      price: number;
      currency: string;
      firedAt: string;
    }[];
    firedAtById: Map<string, Date | null>;
  }> {
    const fired: {
      id: string;
      symbol: string;
      name: string | null;
      alertDirection: AlertDirection;
      alertPrice: number;
      price: number;
      currency: string;
      firedAt: string;
    }[] = [];
    const firedAtById = new Map<string, Date | null>();
    for (const item of items) {
      let decision: AlertDecision;
      try {
        decision = evaluateAlert(item, bySymbol.get(item.symbol) ?? null);
      } catch {
        continue;
      }
      if (decision === 'none') continue;
      const firedAt = decision === 'fire' ? new Date() : null;
      try {
        await this.prisma.watchlistItem.update({
          where: { id: item.id },
          data: { alert_fired_at: firedAt },
        });
      } catch {
        // A failed write re-fires (or re-arms) on the next load.
        continue;
      }
      firedAtById.set(item.id, firedAt);
      if (decision === 'fire') {
        const quote = bySymbol.get(item.symbol);
        if (!quote) continue;
        fired.push({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          alertDirection: item.alert_direction as AlertDirection,
          alertPrice: Number(item.alert_price),
          price: quote.price,
          currency: quote.currency,
          firedAt: firedAt!.toISOString(),
        });
      }
    }
    return { fired, firedAtById };
  }

  /**
   * Alerts currently fired, for the notification centre: a cheap
   * database-only read — no quote fetching, no evaluation. The
   * dashboard reads this alongside the bills; evaluation itself
   * happens on the market-overview load.
   */
  async firedAlerts(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: {
        user_id: userId,
        alert_direction: { not: null },
        alert_fired_at: { not: null },
      },
      orderBy: [{ alert_fired_at: 'desc' }, { id: 'asc' }],
    });
    // The target price needs its currency for display; the cached
    // quote is the cheapest source, and INR is the honest default for
    // an uncached (usually Indian) symbol.
    const quotes = items.length
      ? await this.prisma.marketQuote.findMany({
          where: { symbol: { in: items.map((item) => item.symbol) } },
        })
      : [];
    const currencyBySymbol = new Map(
      quotes.map((quote) => [quote.symbol, quote.currency]),
    );
    return items.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      alertDirection: item.alert_direction,
      alertPrice: item.alert_price == null ? null : Number(item.alert_price),
      currency: currencyBySymbol.get(item.symbol) ?? 'INR',
      firedAt: item.alert_fired_at ? item.alert_fired_at.toISOString() : null,
    }));
  }

  async overview(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { user_id: userId },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    const { quotes, unavailable } = await this.quotes([
      ...overviewIndices,
      ...items.map((item) => item.symbol),
    ]);
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const { fired, firedAtById } = await this.evaluatePriceAlerts(
      items,
      bySymbol,
    );
    return {
      indices: overviewIndices.map((symbol) => ({
        ...(bySymbol.get(symbol) ?? {
          symbol,
          name: indexNames[symbol],
          price: null,
          previousClose: null,
          change: null,
          changePercent: null,
          currency: '',
          sector: null,
          fetchedAt: null,
          stale: false,
        }),
        name: bySymbol.get(symbol)?.name ?? indexNames[symbol],
      })),
      watchlist: items.map((item) => ({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        note: item.note ?? null,
        alertDirection: item.alert_direction ?? null,
        alertPrice: item.alert_price == null ? null : Number(item.alert_price),
        // The post-evaluation state: a just-fired alert already shows
        // its fired time; a just-re-armed one already shows null.
        alertFiredAt: firedAtById.has(item.id)
          ? (firedAtById.get(item.id)?.toISOString() ?? null)
          : (item.alert_fired_at?.toISOString() ?? null),
        quote: bySymbol.get(item.symbol) ?? null,
      })),
      // Alerts that fired on THIS load — the in-app notification.
      alerts: fired,
      unavailable,
    };
  }
}
