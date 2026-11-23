import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { MarketModule } from '../market/market.module';
import { ProfileModule } from '../profile/profile.module';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

@Module({
  imports: [MarketModule, ProfileModule],
  controllers: [ReadinessController],
  providers: [ReadinessService, SessionGuard],
  exports: [ReadinessService],
})
export class ReadinessModule {}
