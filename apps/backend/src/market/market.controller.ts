import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { MarketService } from './market.service';
import { PortfolioService } from './portfolio.service';

@Controller('api')
@UseGuards(SessionGuard)
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
  ) {}

  @Get('market/overview')
  @Header('Cache-Control', 'private, no-store')
  overview(@Req() request: AuthenticatedRequest) {
    return this.market.overview(request.userId);
  }

  @Get('market/search')
  @Header('Cache-Control', 'private, no-store')
  search(@Query('q') query: string) {
    return this.market.search(query);
  }

  @Get('market/quote/:symbol')
  @Header('Cache-Control', 'private, no-store')
  quote(@Param('symbol') symbol: string) {
    return this.market.quote(symbol);
  }

  @Get('market/history/:symbol')
  @Header('Cache-Control', 'private, no-store')
  history(@Param('symbol') symbol: string, @Query('range') range: string) {
    return this.market.history(symbol, range);
  }

  @Get('market/profile/:symbol')
  @Header('Cache-Control', 'private, no-store')
  profile(@Param('symbol') symbol: string) {
    return this.market.profile(symbol);
  }

  @Get('holdings')
  @Header('Cache-Control', 'private, no-store')
  holdings(@Req() request: AuthenticatedRequest) {
    return this.portfolio.holdings(request.userId);
  }

  @Post('holdings')
  @Header('Cache-Control', 'private, no-store')
  addHolding(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.portfolio.addHolding(request.userId, body);
  }

  @Put('holdings/:id')
  @Header('Cache-Control', 'private, no-store')
  updateHolding(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.portfolio.updateHolding(request.userId, id, body);
  }

  @Delete('holdings/:id')
  @Header('Cache-Control', 'private, no-store')
  removeHolding(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.portfolio.removeHolding(request.userId, id);
  }

  @Get('watchlist')
  @Header('Cache-Control', 'private, no-store')
  watchlist(@Req() request: AuthenticatedRequest) {
    return this.portfolio.watchlist(request.userId);
  }

  @Post('watchlist')
  @Header('Cache-Control', 'private, no-store')
  addWatchlistItem(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.portfolio.addWatchlistItem(request.userId, body);
  }

  @Delete('watchlist/:id')
  @Header('Cache-Control', 'private, no-store')
  removeWatchlistItem(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.portfolio.removeWatchlistItem(request.userId, id);
  }

  @Get('portfolio/summary')
  @Header('Cache-Control', 'private, no-store')
  portfolioSummary(@Req() request: AuthenticatedRequest) {
    return this.portfolio.portfolioSummary(request.userId);
  }
}
