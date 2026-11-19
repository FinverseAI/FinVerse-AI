-- Phase 2 (RAG): pgvector store for retrievable chunks.
--
-- The vector extension is required before the table exists. Neon supports
-- pgvector; CREATE EXTENSION is idempotent, so re-running this migration
-- (or a fresh database) is safe.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "rag_documents" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "user_id" TEXT,
    "symbol" VARCHAR(20),
    "title" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "published_at" TIMESTAMP(3),
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rag_documents_source_type_source_id_key" ON "rag_documents"("source_type", "source_id");
CREATE INDEX "rag_documents_user_id_idx" ON "rag_documents"("user_id");
CREATE INDEX "rag_documents_symbol_idx" ON "rag_documents"("symbol");
CREATE INDEX "rag_documents_source_type_published_at_idx" ON "rag_documents"("source_type", "published_at" DESC);
-- Approximate nearest-neighbour index for cosine similarity search. Prisma
-- cannot express this in the schema, so it lives only in this migration;
-- a later `prisma migrate dev` may report it as drift — keep it.
CREATE INDEX "rag_documents_embedding_idx" ON "rag_documents" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
