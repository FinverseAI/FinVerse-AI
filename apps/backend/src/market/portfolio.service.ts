import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserHolding, WatchlistItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from './market.service';
import { validateHolding, validateWatchlistItem } from './market.validation';

/**
 * All portfolio money is computed in integer paise. Quantities carry up to
 * four decimals, so a value is quantity-units (×10^4) times price-paise
 * (×10^2) divided by 10^4, rounded once to the nearest paise.
 */
function valuePaise(quantity: number, price: number) {
  const quantityUnits = Math.round(quantity * 10000);
  const pricePaise = Math.round(price * 100);
  return Math.round((quantityUnits * pricePaise) / 10000);
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
    let totalValuePaise = 0;
    let totalInvestedPaise = 0;
    let stale = false;
    let asOf = 0;
    const valued = holdings.map((holding) => {
      const quantity = Number(holding.quantity);
      const buyPrice = Number(holding.buy_price);
      const investedPaise = valuePaise(quantity, buyPrice);
      const quote = bySymbol.get(holding.symbol);
      if (!quote) {
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
        sector: holding.sector ?? quote.sector ?? 'Unknown',
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
      sectors,
      unavailable,
      asOf: asOf ? new Date(asOf).toISOString() : null,
      stale,
    };
  }
}
