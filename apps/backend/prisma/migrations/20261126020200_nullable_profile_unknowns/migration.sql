-- B47: the onboarding questions behind these columns are not always
-- asked, so a missing answer must store as unknown (NULL) instead of
-- forcing the client to assert false data (e.g. salaried / low risk /
-- zero savings). Downstream readers must treat NULL as unknown, never
-- as a default: readiness treats a NULL emergency band as unavailable,
-- never as a score. Existing rows all carry values, so dropping the NOT
-- NULL constraints is safe on a non-empty database; CHECK constraints
-- still pass on NULL (a NULL comparison is not false).
ALTER TABLE "user_financial_profile" ALTER COLUMN "employment_type" DROP NOT NULL;
ALTER TABLE "user_financial_profile" ALTER COLUMN "current_savings" DROP NOT NULL;
ALTER TABLE "user_financial_profile" ALTER COLUMN "investment_experience" DROP NOT NULL;
ALTER TABLE "user_financial_profile" ALTER COLUMN "risk_tolerance" DROP NOT NULL;
ALTER TABLE "user_financial_profile" ALTER COLUMN "emergency_fund_months" DROP NOT NULL;
