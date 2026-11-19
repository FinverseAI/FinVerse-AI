import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveRagConfig, type RagConfig } from './rag.config';
import { EMBEDDINGS_CLIENT, type EmbeddingsClient } from './rag.embeddings';
import {
  RagRepository,
  type RagSourceType,
  type RetrievedChunk,
} from './rag.repository';

/**
 * Retrieval: embed the query, search the vector store, return the
 * top-k chunks with their source labels. Retrieval never throws:
 *
 * - available: false means the embeddings layer is down or unconfigured
 *   — the caller degrades to raw metrics / an honest message.
 * - available: true with zero chunks means the query embedded fine but
 *   nothing relevant passed the similarity threshold — the caller must
 *   say so instead of answering from memory. The two states are kept
 *   distinct on purpose; conflating them would hide real outages behind
 *   "no context" answers.
 */

export interface RetrievedContext {
  available: boolean;
  chunks: RetrievedChunk[];
  reason: string | null;
}

export interface RetrieveOptions {
  symbol?: string;
  sourceType?: RagSourceType;
  topK?: number;
}

@Injectable()
export class RagRetrievalService {
  private readonly config: RagConfig;

  constructor(
    configService: ConfigService,
    private readonly repository: RagRepository,
    @Inject(EMBEDDINGS_CLIENT)
    private readonly embeddings: EmbeddingsClient,
  ) {
    this.config = resolveRagConfig((key) => configService.get<string>(key));
  }

  async retrieve(
    userId: string,
    query: string,
    options: RetrieveOptions = {},
  ): Promise<RetrievedContext> {
    if (this.config.apiKey === undefined) {
      return {
        available: false,
        chunks: [],
        reason: 'Embeddings are not configured yet.',
      };
    }
    try {
      const vector = await this.embeddings.embedOne(query);
      const chunks = await this.repository.searchSimilar(userId, vector, {
        symbol: options.symbol,
        sourceType: options.sourceType,
        topK: options.topK ?? this.config.topK,
        minSimilarity: this.config.minSimilarity,
      });
      return { available: true, chunks, reason: null };
    } catch {
      // An embedding failure or a database failure is a retrieval
      // outage, not a "no context" answer — but it must not take the
      // feature down with it.
      return {
        available: false,
        chunks: [],
        reason: 'Retrieval is unavailable right now.',
      };
    }
  }
}
