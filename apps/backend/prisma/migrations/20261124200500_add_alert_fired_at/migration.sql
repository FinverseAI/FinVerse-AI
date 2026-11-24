-- Price-alert triggering (24 November 2026): records when a watchlist
-- alert last fired, so a crossed alert notifies once per crossing and
-- re-arms only after the price moves back across the threshold.
-- Nullable: existing rows keep NULL (never fired).
ALTER TABLE "watchlist_items" ADD COLUMN "alert_fired_at" TIMESTAMP(3);
