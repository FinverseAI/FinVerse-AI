import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The pgvector store, accessed only through raw SQL: Prisma cannot read
 * or write the vector(768) column through the typed client
 * (Unsupported in the schema), so every query here is $queryRaw /
 * $executeRaw with bound parameters — never string interpolation.
 *
 * User scoping is enforced in every retrieval query, not in the caller:
 * a user retrieves only rows where user_id IS NULL (public market
 * content) or user_id = their own id. A caller cannot forget the filter
 * because there is no unscoped retrieval method.
 */

export type RagSourceType = 'news' | 'profile' | 'transaction';

export const RAG_SOURCE_TYPES: RagSourceType[] = [
  'news',
  'profile',
  'transaction',
];

export interface RagDocumentRow {
  id: string;
  source_type: RagSourceType;
  source_id: string;
  user_id: string | null;
  symbol: string | null;
  title: string | null;
  content: string;
  published_at: Date | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface RetrievedChunk extends RagDocumentRow {
  /** Cosine similarity to the query, in [0, 1]; higher is closer. */
  similarity: number;
}

export interface NewRagDocument {
  sourceType: RagSourceType;
  sourceId: string;
  userId: string | null;
  symbol: string | null;
  title: string | null;
  content: string;
  embedding: number[];
  publishedAt: Date | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SimilaritySearchOptions {
  symbol?: string;
  sourceType?: RagSourceType;
  topK: number;
  minSimilarity: number;
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function rowFromDb(row: Record<string, unknown>): RagDocumentRow {
  return {
    id: row.id as string,
    source_type: row.source_type as RagSourceType,
    source_id: row.source_id as string,
    user_id: (row.user_id as string | null) ?? null,
    symbol: (row.symbol as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    content: row.content as string,
    published_at: row.published_at
      ? new Date(row.published_at as string | Date)
      : null,
    url: (row.url as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: new Date(row.created_at as string | Date),
    updated_at: new Date(row.updated_at as string | Date),
  };
}

@Injectable()
export class RagRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert or replace documents by (source_type, source_id). Re-ingesting
   * the same source replaces its chunk and embedding instead of
   * duplicating it, so ingestion is idempotent.
   */
  async upsertDocuments(documents: NewRagDocument[]): Promise<number> {
    let count = 0;
    for (const doc of documents) {
      await this.prisma.$executeRaw`
        INSERT INTO "rag_documents"
          ("id", "source_type", "source_id", "user_id", "symbol", "title",
           "content", "embedding", "published_at", "url", "metadata",
           "created_at", "updated_at")
        VALUES (
          ${randomUUID()}, ${doc.sourceType}, ${doc.sourceId}, ${doc.userId},
          ${doc.symbol}, ${doc.title}, ${doc.content},
          ${vectorLiteral(doc.embedding)}::vector,
          ${doc.publishedAt}, ${doc.url},
          ${doc.metadata === null ? null : JSON.stringify(doc.metadata)}::jsonb,
          NOW(), NOW()
        )
        ON CONFLICT ("source_type", "source_id") DO UPDATE SET
          "title" = EXCLUDED."title",
          "content" = EXCLUDED."content",
          "embedding" = EXCLUDED."embedding",
          "symbol" = EXCLUDED."symbol",
          "published_at" = EXCLUDED."published_at",
          "url" = EXCLUDED."url",
          "metadata" = EXCLUDED."metadata",
          "updated_at" = NOW()
      `;
      count++;
    }
    return count;
  }

  /**
   * Cosine-similarity search, always user-scoped: public rows
   * (user_id IS NULL) plus the caller's own rows. Rows below
   * minSimilarity are dropped in SQL, so the caller only ever sees
   * relevant context.
   */
  async searchSimilar(
    userId: string,
    embedding: number[],
    options: SimilaritySearchOptions,
  ): Promise<RetrievedChunk[]> {
    const literal = vectorLiteral(embedding);
    const symbol = options.symbol ?? null;
    const sourceType = options.sourceType ?? null;
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT "id", "source_type", "source_id", "user_id", "symbol",
             "title", "content", "published_at", "url", "metadata",
             "created_at", "updated_at",
             1 - ("embedding" <=> ${literal}::vector) AS "similarity"
      FROM "rag_documents"
      WHERE ("user_id" IS NULL OR "user_id" = ${userId})
        AND (${symbol}::text IS NULL OR "symbol" = ${symbol})
        AND (${sourceType}::text IS NULL OR "source_type" = ${sourceType})
        AND (1 - ("embedding" <=> ${literal}::vector)) >= ${options.minSimilarity}
      ORDER BY "similarity" DESC
      LIMIT ${options.topK}
    `;
    return rows.map((row) => ({
      ...rowFromDb(row),
      similarity: Number(row.similarity),
    }));
  }

  /** The newest indexed news for a symbol, most recent first. */
  async listRecentNews(
    symbol: string,
    limit: number,
  ): Promise<RagDocumentRow[]> {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT "id", "source_type", "source_id", "user_id", "symbol",
             "title", "content", "published_at", "url", "metadata",
             "created_at", "updated_at"
      FROM "rag_documents"
      WHERE "source_type" = 'news' AND "symbol" = ${symbol}
      ORDER BY "published_at" DESC NULLS LAST, "created_at" DESC
      LIMIT ${limit}
    `;
    return rows.map(rowFromDb);
  }

  /** How many news rows a symbol has and when the newest was indexed. */
  async newsFreshness(
    symbol: string,
  ): Promise<{ count: number; newestAt: Date | null }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ count: number; newest_at: Date | null }>
    >`
      SELECT COUNT(*)::int AS "count", MAX("created_at") AS "newest_at"
      FROM "rag_documents"
      WHERE "source_type" = 'news' AND "symbol" = ${symbol}
    `;
    const row = rows[0];
    return {
      count: row?.count ?? 0,
      newestAt: row?.newest_at ? new Date(row.newest_at) : null,
    };
  }

  /** Source ids already indexed for one user (ingestion dedupe). */
  async existingSourceIds(
    sourceType: RagSourceType,
    userId: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<Array<{ source_id: string }>>`
      SELECT "source_id" FROM "rag_documents"
      WHERE "source_type" = ${sourceType} AND "user_id" = ${userId}
    `;
    return new Set(rows.map((row) => row.source_id));
  }

  /** News urls already indexed for one symbol (ingestion dedupe). */
  async existingNewsSourceIds(symbol: string): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<Array<{ source_id: string }>>`
      SELECT "source_id" FROM "rag_documents"
      WHERE "source_type" = 'news' AND "symbol" = ${symbol}
    `;
    return new Set(rows.map((row) => row.source_id));
  }

  /** Whether a public (user_id NULL) document already exists. */
  async hasPublicSource(
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ found: number }>>`
      SELECT 1 AS "found" FROM "rag_documents"
      WHERE "source_type" = ${sourceType}
        AND "source_id" = ${sourceId}
        AND "user_id" IS NULL
      LIMIT 1
    `;
    return rows.length > 0;
  }

  /** Drop news older than the cutoff so the store stays fresh. */
  async deleteStaleNews(before: Date): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM "rag_documents"
      WHERE "source_type" = 'news' AND "published_at" < ${before}
    `;
  }
}
