import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserHolding, WatchlistItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from './market.service';
import {
  validateHolding,
  validateWatchlistItem,
  validateWatchSettings,
} from './market.validation';

/**
 * All portfolio money is computed in integer minor units (paise for INR,
 * cents for USD). Quantities carry up to four decimals, so a value is
 * quantity-units (×10^4) times price-minor-units (×10^2) divided by 10^4,
 * rounded once to the nearest minor unit.
 */
function valuePaise(quantity: number, price: number) {
  const quantityUnits = Math.round(quantity * 10000);
  const priceMinorUnits = Math.round(price * 100);
  return Math.round((quantityUnits * priceMinorUnits) / 10000);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function holdingResponse(holding: UserHolding) {
  return {
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    sector: holding.sector,
    quantity: Number(holding.quantity),
    buyPrice: Number(holding.buy_price),
    buyDate: holding.buy_date.toISOString().slice(0, 10),
    // Rows saved before the currency column existed have no value.
    currency: holding.currency ?? 'INR',
  };
}

function watchlistResponse(item: WatchlistItem) {
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
  };
}

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
  ) {}

  async holdings(userId: string) {
    const holdings = await this.prisma.userHolding.findMany({
      where: { user_id: userId },
      orderBy: [{ symbol: 'asc' }, { id: 'asc' }],
    });
    return holdings.map(holdingResponse);
  }

  async addHolding(userId: string, input: unknown) {
    const data = validateHolding(input);
    try {
      return holdingResponse(
        await this.prisma.userHolding.create({
          data: { ...data, user_id: userId },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already track this symbol. Edit the holding to update it.',
        );
      }
      throw error;
    }
  }

  async updateHolding(userId: string, id: string, input: unknown) {
    const data = validateHolding(input);
    try {
      const result = await this.prisma.userHolding.updateMany({
        where: { id, user_id: userId },
        data,
      });
      if (!result.count)
        throw new NotFoundException('This holding no longer exists.');
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already track this symbol. Edit the holding to update it.',
        );
      }
      throw error;
    }
    const updated = await this.prisma.userHolding.findFirst({
      where: { id, user_id: userId },
    });
    if (!updated) throw new NotFoundException('This holding no longer exists.');
    return holdingResponse(updated);
  }

  async removeHolding(userId: string, id: string) {
    const result = await this.prisma.userHolding.deleteMany({
      where: { id, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This holding no longer exists.');
    return { deleted: true };
  }

  async watchlist(userId: string) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { user_id: userId },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    return items.map(watchlistResponse);
  }

  async addWatchlistItem(userId: string, input: unknown) {
    const data = validateWatchlistItem(input);
    try {
      return watchlistResponse(
        await this.prisma.watchlistItem.create({
          data: { ...data, user_id: userId },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This symbol is already on your watchlist.',
        );
      }
      throw error;
    }
  }

  async updateWatchSettings(userId: string, id: string, input: unknown) {
    const data = validateWatchSettings(input);
    const current = await this.prisma.watchlistItem.findFirst({
      where: { id, user_id: userId },
    });
    if (!current)
      throw new NotFoundException('This watchlist item no longer exists.');
    // A changed alert re-arms: the old fired state belongs to the old
    // target, so a new target must be able to fire on its own crossing.
    // A note-only edit keeps the fired state — editing a research note
    // must not re-trigger a notification for an alert that already fired.
    const alertChanged =
      (current.alert_direction ?? null) !== data.alert_direction ||
      Number(current.alert_price ?? null) !== Number(data.alert_price ?? null);
    await this.prisma.watchlistItem.update({
      where: { id },
      data: alertChanged ? { ...data, alert_fired_at: null } : data,
    });
    return { updated: true };
  }

  async removeWatchlistItem(userId: string, id: string) {
    const result = await this.prisma.watchlistItem.deleteMany({
      where: { id, user_id: userId },
    });
    if (!result.count)
      throw new NotFoundException('This watchlist item no longer exists.');
    return { deleted: true };
  }

  /**
   * The portfolio valued at current prices. Holdings whose price cannot be
   * fetched (provider down and nothing cached) are listed under
   * `unavailable` and excluded from the totals — never valued at a stale
   * or invented price. Sector weights come from the holding's stored
   * sector, falling back to the quote's sector, then "Unknown".
   */
  async portfolioSummary(userId: string) {
    const holdings = await this.prisma.userHolding.findMany({
      where: { user_id: userId },
      orderBy: [{ symbol: 'asc' }, { id: 'asc' }],
    });
    if (holdings.length === 0) {
      return {
        holdings: [],
        totals: {
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
        },
        totalsByCurrency: [],
        sectors: [],
        unavailable: [],
        asOf: null,
        stale: false,
      };
    }
    const { quotes, unavailable } = await this.market.quotes(
      holdings.map((holding) => holding.symbol),
    );
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const sectorsBySymbol = new Map<string, string>();
    await Promise.all(
      holdings.map(async (holding) => {
        const quote = bySymbol.get(holding.symbol);
        if (
          holding.sector ||
          !quote ||
          quote.currency !== (holding.currency ?? 'INR') ||
          quote.sector
        )
          return;
        const profile = await this.market
          .profile(holding.symbol)
          .catch(() => null);
        const sector = profile?.fundamentals?.sector;
        if (sector) sectorsBySymbol.set(holding.symbol, sector);
      }),
    );
    let totalValuePaise = 0;
    let totalInvestedPaise = 0;
    let stale = false;
    let asOf = 0;
    // Per-currency totals, in each currency's minor units. `totals`
    // below still aggregates across currencies for backwards
    // compatibility, but it is only meaningful when every priced
    // holding shares one currency — consumers must read
    // totalsByCurrency whenever holdings span currencies.
    const totalsByCurrency = new Map<
      string,
      { totalValue: number; totalInvested: number }
    >();
    const valued = holdings.map((holding) => {
      const quantity = Number(holding.quantity);
      const buyPrice = Number(holding.buy_price);
      const investedPaise = valuePaise(quantity, buyPrice);
      const quote = bySymbol.get(holding.symbol);
      const holdingCurrency = holding.currency ?? 'INR';
      // Holding costs are entered in the holding's currency. A quote in
      // a different currency cannot value them until a conversion is
      // available.
      if (quote && quote.currency !== holdingCurrency)
        unavailable.push(holding.symbol);
      if (!quote || quote.currency !== holdingCurrency) {
        return {
          ...holdingResponse(holding),
          currentPrice: null,
          currentValue: null,
          investedValue: investedPaise / 100,
          gainLoss: null,
          gainLossPercent: null,
          sector: holding.sector ?? 'Unknown',
          fetchedAt: null,
          stale: false,
          priced: false,
        };
      }
      const currentPaise = valuePaise(quantity, quote.price);
      const gainPaise = currentPaise - investedPaise;
      totalValuePaise += currentPaise;
      totalInvestedPaise += investedPaise;
      const group = totalsByCurrency.get(holdingCurrency) ?? {
        totalValue: 0,
        totalInvested: 0,
      };
      group.totalValue += currentPaise;
      group.totalInvested += investedPaise;
      totalsByCurrency.set(holdingCurrency, group);
      if (quote.stale) stale = true;
      const fetchedAt = new Date(quote.fetchedAt).getTime();
      if (fetchedAt > asOf) asOf = fetchedAt;
      return {
        ...holdingResponse(holding),
        currentPrice: quote.price,
        currentValue: currentPaise / 100,
        investedValue: investedPaise / 100,
        gainLoss: gainPaise / 100,
        gainLossPercent:
          investedPaise === 0 ? 0 : round2((gainPaise / investedPaise) * 100),
        sector:
          holding.sector ??
          quote.sector ??
          sectorsBySymbol.get(holding.symbol) ??
          'Unknown',
        fetchedAt: quote.fetchedAt,
        stale: quote.stale,
        priced: true,
      };
    });
    const sectorPaise = new Map<string, number>();
    for (const holding of valued) {
      if (!holding.priced) continue;
      sectorPaise.set(
        holding.sector,
        (sectorPaise.get(holding.sector) ?? 0) +
          Math.round((holding.currentValue ?? 0) * 100),
      );
    }
    const sectors = [...sectorPaise.entries()]
      .map(([sector, paise]) => ({
        sector,
        value: paise / 100,
        weight:
          totalValuePaise === 0 ? 0 : round2((paise / totalValuePaise) * 100),
      }))
      .sort((a, b) => b.value - a.value);
    const totalGainPaise = totalValuePaise - totalInvestedPaise;
    const totalsByCurrencyList = [...totalsByCurrency.entries()]
      .map(([currency, group]) => {
        const gain = group.totalValue - group.totalInvested;
        return {
          currency,
          totalValue: group.totalValue / 100,
          totalInvested: group.totalInvested / 100,
          totalGainLoss: gain / 100,
          totalGainLossPercent:
            group.totalInvested === 0
              ? 0
              : round2((gain / group.totalInvested) * 100),
        };
      })
      .sort((a, b) => a.currency.localeCompare(b.currency));
    return {
      holdings: valued,
      totals: {
        totalValue: totalValuePaise / 100,
        totalInvested: totalInvestedPaise / 100,
        totalGainLoss: totalGainPaise / 100,
        totalGainLossPercent:
          totalInvestedPaise === 0
            ? 0
            : round2((totalGainPaise / totalInvestedPaise) * 100),
      },
      totalsByCurrency: totalsByCurrencyList,
      sectors,
      unavailable,
      asOf: asOf ? new Date(asOf).toISOString() : null,
      stale,
    };
  }
}
