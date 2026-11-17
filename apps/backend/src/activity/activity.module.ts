import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, SessionGuard],
})
export class ActivityModule {}
