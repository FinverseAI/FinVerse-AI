import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityService } from '../activity/activity.service';
import {
  MARKET_DATA_PROVIDER,
  type MarketDataProvider,
} from '../market/market.provider';
import { MarketService } from '../market/market.service';
import {
  buildNewsChunkText,
  buildProfileChunkText,
  buildTransactionChunkText,
  chunkText,
} from './rag.chunking';
import { resolveRagConfig, type RagConfig } from './rag.config';
import {
  EMBEDDINGS_CLIENT,
  RagEmbeddingError,
  type EmbeddingsClient,
} from './rag.embeddings';
import { RagRepository, type NewRagDocument } from './rag.repository';

/**
 * Ingestion: fetch → chunk → embed → store, for the three indexed
 * sources. Ingestion is best-effort and idempotent:
 *
 * - Already-indexed sources are skipped (dedupe by source id), so a
 *   re-ingest only embeds what is new.
 * - An embeddings or provider failure never throws: the result reports
 *   available: false and the caller degrades (raw metrics / honest
 *   "no context" instead of a failed feature).
 * - A batch that fails stops the run; documents embedded before the
 *   failure stay stored, and the next ingest picks up the rest.
 *
 * Transaction chunks are always user-scoped (userId set); news and
 * profile chunks are public (userId null).
 */

export type IngestUnavailableReason =
  'embeddings-not-configured' | 'embeddings-unavailable' | 'source-unavailable';

export interface IngestResult {
  indexed: number;
  skipped: number;
  available: boolean;
  reason: IngestUnavailableReason | null;
}

/** Bound the embedding cost of one transaction ingest run. */
export const MAX_TRANSACTIONS_PER_INGEST = 200;
/** News older than this is pruned when news is re-ingested. */
export const NEWS_RETENTION_DAYS = 30;

@Injectable()
export class RagIngestService {
  private readonly config: RagConfig;

  constructor(
    configService: ConfigService,
    private readonly repository: RagRepository,
    @Inject(EMBEDDINGS_CLIENT)
    private readonly embeddings: EmbeddingsClient,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
    private readonly market: MarketService,
    private readonly activity: ActivityService,
  ) {
    this.config = resolveRagConfig((key) => configService.get<string>(key));
  }

  /** Fetch the latest news for a symbol and index what is new. */
  async indexNews(symbol: string): Promise<IngestResult> {
    if (this.config.apiKey === undefined) {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'embeddings-not-configured',
      };
    }
    let items;
    try {
      items = await this.provider.news(symbol);
    } catch {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'source-unavailable',
      };
    }
    const existing = await this.repository.existingNewsSourceIds(symbol);
    const fresh = items.filter((item) => !existing.has(item.link));
    const documents: NewRagDocument[] = [];
    for (const item of fresh) {
      const text = buildNewsChunkText(
        item.title,
        item.publisher,
        item.publishedAt,
      );
      for (const chunk of chunkText(text)) {
        documents.push({
          sourceType: 'news',
          sourceId: item.link,
          userId: null,
          symbol,
          title: item.title,
          content: chunk,
          embedding: [],
          publishedAt: item.publishedAt,
          url: item.link,
          metadata: { publisher: item.publisher },
        });
      }
    }
    const embedded = await this.embedAndStore(documents);
    if (embedded.available) {
      await this.pruneStaleNews().catch(() => undefined);
    }
    return {
      indexed: embedded.indexed,
      skipped: items.length - fresh.length,
      available: embedded.available,
      reason: embedded.reason,
    };
  }

  /** Index a company's profile text (Yahoo longBusinessSummary). */
  async indexProfile(symbol: string): Promise<IngestResult> {
    if (this.config.apiKey === undefined) {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'embeddings-not-configured',
      };
    }
    let profile;
    try {
      profile = await this.market.profile(symbol);
    } catch {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'source-unavailable',
      };
    }
    const fundamentals = profile.fundamentals;
    const description = fundamentals?.description ?? null;
    const sector = fundamentals?.sector ?? profile.sector ?? null;
    // A bare name with no description and no sector is nothing worth
    // retrieving — skip it instead of storing a useless chunk.
    if (!description && !sector) {
      return { indexed: 0, skipped: 1, available: true, reason: null };
    }
    const text = buildProfileChunkText(
      profile.name ?? symbol,
      sector,
      fundamentals?.industry ?? null,
      description,
    );
    const documents = chunkText(text).map((chunk): NewRagDocument => ({
      sourceType: 'profile',
      sourceId: symbol,
      userId: null,
      symbol,
      title: profile.name ?? symbol,
      content: chunk,
      embedding: [],
      publishedAt: null,
      url: null,
      metadata: { sector, industry: fundamentals?.industry ?? null },
    }));
    const embedded = await this.embedAndStore(documents);
    return {
      indexed: embedded.indexed,
      skipped: 0,
      available: embedded.available,
      reason: embedded.reason,
    };
  }

  /**
   * Index the user's own transactions (most recent first, capped).
   * Every chunk carries the user's id, so retrieval can only ever
   * return it to them.
   */
  async indexTransactions(userId: string): Promise<IngestResult> {
    if (this.config.apiKey === undefined) {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'embeddings-not-configured',
      };
    }
    let transactions;
    try {
      transactions = await this.activity.transactions(userId);
    } catch {
      return {
        indexed: 0,
        skipped: 0,
        available: false,
        reason: 'source-unavailable',
      };
    }
    const existing = await this.repository.existingSourceIds(
      'transaction',
      userId,
    );
    const fresh = transactions
      .filter((transaction) => !existing.has(transaction.id))
      .slice(0, MAX_TRANSACTIONS_PER_INGEST);
    const documents: NewRagDocument[] = [];
    for (const transaction of fresh) {
      const text = buildTransactionChunkText(
        transaction.name,
        transaction.category,
        transaction.amount,
        transaction.date,
      );
      for (const chunk of chunkText(text)) {
        documents.push({
          sourceType: 'transaction',
          sourceId: transaction.id,
          userId,
          symbol: null,
          title: transaction.name,
          content: chunk,
          embedding: [],
          publishedAt: new Date(`${transaction.date}T00:00:00.000Z`),
          url: null,
          metadata: { category: transaction.category },
        });
      }
    }
    const embedded = await this.embedAndStore(documents);
    return {
      indexed: embedded.indexed,
      skipped: transactions.length - fresh.length,
      available: embedded.available,
      reason: embedded.reason,
    };
  }

  /**
   * Index a profile only if it is not already stored. Profiles change
   * rarely, so the explain-stock flow calls this instead of re-embedding
   * on every request. Never throws.
   */
  async ensureProfileIndexed(symbol: string): Promise<void> {
    try {
      if (await this.repository.hasPublicSource('profile', symbol)) return;
    } catch {
      return;
    }
    await this.indexProfile(symbol);
  }

  /** Drop news older than the retention window. Never throws. */
  async pruneStaleNews(): Promise<number> {
    const cutoff = new Date(
      Date.now() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    try {
      return await this.repository.deleteStaleNews(cutoff);
    } catch {
      return 0;
    }
  }

  /**
   * Embed documents in batches and store them. Stops at the first
   * embedding failure; documents from earlier batches stay stored.
   */
  private async embedAndStore(documents: NewRagDocument[]): Promise<{
    indexed: number;
    available: boolean;
    reason: IngestUnavailableReason | null;
  }> {
    let indexed = 0;
    for (
      let start = 0;
      start < documents.length;
      start += this.config.ingestBatchSize
    ) {
      const batch = documents.slice(start, start + this.config.ingestBatchSize);
      let vectors: number[][];
      try {
        vectors = await this.embeddings.embed(batch.map((doc) => doc.content));
      } catch (error) {
        if (error instanceof RagEmbeddingError) {
          return {
            indexed,
            available: false,
            reason: 'embeddings-unavailable',
          };
        }
        throw error;
      }
      const withVectors = batch.map((doc, index) => ({
        ...doc,
        embedding: vectors[index],
      }));
      indexed += await this.repository.upsertDocuments(withVectors);
    }
    return { indexed, available: true, reason: null };
  }
}
