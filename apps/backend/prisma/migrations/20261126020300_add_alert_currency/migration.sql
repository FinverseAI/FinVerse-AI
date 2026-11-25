-- Price alerts (26 November 2026): store the quote currency at the
-- moment an alert fires, so the notification centre never has to guess
-- a currency (B26). Nullable: existing rows keep NULL (unknown).
ALTER TABLE "watchlist_items" ADD COLUMN "alert_currency" VARCHAR(3);
