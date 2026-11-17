CREATE TABLE "user_bills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "auto_pay" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_bills_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_bills_positive_amount" CHECK ("amount" > 0)
);

CREATE TABLE "user_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_transactions_nonzero_amount" CHECK ("amount" <> 0)
);

CREATE INDEX "user_bills_user_id_due_date_idx" ON "user_bills"("user_id", "due_date");
CREATE INDEX "user_transactions_user_id_date_idx" ON "user_transactions"("user_id", "date");
ALTER TABLE "user_bills" ADD CONSTRAINT "user_bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_transactions" ADD CONSTRAINT "user_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
