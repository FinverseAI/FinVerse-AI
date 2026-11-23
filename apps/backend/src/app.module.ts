import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { ActivityModule } from './activity/activity.module';
import { MarketModule } from './market/market.module';
import { AiModule } from './ai/ai.module';
import { validateEnvironment } from './config/environment';
import { RagModule } from './rag/rag.module';
import { ReadinessModule } from './readiness/readiness.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    ProfileModule,
    ActivityModule,
    MarketModule,
    RagModule,
    ReadinessModule,
    AiModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
