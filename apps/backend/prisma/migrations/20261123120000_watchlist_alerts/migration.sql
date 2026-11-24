ALTER TABLE "watchlist_items"
  ADD COLUMN "note" VARCHAR(500),
  ADD COLUMN "alert_direction" VARCHAR(5),
  ADD COLUMN "alert_price" DECIMAL(14,2),
  ADD CONSTRAINT "watchlist_alert_pair" CHECK (
    ("alert_direction" IS NULL AND "alert_price" IS NULL) OR
    ("alert_direction" IS NOT NULL AND "alert_direction" IN ('above', 'below')
      AND "alert_price" IS NOT NULL AND "alert_price" > 0)
  );
