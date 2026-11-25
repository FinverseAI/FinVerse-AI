-- Add currency to user_holdings. Existing holdings were all entered in
-- INR, so they default to INR; new holdings record the currency their
-- buy price is in (see apps/backend/src/market/market.validation.ts).
ALTER TABLE "user_holdings" ADD COLUMN "currency" VARCHAR(8) NOT NULL DEFAULT 'INR';
