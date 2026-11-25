-- B44: idempotency keys for POST creates (bill, payment, transaction,
-- goal contribution). A client sends a unique X-Idempotency-Key header
-- per request; a replay of the same (user, key) within 24 hours is
-- rejected with 409 DUPLICATE_REQUEST instead of creating a duplicate
-- row. Keys older than 24 hours are treated as expired and may be reused.
-- The UNIQUE(user_id, key) constraint is the backstop against two
-- concurrent replays racing the application-level check.
CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");
CREATE INDEX "idempotency_keys_user_id_created_at_idx" ON "idempotency_keys"("user_id", "created_at");
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
