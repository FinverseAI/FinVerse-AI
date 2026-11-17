CREATE TABLE "user_bill_payments" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_bill_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_bill_payments_positive_amount" CHECK ("amount" > 0)
);

CREATE INDEX "user_bill_payments_bill_id_idx" ON "user_bill_payments"("bill_id");
CREATE INDEX "user_bill_payments_user_id_idx" ON "user_bill_payments"("user_id");
ALTER TABLE "user_bill_payments" ADD CONSTRAINT "user_bill_payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "user_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_bill_payments" ADD CONSTRAINT "user_bill_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
