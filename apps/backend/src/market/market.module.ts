import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { PortfolioService } from './portfolio.service';
import { MARKET_DATA_PROVIDER, YahooFinanceProvider } from './market.provider';

@Module({
  controllers: [MarketController],
  providers: [
    MarketService,
    PortfolioService,
    SessionGuard,
    { provide: MARKET_DATA_PROVIDER, useClass: YahooFinanceProvider },
  ],
  exports: [MarketService, PortfolioService, MARKET_DATA_PROVIDER],
})
export class MarketModule {}
