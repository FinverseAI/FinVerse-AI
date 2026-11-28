ALTER TABLE "user_financial_profile"
  DROP CONSTRAINT "user_financial_profile_payday_check",
  ADD CONSTRAINT "user_financial_profile_payday_check"
    CHECK ("payday" BETWEEN 1 AND 31);
