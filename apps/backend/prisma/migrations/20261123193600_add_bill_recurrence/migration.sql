ALTER TABLE "user_bills" ADD COLUMN "recurrence" TEXT;
ALTER TABLE "user_bills" ADD CONSTRAINT "user_bills_recurrence_check" CHECK ("recurrence" IS NULL OR "recurrence" = 'monthly');
