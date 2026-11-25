import {
  Inject,
  Injectable,
  NotFoundException,
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
/** A fired alert stays in the notification centre for this long, then
 * expires on its own — there is no background job to clear it (B26). */
export const FIRED_ALERT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Most fired alerts ever returned by GET /api/market/alerts (B26). */
export const FIRED_ALERTS_LIMIT = 50;

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

/**
 * A fired timestamp older than the notification-centre window: the
 * alert has expired (or was dismissed, which ages the timestamp past
 * the window — see dismissAlert). Expired alerts read as unfired
 * everywhere except the crossing logic, where a non-null timestamp
 * still suppresses a re-fire until the price re-arms.
 */
function isFiredAlertExpired(firedAt: Date | null | undefined): boolean {
  return !firedAt || Date.now() - firedAt.getTime() > FIRED_ALERT_TTL_MS;
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
        // Delete + insert run in one transaction (B25): a failed insert
        // must not leave today's bar deleted until the next refresh.
        const writes = [
          this.prisma.marketHistory.deleteMany({
            where: { symbol, date: { gte: today } },
          }),
        ];
        if (bars.length > 0) {
          writes.push(
            this.prisma.marketHistory.createMany({
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
            }),
          );
        }
        await this.prisma.$transaction(writes);
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
   *
   * Concurrency (B19): the fire/re-arm write is conditional on the
   * state read at load time (`alert_fired_at: null` for a fire,
   * non-null for a re-arm), and the alert is only reported when the
   * update actually changes a row (`count === 1`). Two simultaneous
   * overview loads therefore fire the same crossing exactly once —
   * the loser sees `count === 0` and reports nothing.
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
      // B26: store the quote currency at fire time so the notification
      // centre never has to guess one; cleared on re-arm.
      const fireCurrency =
        decision === 'fire'
          ? (bySymbol.get(item.symbol)?.currency ?? null)
          : null;
      let written: { count: number };
      try {
        // Conditional write: fire only if still unfired, re-arm only
        // if still fired (B19). A concurrent load that already fired
        // (or re-armed) this alert makes the count 0.
        written =
          decision === 'fire'
            ? await this.prisma.watchlistItem.updateMany({
                where: { id: item.id, alert_fired_at: null },
                data: { alert_fired_at: firedAt, alert_currency: fireCurrency },
              })
            : await this.prisma.watchlistItem.updateMany({
                where: { id: item.id, alert_fired_at: { not: null } },
                data: { alert_fired_at: null, alert_currency: null },
              });
      } catch {
        // A failed write re-fires (or re-arms) on the next load.
        continue;
      }
      // Lost the race: another load already changed this alert, so
      // this load reports nothing — not even a stale fired timestamp.
      if (written.count !== 1) continue;
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
   *
   * Bounded (B26): at most FIRED_ALERTS_LIMIT rows, and only alerts
   * fired within FIRED_ALERT_TTL_MS — a fired alert expires on its
   * own instead of sitting in the centre forever. The currency is the
   * one stored on the watchlist item when the alert fired; the cached
   * quote is only a fallback for alerts fired before that column
   * existed, and with neither it is null, never a guessed ₹.
   */
  async firedAlerts(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: {
        user_id: userId,
        alert_direction: { not: null },
        alert_fired_at: {
          gte: new Date(Date.now() - FIRED_ALERT_TTL_MS),
        },
      },
      orderBy: [{ alert_fired_at: 'desc' }, { id: 'asc' }],
      take: FIRED_ALERTS_LIMIT,
    });
    // The target price needs its currency for display. Prefer the
    // currency stored on the item when the alert fired (B26); the
    // cached quote is only a fallback for alerts fired before that
    // column existed. With neither, the currency is unknown (null) —
    // a foreign symbol must not be displayed as ₹.
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
      currency:
        item.alert_currency ?? currencyBySymbol.get(item.symbol) ?? null,
      firedAt: item.alert_fired_at ? item.alert_fired_at.toISOString() : null,
    }));
  }

  /**
   * Dismiss a fired alert from the notification centre (B26). There is
   * no dismissed flag on the row — that needs a migration — so a
   * dismiss ages `alert_fired_at` past the expiry window: the alert
   * leaves the fired list and reads as unfired, but because the
   * timestamp stays non-null a still-crossed price does NOT re-fire it
   * on the next overview load. It re-arms normally when the price
   * moves back across the target.
   */
  async dismissAlert(userId: string, id: string) {
    const dismissedAt = new Date(Date.now() - FIRED_ALERT_TTL_MS - 1000);
    const result = await this.prisma.watchlistItem.updateMany({
      where: { id, user_id: userId, alert_fired_at: { not: null } },
      data: { alert_fired_at: dismissedAt },
    });
    if (!result.count) {
      throw new NotFoundException('This alert is no longer fired.');
    }
    return { dismissed: true };
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
          // No price at all: this is a failed fetch, not a fresh
          // zero — a consumer reading the index alone must be able to
          // tell (B29). `available: false` says it outright.
          stale: true,
          available: false,
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
        // its fired time; a just-re-armed one already shows null. An
        // untouched alert shows its stored time — unless it expired
        // (or was dismissed), in which case it reads as unfired.
        alertFiredAt: firedAtById.has(item.id)
          ? (firedAtById.get(item.id)?.toISOString() ?? null)
          : !isFiredAlertExpired(item.alert_fired_at)
            ? (item.alert_fired_at?.toISOString() ?? null)
            : null,
        quote: bySymbol.get(item.symbol) ?? null,
      })),
      // Alerts that fired on THIS load — the in-app notification.
      alerts: fired,
      unavailable,
    };
  }
}
