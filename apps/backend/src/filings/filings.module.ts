import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { BseClient } from './bse.client';
import { FilingsController } from './filings.controller';
import { FilingsService } from './filings.service';
import { NseClient } from './nse.client';

@Module({
  controllers: [FilingsController],
  providers: [FilingsService, NseClient, BseClient, SessionGuard],
  exports: [FilingsService],
})
export class FilingsModule {}
