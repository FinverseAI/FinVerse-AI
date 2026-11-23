import assert from "node:assert/strict";
import test from "node:test";
import {
  earliestBuyDate,
  formatCompact,
  formatFetchedAt,
  formatPercent,
  formatPrice,
  historyRanges,
  portfolioCashFlows,
} from "../lib/market.ts";

test("formatPrice uses Indian grouping with two decimals", () => {
  assert.equal(formatPrice(1234567.89), "₹12,34,567.89");
  assert.equal(formatPrice(0), "₹0.00");
  assert.equal(formatPrice(-42.5), "-₹42.50");
});

test("formatPrice honours the quote currency", () => {
  assert.equal(formatPrice(99.99, "USD"), "$99.99");
});

test("formatCompact shortens large values and leaves small ones alone", () => {
  assert.equal(formatCompact(2500000), "₹25L");
  assert.equal(formatCompact(999), "₹999");
});

test("formatPercent signs positive values and never signs zero", () => {
  assert.equal(formatPercent(2.5), "+2.50%");
  assert.equal(formatPercent(-1.25), "-1.25%");
  assert.equal(formatPercent(0), "0.00%");
  assert.equal(formatPercent(2.5, false), "2.50%");
});

test("formatFetchedAt reports unknown timestamps honestly", () => {
  assert.equal(formatFetchedAt(null), "Unknown");
  assert.equal(formatFetchedAt("not-a-date"), "Unknown");
});

test("formatFetchedAt shows the day, month and time of a known fetch", () => {
  const formatted = formatFetchedAt("2026-11-23T10:30:00.000Z");
  assert.match(formatted, /^23 Nov, \d{1,2}:\d{2}\s?(am|pm)$/);
});

test("history ranges cover one month to five years", () => {
  assert.deepEqual(
    historyRanges.map(({ value }) => value),
    ["1mo", "3mo", "6mo", "1y", "5y"],
  );
});

const pricedHolding = {
  id: "h1",
  symbol: "RELIANCE",
  name: "Reliance Industries",
  sector: "Energy",
  quantity: 10,
  buyPrice: 2400,
  buyDate: "2025-01-15",
  currentPrice: 2900,
  currentValue: 29000,
  investedValue: 24000,
  gainLoss: 5000,
  gainLossPercent: 20.83,
  fetchedAt: "2026-11-23T10:00:00.000Z",
  stale: false,
  priced: true,
};

const unpricedHolding = {
  ...pricedHolding,
  id: "h2",
  symbol: "UNKNOWN",
  buyDate: "2024-06-01",
  currentPrice: null,
  currentValue: null,
  gainLoss: null,
  gainLossPercent: null,
  fetchedAt: null,
  priced: false,
};

test("portfolioCashFlows books the buy as an outflow and the current value as an inflow", () => {
  assert.deepEqual(portfolioCashFlows([pricedHolding], "2026-11-23"), [
    { amount: -24000, date: "2025-01-15" },
    { amount: 29000, date: "2026-11-23" },
  ]);
});

test("portfolioCashFlows excludes unpriced holdings instead of guessing a value", () => {
  assert.deepEqual(portfolioCashFlows([unpricedHolding], "2026-11-23"), []);
  assert.equal(
    portfolioCashFlows([pricedHolding, unpricedHolding], "2026-11-23").length,
    2,
  );
});

test("earliestBuyDate takes the earliest priced buy and ignores unpriced holdings", () => {
  assert.equal(earliestBuyDate([pricedHolding, unpricedHolding]), "2025-01-15");
  assert.equal(earliestBuyDate([unpricedHolding]), null);
  assert.equal(earliestBuyDate([]), null);
});
