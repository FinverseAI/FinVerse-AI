import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, SessionGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
