ALTER TABLE "user_financial_profile"
  ADD COLUMN "payday" INTEGER,
  ADD COLUMN "budget_split" JSONB,
  ADD CONSTRAINT "user_financial_profile_payday_check" CHECK ("payday" BETWEEN 1 AND 28);
