-- B37: link every side effect a payment creates back to its source, so
-- deleting a payment or a bill can undo those side effects in the same
-- transaction instead of orphaning them.
--
-- user_transactions.bill_payment_id: the expense transaction a payment
-- generates. One payment generates at most one expense (UNIQUE), and
-- deleting the payment deletes the expense (ON DELETE CASCADE).
-- user_bills.parent_bill_id: the bill a monthly payment's next occurrence
-- was generated from. Deleting the parent deletes the generated
-- occurrence (ON DELETE CASCADE), which in turn cascade-deletes that
-- occurrence's own payments and their expenses.
ALTER TABLE "user_transactions" ADD COLUMN "bill_payment_id" TEXT;
CREATE UNIQUE INDEX "user_transactions_bill_payment_id_key" ON "user_transactions"("bill_payment_id");
ALTER TABLE "user_transactions" ADD CONSTRAINT "user_transactions_bill_payment_id_fkey" FOREIGN KEY ("bill_payment_id") REFERENCES "user_bill_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_bills" ADD COLUMN "parent_bill_id" TEXT;
CREATE INDEX "user_bills_parent_bill_id_idx" ON "user_bills"("parent_bill_id");
ALTER TABLE "user_bills" ADD CONSTRAINT "user_bills_parent_bill_id_fkey" FOREIGN KEY ("parent_bill_id") REFERENCES "user_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
