import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { FilingsService } from './filings.service';

@Controller('api')
@UseGuards(SessionGuard)
export class FilingsController {
  constructor(private readonly filings: FilingsService) {}

  @Get('market/filings/:symbol')
  @Header('Cache-Control', 'private, no-store')
  filingsFor(@Param('symbol') symbol: string) {
    return this.filings.getFilings(symbol);
  }
}
