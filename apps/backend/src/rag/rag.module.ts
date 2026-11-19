import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityModule } from '../activity/activity.module';
import { SessionGuard } from '../auth/session.guard';
import { MarketModule } from '../market/market.module';
import { resolveRagConfig } from './rag.config';
import { RagController } from './rag.controller';
import {
  EMBEDDINGS_CLIENT,
  OpenRouterEmbeddingsClient,
} from './rag.embeddings';
import { RagIngestService } from './rag.ingest';
import { RagRepository } from './rag.repository';
import { RagRetrievalService } from './rag.retrieval';
import { RagService } from './rag.service';

@Module({
  imports: [ActivityModule, MarketModule],
  controllers: [RagController],
  providers: [
    RagRepository,
    RagIngestService,
    RagRetrievalService,
    RagService,
    SessionGuard,
    {
      provide: EMBEDDINGS_CLIENT,
      useFactory: (config: ConfigService) => {
        const resolved = resolveRagConfig((key) => config.get<string>(key));
        return new OpenRouterEmbeddingsClient(
          resolved.apiKey,
          resolved.baseUrl,
          resolved.embeddingModel,
          resolved.timeoutMs,
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [RagRepository, RagIngestService, RagRetrievalService, RagService],
})
export class RagModule {}
