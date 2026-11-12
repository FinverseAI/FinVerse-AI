CREATE TYPE "EmploymentType" AS ENUM ('salaried', 'self-employed', 'student', 'other');
CREATE TYPE "InvestmentExperience" AS ENUM ('none', 'beginner', 'intermediate', 'advanced');
CREATE TYPE "RiskTolerance" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "GoalPriority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "EmergencyFundMonths" AS ENUM ('0', '1-3', '3-6', '6+');

CREATE TABLE "user_financial_profile" (
    "user_id" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "employment_type" "EmploymentType" NOT NULL,
    "monthly_income" NUMERIC(12,2) NOT NULL CHECK ("monthly_income" >= 0),
    "other_monthly_income" NUMERIC(12,2) CHECK ("other_monthly_income" >= 0),
    "fixed_expenses" NUMERIC(12,2) NOT NULL CHECK ("fixed_expenses" >= 0),
    "variable_expenses" NUMERIC(12,2) NOT NULL CHECK ("variable_expenses" >= 0),
    "existing_debt_total" NUMERIC(12,2) CHECK ("existing_debt_total" >= 0),
    "current_savings" NUMERIC(12,2) NOT NULL CHECK ("current_savings" >= 0),
    "monthly_savings_target" NUMERIC(12,2) NOT NULL CHECK ("monthly_savings_target" >= 0),
    "investment_experience" "InvestmentExperience" NOT NULL,
    "risk_tolerance" "RiskTolerance" NOT NULL,
    "already_investing" BOOLEAN NOT NULL,
    "invested_amount" NUMERIC(12,2) CHECK ("invested_amount" >= 0),
    "emergency_fund_months" "EmergencyFundMonths" NOT NULL,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profile_budget_check" CHECK (
        "fixed_expenses" + "variable_expenses" + "monthly_savings_target" <= "monthly_income" + COALESCE("other_monthly_income", 0)
    ),
    CONSTRAINT "profile_investments_check" CHECK ("already_investing" OR COALESCE("invested_amount", 0) = 0)
);

CREATE TABLE "user_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "name" VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM("name")) > 0),
    "target_amount" NUMERIC(12,2) NOT NULL CHECK ("target_amount" > 0),
    "target_date" DATE NOT NULL,
    "priority" "GoalPriority" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "user_goals_user_id_idx" ON "user_goals"("user_id");
