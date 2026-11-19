import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityModule } from '../activity/activity.module';
import { MarketModule } from '../market/market.module';
import { resolveRagConfig } from './rag.config';
import {
  EMBEDDINGS_CLIENT,
  OpenRouterEmbeddingsClient,
} from './rag.embeddings';
import { RagIngestService } from './rag.ingest';
import { RagRepository } from './rag.repository';
import { RagRetrievalService } from './rag.retrieval';

@Module({
  imports: [ActivityModule, MarketModule],
  providers: [
    RagRepository,
    RagIngestService,
    RagRetrievalService,
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
  exports: [RagRepository, RagIngestService, RagRetrievalService],
})
export class RagModule {}
