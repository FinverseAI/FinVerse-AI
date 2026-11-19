CREATE TABLE "user_holdings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120),
    "sector" VARCHAR(80),
    "quantity" DECIMAL(12,4) NOT NULL,
    "buy_price" DECIMAL(12,2) NOT NULL,
    "buy_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_holdings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_holdings_positive_quantity" CHECK ("quantity" > 0),
    CONSTRAINT "user_holdings_positive_buy_price" CHECK ("buy_price" > 0)
);

CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_quotes" (
    "symbol" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120),
    "price" DECIMAL(14,4) NOT NULL,
    "previous_close" DECIMAL(14,4),
    "currency" VARCHAR(8) NOT NULL,
    "sector" VARCHAR(80),
    "fetched_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "market_quotes_pkey" PRIMARY KEY ("symbol"),
    CONSTRAINT "market_quotes_positive_price" CHECK ("price" > 0)
);

CREATE TABLE "market_history" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(14,4) NOT NULL,
    "high" DECIMAL(14,4) NOT NULL,
    "low" DECIMAL(14,4) NOT NULL,
    "close" DECIMAL(14,4) NOT NULL,
    "volume" BIGINT,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "market_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_holdings_user_id_symbol_key" ON "user_holdings"("user_id", "symbol");
CREATE UNIQUE INDEX "watchlist_items_user_id_symbol_key" ON "watchlist_items"("user_id", "symbol");
CREATE UNIQUE INDEX "market_history_symbol_date_key" ON "market_history"("symbol", "date");
ALTER TABLE "user_holdings" ADD CONSTRAINT "user_holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
