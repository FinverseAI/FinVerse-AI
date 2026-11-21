-- Phase 3 (Guardrails): persistent log of every guardrail check, pass or
-- fail, so Phase 5 can compute the guardrail pass rate from this table.
-- CreateTable
CREATE TABLE "guardrail_checks" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "claim_text" TEXT NOT NULL,
    "source_tool" TEXT NOT NULL,
    "check_type" TEXT NOT NULL,
    "expected" TEXT,
    "actual" TEXT,
    "verdict" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardrail_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardrail_checks_user_id_idx" ON "guardrail_checks"("user_id");
CREATE INDEX "guardrail_checks_feature_idx" ON "guardrail_checks"("feature");
CREATE INDEX "guardrail_checks_request_id_idx" ON "guardrail_checks"("request_id");

-- AddForeignKey
ALTER TABLE "guardrail_checks" ADD CONSTRAINT "guardrail_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
