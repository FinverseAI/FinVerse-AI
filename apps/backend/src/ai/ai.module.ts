import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionGuard } from '../auth/session.guard';
import { ActivityModule } from '../activity/activity.module';
import { MarketModule } from '../market/market.module';
import { ProfileModule } from '../profile/profile.module';
import { RagModule } from '../rag/rag.module';
import { ReadinessModule } from '../readiness/readiness.module';
import { resolveAiConfig } from './ai.config';
import { AiController } from './ai.controller';
import { GuardrailCheckRepository } from './ai.guardrail.repository';
import { GuardrailService } from './ai.guardrail.service';
import { LLM_CLIENT, OpenRouterClient } from './ai.provider';
import { AiService } from './ai.service';
import { AiTools } from './ai.tools';

@Module({
  imports: [
    ActivityModule,
    MarketModule,
    ProfileModule,
    RagModule,
    ReadinessModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiTools,
    GuardrailService,
    GuardrailCheckRepository,
    SessionGuard,
    {
      provide: LLM_CLIENT,
      useFactory: (config: ConfigService) => {
        const resolved = resolveAiConfig((key) => config.get<string>(key));
        return new OpenRouterClient(resolved.apiKey, resolved.baseUrl);
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
